import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import { createCheckReasonSchema } from '@/features/Financial/Operations/config/checkSchemas';

describe('check bounce and void reason', () => {
  it('shows the translated required message for blank and whitespace-only reasons', () => {
    for (const language of ['en', 'fr', 'ar', 'es'] as const) {
      const t = (key: string) => schoolI18n.translate(language, key as never);
      const schema = createCheckReasonSchema(t);
      const message = t('validationMessages.reasonIsRequired');
      expect(message).not.toBe('validationMessages.reasonIsRequired');
      for (const reason of ['', '   ', undefined, null]) {
        const parsed = schema.safeParse({ reason });
        expect(parsed.success).toBe(false);
        expect(parsed.error!.issues[0].message).toBe(message);
      }
      expect(schema.parse({ reason: '  Insufficient funds  ' }).reason).toBe('Insufficient funds');
    }
  });
});
