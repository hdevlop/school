/**
 * Convert a number to French words (used in bilingual receipts for Moroccan schools).
 */

const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (t === 7) return o === 1 ? 'soixante et onze' : `soixante-${ones[10 + o]}`;
  if (t === 9) return o === 0 ? 'quatre-vingt-dix' : `quatre-vingt-${ones[10 + o]}`;
  const ten = tens[t];
  if (o === 0) return t === 8 ? 'quatre-vingts' : ten;
  if (o === 1 && t !== 8) return `${ten} et un`;
  return `${ten}-${ones[o]}`;
}

function hundredsChunk(n: number): string {
  if (n < 100) return twoDigits(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundredWord = h === 1 ? 'cent' : `${ones[h]} cent`;
  if (rest === 0) return h === 1 ? 'cent' : `${ones[h]} cents`;
  return `${hundredWord} ${twoDigits(rest)}`;
}

export function amountInWordsFR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);

  if (intPart === 0 && decPart === 0) return 'zéro dirham';

  const groups = [
    { value: 1_000_000, singular: 'million', plural: 'millions' },
    { value: 1_000, singular: 'mille', plural: 'mille' },
    { value: 1, singular: '', plural: '' },
  ];

  let remaining = intPart;
  const parts: string[] = [];

  for (const g of groups) {
    if (remaining >= g.value) {
      const count = Math.floor(remaining / g.value);
      remaining %= g.value;
      const countWord = hundredsChunk(count);
      if (g.value === 1) {
        parts.push(countWord);
      } else {
        const label = count === 1 ? g.singular : g.plural;
        parts.push(count === 1 && g.value === 1000 ? 'mille' : `${countWord} ${label}`);
      }
    }
  }

  let result = parts.join(' ').trim();
  result += ` dirham${intPart > 1 ? 's' : ''}`;

  if (decPart > 0) {
    result += ` et ${twoDigits(decPart)} centime${decPart > 1 ? 's' : ''}`;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}
