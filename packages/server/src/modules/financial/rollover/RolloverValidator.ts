import { Err, I18n, Service } from '../../../najm';
import type { RolloverDto } from './RolloverDto';

@Service()
export class RolloverValidator {
  @I18n('rollover.errors') private et!: (key: string, params?: Record<string, unknown>) => string;
  ensureYears(dto: RolloverDto, selectedYear: string) {
    if (dto.toYear !== selectedYear) Err(409, this.et('targetMismatch'));
    if (dto.fromYear >= dto.toYear) Err(409, this.et('sourceAfterTarget'));
  }

  ensureIdempotentPayload(existingHash: string, payloadHash: string) {
    if (existingHash !== payloadHash) Err(409, this.et('idempotencyKeyReused'));
  }

  ensureSeparateActivation(confirmSettingsUpdate: boolean) {
    if (confirmSettingsUpdate) Err(409, this.et('activateSeparately'));
  }

  ensureMatchingPreview<T extends { id: string; payloadHash: string }>(run: T | null | undefined, runId: string, payloadHash: string): T {
    if (!run) Err(400, this.et('noPreview'));
    if (run.id !== runId) Err(409, this.et('runIdMismatch'));
    if (run.payloadHash !== payloadHash) Err(409, this.et('payloadMismatch'));
    return run;
  }

  ensureCommittable(run: { dryRun: boolean; status: string }) {
    if (!run.dryRun || run.status !== 'previewed') Err(409, this.et('cannotCommitStatus', { status: run.status }));
  }

  ensureProposedFees(preview: any) {
    if (!Array.isArray(preview?.details?.proposedFees)) Err(500, this.et('previewMissingFees'));
  }

  ensureRunExists<T>(run: T | null | undefined): T {
    if (!run) Err(404, this.et('runNotFound'));
    return run;
  }
}
