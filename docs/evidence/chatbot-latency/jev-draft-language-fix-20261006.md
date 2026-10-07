# Draft language coverage and provisional-label correction

School's existing language profile now recognizes more French constructions and
Arabizi spellings. French selection uses anchored openings or grammatical phrases;
the added Arabizi fallback requires an anchored opening and at least two distinct
Darija signals. Repeated tokens, name-only text, quoted foreign-language examples,
English and Spanish near-matches have regression coverage. The published Najm
profile remains the fallback, and the same School function serves context hints
and template selection. Intent regexes and tool execution were not changed.

| Check on the 960-question draft | Before | After |
|---|---:|---:|
| Unknown language | 145 | 1 |
| Supported provisional labels skipped for language | 106 | 1 |
| French detected as French | 176 / 240 | 240 / 240 |
| Arabizi detected as Darija | 159 / 240 | 239 / 240 |
| Synchronous template matches | 22 | 23 |
| Template disagreement with provisional labels | 0 | 0 |

The additional match is the existing French attendance refusal for “Marque
ZzMeryem Exemple absente aujourd'hui.” No new read paraphrase receives a
deterministic template. “7awwel ZzEleveDemo mn ZzClasseA l ZzClasseB.” remains
unknown: it supplies only one recognized Darija signal besides invented names.
Preserve abstention rather than deriving a language from fixture identifiers.

The French case `mda26-student_and_teacher_count-12-fr` now has provisional intent
`needs_llm`: “Je cherche les deux totaux, sans les listes de noms.” omits which
totals. Its original wording, ID, family and author/review history are unchanged.
The generator applies the same explicit per-case correction. Its other three
variants name students and teachers and retain the combined-count label. Current
case counts are 99 combined-count and 201 `needs_llm`; all other labels keep their
original counts. This is an assistant correction, not an independent human review.

The blind worksheet is byte-for-byte unchanged: labels were never included in it,
and the question fingerprints bind text/context rather than initial labels. The
[correction record](jev-draft-label-correction-20261006.json) retains before hashes.
Original [coverage results](jev-draft-coverage-20261006.json) and earlier verification
hashes describe the earlier source/labels, and remain intact. An intermediate
[recheck](jev-draft-language-recheck-20261006.json) retains the five-miss stage;
the [final report](jev-draft-language-final-v2-20261006.json) records current sources.
The v2 report follows tighter English/Spanish command-word safeguards; the first
final snapshot is retained with its own earlier source hash.

Final assumed first-turn administrator eligibility is 936 misses: 695 have
supported provisional labels and 241 have unsupported/excluded labels. None is
a Jev acceptance. The prototype count veto still declines 13 supported count
labels that exclude names/lists; its former fourteenth case is now `needs_llm`.
The 47 Arabic-script Darija cases detected as `ar` remain for wording/register
review. Native authors/reviews remain zero and Jev stays off.

Final focused language/draft/audit/replay verification passes 135 tests (1,080 assertions).
These checks do not measure model decisions, rendered replies, latency, billing
or native fluency. No provider or School-tool calls were made.

The historical count-guard study still refuses source changes by default.
Its new explicit `--current-language-profile` option permits only the language
profile hash to differ; decision parsing, intent/request shape, tool templates,
corpus hashes and raw saved reports retain their checks. The resulting
[current-profile replay](jev-count-guard-current-language-v2-20261006.json) records
310 unchanged normalized decisions and marks original eligibility reproduction
false. With current language eligibility, accepted unique questions change from
52 before the prototype veto to 48 after it, with the same one prevented error
and three correct-question losses. The original measured 50-to-46 report remains
unchanged. Seven replay/guard tests pass (87 assertions), including frozen-source
refusal, fetch blocking and output preservation. This is development on spent
data, not fresh acceptance.

[Verification](jev-draft-language-fix-verification-20261006.json) records final
focused tests, lint and production build, plus the passing broader tests and
typecheck before the final regex-only safeguard refinement. It retains the
earlier source-hash rejection, mock timeout and unrelated dashboard type errors
alongside their later passing checks. No finance files were changed for this task.
