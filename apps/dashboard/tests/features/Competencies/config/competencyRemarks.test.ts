import { describe, expect, it } from 'bun:test';
import type { CompetencyDomain, CompetencyLevel } from '@sms/contracts';
import { readFileSync } from 'node:fs';
import { agree, hasOwnRemark, proposeRemark } from '@/features/Competencies/config/competencyRemarks';

// The school's CP Arabic grid.
const domain = (id: string, name: string, items: string[]): CompetencyDomain => ({
  id, teacherAssignmentId: 't', name, altName: null, position: 0,
  competencies: items.map((item, position) => ({ id: `${id}${position}`, domainId: id, name: item, altName: null, position })),
});
const CP = [
  domain('r', 'القراءة', ['القراءة السليمة', 'فهم المسموع', 'فهم المقروء', 'التجزيء المقطعي', 'المرونة']),
  domain('w', 'الكتابة', ['الخط', 'النقل', 'الإملاء', 'التعبير الكتابي']),
];
const propose = (levels: Record<string, CompetencyLevel>, gender: 'M' | 'F', domains = CP, language: 'ar' | 'fr' = 'ar') =>
  proposeRemark({ domains, levelOf: (id) => levels[id], gender, language });

describe('the remark book', () => {
  it('agrees with the pupil: feminine for a girl, masculine otherwise', () => {
    expect(agree('{يواجه|تواجه} صعوبة', 'F')).toBe('تواجه صعوبة');
    expect(agree('{يواجه|تواجه} صعوبة', 'M')).toBe('يواجه صعوبة');
    expect(agree('{Il|Elle} est {encouragé|encouragée}', null)).toBe('Il est encouragé');
  });

  it('proposes nothing before any level is set', () => {
    expect(propose({}, 'F')).toBeNull();
  });

  // As the teachers write it: difficulties, then what helps.
  it('names a weak pupil\'s difficulties, weakest first, then the need the teachers write', () => {
    expect(propose({ w0: 'not_acquired', r0: 'beginning', r1: 'in_progress', w2: 'in_progress' }, 'F')).toBe([
      'تواجه صعوبة في رسم بعض الحروف وكتابتها بالشكل الصحيح.',
      'تواجه صعوبة في التعرف على بعض الحروف وقراءتها بشكل صحيح.',
      'تحتاج إلى تحسين التحكم في القلم واحترام اتجاه الكتابة ومقاييس الحروف.',
    ].join('\n'));
  });

  it('asks for doubled effort past two weak skills', () => {
    const remark = propose({ r0: 'not_acquired', r3: 'not_acquired', w2: 'beginning', w0: 'beginning' }, 'M')!;
    expect(remark.split('\n')).toHaveLength(3);
    expect(remark).toEndWith('يحتاج إلى مواكبة وجهد مضاعف لتجاوز تعثراته.');
  });

  it('gives a good pupil an appreciation, a strength and what to work on', () => {
    expect(propose({ r0: 'advanced', r1: 'mastered', r4: 'in_progress', w0: 'advanced' }, 'M')).toBe([
      'مستوى جيد.',
      'يتمكن جيدا من فهم المسموع والتفاعل معه.',
      'يحتاج إلى مزيد من التمرن على القراءة بطلاقة واسترسال.',
      'مطالب بمواصلة المجهود.',
    ].join('\n'));
  });

  it('congratulates an excellent pupil', () => {
    expect(propose({ r0: 'mastered', r1: 'mastered', w0: 'advanced' }, 'F')).toBe(
      'عمل ممتاز، تتحكم في مختلف المهارات المقررة.\nنشجعها على الاستمرار بنفس الجدية.',
    );
  });

  it('writes a French list in French, and names a skill it has no sentence for', () => {
    const list = [domain('f', 'Lecture', ['Reconnaître les sons et les lettres', 'Lire un album'])];
    expect(propose({ f0: 'beginning', f1: 'not_acquired' }, 'F', list, 'fr')).toBe([
      'Elle rencontre des difficultés dans « Lire un album ».',
      'Elle rencontre des difficultés dans la reconnaissance des sons et des lettres.',
      "Elle a besoin d'un accompagnement régulier dans « Lire un album ».",
    ].join('\n'));
  });
});

// Every French and maths skill of the default lists (packages/server/src/modules/competencies/defaultCatalogs.ts)
// has its own sentence; read as text, since the dashboard does not import the server.
describe('the remark book covers French and maths', () => {
  const source = readFileSync(new URL('../../../../../../packages/server/src/modules/competencies/defaultCatalogs.ts', import.meta.url), 'utf8');
  // Each list is one `{ subject: …, classes: …, domains: [...] }` block of the file.
  const skillsOf = (subject: string) => source.split(/\n {2}\{\n/)
    .filter((block) => block.includes(`subject: '${subject}'`))
    .map((block) => ({
      arabic: subject === 'MATH' && block.includes("classes: ['CE6']"),
      skills: [...block.matchAll(/\[\s*(['"])(?:(?!\1).)+\1,\s*\[([^\]]*)\]\]/g)]
        .flatMap(([, , items]) => [...items.matchAll(/(['"])((?:(?!\1).)+)\1/g)].map((match) => match[2])),
    }));

  for (const subject of ['FR', 'MATH']) {
    it(subject, () => {
      const lists = skillsOf(subject);
      expect(lists.length).toBeGreaterThan(2);
      for (const { arabic, skills } of lists) {
        expect(skills.length).toBeGreaterThan(0);
        for (const skill of skills) expect(hasOwnRemark(arabic ? 'ar' : 'fr', skill), skill).toBe(true);
      }
    });
  }
});
