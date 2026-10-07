import { detectMoroccanReplyLanguage, normalizeReplyText, type ReplyLanguage } from 'najm-chatbot';

// Clear French openings take precedence over foreign names, like the published
// profile's existing command prefixes. Shared words alone prove no language.
const frenchOpening = /^(?:tu\s+(?:peux|pourrais)|on\s+a\s+combien|il\s+y\s+a|(?:qui|quels?|quelles?)\s+(?:est|sont|a|ont|temps|manque)|c['’]est\s+(?:quand|quoi|combien|qui|ou|où)|qu['’]est[ -]ce|est[ -]ce\s+(?:que|qu['’](?:ils|elles|il|elle|on))|j['’]aimerais|ça\s+fait\s+combien|dis[ -]moi|l['’](?:école|ecole)\s+a\s+combien|effectif\s+des\s+(?:élèves|eleves|enseignants)|les\s+prochains?\s+(?:examens?|contrôles?)|et\s+les|au\s+revoir|merci|coucou|ajoute|supprime|modifie|enlève|enleve|inscris|efface|envoie|écris|ecris)(?!\p{L})/u;
// "Marque" is shared with Spanish; its French complement must disambiguate it.
const frenchMark = /^marque(?!\p{L}).*(?<!\p{L})(?:comme|élève|élèves)(?!\p{L})/u;
// Multi-word French constructions also recognize topic changes and qualifiers;
// selecting a language does not grant an intent or widen a read template.
const frenchPhrases = [
  /^(?:bonsoir|d['’]accord|j['’]ai\s+besoin|il\s+me\s+faut)(?!\p{L})/u,
  /^l['’](?:école|ecole|effectif|assiduité|assiduite|état|etat)(?!\p{L})/u,
  /^(?:le\s+(?:nombre|total)|les\s+classes|cette\s+année|cette\s+annee|aujourd['’]hui)(?!\p{L})/u,
  /^(?:quel\s+(?:chiffre|nombre|professeur|montant)|quelle\s+salle|sans\s+répartition)(?!\p{L})/u,
  /^pour\s+(?:cette|toute|la|l(?=['’]))(?!\p{L})/u,
  /^(?:réponds|reponds|afficher|présente|corrige|annule|rembourse|affecte|transfère|transfere|désactive|desactive|trouve|cherche)(?!\p{L})/u,
  /^(?:indique|calcule|ignore)\s+(?:le|les|uniquement|l(?=['’]))(?!\p{L})/u,
  /^(?:change\s+(?:le|la)|mets\s+(?:tous|à|a)|compare\s+le|quand|et\s+(?:pour|son)|où\s+puis|ou\s+puis|ne\s+change|fais\s+comme)(?!\p{L})/u,
  /^marque(?!\p{L}).*(?<!\p{L})(?:absente|présent|présente|aujourd['’]hui)(?!\p{L})/u,
];
const arabiziOpenings = ['chkoun', 'chkon', 'kifach', 'imta', 'zid', 'bdel', 'beddel', 'sjel', 'sjjl', 'sjjel',
  'kteb', 'chno', 'achno', 'chnou', 'fin', 't9der', 'kan9elleb', 'werrini', 'goul', 'fhad', 'flmdrasa',
  '7alat', 'lhad', 'fou9ach', '9eyyed', 'dir', 'lghi', 'sifet', 'mse7', 'rje3', '3eyyen', '7awwel',
  '7bes', '9elleb', 'chre7', 'tjahel', 'salam', 'sba7', 'chokran', 'safi', 'ana', 'msa', 'wakha',
  'kanchokrek', 'nharek', 'lli', 'lah', 'werini', '7iyed', 'sejjl', 'sejjel', 'bslama', 'mzyan', 'chmen'];
const arabiziSignals = [...arabiziOpenings, 'ghayb', 'ghaybin', 'ghayba', 'lyoum', 'lyom', 'llyoum', 'daba', 'wa7d',
  'tilmid', 'tlamid', 'jdid', 'jay', 'jayyin', 'dyal', 'dyalk', 'dyalhom', 'had', 'l3am', 'asatida', 'ostad',
  'lmdrasa', 'mjmo3', 'smiyat', 'a9sam', '7odour', 'imti7anat', 'ghadi', 'no9ta', '9ism', 'smit',
  'tarik', 'b7al', 'baghi', 'bikhir', 'labas', 'bzzaf', 'ntla9aw', 'nfe3ni', 'lmousa3id', 'kolchi', 'mabrouk',
  'l9a3a', 'lbare7', 'lghdda', 'l7issab', 'flous', 'aba2', 'i3lan', 'bnisba', 'jaya', 'nbeddel', 'nzid',
  'lkhir', 'atfal', 'nsjjel', 'jawb', 'yjazik', 'me7taj', 'ghayeb', 'ghedda', 'lmousa3ada', 'nnisba', 'lhadok', 'tilmida', '7adra'];
const arabiziOpening = new RegExp(`^(?:${arabiziOpenings.join('|')}|w\\s+b(?:nisba|\\s+nnisba))(?![\\p{L}\\p{N}])`, 'u');
const arabiziWords = new RegExp(`(?<![\\p{L}\\p{N}])(?:${arabiziSignals.join('|')})(?![\\p{L}\\p{N}])`, 'gu');

/** The single School profile used for reply selection and domain context hints. */
export function schoolReplyLanguage(userText: string): ReplyLanguage | null {
  const text = normalizeReplyText(userText);
  if (frenchOpening.test(text) || frenchMark.test(text) || frenchPhrases.some(pattern => pattern.test(text))) return 'fr';
  const language = detectMoroccanReplyLanguage(userText);
  if (language) return language;
  // A command/question opening plus another distinct Darija signal, rather than
  // one transliterated name or code, is needed to opt into Arabic-script Darija.
  return arabiziOpening.test(text) && new Set(text.match(arabiziWords) ?? []).size >= 2 ? 'ary' : null;
}
