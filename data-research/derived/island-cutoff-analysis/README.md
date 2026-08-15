# Island cutoff analysis

The source contains **2,564 Freshwater Atlas island polygon features** with a
minimum recorded area of **1.0001567 ha**. It is not an inventory of the agreed
Vancouver Island tourism region. The fetch selected every FWA island polygon of
at least one hectare that **intersects** the rectangular WGS84 envelope
`[-129.15, 48.18, -122.88, 51.15]`; features were selected, not clipped. This
working extent therefore also contains inland lake islands and islands near the
adjacent mainland coast.

| Minimum area (ha) | Features retained |
| ---: | ---: |
| 0 | 2,564 |
| 0.1 | 2,564 |
| 0.5 | 2,564 |
| 1 | 2,564 |
| 2 | 1,692 |
| 5 | 969 |
| 10 | 630 |
| 25 | 355 |
| 50 | 229 |
| 100 | 158 |
| 500 | 80 |
| 1,000 | 55 |

Counts at 0–1 ha are identical because the source fetch already excluded
features smaller than one hectare. The full snapshot contains 1,824 `Marine`,
709 `Fresh`, and 31 `Marine/Fresh` features.

## Recommendation

Use **10 ha** as the default background-island cutoff, then explicitly retain
the agreed visitor islands and every island intersecting a retained park,
regardless of size. Exclude `Fresh` islands from the regional land mask unless
an inland island is intentionally needed.

An area cutoff is not a performance solution by itself: 10 ha retains only
24.57% of features but still retains 85.78% of the original coordinate
positions. Generate zoom-specific simplified geometry or vector tiles in
addition to filtering.
