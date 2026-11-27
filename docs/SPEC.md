# fastself.ai: specifikacija projekta

Verzija 1.0, 25. novembar 2026. Tim: Danilo i Andrej. Stanje koda: glavna grana na dan 25.11.2026.

## 1. Uvod

**Svrha dokumenta.** Opisuje šta fastself.ai radi, kako je građen, kako se provjerava i šta je ostalo do predaje. To je sažetak interne dokumentacije iz repozitorijuma.

**Proizvod.** fastself.ai je pratilac posta za Crnu Goru. Pokriva pravoslavni post (po julijanskom kalendaru), Ramazan i dobrovoljne islamske postove, i povremeni post (intermittent fasting, IF), kao i svaku njihovu kombinaciju. Za svaki dan odgovara na dva pitanja: šta danas smijem da jedem i kada. Vjersko pravilo određuje šta se jede, a vremenski prozor određuje kada. Kad važi više pravila, prozori se sijeku, a za hranu važi najstrože pravilo. Korisnik dobija brojčanik dana sa odbrojavanjem, kalendar, plan za 7 ili 30 dana, IF tajmer, podsjetnike i prijedloge jela koji se uvijek provjeravaju prema pravilu dana i njegovim alergijama.

**Obim verzije 1.0.** Jedan kod (Expo) radi na iOS-u i Androidu. Ove sedmice izlazi samo iOS verzija za iPhone: TestFlight grupa za mentore u četvrtak 26.11, predaja na App Store pregled u petak 27.11.2026. Android se iz istog koda svakodnevno koristi u razvoju, a u Google Play ide sa verzijom 1.1.

**Načela.**

- Podaci su prvo na telefonu. Nalog je opcion i aplikacija je u cjelini upotrebljiva bez njega.
- Pravila posta su podaci sa brojem verzije (paket pravila v0.1, JSON sa izvorima), a ne kod.
- AI se koristi samo uz pristanak i ne dobija lične podatke, a svaki recept se provjerava dva puta.
- Aplikacija nije medicinska i to jasno kaže.

**Pojmovi.**

- **Nivo posta:** koliko je dan strog: voda (najstrože), ulje, riba, bez mesa, mrsno (bez ograničenja).
- **Mjera posta:** najstroži nivo koji korisnik drži; aplikacija mu nikad ne prikazuje stroži.
- **Vaktija:** dnevna vremena namaza. Za post su bitni zora (početak) i akšam (kraj).
- **Nafila:** dobrovoljni islamski post; aplikacija ga samo predlaže.

## 2. Zainteresovane strane

- **Korisnici:** ljudi u Crnoj Gori koji drže pravoslavne postove, poste Ramazan ili dobrovoljne islamske postove, drže IF, ili to kombinuju. Mlađi od 18 godina mogu da prate vjerski kalendar, ali ne i IF.
- **Tim:** Danilo (Mac, iPhone) radi dizajn sistem, navigaciju, ekrane, iOS provjere, E2E testove i TestFlight. Andrej (Windows, Android) radi jezgro pravila, lokalnu bazu, Supabase, AI, obavještenja, sinhronizaciju, ekran Plan, pravne stranice i App Store Connect.
- **Mentori:** prate projekat, traže naloge i bazu podataka, dobijaju ovaj dokument i verziju preko TestFlighta.
- **Apple App Review:** odobrava objavu. Traži brisanje naloga u aplikaciji, Sign in with Apple, tačne oznake privatnosti i dovršene tekstove.
- **Spoljni servisi:** Supabase (baza, prijava, funkcije; EU, Frankfurt), Cloudflare Workers AI (AI model; prima samo anonimni upit), Expo EAS (izrada verzija), servis za slanje email kodova.
- **Izvori pravila:** svetosavlje.org i crkveni kalendar, vaktija Islamske zajednice u Crnoj Gori (IZ CG), kalendar Diyaneta za hidžretske mjesece. Prema njima se radi ljudska provjera tačnosti.

## 3. Funkcionalni zahtjevi

Prioriteti: **P0** mora biti u verziji za pregled. **P1** ulazi ako je ispravno do četvrtka u 18:00, inače se sakriva iza prekidača. **P2** je za verziju 1.1.

| ID | Zahtjev | Pr. |
|---|--------------------------|---|
| F-01 | Uvodni tok: dobrodošlica i pet koraka (prakse, alergije i ishrana, sigurnosna pitanja, dozvole, nalog). Završava se i bez naloga i bez dozvola. | P0 |
| F-02 | Prakse: pravoslavni post, Ramazan, dobrovoljni islamski post, IF; bar jedna. Uz pravoslavni post biraju se mjera posta i krsna slava. | P0 |
| F-03 | Alergije i ishrana: 14 alergena sa EU liste, sopstvene riječi, vegetarijanska, veganska ili halal ishrana. | P0 |
| F-04 | Sigurnosna pitanja (trudnoća ili dojenje, dijabetes, poremećaj ishrane, mlađi od 18). Odgovori ostaju samo na telefonu. Mlađima od 18 IF je isključen. | P0 |
| F-05 | Pravilo dana: nivo posta iz perioda posta, dana u sedmici i praznika. Najstrože pravilo pobjeđuje, zatim praznična olakšica, pa mjera posta. | P0 |
| F-06 | Vremenski prozor: u Ramazanu i na izabrani dobrovoljni dan post je od zore do akšama; IF prozor za jelo završava se u 20:00. U kombinaciji se prozori sijeku. | P0 |
| F-07 | Danas: brojčanik od 24 sata sa odbrojavanjem, „Danas na tanjiru” (šta može i šta ne može) i „Zašto” (razlozi i verzija paketa pravila). Kartice za vaktiju, dobrovoljni post, slavu i sedmicu. | P0 |
| F-08 | Izuzetak „Danas ne mogu da postim”, dani za naknadu, praćenje dana Ramazana, mjesečeva mijena i datum po starom kalendaru. | P1 |
| F-09 | Kalendar: mjesec sa bojom nivoa po danu. Izabrani dan pokazuje datum po starom kalendaru, hidžretski datum, nivo i razloge. | P0 |
| F-10 | Plan: narednih 7 ili 30 dana, statistika po nivoima i vremenska linija po danima. | P0 |
| F-11 | AI jelovnik za 7 dana i spisak za kupovinu. | P1 |
| F-12 | Tajmer: početak i kraj IF posta, napredak, obavještenje na kraju, zadnjih 7 dana. | P0 |
| F-13 | Šta da jedem, naši recepti: od 18 ugrađenih prikazuju se samo oni koji prolaze provjeru za taj dan i tu listu alergija. Rade bez interneta. | P0 |
| F-14 | Šta da jedem, AI prijedlog: tri jela od izabranih namirnica, tek poslije pristanka. Svaki recept se provjerava na serveru i ponovo na uređaju; odbijeni se prikazuju sa razlogom. | P0 |
| F-15 | Vaktija: grad (lokacija jednom ili ručni izbor, 11 gradova), metod obračuna, korekcija zore i akšama, pomak hidžretskog kalendara za ±1 dan. | P0 |
| F-16 | Lokalni podsjetnici: veče prije posnog dana, sehur i iftar, IF prozor, kraj IF posta. | P0 |
| F-17 | Opcioni nalog: Sign in with Apple (samo iOS) ili email kod. Sinhronizacija uz poseban pristanak za prakse, alergije i istoriju. | P0 |
| F-18 | Izvoz podataka u JSON. Brisanje naloga u aplikaciji briše podatke na serveru i opoziva Apple token. | P0 |
| F-19 | Prijava greške (pravilo, vrijeme, recept, drugo), i bez naloga. Ekran Privatnost objašnjava šta ostaje na telefonu, šta ide na server i šta vidi AI. | P0 |

**P2, nije u verziji 1.0:** Live Activity i vidžeti, engleski interfejs, iPad, objava u Google Play, udaljeno ažuriranje paketa pravila.

### Pravila domena, ukratko

**Pravoslavni post.** Vaskrs se računa julijanskim obračunom, pa se dodaje 13 dana. Periodi posta:

| Period | Datumi | Pon, sri, pet | Uto, čet | Sub, ned |
|-----|-------|----|---|------|
| Božićni post | 28.11. do 6.1. | voda | ulje | riba do 30.12, zatim ulje |
| Veliki post | Čisti ponedjeljak do Velike subote | voda | voda | ulje |
| Petrovski post | od 57. dana poslije Vaskrsa do 11.7. | voda | ulje | riba |
| Gospojinski post | 14.8. do 27.8. | voda | voda | ulje |

Van ovih perioda poste se srijeda i petak. Jednodnevni postovi (Badnji dan, Krstovdan, Usekovanje) su na vodi. Sedmice bez posta (Svjatki, Svijetla, Trojičina, sedmica Mitara i fariseja) su mrsne. Na veće praznike u postu (npr. Vavedenje, Sveti Nikola, Blagovijesti, Cvijeti) dozvoljena je riba.

**Islamski post.** Hidžretski datumi dolaze iz poznatih početaka mjeseci (kalendar Diyaneta za Crnu Goru), uz korisnikov pomak od ±1 dan. Vremena namaza računaju se na telefonu; podrazumijevani metod koristi uglove koje navodi IZ CG i kalibrisane pomake. Dobrovoljni post se samo predlaže (ponedjeljak i četvrtak, bijeli dani, šest dana ševvala, Dan Arefata, Ašura), i nikad na zabranjene dane.

**IF.** Planovi su 12:12, 14:10 i 16:8. U verziji 1.0 prozor za jelo uvijek se završava u 20:00.

**Hrana.** Nivo posta zabranjuje kategorije namirnica. Na to se dodaju ishrana i alergije. Provjera gleda kategorije recepta i ključne riječi u sastojcima i koracima pripreme.

| Nivo | Zabranjeno |
|---|---------------|
| voda | meso, mliječno, jaja, riba, ulje, vino, rakovi, mekušci |
| ulje | meso, mliječno, jaja, riba |
| riba | meso, mliječno, jaja |
| bez mesa | meso |
| mrsno | ništa |

## 4. Nefunkcionalni zahtjevi

- **Privatnost:** na server ide samo ono za šta je dat pristanak, i samo uz nalog. Sigurnosni odgovori i razlozi izuzetaka ne idu na server. Koordinate lokacije se ne čuvaju. Podaci su u EU (Frankfurt).
- **AI i lični podaci:** AI dobija samo zabranjene kategorije hrane, riječi koje se izbjegavaju, obrok, izabrane namirnice i jezik. Nikad ne dobija ime, email, identifikator korisnika, prakse, vjeru ni lokaciju.
- **Bezbjednost:** svaki korisnik vidi samo svoje redove (RLS na svim tabelama). Servisni ključ postoji samo u edge funkcijama. AI je ograničen na 20 poziva dnevno po instalaciji i 60 po IP adresi.
- **Tačnost:** pravoslavna pravila i Vaskrs za 2026. i 2027. poklapaju se sa zvaničnim kalendarom. Vremena za Podgoricu su unutar ±2 minuta od vaktije IZ CG.
- **Rad bez mreže:** sve osim AI, sinhronizacije i prijave radi bez interneta.
- **Performanse:** hladan start do ekrana Danas ispod 2 s na iPhoneu 12 ili novijem. AI poziv ima rok od 12 s.
- **Pristupačnost:** dodirne mete najmanje 44 pt, opis za svako dugme sa ikonom, VoiceOver i TalkBack, Dynamic Type, Reduce Motion.
- **Jezik:** crnogorski, ijekavica, latinica. Datumi su kalendarski datumi u zoni Europe/Podgorica.
- **App Store:** brisanje naloga u aplikaciji, AI provajder imenovan u pristanku, bez nedovršenih tekstova, napomena da aplikacija nije medicinska.

## 5. Arhitektura

```
Telefon (iOS ili Android; Expo, React Native)
  |- Ekrani i navigacija (Expo Router)
  |- Jezgro, packages/core: pravila, kalendari, vaktija, plan dana,
  |    provjera recepata, plan podsjetnika
  |- SQLite: izvor istine i red za slanje (outbox)
  |- Lokalna obavještenja
  |
  |  HTTPS, samo kroz lib/api.ts i lib/supabase.ts
  v
Supabase (EU, Frankfurt)
  |- Auth: Apple, email kod
  |- Postgres sa RLS
  |- Edge funkcije (Deno) --> AI provajder (Cloudflare Workers AI)
                          --> Apple (izdavanje i opoziv tokena)
```

- **Monorepo (pnpm):** `apps/mobile` je aplikacija, `packages/core` je čist TypeScript, `supabase/` drži šemu, RLS i funkcije.
- **Jezgro je jedini izvor istine** za pravila, datume, vremena namaza i provjeru recepata. Dio jezgra se pakuje u edge funkcije, pa server i uređaj koriste isti kod provjere.
- **Telefon je izvor istine za podatke.** Upis ulazi u red za slanje samo ako je korisnik prijavljen i dao pristanak za tu grupu podataka.
- **AI** se zove samo preko edge funkcija i tek poslije pristanka. Provajder je iza jednog interfejsa.
- **Obavještenja** su samo lokalna. Nema push servera.

**Tok AI prijedloga.**

1. Aplikacija izračuna zabranjene kategorije i šalje ih funkciji `meal-suggest` sa obrokom, namirnicama i slučajnim identifikatorom instalacije.
2. Funkcija validira ulaz, provjeri dnevno ograničenje i od modela traži tri recepta.
3. Svaki recept prolazi provjeru; odbijeni se vraćaju sa razlogom. Ako nijedan ne prođe ni u drugom pokušaju, vraćaju se ugrađeni recepti.
4. Aplikacija ponovo provjerava svaki recept prije prikaza.

## 6. Model podataka

| Podatak | Telefon (SQLite) | Server (Postgres) | Ide na server |
|-------|------|------|-----|
| Grad, metod vaktije, korekcije | `kv` | `profiles` | uz pristanak |
| Prakse, mjera posta, slava, IF plan | `practices` | `user_practices` | uz pristanak |
| Alergije, sopstvene riječi, ishrana | `allergies` | `user_allergies` | uz pristanak |
| IF postovi | `fasting_sessions` | `fasting_sessions` | uz pristanak |
| Oznake dana (izuzetak, nafila) | `day_marks` | `day_marks` | uz pristanak, bez razloga |
| Jelovnici | `meal_plans` | `meal_plans` | uz pristanak |
| Sigurnosni odgovori | `safety` | nema | nikad |
| Pristanci | `kv` | `consents` | samo dodavanje |
| Prijave grešaka | nema | `reports` | upis, bez čitanja |
| Apple tokeni, brojač AI poziva | nema | privatna šema | nedostupno aplikaciji |

- **RLS:** korisnik čita i mijenja samo svoje redove. Prijavu greške može poslati svako, a preko API-ja ih niko ne čita.
- **Brisanje naloga** kaskadno briše sve redove korisnika.
- **Sinhronizacija:** pri prijavi, pri povratku u aplikaciju i 5 s poslije lokalne izmjene. U sukobu pobjeđuje posljednji upis.

## 7. API

| Tačka | Ko zove | Šta radi | Stanje |
|-----|-----|---------|---|
| `POST meal-suggest` | gost ili korisnik, poslije AI pristanka | Tri AI recepta, provjerena na serveru | urađeno |
| `POST meal-plan` | isto | Jelovnik za 7 dana | P1, predstoji |
| `POST apple-token` | prijavljen korisnik | Čuva Apple token u privatnoj šemi | predstoji |
| `POST delete-account` | prijavljen korisnik | Opoziva Apple token i briše korisnika | predstoji |
| `GET health` | javno | Provjera dostupnosti | urađeno |
| `reports` (upis u tabelu) | gost ili korisnik | Prijava greške | urađeno |
| Supabase Auth | aplikacija | Apple prijava; email kod od 6 cifara | predstoji |

**Zahtjev za `meal-suggest`:** `{ forbidden, avoid, meal, ingredients, locale, device, rulePackVersion }`. Nepoznata polja se odbijaju. **Odgovor:** `{ recipes, rejected, fallback, provider }`. **Greške:** 400 `invalid_input`, 429 `rate_limited`.

**Klijent.** Funkcije klijenta vraćaju tipizovan rezultat: uspjeh ili jednu od grešaka `offline`, `rate_limited`, `server`, `invalid`. Nikad ne bacaju izuzetak prema ekranu. U razvoju postoji lažni server (mock).

**AI provajder.** Cloudflare Workers AI, model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` u JSON režimu, pa je izlaz strukturisan po šemi recepta. Promjena provajdera traži novu verziju aplikacije, jer tekst pristanka imenuje provajdera.

## 8. Korisnički interfejs

**Vizuelni jezik „Nebeski sat”.** Pozadina je nebo koje prati stvarno doba dana, a sadržaj je na staklenim karticama. Naslovi i brojevi su u fontu Bodoni Moda, tekst u fontu Hanken Grotesk.

- **Uvodni tok:** dobrodošlica i pet koraka.
- **Pet tabova:** Danas (brojčanik, tanjir, razlozi, kartice), Kalendar (mjesec i kartica dana), Plan (7 ili 30 dana), Tajmer (IF prsten i zadnjih 7 dana), Profil (nalog, podešavanja, podsjetnici, privatnost i podaci).
- **Ekrani preko tabova:** Prakse, Alergije, Vaktija, Privatnost, Šta da jedem, Nalog.
- **Donji listovi:** prijava greške, AI pristanak, brisanje, izuzetak, kupovina.

**Stanja.** Lokalni podaci se prikazuju bez čekanja. Greške mreže postoje samo kod AI, sinhronizacije i prijave, uvijek sa ponovnim pokušajem.

**Razlike po platformi.** iOS ima nativne tabove sa Liquid Glass izgledom, Android Material tabove. Staklo je na Androidu poluprovidna puna boja. Sign in with Apple postoji samo na iOS-u.

## 9. Tehnologije

| Sloj | Tehnologija |
|----|---------------|
| Aplikacija | Expo SDK 58 (New Architecture), React Native, TypeScript strict, Expo Router |
| Prikaz i pokret | Reanimated 4, react-native-svg, expo-glass-effect, expo-linear-gradient |
| Uređaj | expo-sqlite, expo-notifications, expo-location, expo-apple-authentication |
| Stanje i validacija | zustand, zod |
| Jezgro | Čist TypeScript; jedine zavisnosti su adhan (vremena namaza) i zod |
| Pozadina | Supabase: Postgres, RLS, Auth, Edge funkcije (Deno), region eu-central-1 |
| AI | Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) iza zajedničkog interfejsa |
| Testovi | Vitest, Jest i React Native Testing Library, pgTAP, deno test, Maestro |
| Izrada i isporuka | pnpm workspaces, Node 22+, GitHub Actions, EAS Build, TestFlight |

## 10. Testiranje

| Sloj | Alat | Šta pokriva | Stanje 25.11. |
|---|---|--------|-----|
| Jezgro | Vitest | Pravila, Vaskrs, hidžretski datumi, vaktija, plan dana, provjera recepata | 473 testa prolaze |
| Aplikacija | Jest, RNTL | Ponašanje ekrana, lokalna baza, obavještenja, klijent API-ja | 392 testa prolaze |
| Baza i RLS | pgTAP | Šema, RLS, pristanci, prijave, kaskadno brisanje | 184 testa prolaze |
| Edge funkcije | deno test | Validacija ulaza, ograničenje poziva, odbijanje loših recepata | 31 test prolazi |
| E2E | Maestro | 8 tokova na iOS Simulatoru | 2 toka napisana; ostali u četvrtak |
| Uređaji | ručna lista | iPhone i kraća lista na Android telefonu | uz TestFlight verziju |
| Tačnost | ljudi | Kalendar i vaktija naspram izvora | vaktija 23.11; kalendar prije predaje |

- **Referentni podaci u testovima jezgra:** Vaskrs od 2020. do 2040, pravila po danima, vremena namaza za Podgoricu, hidžretski datumi, kombinacije praksi.
- **Greška S1 blokira izdavanje:** pad aplikacije, gubitak podataka, pogrešno vjersko pravilo ili vrijeme, alergen prikazan kao dozvoljen.

## 11. Plan projekta

Pet radnih dana, dvoje ljudi paralelno na različitim dijelovima koda. Svaka cjelina ulazi u glavnu granu kroz zahtjev za spajanje, uz automatske provjere i odobrenje jednog člana tima.

| Dan | Plan | Stanje 25.11. |
|---|--------------|-----|
| Pon 23.11. | Skelet projekta, prenos jezgra pravila iz prototipa, dizajn sistem | završeno |
| Uto 24.11. | Lokalna baza, navigacija, uvodni tok, Danas, šema i RLS, edge funkcije | završeno |
| Sri 25.11. | Kalendar, Plan i kupovina, Tajmer, Profil, klijent API-ja, obavještenja, ovaj dokument, pravne stranice | završeno, osim pravnih stranica |
| Čet 26.11. | Prijava, sinhronizacija, brisanje naloga i izvoz, ekran „Šta da jedem” sa AI pristankom, E2E, produkciona pozadina, prva TestFlight verzija | predstoji |
| Pet 27.11. | Ispravke grešaka, revizija za App Store, snimci ekrana, podaci u App Store Connect, predaja na pregled | predstoji |

**Kriterijumi prihvatanja iz zadatka.**

| Kriterijum | Stanje 25.11. |
|---------|---------|
| Aplikacija radi na pravom telefonu | Razvojna verzija se provjerava na Android telefonu; TestFlight u četvrtak |
| Pravoslavna pravila i Vaskrs za 2026. i 2027. odgovaraju zvaničnom kalendaru | Testovi prolaze; ljudsko poređenje sa crkvenim kalendarom prije predaje |
| Ramazanska vremena za Podgoricu su unutar ±2 min od vaktije IZ CG | Novembar 2026: svih 30 dana unutar ±1 min |
| IF tajmer obavještava | Test zakazivanja prolazi; provjera na uređaju uz TestFlight verziju |
| AI vraća jelo u skladu sa pravilom | Funkcija je urađena i testirana; ekran u četvrtak |

**Otvorene odluke.** Formalna potvrda AI provajdera (izabran je Cloudflare Workers AI; u kodu je još Anthropic), jezik u prodavnici, Apple razvojni nalog (organizacija ili lični nalog), servis za slanje email kodova u produkciji.

**Rizici.**

- Pregled za spoljnu TestFlight grupu obično traje 24 do 48 sati, pa mentori sa iPhoneom verziju mogu dobiti tek poslije toga. Na zahtjev se šalje Android APK.
- Ako je neka P0 stavka neispravna u četvrtak uveče, prvo se izbacuje P1. Brisanje naloga, pristanak i politika privatnosti ne izbacuju se nikad.

## 12. Istorija izmjena

| Verzija | Datum | Autor | Opis |
|--|---|--|---------|
| 1.0 | 25.11.2026. | Andrej | Prva verzija: sažetak interne dokumentacije i stanje projekta trećeg dana |
