# App Store Connect metadata (paste as is; limits checked)

Fill `[POPUNI]` before pasting. A copies each field into App Store Connect on Fri (T26).

## English (U.S.), primary
- **Name** (30): `fastself.ai`
- **Subtitle** (30): `Orthodox, Ramadan & IF times` (28)
- **Promotional text** (170): `Orthodox fasting, Ramadan and intermittent fasting on one dial. What you can eat today, when the fast starts and ends. No account needed, no ads.`
- **Keywords** (100): `post,ramazan,ramadan,iftar,sehur,vaktija,pravoslavni,kalendar,isprekidani,fasting,prayer,slava,IF` (97)
- **Description** (4000):
```
fastself.ai shows the rules and times of your fast for every day, in Montenegrin.

ORTHODOX FASTING
Wednesdays, Fridays and the four great fasts by the Julian calendar. Every day shows its level (water, oil, fish,
no meat) and why. Set the strictest level you keep and your patron saint day (slava).

RAMADAN AND VOLUNTARY FASTS
Fajr and maghrib for your city in Montenegro, a sehur reminder and an iftar countdown. Voluntary fasts: Mondays and
Thursdays, the white days, Arafat, Ashura and six days of Shawwal. Adjust the method, minutes and the start of Ramadan.

INTERMITTENT FASTING
12:12, 14:10 or 16:8 with a timer that keeps running when the app is closed. It works together with a religious fast:
the fast decides what you eat, the window decides when.

WHAT TO EAT
Recipes that fit today's rule and your allergies. Optional AI suggestions, only with your consent; every recipe is
checked against the day's rule and your allergy list before you see it.

PRIVATE BY DEFAULT
Works without an account. Your data stays on your phone. An optional account syncs between your devices, on servers
in the EU, and you can delete it in the app at any time.

fastself.ai is not a medical app. If you have a health condition, talk to your doctor before fasting.
```
- **What's New**: `First release.`
- **Support URL**: `https://pliskin1.github.io/fastself-site/support`
- **Privacy Policy URL**: `https://pliskin1.github.io/fastself-site/privacy`
- **Copyright**: `2026 [POPUNI: legal entity]`

## Croatian localisation (closest to Montenegrin; D-24)
- **Subtitle**: `Pravila i vremena posta` (23)
- **Promotional text**: `Pravoslavni post, Ramazan i isprekidani post na jednom satu. Šta se danas jede, kad počinje i kad se završava post, bez naloga i bez reklama.` (141)
- **Keywords**: same as English.
- **Description**:
```
fastself.ai za svaki dan pokazuje pravila i vremena tvog posta.

PRAVOSLAVNI POST
Srijede, petci i četiri velika posta po julijanskom kalendaru. Svaki dan ima svoju mjeru (voda, ulje, riba, bez mesa)
i objašnjenje zašto. Izaberi najstrožu mjeru koju držiš i svoju krsnu slavu.

RAMAZAN I DOBROVOLJNI POSTOVI
Zora i akšam za tvoj grad, podsjetnik za sehur i odbrojavanje do iftara. Dobrovoljni postovi: ponedjeljak i četvrtak,
bijeli dani, Arefat, Ašura i šest dana ševvala. Podesi metodu, minute i početak Ramazana.

ISPREKIDANI POST
12:12, 14:10 ili 16:8, sa tajmerom koji radi i kad je aplikacija zatvorena. Ide uz vjerski post: post određuje šta
jedeš, prozor određuje kada.

ŠTA DA JEDEM
Recepti koji odgovaraju današnjem pravilu i tvojim alergijama. AI prijedlozi samo uz tvoj pristanak; svaki recept
prolazi provjeru prije nego što ga vidiš.

PRIVATNOST
Radi bez naloga. Podaci ostaju na telefonu. Nalog je opcion, sinhronizuje uređaje preko servera u EU i brišeš ga u
aplikaciji kad hoćeš.

fastself.ai nije medicinska aplikacija. Ako imaš zdravstveno stanje, posavjetuj se sa ljekarom prije posta.
```

## App information
- Category: Lifestyle (primary), Health & Fitness (secondary).
- Age rating: answer the questionnaire; expected 4+. Medical or treatment information: none.
- Content rights: no third-party content.
- App Review contact: [POPUNI: name, phone, email].
- Sign-in required: no (guest mode). Demo account: not needed.

## App Review notes (App Review Information → Notes)
Final text for 1.0; it replaces the APPSTORE.md §7 draft. Check before pasting that the build has Sign in with Apple,
email login, "Obriši nalog" in Profil and the AI consent sheet (audit T24 blockers 1 to 4).
```
fastself.ai shows daily fasting rules and times for Orthodox fasting, Ramadan and intermittent fasting.
No login is required: all features work as a guest. An account is optional and only syncs data between devices.
To test account features, use Sign in with Apple with any Apple ID, or email login (a 6-digit code is emailed).
To delete an account: Profil → Obriši nalog. This deletes all server data and revokes the Sign in with Apple token.
AI meal suggestions require explicit consent (Profil → AI prijedlozi jela). We send only a list of forbidden food
categories, the user's own avoid words, the meal type and chosen ingredients to Cloudflare Workers AI, through our
server. No name, email, account id, religion or location is sent. Every suggested recipe is validated on the device
and on the server against the day's rule and the user's allergies.
The app is not a medical app and contains no health claims. Interface language: Montenegrin.
```

## App Privacy answers (App Privacy → Data Types)
No tracking, no ATT prompt. Everything below is "App Functionality" only.
| Data type | Collected | Linked to user | Tracking | Why |
|---|---|---|---|---|
| Contact Info: Email Address | yes | yes | no | email login; Apple may relay |
| Identifiers: User ID | yes | yes | no | account |
| Identifiers: Device ID | yes | no | no | random install id, hashed, AI rate limit |
| Health & Fitness: Health | yes | yes | no | allergies, only with sync consent |
| Health & Fitness: Fitness | yes | yes | no | fasting history, only with sync consent |
| Sensitive Info | yes | yes | no | religious practices, only with sync consent |
| Location: Coarse Location | yes | yes | no | the chosen city syncs with practices consent (`profiles.city`); never coordinates |
| User Content: Other User Content | yes | no | no | error reports, not linked to the account |
| Diagnostics | no | | | no crash reporting in 1.0 |
