import type { Table } from '@tanstack/react-table';
import { BEHAVIOR_REWARD_CERTIFICATE_PLACE_VALUES, type BehaviorRewardCertificatePlace } from '@sms/contracts';
import { escapePrintHtml, safePrintImageUrl } from '@/shared/schoolPrintDocument';

export type CertificateReward = {
  id: string;
  rewardType?: string | null;
  certificatePlace?: string | null;
  student?: { name?: string | null; arabicName?: string | null } | null;
  awardedByUser?: { name?: string | null } | null;
};

export const CERTIFICATE_PLACES = BEHAVIOR_REWARD_CERTIFICATE_PLACE_VALUES;
export type CertificatePlace = BehaviorRewardCertificatePlace;
/** One printed certificate: the student, the place the reward records, and the teacher who gave it. */
export type RankedCertificate = { id: string; name: string; arabicName: string; place: CertificatePlace; teacherName: string };

type CertificateOptions = {
  school: { name: string; nameAr?: string | null; logo?: string | null };
  academicYear: string;
  assetOrigin: string;
};

/** The certificate a reward prints, or null when it is not a certificate reward with a place and a named student. */
export function rewardCertificate(reward: CertificateReward): RankedCertificate | null {
  const place = CERTIFICATE_PLACES.find(value => value === reward.certificatePlace);
  const name = reward.student?.name?.trim() ?? '';
  const arabicName = reward.student?.arabicName?.trim() ?? '';
  if (reward.rewardType !== 'certificate' || !place || (!name && !arabicName)) return null;
  return { id: reward.id, name, arabicName, place, teacherName: reward.awardedByUser?.name?.trim() ?? '' };
}

export function rewardCertificates(rewards: readonly CertificateReward[]): RankedCertificate[] {
  return rewards.flatMap(reward => rewardCertificate(reward) ?? []);
}

/** The checked rewards still inside the filters, in the table's sort order, across every page. */
export function certificateRewardsFromTable<T extends CertificateReward>(table: Table<T>) {
  return table.getPrePaginationRowModel().rows
    .filter(row => row.getIsSelected())
    .map(row => row.original);
}

const REWARDING_EFFORT = 'En récompense de ses efforts, de son sérieux et de son engagement dans son travail scolaire.';
const CERTIFICATE_MESSAGES = {
  first: [REWARDING_EFFORT, 'Nous le félicitons pour ses brillants résultats et l’encourageons à poursuivre ses efforts.'],
  second: [REWARDING_EFFORT, 'Nous le félicitons pour ses progrès et l’encourageons à continuer sur cette voie.'],
  third: [
    'En reconnaissance de ses efforts, de son sérieux et de son engagement dans son travail scolaire.',
    'Nous le félicitons pour ses progrès et l’encourageons à persévérer.',
  ],
} satisfies Record<CertificatePlace, readonly string[]>;

export function buildRewardCertificateDocument(recipients: readonly RankedCertificate[], { school, academicYear, assetOrigin }: CertificateOptions) {
  const e = escapePrintHtml;
  const logo = safePrintImageUrl(school.logo, assetOrigin);
  const ministryLogo = safePrintImageUrl('/images/massar/ministry.png', assetOrigin);
  const titleRibbon = safePrintImageUrl('/images/behavior-rewards/certificate-title-ribbon.png', assetOrigin);
  const congratulationsRibbon = safePrintImageUrl('/images/behavior-rewards/certificate-congratulations-ribbon.png', assetOrigin);
  const schoolNameAr = school.nameAr?.trim();
  const arabic = (value: string) => `<bdi lang="ar" dir="rtl">${e(value)}</bdi>`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>شهادة تقديرية · Certificat d’appréciation</title><style>
    @font-face{font-family:Naskh;src:url(${JSON.stringify(`${assetOrigin}/fonts/insurance/NotoNaskhArabic-400.woff2`)}) format('woff2');font-weight:400}
    @font-face{font-family:Naskh;src:url(${JSON.stringify(`${assetOrigin}/fonts/insurance/NotoNaskhArabic-700.woff2`)}) format('woff2');font-weight:700}
    @page{size:A4 landscape;margin:6mm}
    *{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    html{color-scheme:light}body{margin:0;color:#16243d;font:13pt/1.25 Georgia,"Times New Roman",serif}
    p,h1,h2{margin:0}bdi{overflow-wrap:anywhere}[lang="ar"]{font-family:Naskh,Tahoma,serif;line-height:1.25}
    .certificate{--edge:#bf860d;position:relative;width:100%;height:197mm;break-inside:avoid;break-after:page}
    .certificate:last-child{break-after:auto}
    .second{--edge:#70899e}
    .third{--edge:#aa5e25}
    .artwork{position:absolute;inset:0;width:100%;height:100%}
    .content{position:absolute;inset:8mm 73mm 11mm;display:grid;grid-template-rows:37mm minmax(41mm,auto) 42mm 20mm 1fr;align-items:center;text-align:center}
    .school,.recipient,.message{display:grid;justify-items:center;gap:1mm;min-width:0}
    .school{position:absolute;top:10mm;left:13mm;width:51mm;gap:.6mm;font-size:11pt;font-weight:700;text-align:center}
    .school img{width:33mm;height:24mm;object-fit:contain}
    .school bdi{max-width:100%}
    .ministry{position:absolute;top:10mm;right:13mm;width:51mm;height:30mm;object-fit:contain}
    .heading{align-self:stretch;min-width:0}
    .heading img{display:block;width:100%;height:auto}
    .recipient>p{font-size:15pt;font-style:italic}
    .recipient h2{width:100%;font-size:26pt;line-height:1.08;overflow-wrap:anywhere}
    .recipient h2 bdi{display:block}
    .recipient h2 bdi[lang="ar"]{font-size:27pt}
    .message{gap:2mm;font-size:14pt;font-style:italic}
    .congratulations{position:relative;width:125mm;max-width:100%;height:20mm;justify-self:center;overflow:hidden}
    .congratulations img{position:absolute;left:0;top:50%;width:100%;height:auto;transform:translateY(-50%)}
    footer{display:flex;justify-content:space-between;align-items:end;gap:6mm;align-self:end;font-size:11pt;font-weight:700;font-style:italic;text-align:start}
    .signature{max-width:56%;min-width:49mm;text-align:center}
    .signature bdi{display:block;margin-top:.8mm;padding-bottom:.8mm;border-bottom:.35mm dotted var(--edge)}
  </style></head><body>
  ${recipients.map(({ name, arabicName, place, teacherName }) => `<article class="certificate ${place}">
    <img class="artwork" src="${e(safePrintImageUrl(`/images/behavior-rewards/certificate-${place}.png`, assetOrigin))}" alt="">
    <header class="school">${logo ? `<img src="${e(logo)}" alt="">` : ''}
      ${schoolNameAr && schoolNameAr !== school.name ? arabic(schoolNameAr) : ''}<bdi>${e(school.name)}</bdi>
    </header>
    <img class="ministry" src="${e(ministryLogo)}" alt="Logo du ministère">
    <div class="content">
      <h1 class="heading"><img src="${e(titleRibbon)}" alt="شهادة تقديرية · Certificat d’appréciation"></h1>
      <div class="recipient">
        <p>Décerné à l’élève :</p>
        <h2>${arabicName ? arabic(arabicName) : ''}${name && name !== arabicName ? `<bdi>${e(name)}</bdi>` : ''}</h2>
      </div>
      <div class="message">${CERTIFICATE_MESSAGES[place].map(line => `<p>${line}</p>`).join('')}</div>
      <p class="congratulations"><img src="${e(congratulationsRibbon)}" alt="Bravo et félicitations !"></p>
      <footer>
        <p>Année scolaire&nbsp;: <bdi dir="ltr">${e(academicYear)}</bdi></p>
        <p class="signature">Signature de l’enseignant(e)&nbsp;:<bdi>${e(teacherName)}</bdi></p>
      </footer>
    </div>
  </article>`).join('')}
  </body></html>`;
}
