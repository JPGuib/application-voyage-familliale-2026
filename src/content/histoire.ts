// Contenu de la rubrique "Histoire". Même structure que src/content/places.ts :
// chaque entrée peut avoir des photos, un texte, et un audio associé.
//
// ⚠️ Contenu d'exemple à remplacer : les textes et images ci-dessous sont des
// placeholders. Pense à déposer les fichiers audio dans public/audio/ (ex:
// public/audio/histoire-empire-ottoman.mp3) pour qu'ils fonctionnent.

export const HISTOIRE_TOPICS = [
  {
    id: "histoire-generale",
    name: "De l'Anatolie à la Turquie moderne",
    shortDesc: "Des Hittites à la République, un voyage à travers 10 000 ans",
    tag: "Histoire",
    image: "/images/Histoire/Anatolie-empire_romain-map.webp",
    photos: [
      "/images/Histoire/Anatolie-empire_romain-map.webp",
      "/images/Histoire/Entrée Saint Sophie Suluman.webp",
      "/images/Histoire/Histoire de la Turquie.webp",
      "/images/Histoire/Ottoman-14-17map.webp",
      "/images/Histoire/Ottoman-Abdulhamid-2.webp",
      "/images/Histoire/ottoman-soliman.webp",
    ],
    audioTitle: "La Turquie, mémoire des civilisations",
    audioDuration: "4 min 15 sec",
    audioSrc: "/audio/Histoire/Anatolie.mp3",
    history: ["Le territoire de la Turquie actuelle a été le théâtre de l'émergence et de la chute de nombreuses civilisations : Hittites, Grecs, Romains, Byzantins, Seldjoukides et Ottomans. Chaque ère a laissé une empreinte indélébile sur le paysage, la culture et l'identité turque. De Göbekli Tepe, le plus ancien temple connu, aux murailles de Constantinople, l'histoire turque est un palimpseste où s'entremêlent mythologies, conquêtes et renaissances.",
      "Vers 1650 - 1180 AV JC - Les Hittites", 
      "Premier grand peuple d'Anatolie, rival de L'Egypte antique. Ils maîtrisent le travail du fer et bâtissent leur capitale, Hattousa.",
      "A partir du XIIe siècle AV JC - La période grecque",
      "Des colons grecs s'installent sur les côtes, fondant des cités comme Troie, Éphèse et Milet",
      "A partir du Ier siècle AV JC - La période romaine",
      "Rome intègre l'Anatolie dans son empire, elle y fonde Bizance, l'actuelle Istanbul",
      "395 - 1453 apr. JC. - La période byzantine",
      "L'Empire byzantin se divise, et avec lui le monde chrétien. Bizance, rebaptisée Constantinople, devient la capitale des chrétiens d'Orient pendant plus de milles ans.",
      "1299 - 1923 apr. JC. - L'empire ottoman",
      "Les turcs seldjoukides apportent l'islam. En 1453, Mehmed II prend Constantinople, qui devient Istanbul. L'empire s'étend sur trois continents, notamment sous Soliman le Magnifique",
      "1923 à nos jours - La République moderne",
      "Mustafa Kemal Atatürk fonde la République turque et la modernise. Le pays est aujourd'hui dirigé par Recep Tayyip Erdoğan."
    ],
      anecdotes: [
      "La ville de Troie, célèbre pour la guerre éponyme, se trouve en Turquie.",
      "Le premier traité de paix écrit de l'histoire est le traité hittite-égyptien de Kadesh (1258 av. J.-C.).",
      "La Turquie abrite 19 sites classés au patrimoine mondial de l'UNESCO."
    ]
  },
  {
    id: "periode-antique",
    name: "L'Antiquité : Hittites, Grecs et Romains (de 1600 av. J.-C. à 395 apr. J.-C.)",
    shortDesc: "Les racines profondes de l'Anatolie",
    tag: "Histoire",
    image: "/images/Histoire/Ephese.webp",
    photos: [
      "/images/Histoire/Ephese.webp",
      "/images/Histoire/Hittites-empire.webp",
      "/images/Histoire/Anatolie-colons_grecs.webp",
      "/images/Histoire/Anatolie-empire_romain-map.webp",
      "/images/Histoire/La porte des Lions à Hattusa.webp",
      "/images/Histoire/Sanctuaire rupestre de Yazilikaya.webp",
      "/images/Histoire/Aspendos.webp"
    ],
    audioTitle: "L'Anatolie, berceau des civilisations",
    audioDuration: "3 min 50 sec",
    audioSrc: "/audio/Histoire/Histoire_de_la_turquie_L_Antiquite_Hittites_Grecs_et_Romains.mp3",
    history: "Dès le IIe millénaire avant notre ère, les Hittites établissent un puissant empire en Anatolie centrale. Plus tard, les colonies grecques fleurissent sur les côtes égéennes, donnant naissance à des cités comme Éphèse et Milet. À leur tour, les Romains intègrent l'Anatolie dans leur empire, la transformant en province prospère où naîtra le christianisme. Les ruines d'Éphèse, le théâtre d'Aspendos et les thermes de Hiérapolis témoignent encore de cette splendeur.",
    anecdotes: [
      "Le temple d'Artémis à Éphèse était l'une des Sept Merveilles du monde antique.",
      "Saint Paul a écrit son Épître aux Éphésiens depuis cette ville.",
      "Les Hittites maîtrisaient déjà la fonte du fer, une avancée technologique majeure."
    ]
  },
  {
    id: "periode-byzantine",
    name: "L'ère byzantine : Constantinople, capitale du monde (de 330 à 1453)",
    shortDesc: "Mille ans d'empire chrétien oriental",
    tag: "Histoire",
    image: "/images/Histoire/anatolie-byzance-lng.webp",
    photos: [
      "/images/Histoire/anatolie-byzance-lng.webp",
      "/images/Histoire/anatolie-byzance-600.webp",
      "/images/Histoire/anatolie-islam632-750.webp",
      "/images/Histoire/anatolie-byzantine-870.webp",
      "/images/Histoire/schisme-occident-1054.webp",
      "/images/Histoire/anatolie-byzantine-1265.webp",
      "/images/Histoire/Sainte Sophie.webp",
      "/images/Histoire/Citerne Basilique.webp",
      "/images/Histoire/Murs de Théose.webp",
      "/images/Histoire/Saint Sauveur in chora.webp"
    ],
    audioTitle: "Byzance, l'empire aux mille églises",
    audioDuration: "3 min 30 sec",
    audioSrc: "/audio/Histoire/L_ere_byzantine_Constantinople_capitale_du_monde.mp3",
    history: "En 330, Constantin fonde Constantinople et en fait la nouvelle Rome. Pendant plus de mille ans, l'Empire byzantin préserve la culture gréco-romaine tout en développant un art et une théologie uniques. Sainte-Sophie, avec sa gigantesque coupole, symbolise l'apogée de cette civilisation. Malgré les croisades et les sièges arabes, Byzance résiste jusqu'à la chute de 1453, marquant la fin du Moyen Âge.",
    anecdotes: [
      "Les Byzantins ont inventé le feu grégeois, une arme incendiaire redoutée.",
      "Constantinople était la plus grande ville d'Europe pendant des siècles.",
      "Les mosaïques de Sainte-Sophie furent recouvertes de plâtre à la conquête ottomane."
    ] 
  },
  {
    id: "periode-ottomane",
    name: "L'Empire ottoman : six siècles de grandeur (de 1299 à 1923)",
    shortDesc: "D'Anatolie aux portes de Vienne",
    tag: "Histoire",
    image: "/images/Histoire/Ottoman-1900-map.webp",
    photos: [
      "/images/Histoire/Ottoman-14-17map.webp",
      "/images/Histoire/Ottomans-Perse-16.webp",
      "/images/Histoire/Ottoman-1900-map.webp",
      "/images/Histoire/anatolie-ottomane-1450.webp",
      "/images/Histoire/Cérémonie Cours.webp",
      "/images/Histoire/constantinople-1453.webp",
      "/images/Histoire/ottoman-soliman.webp",
      "/images/Histoire/Mosquée Suleymaniye.webp",
      "/images/Histoire/Mosquée Sultanahmet.webp",
      "/images/Histoire/Palais Dolmabance.webp"
    ],
    audioTitle: "L'Empire ottoman, de l'Anatolie au monde",
    audioDuration: "4 min 05 sec",
    audioSrc: "/audio/Histoire/L_Empire_ottoman_six_siecles_de_grandeur.mp3",
    history: "Fondé au XIIIe siècle par Osman Ier, l'Empire ottoman conquiert Constantinople en 1453 sous Mehmed II. Aux XVIe et XVIIe siècles, il devient une superpuissance s'étendant sur trois continents. Suleiman le Magnifique marque l'âge d'or avec des réformes juridiques et architecturales. Le déclin s'amorce au XVIIIe siècle, aboutissant à la dissolution de l'empire après la Première Guerre mondiale.",
    anecdotes: [
      "Le harem du palais de Topkapi comptait jusqu'à 400 femmes.",
      "Les janissaires formaient une garde d'élite recrutée parmi les enfants chrétiens.",
      "L'Empire ottoman a duré 623 ans, l'un des plus longs de l'histoire."
    ]
  },
  {
    id: "periode-republique",
    name: "La République turque : naissance d'une nation moderne (de 1923 à nos jours)",
    shortDesc: "Mustafa Kemal Atatürk et la transformation de la Turquie",
    tag: "Histoire",
    image: "/images/Histoire/Ottoman_Empire-drap.webp",
    photos: [
      "/images/Histoire/turquie-1923-Lausanne_map.webp",
      "/images/Histoire/ataturk.webp",
      "/images/Histoire/Attaturk.webp",
      "/images/Histoire/turquie-ataturk-drap.webp",
      "/images/Histoire/turquie-erdogan.webp"
    ],
    audioTitle: "Atatürk, père de la Turquie moderne",
    audioDuration: "3 min 45 sec",
    audioSrc: "/audio/Histoire/La_Republique_turque_naissance_d_une_nation_moderne.mp3",
    history: "Proclamée le 29 octobre 1923, la République turque naît des cendres de l'Empire ottoman. Mustafa Kemal Atatürk mène une série de réformes radicales : abolition du califat, adoption de l'alphabet latin, émancipation de la femme, laïcité. Ankara devient la nouvelle capitale. La Turquie bascule progressivement vers une économie de marché et une démocratie multipartite, malgré des périodes d'instabilité politique et militaire.",
    anecdotes: [
      "Atatürk a interdit le fez et imposé le chapeau occidental en 1925.",
      "Le 10 novembre, tout le pays observe une minute de silence à 9h05, heure de sa mort.",
      "La Turquie a été l'un des premiers pays à accorder le droit de vote aux femmes en 1934."
    ]
  },
];