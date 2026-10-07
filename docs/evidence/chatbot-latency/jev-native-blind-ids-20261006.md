# Blind-review metadata repair

The previous worksheet omitted label columns and model scores, but exposed IDs
such as `mda26-student_count-01-fr` and families containing intent names. These
metadata hints undermine independent blind labels. Original ordering also grouped
the assistant draft by intended label. No human review had been supplied, so no
review or native acceptance result is invalidated or manufactured by this fix.

Worksheet v3 now exports only opaque question/family identifiers, the original
question text, declared language, bound question hash and empty review fields.
Original IDs, author IDs and dev/test split stay with the collection operator.
Question IDs are ordered by their opaque hashes, removing label-group ordering.
All nine intent choices remain available to every reviewer; the actual question
text is preserved, including literal intent words if they are part of that text.

Opaque identifiers are deterministically derived from the collection/question
bindings. The importer checks those bindings, rebuilds the mapping from the
original intake, and writes completed reviews under the original case/family IDs.
Rows can be reordered without changing the import. Tampered questions, IDs,
family mappings, extra metadata, stale context, duplicate/missing rows and
conflicting completed reviews retain their checks. The original independent
reviewer and real-time declarations remain mandatory for agreed held-out review.
Legacy v1/v2 worksheets are refused for import and must be re-exported to a new
v3 path for actual independent review. Earlier worksheet files remain intact.

A new [960-question v3 worksheet](../../../datasets/chatbot-latency/jev-moroccan-review-worksheet-v3.json)
is prepared for the assistant development draft. The
[legacy worksheet](../../../datasets/chatbot-latency/jev-moroccan-review-worksheet.json)
and [source intake](../../../datasets/chatbot-latency/jev-native-collection.json)
are preserved. Creating this packet does not make the draft human-authored or
record any human review. Native-authored/reviewed cases remain zero; native
export remains blocked and Jev stays off. No paid or School calls were made.

For actual native collection, share only the v3 review packet and category
definitions with an independent reviewer. Keep intake/provenance and all prior
labels/predictions outside that packet. Original text can itself reveal intent;
opaque metadata removes avoidable hints but does not prove true blinding,
authenticate identities or establish label truth.
The [reviewer guide](../../tests/jev-native-reviewer-guide.md) provides category
definitions and review fields without exposing any case's initial label or score.

Focused intake/draft checks pass 25 tests (883 assertions), including opaque
identifiers, hidden author/split fields, stable metadata after label changes,
shuffled-row import, original provenance preservation and legacy/tamper refusal.

[Final verification](jev-native-blind-ids-verification-20261006.json): 398 script
tests (2,595 assertions), workspace boundaries and lint pass. A full-packet test
imports all 960 pending v3 rows back to the exact original intake without creating
reviews. Original intake/legacy worksheet hashes, text/context hashes and linked
family counts are preserved. No production app code or live data changed.
