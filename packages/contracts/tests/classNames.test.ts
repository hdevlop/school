import { describe, expect, it } from 'bun:test';
import {
  classNameAliases, compareClassNames, findClassByName, SCHOOL_CLASS_ARABIC_NAMES, SCHOOL_CLASS_NAMES,
  toAppClassName, toArabicClassName, toOfficialClassName,
} from '../src/classNames';

describe('School class names', () => {
  it('orders classes by academic progression regardless of creation order or naming convention', () => {
    const names = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CE6', '1AC', '2AC', '3AC', 'PS', 'MS', 'GS', 'TC', '1BAC', '2BAC'];
    const expected = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CE6', '1AC', '2AC', '3AC', 'TC', '1BAC', '2BAC'];
    expect([...names].sort(compareClassNames)).toEqual(expected);
    expect(names.toReversed().sort(compareClassNames)).toEqual(expected);
    expect(names.map(toOfficialClassName).sort(compareClassNames)).toEqual(expected.map(toOfficialClassName));
    expect(compareClassNames(' 1apg ', 'cp')).toBe(0);
  });

  it('keeps custom classes after recognized classes in natural alphabetical order', () => {
    expect(['Group 10', 'PS', 'Group 2', 'Blue', '2BAC'].sort(compareClassNames))
      .toEqual(['PS', '2BAC', 'Blue', 'Group 2', 'Group 10']);
  });

  it.each([...SCHOOL_CLASS_NAMES])('accepts both names for $official / $app', ({ official, app }) => {
    for (const name of [official, app, ` ${official.toLowerCase()} `, app.toLowerCase()]) {
      expect(toAppClassName(name)).toBe(app);
      expect(toOfficialClassName(name)).toBe(official);
      expect(findClassByName([{ id: 'existing', name: app }], name)?.id).toBe('existing');
      expect(findClassByName([{ id: 'existing', name: official }], name)?.id).toBe('existing');
    }
    expect(classNameAliases(app)).toEqual([app, official]);
    expect(classNameAliases(official)).toEqual([official, app]);
  });

  it('preserves preschool, secondary and custom class names', () => {
    for (const name of ['PS', 'MS', 'GS', 'TC', '1BAC', '2BAC', 'CP Academy', 'Blue']) {
      expect(toAppClassName(name)).toBe(name);
      expect(toOfficialClassName(name)).toBe(name);
      expect(classNameAliases(name)).toEqual([name]);
    }
    expect(findClassByName([{ name: 'CP Academy' }], 'CP')).toBeUndefined();
  });

  it('names every recognized level in Arabic, from either name, and keeps custom names', () => {
    expect(Object.keys(SCHOOL_CLASS_ARABIC_NAMES).sort(compareClassNames))
      .toEqual(['PS', 'MS', 'GS', ...SCHOOL_CLASS_NAMES.map(item => item.app), 'TC', '1BAC', '2BAC']);
    // PS is before the official two-year preschool, so it has no ministry name.
    expect(toArabicClassName('PS')).toBe('الأولى روض');
    expect(toArabicClassName('MS')).toBe('الأولى أولي');
    expect(toArabicClassName('GS')).toBe('الثانية أولي');
    expect(toArabicClassName('CP')).toBe('الأولى ابتدائي');
    expect(toArabicClassName(' 1apic ')).toBe('الأولى إعدادي');
    expect(toArabicClassName('2bac')).toBe('الثانية بكالوريا');
    expect(toArabicClassName('Atelier')).toBe('Atelier');
  });

  it('prefers the exact name over an alias and does not substitute an unrelated class', () => {
    const classes = [{ id: 'app', name: 'CP' }, { id: 'official', name: '1APG' }];
    expect(findClassByName(classes, '1apg')?.id).toBe('official');
    expect(findClassByName(classes.toReversed(), 'cp')?.id).toBe('app');
    expect(findClassByName(classes, '2APG')).toBeUndefined();
  });
});
