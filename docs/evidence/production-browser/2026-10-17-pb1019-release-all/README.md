# PB1019 combined release

The owner authorized all remaining changes after validation. The Finance coder's
`65664e2` commit is retained; the schedule filter and Claude skill changes follow
on top. [Validation](validation.json) records 123 focused Finance tests, three
isolated PostgreSQL tests, two REST/MCP tests and a successful full root check.
Three later wire-transfer label corrections passed translation and Finance
checks again; exact-candidate CI verification follows publication.

The first local transport attempt failed because the isolated fixture lacked
the existing receipt-language column. Applying the existing additive migration
only on guarded loopback `school_history_test` resolved it; the rerun passed.

Deployment and browser retest evidence will be added after exact revision proof.
