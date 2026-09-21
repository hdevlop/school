import { CacheService } from 'najm-cache';
import { moroccanCinTemporaryCredential } from 'najm-auth';

import { AuthService } from '@server/auth';
import { Err, I18n, Service, Transaction } from '@server/najm';
import type { AccessResetDelivery, AccessResetResult, ResetAccessDto } from './AccessResetDto';
import { AccessResetRepository } from './AccessResetRepository';
import {
  AccessResetValidator,
  type AccessResetActor,
  type ResolvedAccessTarget,
} from './AccessResetValidator';

/**
 * One reset per target per window, counted on the shared cache rather than
 * per process, so two administrators — or one administrator clicking twice —
 * cannot both get through. In production that cache is Redis, so the bound
 * holds across instances.
 */
const RESET_COOLDOWN_MS = 60_000;
const COOLDOWN_PREFIX = 'access-reset:target:';

/** Transports that accept a message without anyone receiving mail. */
const SIMULATED_EMAIL_PROVIDERS = new Set(['console', 'memory']);

@Service()
export class AccessResetService {
  @I18n('accessReset.errors') private at!: (key: string) => string;

  constructor(
    private accessResetRepository: AccessResetRepository,
    private accessResetValidator: AccessResetValidator,
    private authService: AuthService,
    private cache: CacheService,
  ) {}

  /**
   * One administrative action whose consequence the server chooses.
   *
   * Eligibility is resolved from state loaded now, then checked against the
   * consequence the dialog explained. Both happen before the cooldown is
   * claimed, so a refusal never spends an administrator's retry — and before
   * any mutation or send, so a refused command leaves no mail, no credential
   * change and no success audit behind.
   */
  async resetAccess(
    userId: string,
    body: ResetAccessDto,
    actor: AccessResetActor,
  ): Promise<AccessResetResult> {
    const target = await this.accessResetValidator.resolveTarget(userId, actor);
    this.accessResetValidator.ensureConfirmationFresh(body.expectedMode, target.mode);

    await this.claimCooldown(target.account.id);

    if (target.mode === 'parent_credential_setup') {
      try {
        return await this.replaceParentCredential(target, body, actor);
      } catch (error) {
        // That path is one transaction, so a failure left nothing behind and
        // the window must not keep a corrected retry out.
        await this.releaseCooldown(target.account.id);
        throw error;
      }
    }

    // The mail path decides for itself: a send that never left may be retried
    // at once, but one that did must not be repeated by a retry.
    return this.sendRecoveryMail(target, body, actor);
  }

  /**
   * Najm replaces the hash, records the durable setup requirement and revokes
   * sessions together; this decorator widens that same transaction to cover the
   * School audit row, so a failed audit rolls the credential back rather than
   * leaving a parent locked out of an account nothing recorded.
   */
  @Transaction()
  private async replaceParentCredential(
    target: ResolvedAccessTarget,
    body: ResetAccessDto,
    actor: AccessResetActor,
  ): Promise<AccessResetResult> {
    // The validator only reaches this mode with a normalized CIN in hand.
    // Checking anyway keeps an empty value from ever being hashed as one.
    const temporaryCredential = target.temporaryCredential;
    if (!temporaryCredential) Err(409, this.at('parentCinMissing'));

    await this.authService.resetToTemporaryCredential(
      target.account.id,
      moroccanCinTemporaryCredential(temporaryCredential),
    );

    await this.accessResetRepository.recordAudit({
      actorId: actor.id,
      actorRole: actor.role ?? 'admin',
      targetUserId: target.account.id,
      reason: body.reason,
      mode: target.mode,
      status: 'success',
      outcome: 'credential_replaced',
    });

    return { userId: target.account.id, mode: target.mode, delivery: 'not_applicable' };
  }

  /**
   * Mail is sent outside any transaction — a send cannot be rolled back — and
   * the audit records what the provider actually reported afterwards.
   */
  private async sendRecoveryMail(
    target: ResolvedAccessTarget,
    body: ResetAccessDto,
    actor: AccessResetActor,
  ): Promise<AccessResetResult> {
    let result;
    try {
      result =
        target.mode === 'invitation_resent'
          ? await this.authService.resendInvitation(target.account.id)
          : await this.authService.sendPasswordReset(target.account.id);
    } catch (error) {
      // Najm discards the token it minted when a send fails, so nothing is
      // live and the administrator may correct the cause and try again.
      await this.releaseCooldown(target.account.id);
      throw error;
    }

    const delivery = this.resolveDelivery(result.emailSent);

    if (result.undeliveredLinkLive) {
      // The mail did not leave and the link minted for it could not be pulled:
      // a usable link exists that nobody received. The flag is value-free — it
      // carries no token — and the anomaly deserves an operator's attention.
      console.error(
        `[access-reset] undelivered recovery link remains live for user ${target.account.id} (mode ${target.mode})`,
      );
    }

    try {
      await this.accessResetRepository.recordAudit({
        actorId: actor.id,
        actorRole: actor.role ?? 'admin',
        targetUserId: target.account.id,
        reason: body.reason,
        mode: target.mode,
        status: delivery === 'not_sent' ? 'failure' : 'success',
        outcome: delivery,
        ...(result.undeliveredLinkLive ? { undeliveredLinkLive: true } : {}),
      });
    } catch (auditError) {
      // A sent mail cannot be unsent, so this is a real partial failure rather
      // than something to swallow. It is named in the log so the gap can be
      // reconciled, the error reaches the administrator, and the cooldown
      // stays claimed so a reflexive retry does not send a second mail.
      console.error(
        `[access-reset] delivery '${delivery}' for user ${target.account.id} (mode ${target.mode}) was not recorded in audit_logs`,
        auditError,
      );
      throw auditError;
    }

    if (delivery === 'not_sent') {
      // A failed send is a failure the administrator has to retry, never a
      // success with a quiet caveat. Nothing left, so the window reopens.
      await this.releaseCooldown(target.account.id);
    }

    return { userId: target.account.id, mode: target.mode, delivery };
  }

  /**
   * A console or memory transport accepting the message is not delivery, and
   * saying so is the difference between "check your inbox" and a silent dead
   * end in any environment without real mail credentials.
   *
   * The provider name is read straight from the environment, matching how the
   * email config resolves it. Going through `resolveEmailConfig()` would
   * re-run its credential validation and could throw here — after the mail has
   * already left — turning a completed send into an error and skipping the
   * audit row for it.
   */
  private resolveDelivery(emailSent: boolean): AccessResetDelivery {
    if (!emailSent) return 'not_sent';
    const provider = (process.env.EMAIL_PROVIDER?.trim() || 'console').toLowerCase();
    return SIMULATED_EMAIL_PROVIDERS.has(provider) ? 'simulated' : 'sent';
  }

  private async claimCooldown(userId: string) {
    const { count } = await this.cache.incr(`${COOLDOWN_PREFIX}${userId}`, RESET_COOLDOWN_MS);
    if (count > 1) Err(429, this.at('cooldown'));
  }

  private async releaseCooldown(userId: string) {
    await this.cache.del(`${COOLDOWN_PREFIX}${userId}`);
  }
}
