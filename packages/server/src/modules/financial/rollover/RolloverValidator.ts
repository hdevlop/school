import { Err, Service } from '../../../najm';
import type { RolloverDto } from './RolloverDto';

@Service()
export class RolloverValidator {
  ensureYears(dto: RolloverDto, selectedYear: string) {
    if (dto.toYear !== selectedYear) Err(409, 'Rollover target must match the selected school year');
    if (dto.fromYear >= dto.toYear) Err(409, 'Rollover source must precede the target school year');
  }

  ensureIdempotentPayload(existingHash: string, payloadHash: string) {
    if (existingHash !== payloadHash) Err(409, 'This rollover idempotency key was already used with a different payload');
  }

  ensureSeparateActivation(confirmSettingsUpdate: boolean) {
    if (confirmSettingsUpdate) Err(409, 'Activate the academic year separately after academic preparation');
  }

  ensureMatchingPreview<T extends { id: string; payloadHash: string }>(run: T | null | undefined, runId: string, payloadHash: string): T {
    if (!run) Err(400, 'No preview exists for this idempotency key');
    if (run.id !== runId) Err(409, 'runId does not match the preview idempotency key');
    if (run.payloadHash !== payloadHash) Err(409, 'Rollover payload does not match the preview');
    return run;
  }

  ensureCommittable(run: { dryRun: boolean; status: string }) {
    if (!run.dryRun || run.status !== 'previewed') Err(409, `Cannot commit a run in status ${run.status}`);
  }

  ensureProposedFees(preview: any) {
    if (!Array.isArray(preview?.details?.proposedFees)) Err(500, 'Preview payload is missing proposed fees');
  }

  ensureRunExists<T>(run: T | null | undefined): T {
    if (!run) Err(404, 'Rollover run not found');
    return run;
  }
}
