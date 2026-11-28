# App Store Connect metadata (paste as is; limits checked)

Paste each field into App Store Connect (T26). The App Review contact and the demo password are typed there, not kept in git.

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

WHAT YOU CAN EAT TODAY
Every day lists what is allowed and what is not, by your fast and your own allergy list, with the reason.

PRIVATE BY DEFAULT
Works without an account. Your data stays on your phone. An optional account syncs between your devices, on servers
in the EU, and you can delete it in the app at any time.

fastself.ai is not a medical app. If you have a health condition, talk to your doctor before fasting.
```
- **What's New**: `First release.`
- **Support URL**: `https://pliskin1.github.io/fastself-site/support`
- **Privacy Policy URL**: `https://pliskin1.github.io/fastself-site/privacy`
- **Copyright**: `2026 fastself.ai`

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

ŠTA SE DANAS JEDE
Svaki dan pokazuje šta može, a šta ne, po tvom postu i tvojim alergijama, uz objašnjenje zašto.

PRIVATNOST
Radi bez naloga. Podaci ostaju na telefonu. Nalog je opcion, sinhronizuje uređaje preko servera u EU i brišeš ga u
aplikaciji kad hoćeš.

fastself.ai nije medicinska aplikacija. Ako imaš zdravstveno stanje, posavjetuj se sa ljekarom prije posta.
```

## App information
- Version: `1.0.0` (must match `version` in `apps/mobile/app.config.ts`; a new record defaults to `1.0`).
- Category: Lifestyle (primary), Health & Fitness (secondary).
- Age rating: answer the questionnaire honestly. Health or wellness topics: yes. Medical or treatment information: none.
  No violence, no user-generated content. Accept the rating that comes out.
- Content rights: no third-party content.
- App Review contact: D enters his own name, phone and email in App Store Connect (not kept in git).
- Sign-in required: yes. Username `review@fastself.ai`; A types the password into App Store Connect (it is not kept in
  git). The app also works as a guest, but sync and account deletion need the login.

## Review notes (paste into App Review Information → Notes)
```
fastself.ai shows daily fasting rules and times for Orthodox fasting, Ramadan and intermittent fasting.
"fastself.ai" is the brand and domain name. Version 1.0 has no AI features.

First launch: tap "Počni", pick any practice under "Šta pratiš?", then tap "Nastavi" on each step ("Razumijem,
nastavi" on the safety step). On the last step tap "Nastavi bez naloga" to use the app as a guest.
No login is required: all features work as a guest. An account (email + password) is optional and only syncs
practices, allergies and fasting history between devices.

Demo account: review@fastself.ai, password in the sign-in fields above.
Sign in: Profil → Prijavi se ili napravi nalog → Prijava.
To delete an account: Profil → Obriši nalog (on the account card and in the Privatnost group). This deletes the
account and all server data immediately. To test deletion, please create a new account (it takes a few seconds and
needs no email confirmation), so that the demo account stays available.
Terms of use: Profil → Uslovi korišćenja. Privacy policy: Profil → Politika privatnosti.
Rating: Profil → Ocijeni aplikaciju (anonymous feedback to the team, not an App Store rating).
Location is asked once, on a button tap, to pick the nearest city for prayer times. Coordinates are not stored or sent.
The app is not a medical app and contains no health claims. Interface language: Montenegrin.
```
These notes replace the text in APPSTORE.md §7: they add the first-launch steps and the note on the name.
