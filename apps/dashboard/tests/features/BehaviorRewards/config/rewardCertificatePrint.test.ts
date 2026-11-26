import { describe, expect, it } from 'bun:test';
import { createTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type RowSelectionState } from '@tanstack/react-table';
import {
  buildRewardCertificateDocument,
  CERTIFICATE_PLACES,
  certificateRewardsFromTable,
  rewardCertificate,
  rewardCertificates,
} from '@/features/BehaviorRewards/config/rewardCertificatePrint';

const teacher = { name: 'Moslih Btissam' };
const rewards = [
  { id: 'reward-a', rewardType: 'certificate', certificatePlace: 'first', student: { name: 'Salma', arabicName: 'سلمى' }, awardedByUser: teacher, category: 'effort' },
  { id: 'reward-b', rewardType: 'certificate', certificatePlace: 'second', student: { name: 'Anas' }, awardedByUser: teacher, category: 'effort' },
  { id: 'reward-a2', rewardType: 'badge', certificatePlace: null, student: { name: 'Salma' }, awardedByUser: teacher, category: 'effort' },
  { id: 'reward-c', rewardType: 'certificate', certificatePlace: 'third', student: { name: 'Adam' }, awardedByUser: teacher, category: 'teamwork' },
];

function makeTable(rowSelection: RowSelectionState) {
  return createTable({
    data: rewards,
    columns: [{ accessorKey: 'category' }],
    getRowId: row => row.id,
    state: { rowSelection, columnFilters: [{ id: 'category', value: 'effort' }], pagination: { pageIndex: 0, pageSize: 1 } },
    onStateChange: () => {}, renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  });
}

describe('reward certificates', () => {
  it('prints only the checked rewards, across pages and inside the filters', () => {
    expect(makeTable({}).getRowModel().rows).toHaveLength(1);
    expect(certificateRewardsFromTable(makeTable({}))).toEqual([]);
    const checked = makeTable({ 'reward-a': true, 'reward-a2': true, 'reward-b': true });
    expect(rewardCertificates(certificateRewardsFromTable(checked)).map(row => row.id)).toEqual(['reward-a', 'reward-b']);
    expect(certificateRewardsFromTable(makeTable({ 'reward-b': true, 'reward-c': true })).map(row => row.id)).toEqual(['reward-b']);
    expect(certificateRewardsFromTable(makeTable({ 'reward-c': true }))).toEqual([]);
  });

  it('takes the place and the signing teacher from the reward itself', () => {
    expect(rewardCertificate(rewards[0])).toEqual({
      id: 'reward-a', name: 'Salma', arabicName: 'سلمى', place: 'first', teacherName: 'Moslih Btissam',
    });
    expect(rewardCertificate(rewards[2])).toBeNull();
    expect(rewardCertificate({ ...rewards[0], certificatePlace: null })).toBeNull();
    expect(rewardCertificate({ ...rewards[0], certificatePlace: 'fourth' })).toBeNull();
    expect(rewardCertificate({ ...rewards[0], student: { name: ' ' } })).toBeNull();
  });

  it('prints each place with its wording and escapes the school, student and teacher details', () => {
    const html = buildRewardCertificateDocument(CERTIFICATE_PLACES.map(place => ({
      id: place, name: `${place} <student>`, arabicName: 'سلمى', place, teacherName: 'Mme <A>',
    })), {
      school: { name: 'École A & B', nameAr: 'مدرسة', logo: '/logo.png' },
      academicYear: '2026-2027', assetOrigin: 'https://school.test',
    });
    expect(html.match(/<article class="certificate /g)).toHaveLength(3);
    expect(html.match(/certificate-title-ribbon\.png" alt="شهادة تقديرية · Certificat d’appréciation"/g)).toHaveLength(3);
    expect(html.match(/certificate-congratulations-ribbon\.png" alt="Bravo et félicitations !"/g)).toHaveLength(3);
    expect(html.match(/class="ministry" src="https:\/\/school\.test\/images\/massar\/ministry\.png"/g)).toHaveLength(3);
    for (const place of CERTIFICATE_PLACES) expect(html).toContain(`/images/behavior-rewards/certificate-${place}.png`);
    expect(html).toContain('https://school.test/logo.png');
    expect(html).toContain('École A &amp; B');
    expect(html).toContain('مدرسة');
    expect(html.match(/Mme &lt;A&gt;/g)).toHaveLength(3);
    expect(html).toContain('first &lt;student&gt;');
    expect(html).toContain('brillants résultats');
    expect(html).toContain('continuer sur cette voie');
    expect(html).toContain('l’encourageons à persévérer');
  });
});
