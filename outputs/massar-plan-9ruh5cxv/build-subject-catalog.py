import json
from pathlib import Path

out = Path(__file__).parent
data = json.loads((out / 'catalog.json').read_text(encoding='utf-8-sig'))
records = data['records']
names = ['اللغة العربية', 'اللغة الفرنسية', 'اللغة الإنجليزية', 'الرياضيات', 'النشاط العلمي', 'التربية الإسلامية', 'التربية الفنية', 'الاجتماعيات', 'المعلوميات و الروبوتيك']
classes = {1: 'CP', 2: 'CE1', 3: 'CE2', 4: 'CM1', 5: 'CM2', 6: 'CE6'}
locked = {(2, 'اللغة الإنجليزية'), (4, 'التربية الفنية'), (4, 'الاجتماعيات')}
subjects = []
for name in names:
    rows = [r for r in records if r['subject'] == name]
    subject = {'name': name, 'codesObserved': sorted({r['subjectCode'] for r in rows if r['subjectCode']}), 'grades': []}
    for grade in range(1, 7):
        matching = [r for r in rows if r['folderGrade'] == grade]
        entry = {'grade': grade, 'classLabel': classes[grade], 'components': [], 'sources': []}
        if not matching:
            entry['status'] = 'encrypted_unverified' if (grade, name) in locked else 'not_supplied'
        else:
            first = matching[0]
            entry.update(status='school_custom_no_codes' if first['sourceType'] == 'school_custom' else 'read_from_massar_style_template', subjectCode=first['subjectCode'])
            entry['components'] = [{'code': c['code'], 'name': c['name']} for c in first['components']]
            variants = {}
            for r in matching:
                source = {k: r[k] for k in ['source', 'sheet', 'class', 'academicYear', 'sourceType']}
                source['componentCells'] = r['components']
                entry['sources'].append(source)
                signature = tuple((c['code'], c['name']) for c in r['components'])
                variants.setdefault(signature, []).append(r['source'])
            if len(variants) > 1:
                entry['variants'] = [{'components': [{'code': c, 'name': n} for c, n in sig], 'sourcePaths': paths} for sig, paths in variants.items()]
        subject['grades'].append(entry)
    subjects.append(subject)

notes = [
    'These are the fields in the supplied 2025/2026 files. Template appearance does not independently establish that a workbook is an unmodified official Massar export.',
    'Names, spelling and identifiers are preserved. Codes remain strings with leading zeros. The same label can have different identifiers in different grades.',
    'CP French uses custom school sheets: six labels without Massar component codes. A/B differ only in the capitalization of lecture / Lecture. These labels must not automatically replace a verified Massar CP mapping.',
    'Mathematics and IT/robotics both use code 0019 in the files. Keep the subjects separate by name; this identifier is not globally unique in this collection.',
    'A single component equal to its parent subject means the export supplies one grading field. It does not mean that the teaching curriculum has no internal strands.',
    'Grade 2 English, grade 4 arts and grade 4 social studies remain unverified: both supplied section files are encrypted. Other encrypted files have a readable same-grade counterpart, whose header is reported without claiming that the locked file matches.',
    'Grade 6 Islamic files marked ANCHITA repeat the regular subject/component identifiers. Their separate source paths are retained without inventing another subject.',
    'No supplied file means no evidence here, not that a subject is excluded from Massar.',
    'No student records or marks are included. Original workbooks and app data were not changed.'
]
summary = {'sourceFiles': 104, 'readableFiles': len(records), 'encryptedFiles': len(data['errors']), 'subjectNames': len(subjects), 'readableGradeSubjectMappings': sum(bool(g['sources']) for s in subjects for g in s['grades']), 'unverifiedGradeSubjectMappings': 3}
result = {'sourceFolder': data['sourceFolder'], 'academicYears': sorted({r['academicYear'] for r in records}), 'summary': summary, 'notes': notes, 'subjects': subjects, 'encryptedFiles': data['errors']}
(out / 'subjects-by-grade.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

lines = ['# Primary subjects and sub-subjects from the supplied files', '', 'Source: `C:/Users/hdevlop/Downloads/notes/notes` — academic year **2025/2026**.', '', '**104 files inventoried; 95 readable; 9 encrypted.** This report consolidates A/B duplicates into 48 readable grade/subject mappings across 9 subject names. Full provenance is retained in the JSON.', '', '## How to read this list', '']
lines += ['- ' + note for note in notes]
lines += ['', '## Coverage', '', '| Subject | CP / 1AP | CE1 / 2AP | CE2 / 3AP | CM1 / 4AP | CM2 / 5AP | CE6 / 6AP |', '|---|---:|---:|---:|---:|---:|---:|']
for s in subjects:
    cells = []
    for g in s['grades']:
        cells.append(str(len(g['components'])) + (' custom' if g['status'] == 'school_custom_no_codes' else '') if g['sources'] else ('Locked' if g['status'] == 'encrypted_unverified' else 'No file'))
    lines.append('| ' + s['name'] + ' | ' + ' | '.join(cells) + ' |')
lines += ['', 'Counts are separate grading fields, including one field for an undivided subject.', '']
for s in subjects:
    lines += ['## ' + s['name'], '', 'Observed parent code(s): ' + ', '.join('`' + c + '`' for c in s['codesObserved']) + '.', '', '| Grade | Sub-subject / grading field (identifier — exact label) |', '|---|---|']
    for g in s['grades']:
        label = '{} / {}AP'.format(g['classLabel'], g['grade'])
        if g['status'] == 'encrypted_unverified':
            content = '**Unverified: both supplied files are encrypted.**'
        elif g['status'] == 'not_supplied':
            content = 'No file supplied.'
        else:
            content = '<br>'.join(('`' + c['code'] + '` — ' if c['code'] else '(no code) — ') + c['name'] for c in g['components'])
            if g['status'] == 'school_custom_no_codes':
                content = '**Custom school sheet:**<br>' + content
            if 'variants' in g:
                content += '<br>A/B source spelling variation: `lecture` / `Lecture`.'
        lines.append('| ' + label + ' | ' + content + ' |')
    lines += ['', '### Source references', '']
    for g in s['grades']:
        seen = set()
        for src in g['sources']:
            signature = tuple((c['code'], c['name']) for c in src['componentCells'])
            if signature in seen:
                continue
            seen.add(signature)
            path = src['source'].replace('\\', '/')
            relative = str(Path(src['source']).relative_to(Path(data['sourceFolder']))).replace('\\', '/')
            cells = ', '.join(c['labelCell'] + (' + ' + c['continuationCell'] if c.get('continuationCell') else '') for c in src['componentCells'])
            lines.append('- {} / {}AP: [{}](<{}>) — `{}` labels: `{}`. All {} readable source files for this grade/subject are retained in JSON.'.format(g['classLabel'], g['grade'], relative, path, src['sheet'], cells, len(g['sources'])))
    lines.append('')
lines += ['## Encrypted files', '']
lines += ['- `' + e['file'].replace('\\', '/') + '`' for e in data['errors']]
lines += ['', 'The opening password is needed to read these files. No values were inferred for the three wholly encrypted grade/subject combinations.', '', '## Machine-readable extraction', '', '[subjects-by-grade.json](subjects-by-grade.json) includes every readable source path and the exact code/label cells. [catalog.json](catalog.json) retains the original structural extraction.', '']
(out / 'subjects-by-grade.md').write_text('\n'.join(lines), encoding='utf-8')

sources = [src for s in subjects for g in s['grades'] for src in g['sources']]
assert len(sources) == len(records) == 95
assert len({src['source'] for src in sources}) == 95
for r in records:
    src = next(src for src in sources if src['source'] == r['source'])
    assert src['componentCells'] == r['components']
assert summary['readableGradeSubjectMappings'] == 48
assert sum(g['status'] == 'encrypted_unverified' for s in subjects for g in s['grades']) == 3
print(json.dumps({'summary': summary, 'validation': 'All 95 original headers preserved exactly.', 'outputs': [str((out / n).resolve()) for n in ['subjects-by-grade.md', 'subjects-by-grade.json']]}, ensure_ascii=False, indent=2))
