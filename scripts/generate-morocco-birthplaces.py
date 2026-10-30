"""Generate the bundled reference catalog from HCP's bilingual RGPH 2024 workbook.

Usage: python scripts/generate-morocco-birthplaces.py /path/to/242341.xlsx
Requires openpyxl. The source workbook is downloaded separately, never at runtime.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
import warnings

import openpyxl

warnings.filterwarnings('ignore', category=UserWarning)
source = Path(sys.argv[1])
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
places = []
province_latin = province_arabic = ''
for row in workbook.active:
    latin, arabic, code = row[0].value, row[5].value, row[6].value
    if not isinstance(latin, str):
        continue
    if (latin.startswith(('Province ', 'Préfecture ')) and '(milieu ' not in latin
            and row[6].number_format.count('0') == 5):
        province_latin = latin
        province_arabic = str(arabic or '').strip()
    if not latin.startswith('Commune '):
        continue
    # HCP uses 00.000.00.0 for cities with arrondissements, otherwise
    # 00.000.00.00. Excel stores a number; recover its leading zero.
    digits = str(int(code)).zfill(row[6].number_format.count('0'))
    name_latin = re.sub(r"^Commune (?:de |d['’]|du |des )", '', latin).strip()
    name_arabic = re.sub(r'^جماعة\s+', '', str(arabic or '')).strip()
    assert name_latin and name_arabic and province_latin
    places.append(dict(id=f'MA-HCP-{digits}', nameLatin=name_latin, nameArabic=name_arabic,
                       countryCode='MA', provinceLatin=province_latin, provinceArabic=province_arabic))
workbook.close()
assert len(places) == 1503, f'Unexpected HCP commune count: {len(places)}'
assert len({place['id'] for place in places}) == len(places)
places.sort(key=lambda place: place['id'])
output = Path(__file__).resolve().parents[1] / 'packages/contracts/src/data/moroccoBirthplaces.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text('[\n' + ',\n'.join('  ' + json.dumps(place, ensure_ascii=False) for place in places) + '\n]\n', encoding='utf-8')
print(f'{len(places)} communes; source SHA-256: {hashlib.sha256(source.read_bytes()).hexdigest()}')
