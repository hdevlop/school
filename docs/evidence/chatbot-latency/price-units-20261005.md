# Price units and the Oct 5 usage screenshot

The user supplied an Oct 5 OpenRouter view displaying **$0.06** and **66 provider
requests**, all GPT-OSS-120b. The display rounds spend; it does not give token
prices, per-generation attribution or an unrounded ledger total.

The earlier two Oct 5 experiments are consistent with that view:

| Earlier run | Completed chatbot replies | Recorded generation steps | Observed key increase |
|---|---:|---:|---:|
| Focused attendance check | 6 | 12 | $0.008235850 |
| Full post-fix repeat | 60 | 54 | $0.052126750 |
| Combined | 66 | 66 | **$0.060362600**, rounding to $0.06 |

Generation steps and provider HTTP requests are different instruments; the count
agreement is a consistency check, not proof of provider retries/host attribution.
The combined reply and generation-step counts happen to equal 66, but differ in
each constituent run. Templates make the relationship workload-dependent.

The previously stated **$0.869/1,000 accepted replies** was a normalized projection
from **$0.052126750 spent across 60 replies**. It was never a claim of $0.869
actually spent that day. The screenshot's rounded $0.06/66 similarly implies
about $0.909 per 1,000 *provider requests*, not a flat per-request API price.

The SDK estimate was genuinely too low: $0.006241680 versus the full run's
$0.052126750 observed increase. Declared-rate accounting estimated $0.052940950,
close to that observed window. The [accounting fix](cost-accounting-20261005.md)
preserves SDK metadata while using current declared rates for the stop.

The subsequent [guarded-list repeat](list60-results-20261005.md) is a **new** run:
60 completed replies, only 18 generation steps and a **$0.012718700** observed
increase. Its normalized workload figure is about $0.212/1,000 replies; estimated
cost from conservative declared rates is $0.216/1,000. Do not retroactively add
this run to the older screenshot or call normalized figures actual daily bills.

Reports now lead with actual run-window spend and explicitly label chatbot
replies, generation steps, SDK/declared estimates and per-1,000 projections.
Selected-key identity is verified for current runs; other account traffic and
per-generation host/invoice allocation remain unverified.
