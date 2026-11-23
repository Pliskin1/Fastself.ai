# Islamic calendar 1448–1449, Crna Gora (Diyanet-based)

- Sources, fetched 2026-11-23:
  - https://prayer-times.e-corlu.com/?a=montenegro&id=249&p=20&l=9 ("Islamski praznici - Crna Gora"). No source is
    named on this page itself.
  - https://ramadan.e-corlu.com/?a=montenegro&id=249&l=9 ("Ramazanska vaktija 2027 Crna Gora"). It says Ramadan 1448
    "traje ukupno 29 dana".
  - The Podgorica page of the same site names Diyanet as its source.
- Only Hijri 1448 and early 1449 are published (Dec 2026 – Dec 2027). There are no dates for 2028 or later.
- IZ CG publishes no takvim online (monteislam.com, checked 2026-11-23).

| Holiday (as printed) | Gregorian | Hijri (as printed) |
|---|---|---|
| Početak blagoslovljenih mjeseci, Noć želja (Regaib) | 2026-12-10 Thu | (1 Redžeb 1448) |
| Noć Mi'radža | 2027-01-04 Mon | 26 Redžeb 1448 |
| Noć Berata | 2027-01-27 Wed | 19 Ša'ban 1448 |
| Prva teravija | 2027-02-07 Sun | 30 Ša'ban 1448 |
| Početak Ramazana, prvi iftar | 2027-02-08 Mon | 1 Ramazan 1448 |
| Noć Kadra | 2027-03-05 Fri | 26 Ramazan 1448 |
| Dan Arefe | 2027-03-08 Mon | 29 Ramazan 1448 |
| Ramazanski bajram, days 1–3 | 2027-03-09 – 03-11 | 1–3 Ševval 1448 |
| Kurban bajram, days 1–4 | 2027-05-16 – 05-19 | 10–13 Zu-l-hidždže 1448 |
| Islamska nova godina | 2027-06-06 Sun | 1 Muharrem 1449 |
| Dan Ašure | 2027-06-15 Tue | 10 Muharrem 1449 |
| Mevlud | 2027-08-13 Fri | 11 Rebiu-l-evvel 1449 |
| Početak blagoslovljenih mjeseci | 2027-11-29 Mon | none printed |
| Noć želja (Regaib) | 2027-12-02 Thu | none printed |
| Noć Mi'radža | 2027-12-24 Fri | none printed |

Checks against core (2026-11-23):
- `tabularHijri` matches 5 of the 11 Hijri-dated rows with shift 0, 5 with shift −1 and 0 with shift +1. No single
  shift fits, because month lengths differ.
- At shift 0:
  - 1 Ramazan (8 Feb), Ašura and the Hijri new year match.
  - Tabular Ramadan has 30 days, so Ramazanski bajram falls on 10 Mar instead of 9 Mar.
  - Kurban-bajram falls on 17 May instead of 16 May.
- On 2026-11-23, IZ CG shows 13 džumade-l-uhra, Diyanet 14, and core 12. So IZ CG does not follow Diyanet
  exactly for this month.
- Page quirk: "Noć Berata" is printed on 19 Ša'ban. Berat is normally the night before 15 Ša'ban.
