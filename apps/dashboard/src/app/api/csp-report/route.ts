import { createCspReportHandler } from 'najm-next/security/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createCspReportHandler({
  sink: (report) => console.warn('[csp] violation', report),
});
