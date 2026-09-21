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

/** Matches how School's email config reads its boolean environment flags. */
const emailFlagEnabled = (value: string | undefined) =>
  value === '1' || value?.toLowerCase() === 'true';

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
   * This first resolution only picks the path. Each path then re-decides
   * against current state and claims the target's window as the last step
   * before its irreversible effect, so no refusal anywhere in the chain ever
   * spends an administrator's retry.
   */
  async resetAccess(
    userId: string,
    body: ResetAccessDto,
    actor: AccessResetActor,
  ): Promise<AccessResetResult> {
    const target = await this.accessResetValidator.resolveTarget(userId, actor);
    this.accessResetValidator.ensureConfirmationFresh(body.expectedMode, target.mode);

    if (target.mode === 'parent_credential_setup') {
      return this.replaceParentCredential(target, body, actor);
    }
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
    // Lock the account, then decide again on what the lock now guarantees is
    // stable. The first resolution chose this path; this one authorizes it,
    // and anything that changed in between — a deactivation, a role change, a
    // CIN edit — is caught here rather than acted through.
    await this.accessResetRepository.lockTarget(target.account.id);
    const fresh = await this.accessResetValidator.resolveTarget(target.account.id, actor);
    this.accessResetValidator.ensureConfirmationFresh(body.expectedMode, fresh.mode);

    // The validator only reaches this mode with a normalized CIN in hand.
    // Checking anyway keeps an empty value from ever being hashed as one.
    const temporaryCredential = fresh.temporaryCredential;
    if (!temporaryCredential) Err(409, this.at('parentCinMissing'));

    // Every refusal is now behind us, so this is the first line that spends
    // the target's window.
    await this.claimCooldown(fresh.account.id);

    await this.authService.resetToTemporaryCredential(
      fresh.account.id,
      moroccanCinTemporaryCredential(temporaryCredential),
    );

    await this.accessResetRepository.recordAudit({
      actorId: actor.id,
      actorRole: actor.role ?? 'admin',
      targetUserId: fresh.account.id,
      reason: body.reason,
      mode: fresh.mode,
      status: 'success',
      outcome: 'credential_replaced',
    });

    return { userId: fresh.account.id, mode: fresh.mode, delivery: 'not_applicable' };
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
    // Decide once more against current state. A send cannot be rolled back, so
    // unlike the parent path this cannot hold a lock across the effect; it
    // narrows the window between deciding and acting rather than closing it.
    // The recipient is never taken from here either — Najm reads it from the
    // account itself at send time.
    const fresh = await this.accessResetValidator.resolveTarget(target.account.id, actor);
    this.accessResetValidator.ensureConfirmationFresh(body.expectedMode, fresh.mode);

    // Claimed only once nothing can still refuse, and never given back.
    await this.claimCooldown(fresh.account.id);

    const result =
      fresh.mode === 'invitation_resent'
        ? await this.authService.resendInvitation(fresh.account.id)
        : await this.authService.sendPasswordReset(fresh.account.id);

    const delivery = this.resolveDelivery(result.emailSent);

    if (result.undeliveredLinkLive) {
      // The mail did not leave and the link minted for it could not be pulled:
      // a usable link exists that nobody received. The flag is value-free — it
      // carries no token — and the anomaly deserves an operator's attention.
      console.error(
        `[access-reset] undelivered recovery link remains live for user ${fresh.account.id} (mode ${fresh.mode})`,
      );
    }

    try {
      await this.accessResetRepository.recordAudit({
        actorId: actor.id,
        actorRole: actor.role ?? 'admin',
        targetUserId: fresh.account.id,
        reason: body.reason,
        mode: fresh.mode,
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
        `[access-reset] delivery '${delivery}' for user ${fresh.account.id} (mode ${fresh.mode}) was not recorded in audit_logs`,
        auditError,
      );
      throw auditError;
    }

    return { userId: fresh.account.id, mode: fresh.mode, delivery };
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
    if (SIMULATED_EMAIL_PROVIDERS.has(provider)) return 'simulated';

    // SendGrid's sandbox validates and accepts the request in full and then
    // delivers nothing. It reports success exactly like a real send, so
    // without this check School would tell an administrator that a parent had
    // been emailed when the mail never left.
    if (provider === 'sendgrid' && emailFlagEnabled(process.env.SENDGRID_SANDBOX_MODE)) {
      return 'simulated';
    }

    return 'sent';
  }

  /**
   * Claim the window for one target. One atomic operation, and never given
   * back — the window closes only by expiring.
   *
   * An earlier version released the claim on failure so an administrator could
   * retry at once. Doing that safely needs an atomic claim-with-ownership,
   * which this cache cannot express: `incr` and a separate owner `set` leave a
   * gap in which a command that has outlived its own TTL deletes a *newer*
   * command's counter, and a third command then runs beside the second. Since
   * the primitive for doing it safely does not exist, the claim is simply not
   * released. The cost is that a failed attempt makes the administrator wait
   * out the window; the alternative was a duplicate send, which is worse.
   */
  private async claimCooldown(userId: string) {
    const { count } = await this.cache.incr(`${COOLDOWN_PREFIX}${userId}`, RESET_COOLDOWN_MS);
    if (count > 1) Err(429, this.at('cooldown'));
  }
}
