import { describe, expect, it } from 'bun:test';
import type { CompetencyDomain, CompetencyLevel } from '@sms/contracts';
import { readFileSync } from 'node:fs';
import { agree, hasOwnRemark, proposeRemark, skillNeed } from '@/features/Competencies/config/competencyRemarks';

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
  it('matches Maths practice to each support level in reports and monthly remarks', () => {
    const skills = ['Compter et dénombrer', 'Lire et écrire les nombres', 'Comparer et ranger les nombres',
      'Résoudre un petit problème', 'Reconnaître les figures planes', 'Reconnaître les formes géométriques', 'Comparer et mesurer des longueurs'];
    for (const name of skills) {
      const activities = (['not_acquired', 'beginning', 'in_progress'] as const).map(level => {
        const activity = skillNeed('fr', name, null, level);
        expect(propose({ m0: level }, 'F', [domain('m', 'Maths', [name])], 'fr')).toEndWith(activity);
        return activity;
      });
      expect(new Set(activities).size).toBe(3);
    }
  });

  it('agrees with the pupil: feminine for a girl, masculine otherwise', () => {
    expect(agree('{يواجه|تواجه} صعوبة', 'F')).toBe('تواجه صعوبة');
    expect(agree('{يواجه|تواجه} صعوبة', 'M')).toBe('يواجه صعوبة');
    expect(agree('{Il|Elle} est {encouragé|encouragée}', null)).toBe('Il est encouragé');
  });

  it('proposes nothing before any level is set', () => {
    expect(propose({}, 'F')).toBeNull();
  });

  it('names the weakest assessed skill and a specific home activity in Arabic', () => {
    expect(propose({ w0: 'not_acquired', r0: 'beginning', r1: 'in_progress', w2: 'in_progress' }, 'F')).toBe([
      'عدد الكفايات المقيّمة هذا الشهر 4 من أصل 9.',
      'يستدعي رسم بعض الحروف وكتابتها بالشكل الصحيح مزيدًا من الدعم.',
      'يمكن اختيار حرف من الكراسة وكتابته على السطر ثم مقارنة شكله بالنموذج.',
    ].join('\n'));
  });

  it('describes a strength and prioritizes just one practice activity for a mixed month', () => {
    const text = propose({ r0: 'advanced', r1: 'mastered', w0: 'beginning', w3: 'beginning' }, 'M')!;
    expect(text.split('\n')).toHaveLength(4);
    expect(text).toContain('أظهر التقييم تمكّنًا من فهم المسموع والتفاعل معه.');
    expect(text).toContain('اختيار حرف من الكراسة');
    expect(text).not.toContain('صورة');
  });

  const english = [domain('e', 'English', ['Reading comprehension', 'Pronunciation', 'Free writing', 'Grammar', 'Vocabulary', 'Guided writing', 'Listening comprehension', 'Oral expression'])];

  it('describes one of eight English skills in French and gives the family an activity', () => {
    expect(propose({ e0: 'mastered' }, 'F', english, 'fr')).toBe([
      'Ce mois-ci, l’évaluation porte sur 1 compétence sur 8.',
      'Votre enfant maîtrise la compréhension des textes en anglais.',
      'Après un court texte en anglais, demandez à votre enfant d’en résumer l’idée principale avec ses propres mots.',
    ].join('\n'));
    expect(propose({ e0: 'in_progress' }, 'F', english, 'fr')!.split('\n')[1]).toBe('Votre enfant consolide la compréhension des textes en anglais.');
  });

  it('reserves whole-list mastery for a complete list with every skill mastered', () => {
    const list = [domain('f', 'Français', ['Grammaire', 'Dictée'])];
    expect(propose({ f0: 'mastered', f1: 'advanced' }, 'M', list, 'fr')).not.toContain('toutes les compétences');
    expect(propose({ f0: 'mastered', f1: 'mastered' }, 'M', list, 'fr')).toStartWith('Votre enfant maîtrise toutes les compétences prévues pour ce mois.');
    expect(propose({ f0: 'mastered' }, 'M', [domain('f', 'Français', ['Dictée'])], 'fr')).toStartWith('Votre enfant maîtrise la dictée.');
  });

  it('uses a custom skill name literally and gives a practice task', () => {
    const list = [domain('f', 'Lecture', ['Reconnaître les sons et les lettres', 'Lire un album'])];
    expect(propose({ f0: 'beginning', f1: 'not_acquired' }, 'F', list, 'fr')).toBe([
      'Votre enfant a besoin d’aide pour travailler « Lire un album ».',
      'Pour travailler « Lire un album » à la maison, reprenez un exemple du cours, puis essayez ensemble un exercice similaire.',
    ].join('\n'));
  });

  it('uses neutral guidance when gender is unknown and the bank has a gendered sentence', () => {
    const domains = [domain('m', 'Calcul', ['Additionner et soustraire'])];
    const text = proposeRemark({ domains, language: 'fr', gender: null, levelOf: () => 'beginning' });
    expect(text).toContain('reprenez un exemple du cours');
    expect(text).not.toMatch(/\b(Il|Elle)\b|[{}]/);
  });
});

// Each French, English and maths skill in the default lists has its own sentence.
// Read the catalog as text because the dashboard does not import the server.
describe('the remark book covers default subject skills', () => {
  const source = readFileSync(new URL('../../../../../../packages/server/src/modules/competencies/defaultCatalogs.ts', import.meta.url), 'utf8')
    // A Windows checkout has CRLF line endings; the blocks below split on LF.
    .replace(/\r\n/g, '\n');
  // Each list is one `{ subject: …, classes: …, domains: [...] }` block of the file.
  const skillsOf = (subject: string) => source.split(/\n {2}\{\n/)
    .filter((block) => block.includes(`subject: '${subject}'`))
    .map((block) => ({
      arabic: subject === 'MATH' && block.includes("classes: ['CE6']"),
      skills: [...block.matchAll(/\[\s*(['"])(?:(?!\1).)+\1,\s*\[([^\]]*)\]\]/g)]
        .flatMap(([, , items]) => [...items.matchAll(/(['"])((?:(?!\1).)+)\1/g)].map((match) => match[2])),
    }));

  for (const subject of ['FR', 'MATH', 'ENG']) {
    it(subject, () => {
      const lists = skillsOf(subject);
      expect(lists.length).toBeGreaterThan(2);
      for (const { arabic, skills } of lists) {
        expect(skills.length).toBeGreaterThan(0);
        for (const skill of skills) expect(hasOwnRemark(arabic ? 'ar' : 'fr', skill), skill).toBe(true);
      }
    });
  }

  it('offers three distinct activities for every French skill in reports and monthly remarks', () => {
    for (const name of new Set(skillsOf('FR').flatMap(list => list.skills))) {
      const activities = (['not_acquired', 'beginning', 'in_progress'] as const).map(level => {
        const activity = skillNeed('fr', name, null, level);
        expect(propose({ f0: level }, 'F', [domain('f', 'Français', [name])], 'fr')).toEndWith(activity);
        return activity;
      });
      expect(new Set(activities).size, name).toBe(3);
    }
  });
});
