import { describe, expect, it } from 'bun:test';
import { formatBirthplaceEntry, parseBirthplaceEntry } from '@/features/Students/config/birthplaceEntry';
import { createStudentSchemas } from '@/features/Students/config/studentSchemas';

describe('single bilingual birthplace field', () => {
  it('shows and splits the two scripts while preserving town-name hyphens', () => {
    expect(formatBirthplaceEntry({ birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' })).toBe('Casablanca - الدار البيضاء');
    expect(parseBirthplaceEntry(' Madrid - مدريد ')).toEqual({ birthplace: 'Madrid', birthplaceArabic: 'مدريد' });
    expect(parseBirthplaceEntry('Ain-Harrouda - عين حرودة')).toEqual({ birthplace: 'Ain-Harrouda', birthplaceArabic: 'عين حرودة' });
    expect(parseBirthplaceEntry('Casablanca—الدار البيضاء')).toEqual({ birthplace: 'Casablanca', birthplaceArabic: 'الدار البيضاء' });
    expect(formatBirthplaceEntry({ birthplace: 'Madrid' })).toBe('Madrid');
    expect(formatBirthplaceEntry({})).toBe('');
  });
  it('requires both scripts for a supplied manual birthplace and allows clearing', () => {
    const entrySchema = createStudentSchemas(key => key).student.shape.birthplaceEntry;
    for (const value of ['Madrid', 'مدريد', 'Madrid - Madrid', 'مدريد - Madrid', '- مدريد', 'Madrid -', `${'a'.repeat(201)} - مدريد`]) {
      expect(entrySchema.safeParse(value).success).toBe(false);
    }
    expect(entrySchema.safeParse('Madrid - مدريد').success).toBe(true);
    expect(entrySchema.safeParse('').success).toBe(true);
    expect(entrySchema.safeParse(undefined).success).toBe(true);
  });
});
