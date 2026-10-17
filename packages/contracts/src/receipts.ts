/** The school's receipt language is independent of each user's interface language. */
export const RECEIPT_LANGUAGES = ['fr', 'ar'] as const;
export type ReceiptLanguage = (typeof RECEIPT_LANGUAGES)[number];
export const DEFAULT_RECEIPT_LANGUAGE: ReceiptLanguage = 'fr';
