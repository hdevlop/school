import { describe, expect, it } from 'bun:test';
import { capitalizeOptionalPersonName, capitalizePersonName } from '../src/personNames';

describe('capitalizePersonName', () => {
  it('capitalizes each word, whatever way it was typed', () => {
    expect(capitalizePersonName('ilham achtouk')).toBe('Ilham Achtouk');
    expect(capitalizePersonName('ABBOU SAFOIANE')).toBe('Abbou Safoiane');
    expect(capitalizePersonName('ilham ACHTOUK')).toBe('Ilham Achtouk');
  });

  it('tidies the spacing', () => {
    expect(capitalizePersonName('  safri   khadija ')).toBe('Safri Khadija');
  });

  it('capitalizes after a hyphen or an apostrophe, and keeps accents', () => {
    expect(capitalizePersonName("jean-marc d'amour el-idrissi o’neil")).toBe("Jean-Marc D'Amour El-Idrissi O’Neil");
    expect(capitalizePersonName('ÉLODIE élise')).toBe('Élodie Élise');
  });

  it('leaves an Arabic name as written, spacing aside', () => {
    expect(capitalizePersonName(' إلهام   أشتوك ')).toBe('إلهام أشتوك');
  });

  it('keeps an absent or empty optional name as it is', () => {
    expect(capitalizeOptionalPersonName(undefined)).toBeUndefined();
    expect(capitalizeOptionalPersonName(null)).toBeNull();
    expect(capitalizeOptionalPersonName('')).toBe('');
  });
});
