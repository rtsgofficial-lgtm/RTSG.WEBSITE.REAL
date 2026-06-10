export type GlobeProfile = {
  id: string;
  officialName: string;
  displayName: string;
  tag?: string;
  iso3s: string[];
  flagUrl: string;
  flagFocus?: {
    u: number;
    v: number;
    scale: number;
  };
  symbolDecal?: {
    url: string;
    lat: number;
    lon: number;
    size: number;
  };
  population: string;
  region: string;
  alliance: string;
  militaryStrength: string;
  rulingParty: string;
  communistParty: string;
  communistPartyUrl?: string;
  researchTitle?: string;
  researchUrl?: string;
  description: string;
};

export type EditableGlobeProfileField =
  | "officialName"
  | "displayName"
  | "population"
  | "region"
  | "alliance"
  | "militaryStrength"
  | "rulingParty"
  | "communistParty"
  | "communistPartyUrl"
  | "researchTitle"
  | "researchUrl"
  | "description";

export const EDITABLE_GLOBE_PROFILE_FIELDS: EditableGlobeProfileField[] = [
  "officialName",
  "displayName",
  "population",
  "region",
  "alliance",
  "militaryStrength",
  "rulingParty",
  "communistParty",
  "communistPartyUrl",
  "researchTitle",
  "researchUrl",
  "description",
];

export const USSR_ISO3S = [
  "RUS",
  "UKR",
  "BLR",
  "MDA",
  "LTU",
  "LVA",
  "EST",
  "GEO",
  "ARM",
  "AZE",
  "KAZ",
  "UZB",
  "TKM",
  "KGZ",
  "TJK",
];

export const EUROPEAN_UNION_ISO3S = [
  "AUT",
  "BEL",
  "BGR",
  "HRV",
  "CYP",
  "CZE",
  "DNK",
  "EST",
  "FIN",
  "FRA",
  "name:France",
  "DEU",
  "GRC",
  "HUN",
  "IRL",
  "ITA",
  "LVA",
  "LTU",
  "LUX",
  "MLT",
  "NLD",
  "POL",
  "PRT",
  "ROU",
  "SVK",
  "SVN",
  "ESP",
  "SWE",
];

export const GLOBE_PROFILES: GlobeProfile[] = [
  {
    id: "iran",
    officialName: "Islamic Republic of Iran",
    displayName: "Iran",
    iso3s: ["IRN"],
    flagUrl: "https://flagcdn.com/w640/ir.png",
    population: "Approx. 90 million",
    region: "West Asia",
    alliance: "BRICS, Shanghai Cooperation Organization, OPEC",
    militaryStrength: "Large regional force with significant missile, drone, naval, and asymmetric capabilities.",
    rulingParty: "N/A - Islamic Republic state structure",
    communistParty: "Tudeh Party of Iran",
    communistPartyUrl: "https://www.tudehpartyiran.org/en/home/",
    researchTitle: "The End of Modernity",
    researchUrl: "https://www.rtsg.media/p/the-end-of-modenity-heidegger-and",
    description:
      "Iran occupies a central position in West Asia, shaped by energy sovereignty, sanctions pressure, and resistance to outside domination. Its regional role is tied to the defense of national independence and a multipolar balance against Western-aligned power blocs.",
  },
  {
    id: "china",
    officialName: "People's Republic of China",
    displayName: "China",
    iso3s: ["CHN"],
    flagUrl: "https://flagcdn.com/w640/cn.png",
    population: "Approx. 1.41 billion",
    region: "East Asia",
    alliance: "BRICS, Shanghai Cooperation Organization, RCEP",
    militaryStrength:
      "Major global power with nuclear forces, blue-water naval capacity, cyber, space, and advanced industrial depth.",
    rulingParty: "Communist Party of China",
    communistParty: "Communist Party of China",
    communistPartyUrl: "https://english.www.gov.cn/",
    researchTitle: "How China Beats the West",
    researchUrl: "https://www.rtsg.media/p/how-china-beats-the-west-in-its-own",
    description:
      "China is a core pole in the emerging multipolar order, combining industrial scale, state planning, infrastructure diplomacy, and long-term sovereignty strategy. Its development model challenges the assumption that global modernization must follow Western liberal capitalism.",
  },
  {
    id: "soviet-union",
    officialName: "Union of Soviet Socialist Republics",
    displayName: "Soviet Union",
    tag: "SOV",
    iso3s: USSR_ISO3S,
    flagUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Flag_of_the_Soviet_Union.svg/640px-Flag_of_the_Soviet_Union.svg.png",
    flagFocus: {
      u: 0.5,
      v: 0.5,
      scale: 1,
    },
    symbolDecal: {
      url: "https://rs.rtsg.org/Soviet_Hammer_and_Sickle_(1924).svg",
      lat: 58,
      lon: 63,
      size: 0.32,
    },
    population: "Approx. 290 million at dissolution",
    region: "Eurasia",
    alliance: "Historical Warsaw Pact and Council for Mutual Economic Assistance",
    militaryStrength:
      "Historical superpower with nuclear parity, global strategic reach, and a vast conventional military-industrial base.",
    rulingParty: "N/A",
    communistParty: "N/A",
    researchTitle: "Soviet History and Revolution",
    researchUrl: "https://www.youtube.com/watch?v=NTt1oB1Lz2I",
    description:
      "The Soviet experience remains one of the decisive ruptures in modern history: a state project that industrialized at extraordinary speed, defeated fascism at immense cost, and reorganized global politics around anti-colonial possibility and social ownership.",
  },
  {
    id: "united-states",
    officialName: "United States of America",
    displayName: "United States",
    iso3s: ["USA"],
    flagUrl: "https://flagcdn.com/w640/us.png",
    population: "Approx. 342 million",
    region: "North America",
    alliance: "NATO, AUKUS, G7, OECD, Five Eyes, Quad",
    militaryStrength:
      "The world's largest military system by spending, with nuclear forces, global bases, carrier strike groups, space, cyber, intelligence, and expeditionary capabilities.",
    rulingParty: "Republican Party-led federal administration within a two-party state structure",
    communistParty: "American Communist Party",
    communistPartyUrl: "https://acp.us",
    researchTitle: "The Political Economy of Barbarism",
    researchUrl: "https://www.rtsg.media/p/the-political-economy-of-barbarism",
    description:
      "The United States is the central organizer of the contemporary imperial system, projecting power through finance, sanctions, military basing, intelligence networks, and alliance discipline. Its internal contradictions sit beside immense productive capacity, a large working class, and recurring movements against war, austerity, and monopoly power.",
  },
  {
    id: "europe",
    officialName: "European Union",
    displayName: "Europe",
    tag: "EU",
    iso3s: EUROPEAN_UNION_ISO3S,
    flagUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/1024px-Flag_of_Europe.svg.png",
    population: "Approx. 449 million",
    region: "Europe",
    alliance: "European Union, NATO-aligned bloc, G7/OECD core states",
    militaryStrength:
      "Fragmented but technologically advanced militaries, with heavy dependence on NATO command structures and U.S. strategic capacity.",
    rulingParty: "Various oligarchs and bureaucrats",
    communistParty: "",
    description:
      "The European Union is a fragmented economic and political superstructure that is primarily kept in line by the United States. While there have been attempts to assert themselves, Europe is still a mostly deindustrialized collection of welfare states that serve only as an extraction zone and military base for the United States.",
  },
  {
    id: "north-korea",
    officialName: "Democratic People's Republic of Korea",
    displayName: "North Korea",
    iso3s: ["PRK"],
    flagUrl: "https://flagcdn.com/w640/kp.png",
    population: "Approx. 26 million",
    region: "East Asia",
    alliance: "Treaty ties with China and Russia; Non-Aligned Movement",
    militaryStrength:
      "Nuclear-armed state with very large conventional forces, missile systems, and hardened defense posture.",
    rulingParty: "Workers' Party of Korea",
    communistParty: "Workers' Party of Korea",
    communistPartyUrl: "http://www.rodong.rep.kp/",
    description:
      "The DPRK's politics are inseparable from war, partition, sanctions, and military encirclement. Its emphasis on self-reliance and deterrence reflects a state survival strategy under constant pressure from the U.S.-led security architecture in Northeast Asia.",
  },
  {
    id: "vietnam",
    officialName: "Socialist Republic of Viet Nam",
    displayName: "Vietnam",
    iso3s: ["VNM"],
    flagUrl: "https://flagcdn.com/w640/vn.png",
    population: "Approx. 100 million",
    region: "Southeast Asia",
    alliance: "ASEAN, RCEP",
    militaryStrength:
      "Capable regional military with strong ground forces, coastal defense, and hard-won strategic experience.",
    rulingParty: "Communist Party of Viet Nam",
    communistParty: "Communist Party of Viet Nam",
    communistPartyUrl: "https://en.dangcongsan.vn/",
    description:
      "Vietnam's modern state was forged through anti-colonial and anti-intervention wars, then rebuilt through pragmatic socialist-oriented development. It remains an important example of national liberation translating into durable sovereignty and economic transformation.",
  },
  {
    id: "laos",
    officialName: "Lao People's Democratic Republic",
    displayName: "Laos",
    iso3s: ["LAO"],
    flagUrl: "https://flagcdn.com/w640/la.png",
    population: "Approx. 7.8 million",
    region: "Southeast Asia",
    alliance: "ASEAN, RCEP",
    militaryStrength: "Small defense force focused on territorial security and internal stability.",
    rulingParty: "Lao People's Revolutionary Party",
    communistParty: "Lao People's Revolutionary Party",
    communistPartyUrl: "https://www.lprp.gov.la/",
    description:
      "Laos carries the legacy of colonial rule and devastating bombardment, while pursuing development through regional integration and state-led planning. Its sovereignty is rooted in quiet endurance and the effort to build outside the orbit of great-power dictates.",
  },
  {
    id: "angola",
    officialName: "Republic of Angola",
    displayName: "Angola",
    iso3s: ["AGO"],
    flagUrl: "https://flagcdn.com/w640/ao.png",
    population: "Approx. 37 million",
    region: "Southern Africa",
    alliance: "African Union, Southern African Development Community, OPEC",
    militaryStrength:
      "One of the stronger militaries in Southern Africa, with significant land forces and oil-backed state capacity.",
    rulingParty: "MPLA",
    communistParty: "MPLA",
    communistPartyUrl: "https://mpla.ao/",
    description:
      "Angola's path was defined by anti-colonial struggle, civil war, and resource sovereignty. Its political history reflects the wider contest between African liberation movements and external efforts to shape the post-colonial order from abroad.",
  },
  {
    id: "venezuela",
    officialName: "Bolivarian Republic of Venezuela",
    displayName: "Venezuela",
    iso3s: ["VEN"],
    flagUrl: "https://flagcdn.com/w640/ve.png",
    population: "Approx. 29 million",
    region: "South America",
    alliance: "ALBA-TCP, OPEC, observer/partner relationships with BRICS forums",
    militaryStrength:
      "Regional force centered on territorial defense, air defense, militia structures, and strategic oil infrastructure.",
    rulingParty: "United Socialist Party of Venezuela",
    communistParty: "Communist Party of Venezuela",
    communistPartyUrl: "https://pcvcantaclaro.com/",
    description:
      "Venezuela is central to Latin America's struggle over resource control and political independence. Its Bolivarian project has faced sanctions, coup pressure, and economic warfare while asserting a sovereign path over oil wealth and regional integration.",
  },
  {
    id: "lebanon",
    officialName: "Republic of Lebanon",
    displayName: "Lebanon",
    iso3s: ["LBN"],
    flagUrl: "https://flagcdn.com/w640/lb.png",
    population: "Approx. 5.8 million",
    region: "West Asia",
    alliance: "Arab League; internal resistance axis alignment through Hezbollah",
    militaryStrength: "Small national army alongside Hezbollah, a major non-state military and political force.",
    rulingParty: "Confessional coalition system; Hezbollah is a major governing and resistance force",
    communistParty: "Lebanese Communist Party",
    communistPartyUrl: "https://lcparty.org/en/",
    description:
      "Lebanon sits at the fault line of regional finance, sectarian governance, occupation, and resistance. Its politics cannot be separated from repeated Israeli aggression, external patronage networks, and the social cost of dependency on fragile institutions.",
  },
  {
    id: "palestine",
    officialName: "State of Palestine and historic Palestine",
    displayName: "Palestine",
    tag: "PAL",
    iso3s: ["PSE", "ISR"],
    flagUrl: "https://flagcdn.com/w640/ps.png",
    population: "Approx. 14.5 million Palestinians worldwide; map highlight covers historic Palestine",
    region: "West Asia",
    alliance: "Arab League, Organization of Islamic Cooperation, Non-Aligned Movement",
    militaryStrength: "Fragmented armed resistance under occupation; no sovereign conventional military.",
    rulingParty:
      "Fragmented authority under occupation: Palestinian Authority/Fatah in the West Bank and Hamas in Gaza",
    communistParty: "Palestinian People's Party",
    communistPartyUrl: "https://www.ppp.ps/",
    description:
      "Palestine is presented here as the full historic territory because the political question is inseparable from occupation, displacement, settlement, and unequal control over land. Its struggle is one of national liberation and return against a deeply militarized colonial order.",
  },
  {
    id: "cuba",
    officialName: "Republic of Cuba",
    displayName: "Cuba",
    iso3s: ["CUB"],
    flagUrl: "https://flagcdn.com/w640/cu.png",
    population: "Approx. 11 million",
    region: "Caribbean",
    alliance: "ALBA-TCP, CELAC, Non-Aligned Movement",
    militaryStrength:
      "Compact but deeply institutionalized defense system built around deterrence, civil defense, and revolutionary state resilience.",
    rulingParty: "Communist Party of Cuba",
    communistParty: "Communist Party of Cuba",
    communistPartyUrl: "https://www.pcc.cu/",
    description:
      "Cuba remains a symbol of sovereignty under blockade, combining international medical solidarity, social provision, and political independence despite decades of economic pressure. Its survival has made it a reference point for anti-colonial statecraft across the Global South.",
  },
  {
    id: "burkina-faso",
    officialName: "Burkina Faso",
    displayName: "Burkina Faso",
    iso3s: ["BFA"],
    flagUrl: "https://flagcdn.com/w640/bf.png",
    population: "Approx. 23 million",
    region: "West Africa",
    alliance: "Alliance of Sahel States, African Union",
    militaryStrength:
      "Modest but increasingly central state security apparatus shaped by counterinsurgency, territorial defense, and Sahel regional realignment.",
    rulingParty: "Military-led transitional government",
    communistParty: "",
    description:
      "Burkina Faso occupies a strategic position in the Sahel, where questions of sovereignty, resource control, foreign military influence, and regional security are tightly connected. Its recent political direction reflects a wider break from old dependency structures and a search for independent development under severe pressure.",
  },
];
