import { createOfflineBrowserErrorAudit as createAudit } from 'najm-offline/testing';

/** najm-offline's browser error audit, with School's fallback avatars as the images WebKit reports natively. */
export function createOfflineBrowserErrorAudit(engine, origin) {
  return createAudit(engine, origin, { imagePaths: ['/images/student_'] });
}
