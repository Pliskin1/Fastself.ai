# START OVDJE: kako da napravite, testirate i objavite fastself.ai

Ovo je jedini fajl koji čitaš ti (i Andrej). Sve ostalo u paketu je za Claude Code. Čitaj redom.

**D** = Danilo (ekrani, navigacija, animacije). **A** = Andrej (core logika, Supabase, pravni dio, App Store Connect).

---

## 1. Šta je u paketu
| Fajl / folder | Čemu služi | Ko čita |
|---|---|---|
| `START-OVDJE.md` | ovaj vodič | vi |
| `CLAUDE.md` | pravila projekta, učitava se u svaku Claude sesiju | Claude |
| `docs/PLAN.md` | 27 zadataka (T1–T27) po danima, sa gotovim promptovima | vi + Claude |
| `docs/PROGRESS.md` | stanje projekta, ažurira se poslije svakog zadatka | vi + Claude |
| `docs/DOMAIN.md` | sva pravila posta, datumi, vaktija, kombinacije | Claude |
| `docs/SCREENS.md`, `COPY.md`, `DESIGN-SYSTEM.md` | svaki ekran, svaki tekst, boje, fontovi, animacije | Claude |
| `docs/DATABASE.md`, `API.md` | baza, RLS, sinhronizacija, edge funkcije, AI | Claude |
| `docs/TESTING.md` | testovi na svim nivoima + tačni podaci za provjeru | vi + Claude |
| `docs/APPSTORE.md`, `docs/store/metadata.md` | sve za Apple review, tekstovi za store | vi |
| `docs/team/DANILO.md`, `docs/team/ANDREJ.md` | ko šta radi po satima, folderi, gotovi promptovi | vi + Claude |
| `docs/PLATFORMS.md` | gdje se posao razlikuje iOS/Android, kako se pokreće na svakoj, buildovi | vi + Claude |
| `docs/DECISIONS.md` | zašto je nešto urađeno tako; otvorene odluke | vi |
| `docs/QA-LOG.md` | prijave bugova i matrica testiranja na telefonima | vi |
| `docs/legal/` | politika privatnosti, uslovi, podrška (za GitHub Pages) | vi |
| `docs/reference/engine.js` | provjerena logika iz prototipa | Claude |
| `docs/reference/prototype/Main.dc.html` | prototip (vizuelna istina) | Claude |
| `.claude/agents/` | 5 pomoćnika: rules-engine, ui-builder, supabase-backend, test-runner, appstore-auditor | Claude |
| `.claude/skills/` | /verify, /new-screen, /supabase-change, /release-ios, fastself-domain | Claude |
| `.claude/hooks/` | auto-formatiranje, skraćeni izlaz testova, blokada tajni i produkcije | automatski |
| `.github/workflows/` | CI na svaki PR + ping da prod baza ne zaspi | GitHub |
| `e2e/maestro/` | E2E testovi na Simulatoru (2 gotova, ostali u T21) | Claude |

## 2. Odluke DANAS (ponedjeljak ujutro, prije bilo kakvog koda)
Upišite odgovor u `docs/DECISIONS.md` (status u **fixed**).
1. **Apple nalog (D-25).** Čiji Apple Developer nalog ($99/godišnje)? Coinis organizacija ili jedan od vas lično.
   **Ako nalog još nije aktivan, ovo je kritično: aktivacija može da traje do 48 h.** Organizaciji treba D-U-N-S broj
   (traje danima), pa ako Coinis nema aktivan nalog, uzmite lični.
2. **Bundle ID (D-28):** `ai.fastself.app`. Poslije prvog uploada ne može da se mijenja.
3. **AI provajder (D-07):** Anthropic (`claude-haiku-5-5`). Napravite ključ u Anthropic Console sa limitom $10.
4. **Email za kodove (D-29):** Resend (treba domen koji kontrolišete) ili Brevo (dovoljna verifikovana email adresa).
   Bez ovoga Apple recenzent neće dobiti kod za prijavu.
5. **Pravno lice i email podrške** za politiku privatnosti (može ime i prezime + Gmail adresa za podršku).
6. **Jezik u storeu (D-24):** engleski primarno + hrvatska lokalizacija (crnogorske/srpske nema u ponudi; provjerite).

## 3. Nalozi koje pravite (A i D zajedno, ~1 h)
- [ ] Apple Developer Program + App Store Connect: dodajte drugog člana (App Manager).
  - Certificates, IDs & Profiles → Identifiers → **App ID** `ai.fastself.app`, uključite **Sign in with Apple**.
  - Keys → novi ključ sa **Sign in with Apple** (primary App ID `ai.fastself.app`). Skinite `.p8` (samo jednom se
    skida!). Zapišite Key ID i Team ID. `.p8` čuvajte van repoa, nikad u git.
  - App Store Connect → My Apps → **+ New App**: iOS, ime `fastself.ai`, jezik English (U.S.), bundle id, SKU
    `fastself-ios-1`.
- [ ] **GitHub**: privatni repo `fastself` (Andrej kao collaborator) + **javni** repo `fastself-site` za pravne stranice.
- [ ] **Expo** nalog (expo.dev), besplatan plan. Oba člana u istoj organizaciji.
- [ ] **Supabase**: dva projekta, `fastself-dev` i `fastself-prod`, region **Frankfurt (eu-central-1)**. Lozinke baze
  u password manager. Prod ref (slova iz URL-a) upišite u `.claude/prod-project-ref.txt`: tako Claude nikad ne može da
  dira produkciju.
- [ ] **Anthropic Console**: API ključ, mjesečni limit $10.
- [ ] **Resend ili Brevo**: SMTP podaci (ulaze u Supabase prod → Authentication → Emails → SMTP).

## 4. Instalacija (jednom, ~1 h, uglavnom čekanje)

### 4a. Danilo, Mac + iPhone (sve što je iOS: Xcode, Simulator, Maestro, iPhone, TestFlight)
```bash
# 1. Xcode 26 iz App Store-a (veliki download). Zatim:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
# Otvori Xcode → Settings → Components → instaliraj iOS 26 Simulator.
# Xcode → Settings → Accounts → dodaj svoj Apple ID (za potpisivanje na telefonu).

# 2. Homebrew (ako ga nemaš): https://brew.sh
brew install node@22 watchman cocoapods deno openjdk@17 jq
brew link --overwrite node@22
corepack enable && corepack prepare pnpm@latest --activate     # pnpm
npm i -g eas-cli

# 3. Docker Desktop (za lokalni Supabase): https://www.docker.com/products/docker-desktop  (ili OrbStack)
brew install supabase/tap/supabase

# 4. Maestro (E2E testovi)
curl -fsSL "https://get.maestro.mobile.dev" | bash

# 5. Claude Code
curl -fsSL https://claude.ai/install.sh | bash
claude            # prvi put: prijava sa claude.ai nalogom
claude plugin install expo@claude-plugins-official

# 6. Provjera
node -v && pnpm -v && deno --version && supabase --version && eas --version && maestro --version && claude --version
```
Na iPhoneu (za dev build preko kabla): Settings → Privacy & Security → **Developer Mode** → uključi, restart.

### 4b. Andrej, Windows + Android (core, Supabase, funkcije, pravni dio, App Store Connect, Android verzija)
Sve njegove zadatke ide bez Xcode-a. U PowerShellu:
```powershell
winget install Git.Git OpenJS.NodeJS.LTS Microsoft.VisualStudioCode Docker.DockerDesktop DenoLand.Deno
# restartuj terminal, pa:
corepack enable; corepack prepare pnpm@latest --activate
npm i -g eas-cli
irm get.scoop.sh | iex                                  # Scoop, za Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
winget install Google.AndroidStudio
irm https://claude.ai/install.ps1 | iex      # Claude Code (koristi Git Bash za komande)
claude
claude plugin install expo@claude-plugins-official
```
Docker Desktop: uključi WSL 2 backend (pita pri instalaciji) i pokreni ga prije `supabase start`.
Andrej **ne može**: iOS Simulator, `pnpm ios`, iPhone, TestFlight, Maestro. **Može**: sve testove osim Maestra,
lokalni Supabase, Android verziju aplikacije na svom telefonu, `eas build` u cloudu, `eas submit`, App Store Connect.

Andrej aplikaciju vidi na **svom Android telefonu**. Isti kod, ista aplikacija (Expo pravi i iOS i Android verziju).
1. Otvori **Android Studio** (instaliran gore). U prvom pokretanju pusti da instalira Android SDK.
   More Actions → Virtual Device Manager → napravi emulator (Pixel, Android 15+), ako hoćeš i bez telefona.
2. Postavi varijable (PowerShell, pa restartuj terminal):
   ```powershell
   setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
   setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
   ```
   I dodaj `%LOCALAPPDATA%\Android\Sdk\platform-tools` u PATH (zbog `adb`).
3. Na telefonu: Settings → About phone → 7× tapni "Build number" (otključa Developer options) → Developer options →
   **USB debugging** uključi. Priključi telefon kablom, prihvati "Allow USB debugging". `adb devices` ga mora pokazati.
4. U folderu projekta: `pnpm android`. Prvi build traje 5–15 min, poslije su izmjene odmah vidljive na telefonu.

## 5. Gdje radiš projekat
- **Folder:** `~/dev/fastself` na tvom Macu, `C:\fastself` kod Andreja (on klonira repo, ne raspakuje zip).
- **Repo:**
  ```bash
  mkdir -p ~/dev && cd ~/dev && unzip ~/Downloads/fastself-kit.zip && cd fastself
  git init -b main && git add . && git commit -m "Add project kit"
  git remote add origin git@github.com:<org>/fastself.git && git push -u origin main
  ```
  Na GitHubu: Settings → Branches → zaštiti `main` (obavezan PR + zelen CI).
- **Editor: VS Code** (oba). Otvori folder projekta u VS Code-u (File → Open Folder). Kod ne kucate vi: piše ga
  Claude Code. Vi zadajete zadatak, čitate šta je promijenio i provjeravate da radi.
  - Claude Code pokreni u **VS Code terminalu** (Terminal → New Terminal → `claude`), ili instaliraj ekstenziju
    "Claude Code" iz Extensions pa ga otvori iz bočnog panela. Isto je; ekstenzija lijepo prikazuje izmjene (diff).
  - Lijevo: fajlovi i izmjene (Source Control tab pokazuje svaki promijenjen red). Dolje: terminal sa Claude-om.
  - Pored: **Simulator** (otvara ga `pnpm ios`), a kasnije tvoj iPhone.
- Ti ručno mijenjaš kod samo za sitnice (tekst, broj, boja). Sve ostalo kroz Claude, da testovi i docs ostanu u skladu.
- **Kako radite zajedno:** jedan GitHub repo. Svako radi na svom računaru, na svojoj grani (`t/T7-danas`), u svojoj
  Claude sesiji. Kad je zadatak gotov: push → Pull Request → drugi pogleda → merge u `main`. Svako jutro `git pull`.
  Andrej: `git clone git@github.com:<org>/fastself.git C:\fastself`, pa `pnpm install`.
- Nikad ne šaljete kod preko Vibera ili zip-a. Samo GitHub.

## 6. Prvi start Claude Code-a (oba, u VS Code-u)
1. VS Code → File → Open Folder → `~/dev/fastself` (Andrej: `C:\fastself`).
2. Terminal → New Terminal → `claude`.
3. Kad pita "trust this folder" → **Yes** (inače hookovi i dozvole iz `.claude/settings.json` ne rade).
4. `/status` → mora pisati da su učitani "Project settings" i model **Sonnet**. `/agents` → vidiš 5 agenata.
5. D počinje T1:
   > Read CLAUDE.md. Do task T1 from docs/PLAN.md. Use the Expo plugin.
6. A čeka da T1 bude spojen u `main` (~1 h), pa `git pull` i T2. Dok čeka: nalozi, `.p8` ključ, Android Studio,
   slike zvanične vaktije i crkvenog kalendara u `docs/reference/sources/`.

## 7. Dnevni ritam
Za **svaki zadatak**:
```bash
git switch main && git pull
git switch -c t/T7-danas
claude
```
1. U `docs/PLAN.md` → tabela "Task matrix" pogledaj: koji agent, koji model, plan mode da ili ne.
2. Nalijepi prompt zadatka. Ako zadatak nema svoj prompt: `Task T7 from docs/PLAN.md. Use the ui-builder subagent.`
3. Ako u tabeli piše plan mode: **Shift+Tab** dok ne piše "plan mode", pošalji prompt, pročitaj plan, ispravi, odobri.
4. Kad Claude kaže da je gotov: `/verify` (testovi samo za dirane fajlove, vraća samo greške).
5. Aplikaciju pokrećeš **ti, u drugom terminal tabu**, ne Claude: `pnpm ios` (D) ili `pnpm android` (A). Ako pukne,
   Claude-u nalijepi samo poruku greške.
6. Claude napravi commit i ažurira `docs/PROGRESS.md`. Ti: `git push -u origin t/T7-danas && gh pr create --fill`.
7. CI zelen → drugi pregleda → merge → `/clear` → sljedeći zadatak.

## 7b. Štednja kredita (obavezno)
Kit je već podešen da štedi: Sonnet je podrazumijevani model, testovi idu kroz Haiku agenta, hookovi skraćuju izlaz
testova na greške, `CLAUDE.md` je kratak i ostali docs se čitaju samo po potrebi. Ostatak zavisi od vas:
1. **Jedan zadatak = jedna sesija.** Poslije merge-a uvijek `/clear`. Duga sesija plaća cijelu istoriju u svakoj poruci.
2. **Opus samo 3 puta u sedmici:** plan za T2, plan za T18, audit u T24 (najviše 2 puta). `/model opus` → plan →
   odobri → `/model sonnet` → izrada. Nikad Opus za ekrane, bugove ili sitnice.
3. **Subagent iz tabele, ne više.** Glavna sesija samo zadaje posao agentu, pregleda i commituje, pa ostaje mala.
   Za izmjenu u jednom fajlu ne treba agent: reci direktno šta i gdje.
4. **Budi precizan.** "U `src/features/danas/Plate.tsx` riba se prikazuje kao dozvoljena 2.12.2026, treba ulje"
   košta 10× manje od "Danas ne radi kako treba".
5. **Ne lijepi duge logove ni cijele fajlove.** Samo poruku greške i 5 redova oko nje. Screenshot samo kad je problem
   vizuelni, jedan, isječen.
6. **Ne traži "pregledaj sve" ili "pročitaj sve docs".** To je najskuplja rečenica.
7. **Kad Claude luta** (isti pokušaj 2 puta): Esc, pa tačan fajl, funkcija i očekivani rezultat. Ili `/clear` i novi start.
8. **`/compact`** kad sesija postane duga: `/compact keep the task, changed files and the failing test`.
9. **`/usage`** pogledaj ujutro i poslije ručka. Ako ste blizu limita: samo Sonnet, manji zadaci, bez agenata osim
   test-runnera.
10. **Svako svoj Claude nalog.** Ako dijelite jedan, limit je zajednički: Opus koristi samo jedan od vas.

## 7c. Kako se uključuju subagenti
- U promptu napiši: `Use the <ime> subagent ...` (imena: rules-engine, ui-builder, supabase-backend, test-runner,
  appstore-auditor). Claude ga pokreće, agent radi u svom kontekstu i vrati kratak izvještaj (do 8 redova).
- `/verify` sam pokreće test-runner (Haiku). Ne moraš ga zvati.
- `/agents` pokazuje listu. Najviše 2 agenta istovremeno.
- Ko koristi koje agente:
  | Ti (D) | Andrej (A) |
  |---|---|
  | ui-builder (svi ekrani), test-runner | rules-engine (core), supabase-backend (baza, funkcije, API), test-runner, appstore-auditor |

## 8. Podjela posla (da se ne sudarate)
Svako ima svoj fajl sa rasporedom po satima, tačnim folderima, šta daje drugom i gotovim promptovima:
**`docs/team/DANILO.md`** i **`docs/team/ANDREJ.md`**. Posao je ~33 h svakome, sa petkom. Ukratko:
| Dan | D (Mac + iPhone: ekrani) | A (Windows + Android: logika, server, Plan) |
|---|---|---|
| Pon 23.11. | T1 scaffold, T3 dizajn sistem + ikonice | instalacija, nalozi, T2 core |
| Uto 24.11. | T5 navigacija, T6 onboarding, T7 Danas | T4 baza + hookovi, T9 šema + RLS, T10 funkcije + prijava greške |
| Sri 25.11. | T8 Kalendar, T13 Profil, T12 Tajmer | T15 notifikacije, T14 api, T11 Plan, T16 spec, pravne stranice |
| Čet 26.11. | T14 UI, T17 auth UI, T20 animacije, T21 E2E, T22 TestFlight | T17 auth backend, T18 sync, T19 brisanje + izvoz, prod backend |
| Pet 27.11. | T25 screenshotovi, iOS bugovi, T27 submit | T24 audit, Android/backend bugovi, T26 metapodaci, T27 submit |
**Spec dokument za mentore je u četvrtak 26.11.** (T16, A, gotov u srijedu).

Folderi (isti fajl nikad ne diraju dvojica u isto vrijeme; tačna lista je u team fajlovima):
- D: `src/app` (osim Plan i 3 sheeta), `src/components`, `src/theme`, `src/features` (osim plan, report, brisanje), app config, E2E.
- A: `packages/core`, `supabase`, `src/lib`, `src/db`, `src/store`, `src/hooks`, `src/sync`, `src/notifications`,
  Plan tab, sheetovi prijava-greske, brisanje, kupovina.

Gdje se posao razlikuje po platformi (Apple prijava, ikonice, staklo, notifikacije na Androidu, povezivanje na lokalni
Supabase, buildovi): `docs/PLATFORMS.md`. D provjerava iOS dio, A Android dio, svaki dan.

## 9. Gdje testiraš šta (sve, baš sve)
| Šta | Gdje | Komanda / kako | Kad |
|---|---|---|---|
| Pravila posta, datumi, Uskrs, Hidžra, vaktija, validacija recepata | terminal | `pnpm test:core` | svaki commit (CI isto) |
| Ekrani i ponašanje (bez telefona) | terminal | `pnpm test:app` | svaki commit |
| Tipovi i stil | terminal | `pnpm typecheck && pnpm lint` | svaki commit (`/verify`) |
| Baza i RLS (ko šta smije da vidi) | lokalni Supabase u Dockeru | `supabase start`, `supabase db reset`, `supabase test db` | svaka promjena baze |
| Tabele i podaci uživo | Supabase Studio lokalno | http://127.0.0.1:54323 | po potrebi |
| Edge funkcije (AI, brisanje) | lokalno | `supabase functions serve --env-file supabase/.env.local` + curl, `deno test ...` | svaka promjena funkcije |
| Email kod za prijavu (lokalno) | Mailpit | http://127.0.0.1:54324 | T17 |
| Izgled i animacije | iOS Simulator (iPhone 17) | `pnpm ios`; u aplikaciji `/dev` ekran za demo datum i sat | stalno dok praviš |
| Klikanje cijelih tokova automatski | Simulator + Maestro | `maestro test e2e/maestro` | svaki dan uveče + prije builda |
| Pravi telefon (Apple prijava, notifikacije, haptika, brzina) | tvoj iPhone preko kabla | `pnpm ios:device` | od srijede |
| Android verzija (isti kod) | Andrejev Android telefon ili emulator | `pnpm android` | od utorka, svaki dan |
| Sinhronizacija između 2 telefona, AI uživo | dev Supabase u cloudu | isti nalog na tvom iPhoneu i Andrejevom Androidu | četvrtak |
| Prava verzija kao iz App Store-a | TestFlight na tvom iPhoneu (+ mentori sa iPhoneom) | `/release-ios testflight` | četvrtak veče, petak |
| Tačnost pravila i vaktije | papir/slike vs aplikacija | `docs/TESTING.md` §9, `docs/reference/sources/` | jednom prije slanja |
| Spremnost za Apple | Claude auditor | "Use the appstore-auditor subagent" | petak prije finalnog builda |
| Ručna matrica (VoiceOver, veliki font, avion mod, brisanje naloga) | tvoj iPhone + Simulator; Android kratka provjera | `docs/QA-LOG.md` tabela | petak |

iOS (Simulator, iPhone, Maestro, TestFlight): Danilo. Android telefon: Andrej. Terminal testovi, lokalni Supabase,
Mailpit i dev cloud: oba.

Telefon i lokalni Supabase: `127.0.0.1` sa pravog telefona je sam telefon. Android: `adb reverse tcp:54321 tcp:54321`.
iPhone: u `.env.local` stavi IP Maca (`ipconfig getifaddr en0`). Najlakše: koristite dev cloud projekat (PLATFORMS.md §3).

Pravilo: ništa ne ide u TestFlight dok `docs/TESTING.md` §10 (8 kapija) nije zeleno.

## 10. Objava, korak po korak
**Četvrtak (A), produkcija:**
1. Supabase prod: Authentication → Providers → Apple uključi, Client IDs = `ai.fastself.app`. Emails → custom SMTP.
   OTP dužina 6, trajanje 600 s.
2. U terminalu (ti, ne Claude) pokreni komande iz `/release-ios` §2: `db push`, deploy funkcija, `secrets set`.
3. `curl https://<prod-ref>.supabase.co/functions/v1/health` → `{"ok":true,...}`.
4. GitHub repo `fastself` → Settings → Secrets → `PROD_HEALTH_URL` (keepalive ping).
5. Repo `fastself-site`: kopiraj `docs/legal/` (popuni sve `[POPUNI ...]`), Settings → Pages → branch `main`, `/root`.
   Provjeri da `/privacy`, `/terms`, `/support` rade. URL-ove upiši u `apps/mobile/src/config.ts`.

**Četvrtak veče, TestFlight:**
6. U Claude-u: `/release-ios testflight` (provjere, bump build broja).
7. U terminalu (može i Andrej sa Windowsa, build ide u Expo cloud): `cd apps/mobile && eas build -p ios --profile production`
   pa `eas submit -p ios --latest`.
   Prvi put EAS pita za Apple prijavu i sam pravi sertifikate: odgovori Yes.
8. Za 10–30 min build je u App Store Connect → TestFlight. Internal testers (vas dvojica) instaliraju odmah preko
   TestFlight aplikacije. Za mentore: External group "Mentori" → Beta App Review (obično do 24–48 h).

**Petak, App Store:**
9. QA matrica na tvom iPhoneu i Simulatoru (Andrej prolazi isto na Androidu, kratko). Bugovi: jedan bug po sesiji, pa `/clear`.
10. `Use the appstore-auditor subagent` → 0 blockera.
11. Screenshotovi: `maestro test e2e/maestro/screenshots.yaml` na iPhone 17 Pro Max Simulatoru (6.9").
12. App Store Connect: tekstovi iz `docs/store/metadata.md`, App Privacy po `APPSTORE.md` §5, age rating, review
    notes iz §7, screenshotovi, izaberi build.
13. Finalni build (novi build broj) → submit → **Add for Review → Submit**. Release: "Manually release".
14. Subota/nedjelja: provjeravaj email i App Store Connect. Odgovor na odbijanje isti dan.

## 11. Ako Apple odbije
Ne paniči, to je normalno za prvu aplikaciju. Otvori poruku u Resolution Center, pa:
1. Kopiraj tekst odbijanja u novu Claude sesiju: "App Review rejected us with: <tekst>. Read docs/APPSTORE.md §9 and
   tell me the minimal fix." 
2. Popravi, novi build broj, novi build, odgovori u Resolution Center kratko: šta je promijenjeno i kako da provjere.
Najčešće: brisanje naloga teško naći, AI pristanak nejasan, crash na nekom uređaju, screenshot ne odgovara aplikaciji.

## 12. Zamke koje vas mogu koštati dan
- Apple Developer nalog nije aktivan → sve stoji. Riješi prvo.
- `.p8` ključ se skida samo jednom. Sačuvaj ga odmah.
- Supabase ugrađeni mailer ne šalje vanjskim adresama → recenzent ne može da se prijavi emailom. Custom SMTP obavezno.
- EAS besplatno: 15 iOS buildova mjesečno i spori red. Ne pravi build za svaku sitnicu; za razvoj `pnpm ios`.
  Ako je red spor u petak: `eas build --local` (gradi na tvom Macu; samo Danilo).
- Ne commituj `apps/mobile/ios/` i `.env.local` (već u `.gitignore`).
- Uploadi traže Xcode 26 (EAS ga koristi sam; za `--local` treba na tvom Macu).
- Free Supabase projekat zaspi poslije 7 dana bez aktivnosti → keepalive workflow to rješava, samo dodaj secret.
- Ne mijenjaj dizajn tokene i scope sam od sebe u petak. Cut pravilo je u PLAN.md: prvo se reže P1, nikad P0.

## 13. Kako da pričaš sa Claude-om (šablon)
```
Task T<broj> from docs/PLAN.md.
Context: <šta je već urađeno ili šta ne radi>.
Files: <tačni fajlovi ako znaš>.
Done when: <šta tačno treba da vidiš ili koji test da prođe>.
Do not: <šta ne smije da dira>.
```
Za bug: "On iPhone 15, iOS 26.1, Danas on 2.12.2026 shows 'Riba dozvoljena' but should show 'Post na ulju'.
Find the cause in packages/core, add a failing test first, then fix."
