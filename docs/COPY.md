# Copy: every UI string

Source for `apps/mobile/src/copy/sr/*.ts`. The keys here are the keys in code. One file per area so the two developers
never edit the same file; `src/copy/sr/index.ts` merges them and exports `t()`.
| file | key prefixes | owner |
|---|---|---|
| `common.ts` | common.*, a11y.* | D |
| `onboarding.ts` | ob.*, prakse.*, alergije.*, sigurnost.*, dozvole.* | D |
| `nalog.ts` | nalog.* | D |
| `legal.ts` | uslovi.* | D |
| `ocjena.ts` | ocjena.*, feedback.* | D |
| `danas.ts` | day.*, dial.*, danas.*, prayer.*, exception.* | D |
| `kalendar.ts` | kal.* | D |
| `tajmer.ts` | tajmer.* | D |
| `profil.ts` | profil.*, vaktija.*, privatnost.* | D |
| `asistent.ts` | asistent.*, ai.consent.* | D |
| `plan.ts` | plan.* | A |
| `report.ts` | report.* | A |
| `brisanje.ts` | delete.* | A |
| `notif.ts` | notif.* | A |
`perm.location` lives in `app.config.ts` (D).
 Language: Montenegrin, **ijekavica**,
sentence case, second person singular ("ti"). The prototype (`docs/reference/prototype/Main.dc.html`) is the tone
reference; when this file and the prototype differ, this file wins.

## 0. Rules
- No ALL CAPS, no emoji, no "→", no exclamation marks except greetings. No "Molimo", no apologies in errors.
- Buttons name the action: "Pošalji kod", not "Dalje". The toast after an action uses the same verb: "Prijava je poslata."
- Gender: prefer neutral wording. Where it cannot be avoided use the masculine form, as the prototype does
  ("Dobro došao nazad", "izabrao"). Safety rows use the slash form ("imao/la", "Mlađi/a").
- Health: never promise results. Use "pravila", "vremena", "prozor za jelo"; never "detoks", "mršavljenje", "liječi".
- Times are 24 h `HH:MM`; dates are "2. decembar", long dates "Srijeda, 2. decembar". Months and weekdays are lower case
  inside sentences and capitalised only at the start of a line.
- Placeholders in code are `{name}`. `t('key', { n: 3 })`.
- Plurals use `pl(n, [one, few, many])` from core. Rule: one if n%10==1 and n%100!=11; few if n%10 in 2..4 and n%100
  not in 12..14; else many. Forms:
  | word | one | few | many |
  |---|---|---|---|
  | namirnica | namirnica | namirnice | namirnica |
  | dan | dan | dana | dana |
  | recept | recept | recepta | recepata |
  | obrok | obrok | obroka | obroka |
  | sat | sat | sata | sati |
  | minut | minut | minuta | minuta |
  | jelo | jelo | jela | jela |
  Tests: 1 namirnica, 3 namirnice, 5 namirnica, 11 namirnica, 21 namirnica, 23 namirnice, 112 namirnica.
- `[AI PROVAJDER]` and `[URL POLITIKE PRIVATNOSTI]` are filled from `src/config.ts`. The release check fails if
  a bracket placeholder reaches a production bundle (TESTING §9).

## 1. Common (`common.*`)
| key | text |
|---|---|
| common.next | Nastavi |
| common.save | Sačuvaj |
| common.cancel | Odustani |
| common.notNow | Ne sada |
| common.back | Nazad |
| common.close | Zatvori |
| common.retry | Pokušaj ponovo |
| common.today | Danas |
| common.disclaimer | fastself.ai nije medicinski savjet. Ako ti je loše, prekini post i javi se ljekaru. |
| common.offline | Nema interneta. Ovo radi i bez njega, osim prijave i sinhronizacije. |
| common.error.network | Veza nije uspjela. Provjeri internet i pokušaj ponovo. |
| common.saved | Sačuvano |

## 2. Onboarding
| key | text |
|---|---|
| ob.step | Korak {n} od 5 |
| ob.welcome.title | Svaki post ima svoje vrijeme. |
| ob.welcome.body | Pravoslavni post, Ramazan i isprekidani post na jednom satu. Znamo koji je dan, kad počinje i šta ide na tanjir. |
| ob.welcome.start | Počni |
| ob.welcome.haveAccount | Već imam nalog |
| ob.welcome.caption | Radi bez naloga. Podaci ostaju na telefonu. |
| prakse.title | Šta pratiš? |
| prakse.sub | Izaberi jedno ili više. Možeš promijeniti bilo kad. |
| prakse.group.orthodox | Pravoslavlje |
| prakse.group.islam | Islam |
| prakse.group.habit | Navika |
| prakse.orthodox.title | Pravoslavni post |
| prakse.orthodox.desc | Srijede, petci i četiri velika posta po julijanskom kalendaru. |
| prakse.ramadan.title | Ramazan |
| prakse.ramadan.desc | Post od zore do akšama, sa vaktijom za tvoj grad. |
| prakse.nafila.title | Dobrovoljni postovi |
| prakse.nafila.desc | Ponedjeljak i četvrtak, bijeli dani, Arefat, Ašura i šest dana ševvala. |
| prakse.if.title | Isprekidani post |
| prakse.if.desc | Prozor za jelo 12:12, 14:10 ili 16:8. Bez ekstremnih režima. |
| prakse.if.minor | Nije dostupno za mlađe od 18 godina. |
| prakse.strog.label | Najstrože što držiš |
| prakse.strog.voda | Voda |
| prakse.strog.ulje | Ulje |
| prakse.strog.riba | Riba |
| prakse.strog.note.voda | Pratimo tipik: srijede, petci i veliki postovi na vodi gdje je propisano. |
| prakse.strog.note.ulje | Dane na vodi prikazujemo kao dane na ulju. Ostala pravila ostaju. |
| prakse.strog.note.riba | Dane na vodi i ulju prikazujemo kao dane sa ribom. |
| prakse.slava.label | Krsna slava |
| prakse.slava.none | Bez slave |
| prakse.combo.orthodoxIf | Post određuje šta jedeš, IF određuje kada. Rade zajedno. |
| prakse.combo.ramadanIf | Tokom Ramazana IF prozor staje u noć, od iftara. |
| prakse.saved | Prakse su sačuvane |
| alergije.title | Alergije i ishrana |
| alergije.sub | Ove namirnice nikad ne predlažemo, bez obzira na post. Lista ostaje na telefonu. |
| alergije.mine | Tvoja lista |
| alergije.count | {n} {pl:namirnica} |
| alergije.empty | Još nema namirnica. |
| alergije.input.label | Dodaj svoju namirnicu |
| alergije.input.placeholder | npr. kivi |
| alergije.input.add | Dodaj |
| alergije.common | Česti alergeni sa EU liste |
| alergije.diet | Ishrana |
| alergije.diet.vegetarian | Vegetarijanska |
| alergije.diet.vegan | Veganska |
| alergije.diet.halal | Halal |
| alergije.disclaimer | Aplikacija provjerava svaki sastojak i korak prije prikaza. Kod alergija uvijek pročitaj deklaraciju. |
| alergije.saved | Alergije i ishrana su sačuvane |
| alergije.remove.a11y | Ukloni {name} |
| sigurnost.title | Prije nego što počneš |
| sigurnost.sub | Označi ono što važi za tebe. Odgovori ostaju samo na telefonu i nikad ne idu na server. |
| sigurnost.preg | Trudna sam ili dojim |
| sigurnost.diab | Imam dijabetes ili uzimam terapiju |
| sigurnost.ed | Imam ili sam imao/la poremećaj ishrane |
| sigurnost.minor | Mlađi/a sam od 18 godina |
| sigurnost.note.minor | Za mlađe od 18 godina IF je isključen. Kalendar vjerskog posta ostaje dostupan. |
| sigurnost.note.general | IF ti ne preporučujemo bez razgovora sa ljekarom. Vjerski post možeš pratiti, a obje tradicije poznaju izuzetke zbog zdravlja. |
| sigurnost.card.title | fastself.ai nije medicinska aplikacija |
| sigurnost.card.body | Pokazuje pravila posta i vremena. Ako imaš zdravstveno stanje ili uzimaš lijekove, posavjetuj se sa ljekarom prije posta. |
| sigurnost.cta | Razumijem, nastavi |
| dozvole.title | Grad i podsjetnici |
| dozvole.sub | Oba su opciona. Aplikacija radi i bez njih. |
| dozvole.city.body | Za zoru i akšam treba nam samo grad. Tačnu lokaciju ne čuvamo. |
| dozvole.city.useLocation | Koristi moju lokaciju |
| dozvole.city.manual | Izaberi grad ručno |
| dozvole.city.picked | Grad: {city} |
| dozvole.city.denied | Lokacija nije dozvoljena. Izaberi grad ručno. |
| dozvole.city.notNeeded | Za prakse koje si izabrao lokacija ne treba, pa je ne tražimo. |
| dozvole.notif.title | Podsjetnici |
| dozvole.notif.body | Veče prije posnog dana, kad se otvara prozor za jelo i pola sata prije zore tokom Ramazana. |
| dozvole.notif.allow | Dozvoli podsjetnike |
| dozvole.notif.on | Podsjetnici su uključeni |
| dozvole.notif.denied | Podsjetnici su isključeni u podešavanjima telefona. |

## 3. Account (`nalog.*`)
| key | text |
|---|---|
| nalog.title.new | Sačuvaj na svim uređajima |
| nalog.title.returning | Dobro došao nazad |
| nalog.sub.new | Nalog nije obavezan. Treba samo ako želiš iste podatke i na drugom telefonu. |
| nalog.sub.returning | Prijavi se i vratićemo tvoje prakse, alergije i istoriju na ovaj telefon. |
| nalog.bullet.1 | Prakse, alergije i istorija na svakom telefonu |
| nalog.bullet.2 | Serveri u EU, šifrovana veza |
| nalog.bullet.3 | Nalog brišeš jednim dugmetom |
| nalog.divider | ili emailom |
| nalog.email.label | Email |
| nalog.email.placeholder | ime@primjer.me |
| nalog.sendCode | Pošalji kod |
| nalog.skip | Nastavi bez naloga |
| nalog.legal | Nastavkom prihvataš uslove korišćenja i politiku privatnosti. |
| nalog.code.title | Unesi kod |
| nalog.code.sub | Poslali smo 6-cifreni kod na {email}. |
| nalog.code.a11y | Kod iz emaila |
| nalog.verify | Potvrdi |
| nalog.changeEmail | Promijeni email |
| nalog.resend | Pošalji ponovo |
| nalog.resendIn | Novi kod za {s} s |
| nalog.err.code | Kod nije tačan. Provjeri email i pokušaj ponovo. |
| nalog.err.expired | Kod je istekao. Pošalji novi. |
| nalog.err.email | Upiši ispravan email. |
| nalog.err.apple | Prijava uz Apple nije završena. Pokušaj ponovo ili koristi email. |
| nalog.consent.title | Šta da sinhronizujemo? |
| nalog.consent.practices | Prakse i podešavanja |
| nalog.consent.allergies | Alergije i ishrana |
| nalog.consent.history | Istorija posta i IF |
| nalog.consent.note | Sigurnosni odgovori i razlozi izuzetaka nikad ne idu na server. Ovo mijenjaš u Profilu. |
| nalog.consent.enable | Uključi sinhronizaciju |
| nalog.restored | Podaci su vraćeni na ovaj telefon |
| nalog.loggedOut | Odjavljen si. Podaci ostaju na telefonu. |

## 4. Danas (`danas.*`) and day logic (`day.*`)
| key | text |
|---|---|
| day.level.voda | Post na vodi |
| day.level.ulje | Post na ulju |
| day.level.riba | Riba dozvoljena |
| day.level.bezMesa | Bez mesa |
| day.level.mrsno | Mrsno |
| day.word.voda / ulje / riba / bezMesa / mrsno | voda / ulje / riba / bez mesa / mrsno |
| day.none | Danas nema posta |
| day.noneSub | Nijedno tvoje pravilo ne važi za ovaj dan |
| day.noPractices | Nijedna praksa |
| day.noPracticesLink | Izaberi šta pratiš |
| day.ramadan | Ramazan |
| day.nafila | Dobrovoljni post |
| day.nafilaToday | Danas postiš dobrovoljno |
| day.if | Isprekidani post {plan} |
| day.exception | Izuzetak: {reason} |
| dial.toIftar | Do iftara |
| dial.toFajr | Do zore |
| dial.toFastEnd | Do kraja posta |
| dial.windowLeft | Prozor za jelo još |
| dial.sub.iftar | iftar u {time} |
| dial.sub.fajr | zora u {time} |
| dial.sub.window | prozor od {from} do {to} |
| dial.a11y | {label} {h} {pl:sat} i {m} {pl:minut}. {sub}. |
| danas.legend.fast | post {from}–{to} |
| danas.legend.eat | jelo {from}–{to} |
| danas.comp.moon | Mjesec: {phase} |
| danas.comp.julian | Po julijanskom kalendaru {date} |
| danas.comp.hijri | Po Hidžri {date} |
| danas.comp.streak | {n} {pl:dan} IF zaredom |
| danas.exception.body | Danas ne postiš. Pravila i vremena i dalje vidiš u kalendaru. |
| danas.exception.undo | Ipak postim |
| danas.plate.title | Danas na tanjiru |
| danas.plate.yes | Može |
| danas.plate.no | Ne može |
| danas.plate.allergy | alergija |
| danas.plate.free | Danas nema ograničenja u hrani. |
| danas.whatToEat | Šta da jedem |
| danas.why | Zašto {word}? |
| danas.why.valid | Važi za danas |
| danas.why.caption | Strože pravilo uvijek pobjeđuje. Paket pravila {version}, julijanski kalendar. |
| danas.why.yourLevel | Tvoja mjera posta |
| danas.why.capped | Prikazano blaže zbog tvoje mjere posta |
| danas.report | Prijavi grešku |
| danas.cantFast | Danas ne mogu da postim |
| danas.ramadan.day | {n}. od 30 dana |
| danas.ramadan.kazaNone | Nema dana za naknadu |
| danas.ramadan.kaza | Dana za naknadu: {n} |
| danas.ramadan.qadr | Lejletul-kadr: {date} |
| danas.ramadan.bajram | Ramazanski bajram: {date} |
| danas.vaktija.title | Vaktija, {city} |
| danas.vaktija.adjust | Podesi |
| danas.vaktija.caption | Podsjetnik za sehur u {time} |
| danas.nafila.title | Dan za dobrovoljni post |
| danas.nafila.on | Postim danas |
| danas.nafila.off | Otkaži |
| danas.countdown.days | {pl:dan} do Ramazana |
| danas.countdown.note | Početak zavisi od viđenja mladog mjeseca, pa može biti dan ranije ili kasnije. |
| danas.slava.today | Danas je tvoja slava |
| danas.slava.tomorrow | Sutra je tvoja slava |
| danas.slava.in | Tvoja slava, za {n} {pl:dan} |
| danas.slava.fast | Pada na posni dan: {level} |
| danas.slava.meat | Ove godine slava je mrsna. |
| danas.week | Sedmica |
| prayer.fajr / sunrise / dhuhr / asr / maghrib / isha | Zora / Izlazak sunca / Podne / Ikindija / Akšam / Jacija |

## 5. Kalendar, Plan, Tajmer
| key | text |
|---|---|
| kal.today | Danas |
| kal.prev.a11y / kal.next.a11y | Prethodni mjesec / Sljedeći mjesec |
| kal.cell.a11y | {date}, {title}{today} |
| kal.cell.todaySuffix | , danas |
| kal.julian | po starom {date} |
| kal.report | Prijavi grešku za ovaj dan |
| kal.weekdays | Pon, Uto, Sri, Čet, Pet, Sub, Ned |
| plan.title | Plan |
| plan.range.7 / 30 | 7 dana / 30 dana |
| plan.summary.7 / 30 | Narednih 7 dana / Narednih 30 dana |
| plan.stat | {n} {pl:dan} {label} |
| plan.meal.title | Jelovnik za sedmicu |
| plan.meal.body | AI predlaže dva obroka za svaki dan. Svaki recept prolazi provjeru posta i tvojih alergija prije nego što ga vidiš. |
| plan.meal.make | Napravi jelovnik za 7 dana |
| plan.meal.remake | Napravi novi jelovnik |
| plan.meal.loading | Pravim jelovnik i provjeravam recepte |
| plan.meal.done | Jelovnik je spreman i provjeren. Obroci su upisani uz dane ispod. |
| plan.meal.weekOnly | Jelovnik pravimo sedmicu po sedmicu, da recepti prate post koji dolazi. |
| plan.shopping | Spisak za kupovinu |
| plan.shopping.caption | Iz jelovnika za narednih 7 dana. Označi ono što već imaš. |
| plan.shopping.count | za {n} {pl:obrok} |
| plan.line.ramadan | Zora {fajr}, iftar {maghrib} |
| plan.line.if | Jelo {from}–{to} |
| tajmer.title | Isprekidani post |
| tajmer.off.title | IF nije uključen |
| tajmer.off.body | Uključi ga u praksama i izaberi 12:12, 14:10 ili 16:8. Ide uz pravoslavni post ili Ramazan. |
| tajmer.off.cta | Uključi IF |
| tajmer.minor.title | Nije dostupno |
| tajmer.minor.body | Isprekidani post je isključen za mlađe od 18 godina. Kalendar vjerskog posta radi normalno. |
| tajmer.state.idle | Pokreni kad završiš posljednji obrok |
| tajmer.state.fasting | Postiš |
| tajmer.state.window | Prozor za jelo je otvoren |
| tajmer.goal | Cilj {h} h, do {time} |
| tajmer.start | Započni post |
| tajmer.stop | Završi post |
| tajmer.stat.start / end / reminder | Početak / Kraj / Podsjetnik |
| tajmer.done | Post je završen: {h} h {m} min. |
| tajmer.early | Završio si poslije {h} h {m} min. I to se računa. |
| tajmer.combo | Danas je i {level}. Prozor za jelo prati IF, a tanjir prati post. |
| tajmer.week | Zadnjih 7 dana |
| tajmer.safety | Ako osjetiš vrtoglavicu, slabost ili mučninu, prekini post. Tajmer radi i kad je aplikacija zatvorena. |

## 6. Profil and pushed screens
| key | text |
|---|---|
| profil.title | Profil |
| profil.local.title | Podaci su samo na ovom telefonu |
| profil.local.body | Napravi nalog samo ako želiš iste podatke i na drugom uređaju. Aplikacija radi i bez njega. |
| profil.local.cta | Prijavi se ili napravi nalog |
| profil.apple | Apple nalog, skriveni email |
| profil.sync.on / off | Sinhronizacija uključena / Sinhronizacija isključena |
| profil.logout | Odjavi se |
| profil.group.fast | Post i ishrana |
| profil.practices | Moje prakse |
| profil.allergies | Alergije i ishrana |
| profil.vaktija | Grad i vaktija |
| profil.group.reminders | Podsjetnici |
| profil.rem.evening | Veče prije posnog dana |
| profil.rem.evening.sub | u 20:00, da stigneš da kupiš šta treba |
| profil.rem.window | Početak posta i prozora za jelo |
| profil.rem.if | Kraj IF posta |
| profil.rem.ramadan | Sehur i iftar |
| profil.rem.ramadan.sub | 30 minuta prije zore i na akšam |
| profil.group.privacy | Privatnost i podaci |
| profil.ai | AI prijedlozi jela |
| profil.ai.sub | šalje samo listu zabranjenih namirnica |
| profil.ai.on / off | AI prijedlozi su uključeni / AI prijedlozi su isključeni |
| profil.sync | Sinhronizacija |
| profil.sync.sub | prakse i alergije na serveru u EU, uz nalog |
| profil.sync.toastOn / toastOff | Sinhronizacija je uključena / Sinhronizacija je isključena |
| profil.policy | Politika privatnosti |
| profil.export | Izvezi moje podatke |
| profil.export.done | Izvoz je spreman: JSON fajl |
| profil.delete.account | Obriši nalog |
| profil.delete.local | Obriši podatke sa telefona |
| profil.group.help | Pomoć |
| profil.report | Prijavi grešku |
| profil.report.sub | pogrešno pravilo, vrijeme ili namirnica |
| profil.footer | fastself.ai {version}. Paket pravila {pack}: pravoslavni kalendar, Ramazan i dobrovoljni postovi. Aplikacija ne daje medicinske savjete. |
| vaktija.title | Grad i vaktija |
| vaktija.changeCity | Promijeni grad |
| vaktija.method | Metoda računanja |
| vaktija.method.izcg | Islamska zajednica u Crnoj Gori |
| vaktija.method.mwl | Muslim World League |
| vaktija.method.diyanet | Diyanet (Turska) |
| vaktija.method.ummAlQura | Umm al-Qura |
| vaktija.method.note | Islamska zajednica objavljuje svoju vaktiju. Ako se vremena razlikuju, pomjeri ih ispod za po minut. |
| vaktija.manual | Ručna korekcija |
| vaktija.fajr / maghrib / shift | Zora / Akšam / Početak Ramazana |
| vaktija.unit.min / day | min / dana |
| vaktija.shift.note | Početak Ramazana zavisi od viđenja mladog mjeseca, pa ga možeš pomjeriti za jedan dan. |
| privatnost.title | Privatnost ukratko |
| privatnost.phone.title | Na telefonu ostaje |
| privatnost.phone.body | Sve prakse, alergije, istorija i podešavanja. Sigurnosni odgovori i razlozi izuzetaka nikad ne napuštaju telefon. |
| privatnost.server.title | Na server ide |
| privatnost.server.body | Samo uz nalog i tvoj pristanak: prakse, alergije i istorija, na serverima u EU (Frankfurt). Prijave grešaka idu bez imena. |
| privatnost.ai.title | AI vidi |
| privatnost.ai.body | Samo uz pristanak: listu zabranjenih namirnica, obrok i sastojke koje izabereš. Servis: {provider}. Bez imena, emaila, vjere i lokacije. |
| privatnost.rights.title | Tvoja prava |
| privatnost.rights.body | Podatke izvoziš i brišeš u Profilu. Pristanke povlačiš bilo kad. Pitanja: {email}. |
| privatnost.policy | Cijela politika privatnosti |

## 7. Asistent (`asistent.*`)
| key | text |
|---|---|
| asistent.title | Šta da jedem |
| asistent.context | Danas: {title} |
| asistent.context.line | Bez: {forbidden}. Alergije: {allergies}. |
| asistent.source.ours / ai | Naši recepti / AI prijedlog |
| asistent.meal.breakfast / lunch / dinner / sehur / iftar | Doručak / Ručak / Večera / Sehur / Iftar |
| asistent.ours.count | {n} {pl:recept} odgovara danu i tvojoj listi. Radi bez interneta i bez AI-ja. |
| asistent.ours.empty | Nijedan naš recept ne odgovara ovom obroku. Probaj drugi obrok. |
| asistent.verified | Provjereno: {what} |
| asistent.ingredients / steps | Sastojci / Priprema |
| asistent.reportRecipe | Prijavi problem sa receptom |
| asistent.ai.pantry | Šta imaš u kuhinji? |
| asistent.ai.payload | Šta tačno šaljemo AI-ju? |
| asistent.ai.payloadNote | Bez imena, emaila, vjere i lokacije. |
| asistent.ai.generate | Predloži 3 jela |
| asistent.ai.step1 | Šaljem samo listu zabrana, bez ličnih podataka |
| asistent.ai.step2 | AI predlaže recepte |
| asistent.ai.step3 | Provjeravam svaki sastojak i korak |
| asistent.ai.passed.one | {n} recept je prošao provjeru |
| asistent.ai.passed.few | {n} recepta su prošla provjeru |
| asistent.ai.passed.many | {n} recepata je prošlo provjeru |
| asistent.ai.rejected | Odbijeno: {reason} |
| asistent.ai.rejected.contains | Sadrži „{item}“, a danas je {level} |
| asistent.ai.rejected.allergy | Sadrži {item}, a to je na tvojoj listi |
| asistent.ai.none | Nijedan recept nije prošao provjeru. Izaberi druge sastojke ili drugi obrok. |
| asistent.ai.again | Novi prijedlog |
| asistent.ai.error | AI trenutno nije dostupan. Evo naših recepata za danas. |
| asistent.ai.limit | Danas si potrošio AI prijedloge. Naši recepti rade bez ograničenja. |
| asistent.footer | Aplikacija provjerava svaki sastojak i korak prije prikaza. Kod alergija uvijek pročitaj deklaraciju. |

Verb agreement changes with the plural form, so `passed` has three keys; pick with `pl(n, [...keys])`.

## 8. Sheets
| key | text |
|---|---|
| report.title | Šta nije u redu? |
| report.type.rule / time / recipe / other | Pogrešno pravilo / Pogrešno vrijeme / Namirnice i alergije / Nešto drugo |
| report.input.placeholder | Opiši ukratko šta si očekivao |
| report.note | Šaljemo samo ovaj opis, datum i verziju pravila. Bez imena i lokacije. |
| report.send | Pošalji prijavu |
| report.sent | Prijava je poslata. Hvala. |
| ai.consent.title | Dozvoli AI prijedloge? |
| ai.consent.body | Da bismo predložili jelo, AI servisu treće strane šaljemo samo ovo: |
| ai.consent.b1 | Listu namirnica koje danas ne smiješ |
| ai.consent.b2 | Obrok i sastojke koje izabereš |
| ai.consent.b3 | Jezik odgovora |
| ai.consent.never | Ne šaljemo ime, email, vjeru, lokaciju ni sigurnosne odgovore. Servis: {provider}. Pristanak povlačiš u Profilu. |
| ai.consent.provider | Anthropic (Claude), or the provider chosen in DECISIONS D-07 |
| ai.consent.allow | Dozvoli |
| delete.title.account | Obrisati nalog? |
| delete.title.local | Obrisati podatke sa telefona? |
| delete.body.account | Brišemo nalog i sve podatke sa servera: prakse, alergije, istoriju, jelovnike i pristanke. Ovo se ne može vratiti. |
| delete.body.local | Brišemo prakse, alergije, istoriju i podešavanja sa ovog telefona. Ovo se ne može vratiti. |
| delete.apple | Ako si se prijavio uz Apple, opozivamo i tu prijavu. |
| delete.confirm.account | Obriši nalog |
| delete.confirm.local | Obriši podatke |
| delete.done.account | Nalog i podaci na serveru su obrisani |
| delete.alsoLocal | Obrisati i podatke sa ovog telefona? |
| exception.title | Danas ne postiš? |
| exception.body | Obje tradicije poznaju izuzetke. Razlog ostaje samo na telefonu. |
| exception.reason.health / travel / other | Zdravlje / Putovanje / Drugo |
| exception.kaza | Dan upisujemo kao dan za naknadu (kaza), da ga ne zaboraviš poslije Ramazana. |
| exception.confirm | Ne postim danas |
| exception.done | Upisano. Danas ne postiš. |
| exception.done.kaza | Upisano. Dan ide u naknadu (kaza). |
| exception.undone | Post je vraćen za danas |

## 9. Notifications (`notif.*`, local only, see DATABASE §notifications)
| key | title | body |
|---|---|---|
| notif.eve | Sutra je {title} | Na tanjiru: {allowed}. Ne može: {forbidden}. |
| notif.window.open | Prozor za jelo je otvoren | Do {to}. |
| notif.window.close | Prozor za jelo se zatvara za 30 minuta | Post počinje u {to}. |
| notif.if.end | Post je završen | {h} h. Prozor za jelo je otvoren do {to}. |
| notif.sehur | Sehur do {fajr} | Zora je za 30 minuta. |
| notif.iftar | Akšam je, {time} | Iftar. Post prekini sa nekoliko urmi i čašom vode. |
| notif.slava | Sutra je {saint} | {rule} |
| notif.nafila | Sutra je dan za dobrovoljni post | {reason}. Uključi ga u aplikaciji ako postiš. |

## 10. System strings (Info.plist, via app.config.ts)
| key | text |
|---|---|
| perm.location | Lokaciju koristimo jednom, da pronađemo najbliži grad za vaktiju. Koordinate ne čuvamo i ne šaljemo. |

## 11. Accessibility labels (`a11y.*`)
| key | text |
|---|---|
| a11y.syncStatus | Stanje sinhronizacije: {state}. Otvori profil. |
| a11y.back | Nazad |
| a11y.dial | Sat dana |
| a11y.weekDay | {weekday}, {date}: {title} |
| a11y.moon | Mjesec, {phase} |
| a11y.toastPrefix | Obavještenje: |
| a11y.recipe.expand / collapse | Prikaži recept / Sakrij recept |
| a11y.stepper.minus / plus | Smanji {what} za jedan / Povećaj {what} za jedan |

## 12. v1 release additions (27 Nov: email + password login, terms, rating, sync label)
Areas: `nalog.*`, `profil.*`, `danas.sync.*` as above; `legal.ts` (`uslovi.*`) and `ocjena.ts` (`ocjena.*`, `feedback.*`) are new files, owner D.
| key | text |
|---|---|
| nalog.mode.signIn | Prijava |
| nalog.mode.signUp | Registracija |
| nalog.mode.a11y | Prijava ili registracija |
| nalog.password.label | Lozinka |
| nalog.password.placeholder | Najmanje {n} znakova |
| nalog.password.show | Prikaži |
| nalog.password.hide | Sakrij |
| nalog.password.showA11y | Prikaži lozinku |
| nalog.password.hideA11y | Sakrij lozinku |
| nalog.submit.signIn | Prijavi se |
| nalog.submit.signUp | Napravi nalog |
| nalog.legal.pre | Nastavkom prihvataš  |
| nalog.legal.terms | uslove korišćenja |
| nalog.legal.and |  i  |
| nalog.legal.policy | politiku privatnosti |
| nalog.legal.end | . |
| nalog.err.credentials | Email ili lozinka nisu tačni. |
| nalog.err.taken | Nalog sa ovim emailom već postoji. Prijavi se. |
| nalog.err.weak | Lozinka mora imati najmanje {n} znakova. |
| nalog.err.confirm | Poslali smo ti email za potvrdu. Potvrdi nalog pa se prijavi. |
| nalog.err.offline | Nema interneta. Provjeri vezu i pokušaj ponovo. |
| nalog.err.rate | Previše pokušaja. Sačekaj minut pa pokušaj ponovo. |
| nalog.err.server | Prijava trenutno ne radi. Pokušaj malo kasnije. |
| nalog.signedIn | Prijavljen si |
| nalog.consent.later | Ne sada |
| nalog.consent.sub | Prijavljen si kao {email}. Izaberi šta ide na server. |
| privatnost.terms | Uslovi korišćenja |
| privatnost.support | Podrška |
| profil.account.title | Prijavljen si |
| profil.account.body | {email} |
| profil.account.syncOn | Prakse, alergije i istorija se čuvaju i na serveru u EU. |
| profil.account.syncOff | Sinhronizacija je isključena. Podaci su samo na ovom telefonu. |
| profil.signOut | Odjavi se |
| profil.signOut.error | Odjava nije uspjela. Pokušaj ponovo. |
| profil.export.error | Izvoz nije uspio. Pokušaj ponovo. |
| profil.terms | Uslovi korišćenja |
| profil.sync.askTitle | Obrisati i kopiju na serveru? |
| profil.sync.askBody | Podaci ostaju na ovom telefonu. Možeš obrisati i kopiju na serveru. |
| profil.sync.askDelete | Obriši sa servera |
| profil.sync.askKeep | Zadrži na serveru |
| profil.sync.deleted | Kopija na serveru je obrisana |
| profil.sync.error | Server nije dostupan. Pokušaj ponovo. |
| profil.rem.denied | Obavještenja su isključena u podešavanjima telefona. |
| profil.rate | Ocijeni aplikaciju |
| profil.rate.sub | reci nam šta ti se sviđa i šta da popravimo |
| danas.sync.on | Sinhronizovano |
| danas.sync.syncing | Sinhronizacija u toku |
| danas.sync.error | Sinhronizacija nije uspjela |
| uslovi.title | Uslovi korišćenja |
| uslovi.meta | Važi od {date}. Pružalac: {entity}, Crna Gora. Kontakt: {email}. |
| uslovi.1.title | Šta aplikacija radi |
| uslovi.1.body | fastself.ai prikazuje pravila i vremena posta prema javno dostupnim kalendarima i proračunima. Pravila mogu da se razlikuju po parohiji, džematu i duhovniku. Kad nisi siguran, pitaj sveštenika ili imama. Grešku prijavi u aplikaciji. |
| uslovi.2.title | Nije medicinski savjet |
| uslovi.2.body | Aplikacija ne daje medicinske savjete i ne zamjenjuje ljekara. Post prekini ako ti je loše. Isprekidani post nije dostupan mlađima od 18 godina. |
| uslovi.3.title | Namirnice i alergije |
| uslovi.3.body | Liste dozvoljenih i zabranjenih namirnica mogu da pogriješe. Kod alergija uvijek pročitaj deklaraciju proizvoda. |
| uslovi.4.title | Nalog |
| uslovi.4.body | Nalog je opcion. Odgovoran si za svoj email i lozinku. Nalog brišeš u aplikaciji u bilo kom trenutku: Profil, pa Obriši nalog. |
| uslovi.5.title | Dozvoljeno korišćenje |
| uslovi.5.body | Ne zloupotrebljavaj servis: bez automatskog slanja zahtjeva, zaobilaženja ograničenja ili ometanja rada. |
| uslovi.6.title | Dostupnost |
| uslovi.6.body | Aplikacija je besplatna i pružamo je kakva jeste. Trudimo se da servis radi, ali ne garantujemo da će sinhronizacija uvijek biti dostupna. Osnovne funkcije rade bez interneta. |
| uslovi.7.title | Odgovornost |
| uslovi.7.body | U mjeri u kojoj zakon dozvoljava, ne odgovaramo za štetu nastalu oslanjanjem na prikazana pravila, vremena ili namirnica. |
| uslovi.8.title | Izmjene |
| uslovi.8.body | Uslove možemo izmijeniti. O bitnim izmjenama obavještavamo u aplikaciji. |
| uslovi.9.title | Pravo |
| uslovi.9.body | Primjenjuje se pravo Crne Gore. Apple nije strana ovih uslova i nema obavezu podrške za aplikaciju. Važe i Appleovi standardni uslovi za aplikacije (Licensed Application EULA). |
| uslovi.web | Otvori uslove na webu |
| uslovi.contact | Piši podršci |
| uslovi.privacy | Politika privatnosti |
| feedback.mode.report | Prijavi grešku |
| feedback.mode.rate | Ocijeni aplikaciju |
| ocjena.title | Kako ti se sviđa fastself.ai? |
| ocjena.sub | Tvoja ocjena ide direktno timu i pomaže nam da odlučimo šta radimo sljedeće. |
| ocjena.star.a11y | {n} od 5 zvjezdica |
| ocjena.score.1 | Loše |
| ocjena.score.2 | Može bolje |
| ocjena.score.3 | Solidno |
| ocjena.score.4 | Dobro |
| ocjena.score.5 | Odlično |
| ocjena.ask.low | Šta da popravimo? |
| ocjena.ask.high | Šta ti se najviše dopada? |
| ocjena.chip.rule | Pravila posta |
| ocjena.chip.time | Vremena |
| ocjena.chip.design | Dizajn |
| ocjena.chip.speed | Brzina |
| ocjena.chip.missing | Nešto mi fali |
| ocjena.chip.other | Nešto drugo |
| ocjena.chip.dial | Sat na Danas |
| ocjena.chip.calendar | Kalendar |
| ocjena.chip.timer | Tajmer |
| ocjena.chip.reminders | Podsjetnici |
| ocjena.chip.simple | Jednostavnost |
| ocjena.input.label | Komentar (nije obavezan) |
| ocjena.input.placeholder.low | Šta te je zasmetalo? |
| ocjena.input.placeholder.high | Napiši nam šta god želiš |
| ocjena.note | Šaljemo samo ocjenu, izbor i komentar. Bez imena, emaila i lokacije. |
| ocjena.send | Pošalji ocjenu |
| ocjena.thanks.title | Hvala ti! |
| ocjena.thanks.high | Drago nam je da ti pomaže. Hvala što si odvojio minut. |
| ocjena.thanks.low | Pročitaćemo svaku riječ. Hvala što nam pomažeš da budemo bolji. |
| ocjena.done | Gotovo |
| ocjena.error | Ocjena nije poslata. Provjeri internet i pokušaj ponovo. |
