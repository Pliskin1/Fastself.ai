// src/meals/data.ts
var CATEGORIES = [
  "povrce",
  "voce",
  "mahunarke",
  "zitarice",
  "orasasto",
  "ulje",
  "riba",
  "mlijecno",
  "jaja",
  "meso",
  "vino",
  "gluten",
  "susam",
  "celer",
  "med",
  "rakovi",
  "mekusci",
  "kikiriki",
  "soja",
  "senf",
  "sulfiti",
  "lupina",
  "svinjetina",
  "alkohol"
];
var MEAL_IDS = ["dorucak", "rucak", "vecera", "sehur", "iftar"];
var CATEGORY_LABEL = {
  povrce: "povr\u0107e",
  voce: "vo\u0107e",
  mahunarke: "mahunarke",
  zitarice: "\u017Eitarice",
  orasasto: "ora\u0161aste plodove",
  ulje: "ulje",
  riba: "ribu",
  mlijecno: "mlije\u010Dne proizvode",
  jaja: "jaja",
  meso: "meso",
  vino: "vino",
  gluten: "gluten",
  susam: "susam",
  celer: "celer",
  med: "med",
  rakovi: "rakove",
  mekusci: "meku\u0161ce",
  kikiriki: "kikiriki",
  soja: "soju",
  senf: "senf",
  sulfiti: "sulfite",
  lupina: "lupinu",
  svinjetina: "svinjetinu",
  alkohol: "alkohol"
};
var FORBID = {
  voda: ["meso", "mlijecno", "jaja", "riba", "ulje", "vino", "rakovi", "mekusci"],
  ulje: ["meso", "mlijecno", "jaja", "riba"],
  riba: ["meso", "mlijecno", "jaja"],
  bezmesa: ["meso"],
  mrsno: []
};
var DIETS = {
  vegetarian: { name: "Vegetarijanska", cats: ["meso", "riba", "rakovi", "mekusci"] },
  vegan: { name: "Veganska", cats: ["meso", "riba", "rakovi", "mekusci", "mlijecno", "jaja", "med"] },
  halal: { name: "Halal", cats: ["svinjetina", "alkohol"] }
};
var ALLERGENS = [
  { id: "gluten", name: "Gluten" },
  { id: "mlijecno", name: "Mlijeko i laktoza" },
  { id: "jaja", name: "Jaja" },
  { id: "riba", name: "Riba" },
  { id: "rakovi", name: "Rakovi" },
  { id: "mekusci", name: "Meku\u0161ci" },
  { id: "kikiriki", name: "Kikiriki" },
  { id: "orasasto", name: "Ora\u0161asti plodovi" },
  { id: "soja", name: "Soja" },
  { id: "susam", name: "Susam" },
  { id: "celer", name: "Celer" },
  { id: "senf", name: "Senf" },
  { id: "sulfiti", name: "Sulfiti" },
  { id: "lupina", name: "Lupina" }
];
var KEYWORDS = {
  ulje: ["ulje", "ulju", "uljem", "^ulja", "maslinov"],
  mlijecno: [
    "mlijek",
    "mlije\u010Dn",
    "mlijecn",
    "^sir$",
    "^sira$",
    "^siru$",
    "^sirom$",
    "^sirevi$",
    "^sireva$",
    "^sirevima$",
    "pavlak",
    "maslac",
    "jogurt",
    "kajmak",
    "^skut",
    "vrhnje",
    "kefir",
    "^puter"
  ],
  jaja: ["^jaja", "^jaje", "^jajet", "^jajim", "omlet"],
  meso: [
    "^meso",
    "^mesn",
    "piletin",
    "junetin",
    "slanin",
    "teletin",
    "jagnjetin",
    "svinjetin",
    "^\u0161unk",
    "^kobasic",
    "^pr\u0161ut",
    "^\u010Dvarc"
  ],
  riba: ["^rib", "osli\u0107", "oslic", "tunj", "losos", "^sardin", "^sku\u0161", "^orada", "^brancin", "^in\u0107un", "^pastrm"],
  vino: ["^vino$", "^vina$", "^vinom$", "^vinu$"],
  orasasto: ["^orah", "^ora\u0161", "^oras", "^badem", "^lje\u0161nj", "^lje\u0161nik", "^pista\u0107", "^indijski orah"],
  susam: ["susam", "tahin"],
  gluten: [
    "bra\u0161n",
    "hljeb",
    "tjestenin",
    "ovsen",
    "p\u0161enic",
    "^je\u010Dm",
    "^kruh",
    "^makaron",
    "^griz",
    "^bulgur",
    "^kuskus",
    "^pecivo",
    "^lepinj"
  ],
  celer: ["celer"],
  svinjetina: ["svinj", "slanin", "^pr\u0161ut", "^\u0161unk", "^\u010Dvarc"],
  alkohol: [
    "^vino$",
    "^vina$",
    "^vinom$",
    "^vinu$",
    "^rakij",
    "^pivo$",
    "^piva$",
    "^pivom$",
    "^viski",
    "^votka",
    "^vodka",
    "^konjak",
    "^liker",
    "^lik\xE9r"
  ],
  med: ["^med$", "^meda$", "^medu$", "^medom$"],
  rakovi: [
    "^rak$",
    "^raka$",
    "^raku$",
    "^rakom$",
    "^rakovi",
    "^rakova",
    "^rakovima",
    "^ra\u010Di\u0107",
    "^\u0161kamp",
    "^kozic",
    "^jastog",
    "^jastoz"
  ],
  mekusci: [
    "^\u0161koljk",
    "^dagnj",
    "^lignj",
    "^hobotnic",
    "^kamenic",
    "^mu\u0161ul",
    "^oktopod",
    "^kalamar",
    "^meku\u0161c",
    "^mekusc"
  ],
  kikiriki: ["^kikirik", "^ara\u0161id"],
  soja: ["^soja$", "^soje$", "^soji$", "^soju$", "^sojom$", "^sojin", "^tofu$", "^edamame$"],
  senf: ["^senf", "^goru\u0161ic"],
  sulfiti: ["sulfit", "^sumporni dioksid"],
  lupina: ["^lupin"]
};

// src/meals/validate.ts
var NOT_FOOD = ["narib", "izrib", "ribiz"];
function normalize(text) {
  const words = text.toLowerCase().replace(/bez\s+ulja/g, " ").split(/[^\p{L}\p{N}]+/u).filter((w) => w && !NOT_FOOD.some((p) => w.startsWith(p)));
  return ` ${words.join(" ")} `;
}
function matches(padded, kw) {
  const start = kw.startsWith("^");
  const end = kw.endsWith("$");
  const core = kw.slice(start ? 1 : 0, end ? -1 : void 0);
  return padded.includes(`${start ? " " : ""}${core}${end ? " " : ""}`);
}
function hitsCategory(padded, cat) {
  const kws = KEYWORDS[cat];
  return !!kws && kws.some((k) => matches(padded, k));
}
function categorize(texts) {
  const padded = normalize(typeof texts === "string" ? texts : texts.join(" "));
  return CATEGORIES.filter((c) => hitsCategory(padded, c));
}
function validateRecipe(r, forbidden, customAvoid = []) {
  const reasons = [];
  const entries = Array.isArray(forbidden) ? forbidden.map((c) => [c, void 0]) : Object.entries(forbidden);
  const stepsPadded = r.steps.map(normalize);
  const allPadded = normalize([r.title, ...r.ingredients, ...r.steps].join(" . "));
  for (const [cat, f] of entries) {
    let hit = r.cats.includes(cat);
    let where = "";
    for (let i = 0; i < r.steps.length && !where; i++) {
      if (hitsCategory(stepsPadded[i], cat)) {
        where = `korak ${i + 1}: \u201E${r.steps[i].replace(/\.$/, "")}\u201D`;
        hit = true;
      }
    }
    if (!hit) hit = hitsCategory(allPadded, cat);
    if (!hit) continue;
    const label = CATEGORY_LABEL[cat];
    if (!f) reasons.push(`Sadr\u017Ei ${label}${where ? ` (${where})` : ""}.`);
    else if (f.src === "alergija") reasons.push(`Sadr\u017Ei ${label}, a to je na tvojoj listi alergija.`);
    else if (f.src === "dijeta") reasons.push(`Sadr\u017Ei ${label}, \u0161to ne ide uz izabranu dijetu.`);
    else reasons.push(`Sadr\u017Ei ${label}${where ? ` (${where})` : ""}, a danas je ${f.label}.`);
  }
  for (const word of customAvoid) {
    const w = word.trim().toLowerCase();
    if (w && allPadded.includes(w)) reasons.push(`Sadr\u017Ei \u201E${word}\u201D, a to je na tvojoj listi alergija.`);
  }
  return reasons;
}

// src/meals/recipes.sr.json
var recipes_sr_default = [
  {
    id: "corba",
    title: "\u010Corba od pasulja i povr\u0107a",
    timeMin: 45,
    meals: ["rucak", "vecera", "iftar"],
    cats: ["mahunarke", "povrce"],
    ingredients: ["pasulj", "\u0161argarepa", "crni luk", "lovorov list"],
    steps: [
      "Potopljen pasulj kuvaj 30 minuta u svje\u017Eoj vodi.",
      "Dodaj sitno sjeckanu \u0161argarepu i luk direktno u vodu.",
      "Kuvaj jo\u0161 15 minuta i za\u010Dini solju, biberom i lovorom."
    ]
  },
  {
    id: "krompir",
    title: "Pe\u010Deni krompir sa ruzmarinom",
    timeMin: 50,
    meals: ["rucak", "vecera"],
    cats: ["povrce"],
    ingredients: ["krompir", "ruzmarin", "so", "biber"],
    steps: [
      "Isijeci krompir na kri\u0161ke i osu\u0161i ga krpom.",
      "Posoli, pobiberi i pospi ruzmarinom.",
      "Peci 45 minuta na 210 \xB0C na papiru za pe\u010Denje."
    ]
  },
  {
    id: "sarma",
    title: "Posna sarma",
    timeMin: 90,
    meals: ["rucak", "vecera"],
    cats: ["povrce", "zitarice", "ulje"],
    ingredients: ["kiseli kupus", "pirina\u010D", "crni luk", "aleva paprika"],
    steps: [
      "Listove kiselog kupusa operi i odvoji.",
      "Propr\u017Eite luk na ulju, pa dodajte pirina\u010D i za\u010Dine.",
      "Zavij filovane listove i kuvaj 90 minuta."
    ]
  },
  {
    id: "salata",
    title: "Salata od kupusa i oraha",
    timeMin: 10,
    meals: ["rucak", "vecera"],
    cats: ["povrce", "orasasto"],
    ingredients: ["kupus", "\u0161argarepa", "orasi", "sir\u0107e"],
    steps: ["Tanko naribaj kupus i \u0161argarepu.", "Posoli i prelij sir\u0107etom.", "Pospi grubo sjeckanim orasima."]
  },
  {
    id: "rizoto",
    title: "Ri\u017Eoto sa pe\u010Durkama",
    timeMin: 35,
    meals: ["rucak", "vecera"],
    cats: ["zitarice", "povrce"],
    ingredients: ["pirina\u010D", "pe\u010Durke", "crni luk", "per\u0161un"],
    steps: [
      "Luk dinstaj na malo vode, bez ulja.",
      "Dodaj pirina\u010D i pe\u010Durke, pa postepeno dolivaj vodu.",
      "Kuvaj 20 minuta i pospi per\u0161unom."
    ]
  },
  {
    id: "sociva",
    title: "\u010Corba od so\u010Diva sa celerom",
    timeMin: 35,
    meals: ["rucak", "vecera", "iftar"],
    cats: ["mahunarke", "povrce", "celer"],
    ingredients: ["crveno so\u010Divo", "celer", "\u0161argarepa", "kumin"],
    steps: [
      "So\u010Divo isperi i stavi da se kuva u vodi.",
      "Dodaj sjeckan celer i \u0161argarepu.",
      "Kuvaj 25 minuta, pa izmiksaj."
    ]
  },
  {
    id: "prebranac",
    title: "Prebranac",
    timeMin: 60,
    meals: ["rucak", "vecera"],
    cats: ["mahunarke", "ulje"],
    ingredients: ["pasulj", "crni luk", "ulje", "aleva paprika"],
    steps: [
      "Skuvaj pasulj dok ne omek\u0161a.",
      "Propr\u017Ei luk na ulju sa alevom paprikom.",
      "Sve slo\u017Ei u posudu i zapeci 30 minuta."
    ]
  },
  {
    id: "tjestenina",
    title: "Tjestenina sa paradajz sosom",
    timeMin: 25,
    meals: ["rucak", "vecera"],
    cats: ["zitarice", "gluten", "povrce", "ulje"],
    ingredients: ["tjestenina", "paradajz", "bijeli luk", "maslinovo ulje", "bosiljak"],
    steps: [
      "Skuvaj tjesteninu u slanoj vodi.",
      "Paradajz i bijeli luk prodinstaj na maslinovom ulju.",
      "Sjedini sa tjesteninom i pospi bosiljkom."
    ]
  },
  {
    id: "riblja",
    title: "Riblja \u010Dorba sa povr\u0107em",
    timeMin: 40,
    meals: ["rucak", "vecera", "iftar"],
    cats: ["riba", "povrce"],
    ingredients: ["osli\u0107", "krompir", "\u0161argarepa", "per\u0161un"],
    steps: [
      "Skuvaj povr\u0107e u vodi 20 minuta.",
      "Dodaj osli\u0107a isje\u010Denog na komade.",
      "Kuvaj jo\u0161 15 minuta i za\u010Dini per\u0161unom."
    ]
  },
  {
    id: "piletina",
    title: "Piletina sa pe\u010Denim povr\u0107em",
    timeMin: 45,
    meals: ["rucak", "vecera", "iftar"],
    cats: ["meso", "ulje", "povrce"],
    ingredients: ["piletina", "tikvica", "paprika", "maslinovo ulje"],
    steps: ["Piletinu i povr\u0107e isijeci na komade.", "Prelij maslinovim uljem i za\u010Dini.", "Peci 40 minuta na 200 \xB0C."]
  },
  {
    id: "ovsena",
    title: "Ovsena ka\u0161a sa jabukom",
    timeMin: 10,
    meals: ["dorucak", "sehur"],
    cats: ["zitarice", "gluten", "voce"],
    ingredients: ["ovsene pahuljice", "jabuka", "cimet", "voda"],
    steps: ["Ovsene pahuljice kuvaj u vodi 5 minuta.", "Dodaj narendanu jabuku i cimet.", "Poslu\u017Ei toplo."]
  },
  {
    id: "humus",
    title: "Humus sa povr\u0107em i hljebom",
    timeMin: 15,
    meals: ["dorucak", "sehur", "vecera"],
    cats: ["mahunarke", "susam", "zitarice", "gluten", "ulje", "povrce"],
    ingredients: ["slanutak", "tahini", "limun", "maslinovo ulje", "hljeb"],
    steps: [
      "Izmiksaj kuvani slanutak sa tahinijem i limunom.",
      "Dodaj malo maslinovog ulja.",
      "Poslu\u017Ei sa svje\u017Eim povr\u0107em i hljebom."
    ]
  },
  {
    id: "vocna",
    title: "Vo\u0107na salata sa medom",
    timeMin: 5,
    meals: ["dorucak", "sehur"],
    cats: ["voce", "med"],
    ingredients: ["jabuka", "banana", "pomorand\u017Ea", "med"],
    steps: ["Isijeci vo\u0107e na kockice.", "Prelij ka\u0161ikom meda.", "Poslu\u017Ei odmah."]
  },
  {
    id: "omlet",
    title: "Omlet sa sirom i paradajzom",
    timeMin: 10,
    meals: ["dorucak", "sehur"],
    cats: ["jaja", "mlijecno", "povrce"],
    ingredients: ["jaja", "sir", "paradajz"],
    steps: [
      "Umuti jaja sa prstohvatom soli.",
      "Dodaj sitno sjeckan paradajz i sir.",
      "Peci na laganoj vatri 5 minuta."
    ]
  },
  {
    id: "paprikas",
    title: "Krompir paprika\u0161 na vodi",
    timeMin: 40,
    meals: ["rucak", "vecera"],
    cats: ["povrce"],
    ingredients: ["krompir", "crni luk", "paprika", "aleva paprika", "lovorov list"],
    steps: [
      "Luk i papriku izdinstaj na malo vode.",
      "Dodaj krompir na kockice, alevu papriku i lovor.",
      "Nalij vodom i kuvaj 30 minuta dok se ne zgusne."
    ]
  },
  {
    id: "oslic",
    title: "Osli\u0107 na \u017Earu sa blitvom",
    timeMin: 30,
    meals: ["rucak", "vecera", "iftar"],
    cats: ["riba", "ulje", "povrce"],
    ingredients: ["osli\u0107", "blitva", "krompir", "maslinovo ulje", "limun"],
    steps: [
      "Krompir i blitvu skuvaj u slanoj vodi.",
      "Osli\u0107a peci na \u017Earu po 4 minuta sa svake strane.",
      "Povr\u0107e prelij maslinovim uljem i limunom."
    ]
  },
  {
    id: "heljda",
    title: "Heljda sa pe\u010Durkama i lukom",
    timeMin: 25,
    meals: ["rucak", "vecera", "sehur"],
    cats: ["zitarice", "povrce"],
    ingredients: ["heljda", "pe\u010Durke", "crni luk", "per\u0161un"],
    steps: [
      "Heljdu isperi i kuvaj 15 minuta u dvostrukoj koli\u010Dini vode.",
      "Pe\u010Durke i luk izdinstaj na malo vode.",
      "Sjedini i pospi per\u0161unom."
    ]
  },
  {
    id: "urme",
    title: "Urme i povrtna supa",
    timeMin: 20,
    meals: ["iftar"],
    cats: ["voce", "povrce"],
    ingredients: ["urme", "\u0161argarepa", "tikvica", "crni luk"],
    steps: [
      "Post prekini sa nekoliko urmi i \u010Da\u0161om vode.",
      "Skuvaj povr\u0107e u vodi 15 minuta i izmiksaj.",
      "Supu poslu\u017Ei toplu, nakon ak\u0161ama."
    ]
  }
];

// src/meals/recipes.ts
var RECIPES = recipes_sr_default;
export {
  ALLERGENS,
  CATEGORIES,
  CATEGORY_LABEL,
  DIETS,
  FORBID,
  KEYWORDS,
  MEAL_IDS,
  RECIPES,
  categorize,
  validateRecipe
};
