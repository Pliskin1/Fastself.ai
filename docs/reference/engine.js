/*
 * fastself.ai prototype engine (reference only, verified against the golden tables in docs/TESTING.md §3).
 * Port this logic to packages/core in TypeScript. Do not import this file from app code.
 * Plain ES5-style JS so it runs in Node: `node -e "const e=require('./docs/reference/engine.js'); console.log(e.fsEaster(2027))"`.
 * Names map to core modules:
 *   fsDayNum, fsFromNum, fsEaster, fsTz, fsLastSunday  -> core/calendar
 *   fsRule, fsStricter, FS_LV                          -> core/rules/orthodox (+ rule-packs/orthodox.v0.1.json)
 *   fsHijri, fsNafila                                  -> core/rules/islamic, core/calendar/hijri
 *   fsPrayer, FS_METHODS, FS_CITIES                    -> core/prayer (use the adhan package; this is the reference maths)
 *   fsTimes, fsDayPlan, fsInWin                        -> core/plan
 *   FS_CAT, FS_FORBID, FS_DIETS, FS_KEYWORDS, FS_ALLERGENS, FS_RECIPES, fsForbidden, fsValidate -> core/meals
 *   FS_SLAVE                                           -> core/slava
 *   FS_SKY_M, FS_SKY_E, fsSkyCols, fsSunAlt, fsMoon, fsMoonPath -> core/sky
 *   fsPl                                               -> core/text/plural
 * The style helpers (fsTrack, fsKnob, fsPill, fsSeg, fsChoice, fsCheck, fsTick, fsChip, fsDigits) are prototype-only
 * CSS strings: use them only to read colours and states, never port them.
 */
var FS_RAD = Math.PI / 180;
var FS_LV = {
  voda: { rank: 4, short: 'voda', title: 'Post na vodi', rgb: '158,197,255', hex: '#9EC5FF', ink: '#CFE2FF' },
  ulje: { rank: 3, short: 'ulje', title: 'Post na ulju', rgb: '217,215,126', hex: '#D9D77E', ink: '#ECEBB4' },
  riba: { rank: 2, short: 'riba', title: 'Riba dozvoljena', rgb: '98,214,196', hex: '#62D6C4', ink: '#A6EEE2' },
  bezmesa: { rank: 1, short: 'bez mesa', title: 'Bez mesa', rgb: '243,203,140', hex: '#F3CB8C', ink: '#F9E0B8' },
  mrsno: { rank: 0, short: 'mrsno', title: 'Mrsno', rgb: '246,242,234', hex: 'rgba(246,242,234,0.5)', ink: '#C4C6DA' }
};
var FS_DAYS = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
var FS_DAYS_SHORT = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
var FS_MONTHS = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
var FS_MONTHS_GEN = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];
var FS_HMONTHS = ['muharem', 'safer', 'rebiul-evvel', 'rebiul-ahir', 'džumadel-ula', 'džumadel-uhra', 'redžeb', 'šaban', 'ramazan', 'ševval', 'zul-kade', 'zul-hidždže'];
var FS_IF = { 12: '12:12', 14: '14:10', 16: '16:8' };
var FS_CITIES = {
  'Podgorica': [42.4304, 19.2594], 'Nikšić': [42.7731, 18.9445], 'Bar': [42.0931, 19.1003], 'Ulcinj': [41.9294, 19.2244],
  'Bijelo Polje': [43.0383, 19.7476], 'Rožaje': [42.8333, 20.1667], 'Pljevlja': [43.3567, 19.3584], 'Berane': [42.8425, 19.8733],
  'Plav': [42.5969, 19.945], 'Herceg Novi': [42.4531, 18.5375], 'Cetinje': [42.3931, 18.9116]
};
var FS_METHODS = {
  mwl: { name: 'Muslim World League', fajr: 18, isha: 17, adj: { sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0 } },
  diyanet: { name: 'Diyanet (Turska)', fajr: 18, isha: 17, adj: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 } },
  uaq: { name: 'Umm al-Qura', fajr: 18.5, ishaMin: 90, adj: { sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0 } }
};
var FS_ALLERGENS = [
  { id: 'gluten', name: 'Gluten' }, { id: 'mlijecno', name: 'Mlijeko i laktoza' }, { id: 'jaja', name: 'Jaja' },
  { id: 'riba', name: 'Riba' }, { id: 'rakovi', name: 'Rakovi' }, { id: 'mekusci', name: 'Mekušci' },
  { id: 'kikiriki', name: 'Kikiriki' }, { id: 'orasasto', name: 'Orašasti plodovi' }, { id: 'soja', name: 'Soja' },
  { id: 'susam', name: 'Susam' }, { id: 'celer', name: 'Celer' }, { id: 'senf', name: 'Senf' },
  { id: 'sulfiti', name: 'Sulfiti' }, { id: 'lupina', name: 'Lupina' }
];
var FS_CAT = {
  povrce: 'povrće', voce: 'voće', mahunarke: 'mahunarke', zitarice: 'žitarice', orasasto: 'orašaste plodove', ulje: 'ulje',
  riba: 'ribu', mlijecno: 'mliječne proizvode', jaja: 'jaja', meso: 'meso', vino: 'vino', gluten: 'gluten', susam: 'susam',
  celer: 'celer', med: 'med', rakovi: 'rakove', mekusci: 'mekušce', kikiriki: 'kikiriki', soja: 'soju', senf: 'senf',
  sulfiti: 'sulfite', lupina: 'lupinu', svinjetina: 'svinjetinu', alkohol: 'alkohol'
};
var FS_SHOW = [['povrce', 'Povrće'], ['voce', 'Voće'], ['mahunarke', 'Mahunarke'], ['zitarice', 'Žitarice'], ['orasasto', 'Orašasto'], ['ulje', 'Ulje'], ['riba', 'Riba'], ['mlijecno', 'Mliječno'], ['jaja', 'Jaja'], ['meso', 'Meso'], ['vino', 'Vino']];
var FS_FORBID = {
  voda: ['meso', 'mlijecno', 'jaja', 'riba', 'ulje', 'vino', 'rakovi', 'mekusci'],
  ulje: ['meso', 'mlijecno', 'jaja', 'riba', 'rakovi', 'mekusci'],
  riba: ['meso', 'mlijecno', 'jaja'],
  bezmesa: ['meso'],
  mrsno: []
};
var FS_DIETS = {
  vegetarijanska: { name: 'Vegetarijanska', cats: ['meso', 'riba', 'rakovi', 'mekusci'] },
  veganska: { name: 'Veganska', cats: ['meso', 'riba', 'rakovi', 'mekusci', 'mlijecno', 'jaja', 'med'] },
  halal: { name: 'Halal', cats: ['svinjetina', 'alkohol'] }
};
var FS_KEYWORDS = {
  ulje: ['ulje', 'ulju', 'uljem', 'maslinov'], mlijecno: ['mlijek', 'sir ', 'sirom', 'pavlak', 'maslac', 'jogurt'], jaja: ['jaja', 'jaje'],
  meso: ['meso', 'piletin', 'junetin', 'slanin'], riba: ['rib', 'oslić', 'tunj', 'losos'], vino: ['vino', 'vinom'],
  orasasto: ['orah', 'orasi', 'badem', 'lješnik'], susam: ['susam', 'tahini'], gluten: ['brašn', 'hljeb', 'tjestenin', 'ovsen', 'pšenic'],
  celer: ['celer'], svinjetina: ['svinj'], alkohol: ['vino', 'rakij', 'pivo']
};
var FS_RECIPES = [
  { id: 'corba', title: 'Čorba od pasulja i povrća', time: '45 min', meals: ['rucak', 'vecera', 'iftar'], cats: ['mahunarke', 'povrce'], ing: 'pasulj, šargarepa, crni luk, lovorov list', steps: ['Potopljen pasulj kuvaj 30 minuta u svježoj vodi.', 'Dodaj sitno sjeckanu šargarepu i luk direktno u vodu.', 'Kuvaj još 15 minuta i začini solju, biberom i lovorom.'] },
  { id: 'krompir', title: 'Pečeni krompir sa ruzmarinom', time: '50 min', meals: ['rucak', 'vecera'], cats: ['povrce'], ing: 'krompir, ruzmarin, so, biber', steps: ['Isijeci krompir na kriške i osuši ga krpom.', 'Posoli, pobiberi i pospi ruzmarinom.', 'Peci 45 minuta na 210 °C na papiru za pečenje.'] },
  { id: 'sarma', title: 'Posna sarma', time: '90 min', meals: ['rucak', 'vecera'], cats: ['povrce', 'zitarice'], ing: 'kiseli kupus, pirinač, crni luk, aleva paprika', steps: ['Listove kiselog kupusa operi i odvoji.', 'Propržite luk na ulju, pa dodajte pirinač i začine.', 'Zavij filovane listove i kuvaj 90 minuta.'] },
  { id: 'salata', title: 'Salata od kupusa i oraha', time: '10 min', meals: ['rucak', 'vecera'], cats: ['povrce', 'orasasto'], ing: 'kupus, šargarepa, orasi, sirće', steps: ['Tanko naribaj kupus i šargarepu.', 'Posoli i prelij sirćetom.', 'Pospi grubo sjeckanim orasima.'] },
  { id: 'rizoto', title: 'Rižoto sa pečurkama', time: '35 min', meals: ['rucak', 'vecera'], cats: ['zitarice', 'povrce'], ing: 'pirinač, pečurke, crni luk, peršun', steps: ['Luk dinstaj na malo vode, bez ulja.', 'Dodaj pirinač i pečurke, pa postepeno dolivaj vodu.', 'Kuvaj 20 minuta i pospi peršunom.'] },
  { id: 'sociva', title: 'Čorba od sočiva sa celerom', time: '35 min', meals: ['rucak', 'vecera', 'iftar'], cats: ['mahunarke', 'povrce', 'celer'], ing: 'crveno sočivo, celer, šargarepa, kumin', steps: ['Sočivo isperi i stavi da se kuva u vodi.', 'Dodaj sjeckan celer i šargarepu.', 'Kuvaj 25 minuta, pa izmiksaj.'] },
  { id: 'prebranac', title: 'Prebranac', time: '60 min', meals: ['rucak', 'vecera'], cats: ['mahunarke', 'ulje'], ing: 'pasulj, crni luk, ulje, aleva paprika', steps: ['Skuvaj pasulj dok ne omekša.', 'Proprži luk na ulju sa alevom paprikom.', 'Sve složi u posudu i zapeci 30 minuta.'] },
  { id: 'tjestenina', title: 'Tjestenina sa paradajz sosom', time: '25 min', meals: ['rucak', 'vecera'], cats: ['zitarice', 'gluten', 'povrce', 'ulje'], ing: 'tjestenina, paradajz, bijeli luk, maslinovo ulje, bosiljak', steps: ['Skuvaj tjesteninu u slanoj vodi.', 'Paradajz i bijeli luk prodinstaj na maslinovom ulju.', 'Sjedini sa tjesteninom i pospi bosiljkom.'] },
  { id: 'riblja', title: 'Riblja čorba sa povrćem', time: '40 min', meals: ['rucak', 'vecera', 'iftar'], cats: ['riba', 'povrce'], ing: 'oslić, krompir, šargarepa, peršun', steps: ['Skuvaj povrće u vodi 20 minuta.', 'Dodaj oslića isječenog na komade.', 'Kuvaj još 15 minuta i začini peršunom.'] },
  { id: 'piletina', title: 'Piletina sa pečenim povrćem', time: '45 min', meals: ['rucak', 'vecera', 'iftar'], cats: ['meso', 'ulje', 'povrce'], ing: 'piletina, tikvica, paprika, maslinovo ulje', steps: ['Piletinu i povrće isijeci na komade.', 'Prelij maslinovim uljem i začini.', 'Peci 40 minuta na 200 °C.'] },
  { id: 'ovsena', title: 'Ovsena kaša sa jabukom', time: '10 min', meals: ['dorucak', 'sehur'], cats: ['zitarice', 'gluten', 'voce'], ing: 'ovsene pahuljice, jabuka, cimet, voda', steps: ['Ovsene pahuljice kuvaj u vodi 5 minuta.', 'Dodaj narendanu jabuku i cimet.', 'Posluži toplo.'] },
  { id: 'humus', title: 'Humus sa povrćem i hljebom', time: '15 min', meals: ['dorucak', 'sehur', 'vecera'], cats: ['mahunarke', 'susam', 'zitarice', 'gluten', 'ulje', 'povrce'], ing: 'slanutak, tahini, limun, maslinovo ulje, hljeb', steps: ['Izmiksaj kuvani slanutak sa tahinijem i limunom.', 'Dodaj malo maslinovog ulja.', 'Posluži sa svježim povrćem i hljebom.'] },
  { id: 'vocna', title: 'Voćna salata sa medom', time: '5 min', meals: ['dorucak', 'sehur'], cats: ['voce', 'med'], ing: 'jabuka, banana, pomorandža, med', steps: ['Isijeci voće na kockice.', 'Prelij kašikom meda.', 'Posluži odmah.'] },
  { id: 'omlet', title: 'Omlet sa sirom i paradajzom', time: '10 min', meals: ['dorucak', 'sehur'], cats: ['jaja', 'mlijecno', 'povrce'], ing: 'jaja, sir, paradajz', steps: ['Umuti jaja sa prstohvatom soli.', 'Dodaj sitno sjeckan paradajz i sir.', 'Peci na laganoj vatri 5 minuta.'] },
  { id: 'paprikas', title: 'Krompir paprikaš na vodi', time: '40 min', meals: ['rucak', 'vecera'], cats: ['povrce'], ing: 'krompir, crni luk, paprika, aleva paprika, lovorov list', steps: ['Luk i papriku izdinstaj na malo vode.', 'Dodaj krompir na kockice, alevu papriku i lovor.', 'Nalij vodom i kuvaj 30 minuta dok se ne zgusne.'] },
  { id: 'oslic', title: 'Oslić na žaru sa blitvom', time: '30 min', meals: ['rucak', 'vecera', 'iftar'], cats: ['riba', 'ulje', 'povrce'], ing: 'oslić, blitva, krompir, maslinovo ulje, limun', steps: ['Krompir i blitvu skuvaj u slanoj vodi.', 'Oslića peci na žaru po 4 minuta sa svake strane.', 'Povrće prelij maslinovim uljem i limunom.'] },
  { id: 'heljda', title: 'Heljda sa pečurkama i lukom', time: '25 min', meals: ['rucak', 'vecera', 'sehur'], cats: ['zitarice', 'povrce'], ing: 'heljda, pečurke, crni luk, peršun', steps: ['Heljdu isperi i kuvaj 15 minuta u dvostrukoj količini vode.', 'Pečurke i luk izdinstaj na malo vode.', 'Sjedini i pospi peršunom.'] },
  { id: 'urme', title: 'Urme i povrtna supa', time: '20 min', meals: ['iftar'], cats: ['voce', 'povrce'], ing: 'urme, šargarepa, tikvica, crni luk', steps: ['Post prekini sa nekoliko urmi i čašom vode.', 'Skuvaj povrće u vodi 15 minuta i izmiksaj.', 'Supu posluži toplu, nakon akšama.'] }
];
var FS_MEALS = { dorucak: 'Doručak', rucak: 'Ručak', vecera: 'Večera', sehur: 'Sehur', iftar: 'Iftar' };
var FS_INGREDIENTS = ['krompir', 'pasulj', 'crni luk', 'šargarepa', 'kupus', 'pirinač', 'pečurke', 'paradajz', 'orasi', 'jabuka'];
var FS_DEMO_DATES = {
  'Srijeda 2.12.2026 (Božićni post)': [2026, 12, 2],
  'Petak 4.12.2026 (Vavedenje)': [2026, 12, 4],
  'Četvrtak 7.1.2027 (Božić, mrsno)': [2027, 1, 7],
  'Ponedjeljak 8.2.2027 (1. ramazan)': [2027, 2, 8],
  'Ponedjeljak 15.3.2027 (Čisti ponedjeljak)': [2027, 3, 15]
};
var FS_PRESETS = {
  'Pravoslavni post + IF 16:8': { p: { orthodox: true, ramadan: false, nafila: false, ifOn: true }, plan: 16 },
  'Pravoslavni post': { p: { orthodox: true, ramadan: false, nafila: false, ifOn: false }, plan: 16 },
  'Ramazan + dobrovoljni postovi': { p: { orthodox: false, ramadan: true, nafila: true, ifOn: false }, plan: 16 },
  'Ramazan + IF 16:8': { p: { orthodox: false, ramadan: true, nafila: false, ifOn: true }, plan: 16 },
  'Samo IF 14:10': { p: { orthodox: false, ramadan: false, nafila: false, ifOn: true }, plan: 14 }
};

function fsDayNum(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 864e5); }
function fsFromNum(n) { var dt = new Date(n * 864e5); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() }; }
function fsEaster(y) { var a = y % 4, b = y % 7, c = y % 19; var d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7; var month = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1; return fsDayNum(y, month, day) + 13; }
function fsStricter(a, b) { if (!a) return b; return FS_LV[b].rank > FS_LV[a].rank ? b : a; }
function fsPad(n) { return (n < 10 ? '0' : '') + n; }
function fsHm(h) { var mins = Math.round(h * 60); mins = ((mins % 1440) + 1440) % 1440; return fsPad(Math.floor(mins / 60)) + ':' + fsPad(mins % 60); }
function fsDur(h) { var mins = Math.max(0, Math.round(h * 60)); return fsPad(Math.floor(mins / 60)) + ':' + fsPad(mins % 60); }
function fsLong(n) { var dt = fsFromNum(n); return FS_DAYS[dt.wd] + ', ' + dt.d + '. ' + FS_MONTHS_GEN[dt.m - 1]; }
function fsShortDate(n) { var dt = fsFromNum(n); return dt.d + '.' + dt.m + '.'; }

function fsRule(y, m, d) {
  var n = fsDayNum(y, m, d), wd = fsFromNum(n).wd, md = m * 100 + d, E = fsEaster(y), o = n - E;
  var weekend = wd === 0 || wd === 6;
  var R = function (lv, reasons, period) { return { lv: lv, reasons: reasons, period: period || null }; };
  if (md >= 107 && md <= 117) return R('mrsno', [['Svjatki', 'od Božića do Krstovdana, mrsna sedmica', 'mrsno']]);
  if (md === 119) return R('mrsno', [['Bogojavljenje', 'praznik, nema posta', 'mrsno']]);
  if (o >= 0 && o <= 6) return R('mrsno', [['Svijetla sedmica', 'sedmica poslije Vaskrsa, mrsna', 'mrsno']]);
  if (o >= 50 && o <= 56) return R('mrsno', [['Trojičina sedmica', 'sedmica poslije Duhova, mrsna', 'mrsno']]);
  if (o >= -69 && o <= -64) return R('mrsno', [['Sedmica Mitara i fariseja', 'mrsna sedmica', 'mrsno']]);
  if (o >= -55 && o <= -49) return R('bezmesa', [['Bijela sedmica', 'bez mesa; mliječno, jaja i riba su dozvoljeni', 'bezmesa']]);
  var reasons = [], lv = null, oneDay = false, period = null;
  if (md >= 1128 || md <= 105) {
    var bs = fsDayNum(m >= 11 ? y : y - 1, 11, 28);
    lv = (weekend && (md >= 1128 || md <= 101)) ? 'riba' : 'ulje';
    reasons.push(['Božićni post', '28.11. – 6.1., ' + (lv === 'riba' ? 'vikend' : 'osnovno pravilo'), lv]);
    period = { name: 'Božićni post', idx: n - bs + 1, len: 40 };
  }
  if (o >= -48 && o <= -1) { lv = weekend ? 'ulje' : 'voda'; reasons.push(['Veliki post', 'od Čistog ponedjeljka do Velike subote', lv]); period = { name: 'Veliki post', idx: o + 49, len: 48 }; }
  if (o >= 57 && md <= 711) { lv = weekend ? 'riba' : 'ulje'; reasons.push(['Petrovski post', 'od Vaskrsa + 57 dana do 11.7.', lv]); period = { name: 'Petrovski post', idx: o - 56, len: fsDayNum(y, 7, 11) - (E + 57) + 1 }; }
  if (md >= 814 && md <= 827) { lv = weekend ? 'ulje' : 'voda'; reasons.push(['Gospojinski post', '14.8. – 27.8.', lv]); period = { name: 'Gospojinski post', idx: d - 13, len: 14 }; }
  if (md === 106) { lv = 'voda'; oneDay = true; reasons.push(['Badnji dan', 'posljednji dan Božićnog posta', 'voda']); period = { name: 'Božićni post', idx: 40, len: 40 }; }
  if (md === 118) { lv = 'voda'; oneDay = true; reasons.push(['Krstovdan', 'jednodnevni post', 'voda']); }
  if (md === 911) { lv = 'voda'; oneDay = true; reasons.push(['Usekovanje', 'jednodnevni post', 'voda']); }
  if (md === 927) { lv = 'voda'; oneDay = true; reasons.push(['Krstovdan (Vozdviženje)', 'jednodnevni post', 'voda']); }
  if ((wd === 3 || wd === 5) && !oneDay) { reasons.push([FS_DAYS[wd], 'posni dan u sedmici, strože pravilo pobjeđuje', 'voda']); lv = fsStricter(lv, 'voda'); }
  var feast = null;
  if (md === 1204) feast = 'Vavedenje';
  if (md === 1219) feast = 'Sveti Nikola';
  if (md === 407) feast = 'Blagovijesti';
  if (md === 819) feast = 'Preobraženje';
  if (o === -7) feast = 'Cvijeti';
  if (feast && lv && FS_LV[lv].rank > FS_LV.riba.rank) { reasons.push([feast, 'praznik, olakšica na ribu', 'riba']); lv = 'riba'; }
  if (!lv) { lv = 'mrsno'; reasons.push(['Običan dan', 'nema posta', 'mrsno']); }
  return R(lv, reasons, period);
}

function fsLastSunday(y, m) { var last = fsDayNum(y, m + 1, 0); return last - fsFromNum(last).wd; }
function fsTz(y, m, d) { var n = fsDayNum(y, m, d); return (n >= fsLastSunday(y, 3) && n < fsLastSunday(y, 10)) ? 2 : 1; }
function fsPrayer(y, m, d, lat, lng, methodId) {
  var M = FS_METHODS[methodId] || FS_METHODS.mwl;
  var dsin = function (x) { return Math.sin(x * FS_RAD); }, dcos = function (x) { return Math.cos(x * FS_RAD); }, dtan = function (x) { return Math.tan(x * FS_RAD); };
  var dasin = function (x) { return Math.asin(x) / FS_RAD; }, dacos = function (x) { return Math.acos(x) / FS_RAD; };
  var datan2 = function (a, b) { return Math.atan2(a, b) / FS_RAD; }, dacot = function (x) { return Math.atan(1 / x) / FS_RAD; };
  var fix = function (a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  var jd = 2440587.5 + Date.UTC(y, m - 1, d) / 864e5 - lng / (15 * 24);
  var sun = function (j) {
    var D = j - 2451545.0, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    var L = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360), e = 23.439 - 0.00000036 * D;
    var RA = fix(datan2(dcos(e) * dsin(L), dcos(L)) / 15, 24);
    return { decl: dasin(dsin(e) * dsin(L)), eqt: q / 15 - RA };
  };
  var mid = function (t) { return fix(12 - sun(jd + t / 24).eqt, 24); };
  var angleT = function (angle, t, ccw) { var s = sun(jd + t / 24); var T = dacos((-dsin(angle) - dsin(s.decl) * dsin(lat)) / (dcos(s.decl) * dcos(lat))) / 15; return mid(t) + (ccw ? -T : T); };
  var asrT = function (t) { var s = sun(jd + t / 24); return angleT(-dacot(1 + dtan(Math.abs(lat - s.decl))), t, false); };
  var adj = fsTz(y, m, d) - lng / 15;
  var r = { fajr: angleT(M.fajr, 5, true), sunrise: angleT(0.833, 6, true), dhuhr: mid(12), asr: asrT(13), maghrib: angleT(0.833, 18, false) };
  r.isha = M.ishaMin ? r.maghrib + M.ishaMin / 60 : angleT(M.isha, 18, false);
  var out = {};
  for (var k in r) out[k] = r[k] + adj + ((M.adj[k] || 0) / 60);
  return out;
}
function fsHijri(y, m, d) {
  var jd = Math.floor(2440587.5 + Date.UTC(y, m - 1, d) / 864e5 + 0.5);
  var l = jd - 1948440 + 10632, n = Math.floor((l - 1) / 10631); l = l - 10631 * n + 354;
  var j = Math.floor((10985 - l) / 5316) * Math.floor(50 * l / 17719) + Math.floor(l / 5670) * Math.floor(43 * l / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) - Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
  var mo = Math.floor(24 * l / 709), da = l - Math.floor(709 * mo / 24);
  return { y: 30 * n + j - 30, m: mo, d: da };
}
function fsNafila(wd, h) {
  if (h.m === 9) return null;
  if (h.m === 10 && h.d === 1) return null;
  if (h.m === 12 && h.d >= 10 && h.d <= 13) return null;
  if (h.m === 12 && h.d === 9) return 'Dan Arefata';
  if (h.m === 1 && (h.d === 9 || h.d === 10)) return 'Ašura';
  if (h.m === 10 && h.d >= 2 && h.d <= 7) return 'Šest dana ševvala';
  if (h.d >= 13 && h.d <= 15) return 'Bijeli dani, ' + h.d + '. ' + FS_HMONTHS[h.m - 1];
  if (wd === 1) return 'Ponedjeljak, sunnet post';
  if (wd === 4) return 'Četvrtak, sunnet post';
  return null;
}
function fsTimes(n, s) {
  var dt = fsFromNum(n), c = FS_CITIES[s.city] || FS_CITIES.Podgorica;
  var t = fsPrayer(dt.y, dt.m, dt.d, c[0], c[1], s.method);
  t.fajr += s.offZora / 60;
  t.maghrib += s.offAksam / 60;
  return t;
}
function fsDayPlan(n, s) {
  var dt = fsFromNum(n), P = s.practices;
  var orth = P.orthodox ? fsRule(dt.y, dt.m, dt.d) : null;
  if (orth && s.strog && s.strog !== 'voda' && FS_LV[orth.lv].rank > FS_LV[s.strog].rank) {
    orth = { lv: s.strog, reasons: orth.reasons.concat([['Tvoja mjera posta', 'najstrože što držiš: ' + FS_LV[s.strog].short, s.strog]]), period: orth.period };
  }
  var exc = s.exceptions && s.exceptions[n];
  var lv = orth ? orth.lv : 'mrsno';
  var hd = fsFromNum(n - s.ramShift), h = fsHijri(hd.y, hd.m, hd.d);
  var ram = P.ramadan && h.m === 9 ? h.d : 0;
  var naf = (P.nafila && !ram) ? fsNafila(dt.wd, h) : null;
  var nafFast = !!(naf && s.nafilaDays[n]);
  var t = (P.ramadan || P.nafila) ? fsTimes(n, s) : null;
  var ifH = (P.ifOn && !s.minor) ? s.ifPlan : 0;
  var win = null;
  if (ram || nafFast) {
    var es = t.maghrib, ee = t.fajr + 24;
    if (ifH) ee = Math.min(ee, es + (24 - ifH));
    win = { start: es, end: ee, kind: ram ? 'ramazan' : 'nafila', ifInside: !!ifH };
  } else if (ifH) {
    win = { start: 20 - (24 - ifH), end: 20, kind: 'if', ifInside: false };
  }
  var title, sub, dot;
  var orthFast = orth && lv !== 'mrsno';
  if (orthFast) {
    title = FS_LV[lv].title; dot = FS_LV[lv].hex;
    sub = orth.period ? orth.period.name + ', ' + orth.period.idx + '. dan od ' + orth.period.len : orth.reasons[0][0];
    if (ram) sub += ', i ' + ram + '. ramazan';
  } else if (ram) {
    title = ram + '. ramazan'; dot = '#FFC86E'; sub = 'Post od zore do akšama, ' + h.y + '. po Hidžri';
  } else if (nafFast) {
    title = 'Dobrovoljni post'; dot = '#FFC86E'; sub = naf;
  } else if (orth && orth.reasons[0][0] !== 'Običan dan') {
    title = 'Mrsno'; dot = 'rgba(246,242,234,0.5)'; sub = orth.reasons[0][0] + ', ' + orth.reasons[0][1];
  } else if (ifH) {
    title = 'IF ' + FS_IF[ifH]; dot = '#F6F2EA'; sub = 'Prozor za jelo ' + fsHm(win.start) + '–' + fsHm(win.end);
  } else {
    title = 'Danas nema posta'; dot = 'rgba(246,242,234,0.5)'; sub = naf ? 'Dobrovoljni post je moguć: ' + naf.toLowerCase() : 'Nijedno tvoje pravilo ne važi za ovaj dan';
  }
  if (exc) {
    return { n: n, dt: dt, orth: orth, lv: 'mrsno', h: h, ram: ram, naf: null, nafFast: false, t: t, win: null, ifH: 0, title: 'Danas ne postiš', sub: (ram ? ram + '. ramazan, dan za naknadu' : 'Izuzetak: ' + exc), dot: 'rgba(246,242,234,0.5)', orthFast: false, exc: exc, ruleLv: lv };
  }
  return { n: n, dt: dt, orth: orth, lv: lv, h: h, ram: ram, naf: naf, nafFast: nafFast, t: t, win: win, ifH: ifH, title: title, sub: sub, dot: dot, orthFast: !!orthFast, exc: null, ruleLv: lv };
}
function fsForbidden(dp, s) {
  var f = {}, k, i;
  var rule = FS_FORBID[dp.lv] || [];
  for (i = 0; i < rule.length; i++) f[rule[i]] = { src: 'pravilo', label: FS_LV[dp.lv].title.toLowerCase() };
  for (k in FS_DIETS) if (s.diets[k]) for (i = 0; i < FS_DIETS[k].cats.length; i++) if (!f[FS_DIETS[k].cats[i]]) f[FS_DIETS[k].cats[i]] = { src: 'dijeta', label: FS_DIETS[k].name.toLowerCase() + ' dijeta' };
  for (i = 0; i < s.allergies.length; i++) f[s.allergies[i]] = { src: 'alergija', label: 'tvoja lista alergija' };
  return f;
}
function fsValidate(r, forb, custom) {
  var reasons = [];
  var text = (r.ing + ' ' + r.steps.join(' ')).toLowerCase().replace(/bez ulja/g, '');
  for (var cat in forb) {
    var hit = r.cats.indexOf(cat) >= 0, where = '';
    var kws = FS_KEYWORDS[cat] || [];
    for (var si = 0; si < r.steps.length && !where; si++) {
      var st = r.steps[si].toLowerCase().replace(/bez ulja/g, '');
      for (var ki = 0; ki < kws.length; ki++) if (st.indexOf(kws[ki]) >= 0) { where = 'korak ' + (si + 1) + ': „' + r.steps[si].replace(/\.$/, '') + '”'; hit = true; break; }
    }
    if (!hit) for (var kj = 0; kj < kws.length; kj++) if (text.indexOf(kws[kj]) >= 0) { hit = true; break; }
    if (hit) {
      var F = forb[cat];
      if (F.src === 'alergija') reasons.push('Sadrži ' + FS_CAT[cat] + ', a to je na tvojoj listi alergija.');
      else if (F.src === 'dijeta') reasons.push('Sadrži ' + FS_CAT[cat] + ', što ne ide uz izabranu dijetu.');
      else reasons.push('Sadrži ' + FS_CAT[cat] + (where ? ' (' + where + ')' : '') + ', a danas je ' + F.label + '.');
    }
  }
  for (var ci = 0; ci < custom.length; ci++) if (text.indexOf(custom[ci].toLowerCase()) >= 0) reasons.push('Sadrži „' + custom[ci] + '”, a to je na tvojoj listi alergija.');
  return reasons;
}
function fsArc(h1, h2, rad, c) {
  var span = ((h2 - h1) % 24 + 24) % 24;
  if (span < 0.02) span = 0.02;
  if (span > 23.98) span = 23.98;
  var p = function (hr) { var t = hr / 24 * Math.PI * 2; return [c + rad * Math.sin(t), c - rad * Math.cos(t)]; };
  var a = p(h1), b = p(h1 + span);
  return 'M ' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ' A ' + rad + ' ' + rad + ' 0 ' + (span > 12 ? 1 : 0) + ' 1 ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
}
function fsInWin(h, w) { var len = ((w.end - w.start) % 24 + 24) % 24; var into = ((h - w.start) % 24 + 24) % 24; return into < len; }


// ---- helpers from the prototype component (comp2.js, before the class) ----

var FS_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
var FS_SPRING = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
var FS_TIMES = { '05:45, zora': 5.75, '08:00, jutro': 8, '12:30, podne': 12.5, '16:30, akšam': 16.5, '21:30, noć': 21.5 };
var FS_SLAVE = [
  ['Bez slave', null, ''], ['Sveti Nikola (19.12.)', [12, 19], 'Sveti Nikola'], ['Sveti Jovan (20.1.)', [1, 20], 'Sveti Jovan'],
  ['Đurđevdan (6.5.)', [5, 6], 'Đurđevdan'], ['Sveti Vasilije Ostroški (12.5.)', [5, 12], 'Sveti Vasilije Ostroški'],
  ['Aranđelovdan (21.11.)', [11, 21], 'Aranđelovdan'], ['Mitrovdan (8.11.)', [11, 8], 'Mitrovdan'], ['Lučindan (31.10.)', [10, 31], 'Lučindan'],
  ['Petrovdan (12.7.)', [7, 12], 'Petrovdan'], ['Ilindan (2.8.)', [8, 2], 'Ilindan'], ['Sveti Stefan (9.1.)', [1, 9], 'Sveti Stefan']
];
var FS_SKY_M = [
  [-90, ['#03040D', '#080B22', '#101533']], [-18, ['#03040D', '#080B22', '#101533']], [-12, ['#05071A', '#111640', '#2A2558']],
  [-6, ['#0A1035', '#2C2A66', '#7A4C78']], [0, ['#13245A', '#4D4C8A', '#D98A7C']], [6, ['#183466', '#4F6A9E', '#E0A983']],
  [15, ['#0D2A52', '#1C4A7C', '#3A70A6']], [90, ['#0D2A52', '#1C4A7C', '#3A70A6']]
];
var FS_SKY_E = [
  [-90, ['#03040D', '#080B22', '#101533']], [-18, ['#03040D', '#080B22', '#101533']], [-12, ['#05061A', '#141239', '#33204F']],
  [-6, ['#090C2E', '#2E1F58', '#843B63']], [0, ['#121B4C', '#55337A', '#E07E5B']], [6, ['#1A2D5E', '#644A84', '#E59A5E']],
  [15, ['#0D2A52', '#1C4A7C', '#3A70A6']], [90, ['#0D2A52', '#1C4A7C', '#3A70A6']]
];
function fsHexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function fsMix(a, b, t) { var A = fsHexRgb(a), B = fsHexRgb(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
function fsSkyCols(alt, morning) {
  var T = morning ? FS_SKY_M : FS_SKY_E;
  for (var i = 0; i < T.length - 1; i++) {
    if (alt <= T[i + 1][0]) { var t = (alt - T[i][0]) / (T[i + 1][0] - T[i][0]); return [0, 1, 2].map(function (k) { return fsMix(T[i][1][k], T[i + 1][1][k], Math.max(0, Math.min(1, t))); }); }
  }
  return T[T.length - 1][1];
}
function fsSunAlt(n, hLocal, lat, lng) {
  var dt = fsFromNum(n), tz = fsTz(dt.y, dt.m, dt.d);
  var jd = 2440587.5 + n + (hLocal - tz) / 24, D = jd - 2451545.0;
  var g = (357.529 + 0.98560028 * D) % 360, q = (280.459 + 0.98564736 * D) % 360;
  var L = (q + 1.915 * Math.sin(g * FS_RAD) + 0.020 * Math.sin(2 * g * FS_RAD)) % 360, e = 23.439 - 0.00000036 * D;
  var RA = Math.atan2(Math.cos(e * FS_RAD) * Math.sin(L * FS_RAD), Math.cos(L * FS_RAD)) / FS_RAD / 15;
  RA = ((RA % 24) + 24) % 24;
  var decl = Math.asin(Math.sin(e * FS_RAD) * Math.sin(L * FS_RAD));
  var eqt = q / 15 - RA; eqt = ((eqt + 12) % 24 + 24) % 24 - 12;
  var solar = hLocal - tz + lng / 15 + eqt, H = (solar - 12) * 15 * FS_RAD, la = lat * FS_RAD;
  var alt = Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(H)) / FS_RAD;
  return { alt: alt, morning: ((solar % 24) + 24) % 24 < 12 };
}
function fsMoon(n) {
  var jd = 2440587.5 + n + 0.5, syn = 29.530588853;
  var age = ((jd - 2451550.26) % syn + syn) % syn, p = age / syn, il = (1 - Math.cos(2 * Math.PI * p)) / 2;
  var name = age < 1.84 ? 'mladi mjesec' : age < 5.53 ? 'rastući srp' : age < 9.22 ? 'prva četvrt' : age < 12.91 ? 'rastući mjesec' : age < 16.61 ? 'pun mjesec' : age < 20.3 ? 'opadajući mjesec' : age < 23.99 ? 'posljednja četvrt' : age < 27.68 ? 'opadajući srp' : 'mladi mjesec';
  return { p: p, il: il, name: name };
}
function fsMoonPath(p, cx, cy, r) {
  var t = Math.cos(2 * Math.PI * p), rx = Math.max(0.01, Math.abs(t) * r);
  var top = cx + ' ' + (cy - r), bot = cx + ' ' + (cy + r);
  if (p < 0.5) return 'M ' + top + ' A ' + r + ' ' + r + ' 0 0 1 ' + bot + ' A ' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (t > 0 ? 0 : 1) + ' ' + top + ' Z';
  return 'M ' + top + ' A ' + r + ' ' + r + ' 0 0 0 ' + bot + ' A ' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (t < 0 ? 0 : 1) + ' ' + top + ' Z';
}
function fsTrack(v) { return v ? 'background: #FFC25E;' : 'background: rgba(255,255,255,0.18);'; }
function fsKnob(v) { return v ? 'transform: translateX(20px);' : 'transform: translateX(0px);'; }
function fsPill(lv) { return lv === 'mrsno' ? 'border: 1px solid rgba(255,255,255,0.24); color: #D4D6E6;' : 'background: rgba(' + FS_LV[lv].rgb + ',0.2); color: ' + FS_LV[lv].ink + ';'; }
function fsSolidPill(lv) { return lv === 'mrsno' ? 'border: 1px solid rgba(255,255,255,0.32); color: #F6F2EA;' : 'background: ' + FS_LV[lv].hex + '; color: #0B0D24;'; }
function fsSeg(on) { return on ? 'background: #FFC25E; color: #1F1404; box-shadow: 0 6px 18px rgba(255,194,94,0.32);' : 'background: rgba(255,194,94,0); color: #F6F2EA; box-shadow: 0 6px 18px rgba(255,194,94,0);'; }
function fsChoice(on) { return on ? 'background: rgba(255,200,110,0.13); border: 1px solid rgba(255,200,110,0.75); box-shadow: 0 0 0 4px rgba(255,200,110,0.10), inset 0 1px 0 rgba(255,255,255,0.18);' : 'background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 0 0 4px rgba(255,200,110,0), inset 0 1px 0 rgba(255,255,255,0.12);'; }
function fsCheck(on) { return on ? 'background: #FFC25E; border: 1.5px solid #FFC25E;' : 'background: rgba(255,194,94,0); border: 1.5px solid rgba(255,255,255,0.38);'; }
function fsTick(on) { return on ? 'opacity: 1; transform: scale(1);' : 'opacity: 0; transform: scale(0.4);'; }
function fsChip(on) { return on ? 'background: #F6F2EA; color: #0B0D24; border: 1px solid #F6F2EA;' : 'background: rgba(255,255,255,0.06); color: #F6F2EA; border: 1px solid rgba(255,255,255,0.18);'; }
function fsPl(n, one, few, many) { var a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? one : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many)); }
function fsDigits(str, big) {
  return str.split('').map(function (ch) { return { ch: ch, style: ch === ':' ? 'width: 0.26em; opacity: 0.55;' : 'width: 0.58em;' }; });
}

if (typeof module !== "undefined") module.exports = { FS_RAD, FS_LV, FS_DAYS, FS_DAYS_SHORT, FS_MONTHS, FS_MONTHS_GEN, FS_HMONTHS, FS_IF, FS_CITIES, FS_METHODS, FS_ALLERGENS, FS_CAT, FS_SHOW, FS_FORBID, FS_DIETS, FS_KEYWORDS, FS_RECIPES, FS_MEALS, FS_INGREDIENTS, FS_DEMO_DATES, FS_PRESETS, fsDayNum, fsFromNum, fsEaster, fsStricter, fsPad, fsHm, fsDur, fsLong, fsShortDate, fsRule, fsLastSunday, fsTz, fsPrayer, fsHijri, fsNafila, fsTimes, fsDayPlan, fsForbidden, fsValidate, fsArc, fsInWin, FS_EXPO, FS_SPRING, FS_TIMES, FS_SLAVE, FS_SKY_M, FS_SKY_E, fsHexRgb, fsMix, fsSkyCols, fsSunAlt, fsMoon, fsMoonPath, fsTrack, fsKnob, fsPill, fsSolidPill, fsSeg, fsChoice, fsCheck, fsTick, fsChip, fsPl, fsDigits };
