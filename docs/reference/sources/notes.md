# Source checks: who checked what, when, and the differences found

| Date | Who | Source | Checked against | Result |
|---|---|---|---|---|
| 2026-11-23 | A + Claude | svetosavlje.org "Pravilo posta za celu godinu" | `orthodox.v0.1.json` | The rule pack was written from this page. Gaps (one-day fasts, fast boundaries) were filled from DOMAIN §2. Church-calendar photos are still to be checked. |
| 2026-11-23 | A + Claude | `monteislam-vaktija-podgorica-2026-11-23.md` | `izcg` method | Uses the stated angles 19.5°/17.5° plus offsets +1/−8/+1/+1/+8/+2. All 30 days are within ±1 min. Recheck in December. |
| 2026-11-23 | A + Claude | `diyanet-ramazan-podgorica-2026-11-23.md` | `turkey` method | All 29 days × 6 times are within ±1 min. |
| 2026-11-23 | A + Claude | `diyanet-islamski-praznici-crna-gora-2026-11-23.md` | `tabularHijri` | No single shift matches. Tabular Ramadan 1448 has 30 days (source: 29), and Kurban-bajram is +1 day. **Decided (A):** the app follows this calendar through `rule-packs/islamic.v0.1.json`, with 10 month starts from 1448-06 to 1449-07. **Open:** data for 2028+ (extend the JSON yearly), and IZ CG's own takvim (on 2026-11-23 it showed 13 džumade-l-uhra, Diyanet 14). |
