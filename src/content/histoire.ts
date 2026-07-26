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
      "1299 - 1923 apr. JC. - L"empire ottoman",
      "Les turcs seldjoukides apportent l'islam. En 1453, Mehmed II prend Constantinople, qui devient Istanbul. L'empire s'étend sur trois continents, notamment sous Soliman le Magnifique",
      "1923 à nos jours - La République moderne",
      "Mustafa Kemal Atatürk fonde la République turque et la modernise. Le pays est aujourd'hui dirigé par Recep Tayyip Ergogan",   
    ],
      anecdotes: [
      "La ville de Troie, célèbre pour la guerre éponyme, se trouve en Turquie.",
      "Le premier traité de paix écrit de l'histoire est le traité hittite-égyptien de Kadesh (1258 av. J.-C.).",
      "La Turquie abrite 19 sites classés au patrimoine mondial de l'UNESCO."
    ]
  },
  {
    id: "periode-antique",
    name: "L'Antiquité : Hittites, Grecs et Romains",
    shortDesc: "Les racines profondes de l'Anatolie",
    tag: "Histoire",
    image: "/images/places/ephesus-ruines.png",
    photos: [
      "/images/places/ephesus-ruines.png",
      "/images/places/temple-artemis.png",
      "/images/places/pergamum.png"
    ],
    audioTitle: "L'Anatolie, berceau des civilisations",
    audioDuration: "3 min 50 sec",
    audioSrc: "/audio/Antiquite_Turquie.mp3",
    history: "Dès le IIe millénaire avant notre ère, les Hittites établissent un puissant empire en Anatolie centrale. Plus tard, les colonies grecques fleurissent sur les côtes égéennes, donnant naissance à des cités comme Éphèse et Milet. À leur tour, les Romains intègrent l'Anatolie dans leur empire, la transformant en province prospère où naîtra le christianisme. Les ruines d'Éphèse, le théâtre d'Aspendos et les thermes de Hiérapolis témoignent encore de cette splendeur.",
    anecdotes: [
      "Le temple d'Artémis à Éphèse était l'une des Sept Merveilles du monde antique.",
      "Saint Paul a écrit son Épître aux Éphésiens depuis cette ville.",
      "Les Hittites maîtrisaient déjà la fonte du fer, une avancée technologique majeure."
    ]
  },
  {
    id: "periode-byzantine",
    name: "L'ère byzantine : Constantinople, capitale du monde",
    shortDesc: "Mille ans d'empire chrétien oriental",
    tag: "Histoire",
    image: "/images/places/sainte-sophie.png",
    photos: [
      "/images/places/sainte-sophie.png",
      "/images/places/mosquee-bleue.png",
      "/images/places/murailles-constantinople.png"
    ],
    audioTitle: "Byzance, l'empire aux mille églises",
    audioDuration: "3 min 30 sec",
    audioSrc: "/audio/Byzance_Turquie.mp3",
    history: "En 330, Constantin fonde Constantinople et en fait la nouvelle Rome. Pendant plus de mille ans, l'Empire byzantin préserve la culture gréco-romaine tout en développant un art et une théologie uniques. Sainte-Sophie, avec sa gigantesque coupole, symbolise l'apogée de cette civilisation. Malgré les croisades et les sièges arabes, Byzance résiste jusqu'à la chute de 1453, marquant la fin du Moyen Âge.",
    anecdotes: [
      "Les Byzantins ont inventé le feu grégeois, une arme incendiaire redoutée.",
      "Constantinople était la plus grande ville d'Europe pendant des siècles.",
      "Les mosaïques de Sainte-Sophie furent recouvertes de plâtre à la conquête ottomane."
    ]
  },
  {
    id: "periode-ottomane",
    name: "L'Empire ottoman : six siècles de grandeur",
    shortDesc: "D'Anatolie aux portes de Vienne",
    tag: "Histoire",
    image: "/images/places/topkapi.png",
    photos: [
      "/images/places/topkapi.png",
      "/images/places/mosquee-suleymaniye.png",
      "/images/places/palais-dolmabahce.png"
    ],
    audioTitle: "L'Empire ottoman, de l'Anatolie au monde",
    audioDuration: "4 min 05 sec",
    audioSrc: "/audio/Empire_Ottoman.mp3",
    history: "Fondé au XIIIe siècle par Osman Ier, l'Empire ottoman conquiert Constantinople en 1453 sous Mehmed II. Aux XVIe et XVIIe siècles, il devient une superpuissance s'étendant sur trois continents. Suleiman le Magnifique marque l'âge d'or avec des réformes juridiques et architecturales. Le déclin s'amorce au XVIIIe siècle, aboutissant à la dissolution de l'empire après la Première Guerre mondiale.",
    anecdotes: [
      "Le harem du palais de Topkapi comptait jusqu'à 400 femmes.",
      "Les janissaires formaient une garde d'élite recrutée parmi les enfants chrétiens.",
      "L'Empire ottoman a duré 623 ans, l'un des plus longs de l'histoire."
    ]
  },
  {
    id: "periode-republique",
    name: "La République turque : naissance d'une nation moderne",
    shortDesc: "Mustafa Kemal Atatürk et la transformation de la Turquie",
    tag: "Histoire",
    image: "/images/places/anitkabir.png",
    photos: [
      "/images/places/anitkabir.png",
      "/images/places/place-taksim.png",
      "/images/places/ankara-mausolee.png"
    ],
    audioTitle: "Atatürk, père de la Turquie moderne",
    audioDuration: "3 min 45 sec",
    audioSrc: "/audio/Republique_Turque.mp3",
    history: "Proclamée le 29 octobre 1923, la République turque naît des cendres de l'Empire ottoman. Mustafa Kemal Atatürk mène une série de réformes radicales : abolition du califat, adoption de l'alphabet latin, émancipation de la femme, laïcité. Ankara devient la nouvelle capitale. La Turquie bascule progressivement vers une économie de marché et une démocratie multipartite, malgré des périodes d'instabilité politique et militaire.",
    anecdotes: [
      "Atatürk a interdit le fez et imposé le chapeau occidental en 1925.",
      "Le 10 novembre, tout le pays observe une minute de silence à 9h05, heure de sa mort.",
      "La Turquie a été l'un des premiers pays à accorder le droit de vote aux femmes en 1934."
    ]
  },
  {
    id: "geographie",
    name: "Géographie de la Turquie",
    shortDesc: "Entre montagnes, mers et plateaux",
    tag: "Géographie",
    image: "/images/places/cappadocie-ballons.png",
    photos: [
      "/images/places/cappadocie-ballons.png",
      "/images/places/pamukkale.png",
      "/images/places/mont-ararat.png"
    ],
    audioTitle: "La Turquie, un pays aux mille paysages",
    audioDuration: "3 min 20 sec",
    audioSrc: "/audio/Geographie_Turquie.mp3",
    history: "La Turquie s'étend sur 783 562 km² à cheval entre l'Europe et l'Asie. Le Bosphore et les Dardanelles séparent les deux continents. Le pays est entouré par quatre mers : la mer Noire au nord, la mer de Marmara à l'ouest, la mer Égée au sud-ouest et la Méditerranée au sud. Son relief est dominé par le plateau anatolien, encadré par les chaînes du Pontique au nord et du Taurus au sud. Le mont Ararat, à 5 137 m, est le point culminant.",
    anecdotes: [
      "La Cappadoce abrite des cheminées de fée formées par l'érosion volcanique.",
      "Pamukkale est une terrasse naturelle de travertin blanc alimentée par des sources chaudes.",
      "Le lac de Van est le plus grand lac salé du pays, sans émissaire."
    ]
  },
  {
    id: "demographie",
    name: "Démographie de la Turquie",
    shortDesc: "85 millions d'habitants, une population jeune et dynamique",
    tag: "Société",
    image: "/images/places/istanbul-foule.png",
    photos: [
      "/images/places/istanbul-foule.png",
      "/images/places/bazar-epices.png",
      "/images/places/quartier-residentiel.png"
    ],
    audioTitle: "Les Turcs, un peuple aux mille visages",
    audioDuration: "3 min 10 sec",
    audioSrc: "/audio/Demographie_Turquie.mp3",
    history: "Avec environ 85 millions d'habitants, la Turquie est le deuxième pays le plus peuplé du Moyen-Orient. Sa population est très jeune, avec une médiane d'âge d'environ 33 ans. Istanbul concentre à elle seule plus de 15 millions d'habitants. Outre les Turcs, le pays compte des communautés kurdes, arabes, arméniennes, grecques et juives. L'urbanisation est rapide, avec plus de 75 % de la population vivant en ville.",
    anecdotes: [
      "Istanbul est la plus grande ville d'Europe par sa population.",
      "La diaspora turque en Europe compte plus de 5 millions de personnes.",
      "Le taux d'alphabétisation dépasse les 95 %, un héritage des réformes d'Atatürk."
    ]
  },
  {
    id: "economie",
    name: "Économie de la Turquie",
    shortDesc: "Une puissance émergente entre tradition et modernité",
    tag: "Économie",
    image: "/images/places/istanbul-financier.png",
    photos: [
      "/images/places/istanbul-financier.png",
      "/images/places/port-izmir.png",
      "/images/places/usine-turque.png"
    ],
    audioTitle: "L'économie turque, entre croissance et défis",
    audioDuration: "3 min 40 sec",
    audioSrc: "/audio/Economie_Turquie.mp3",
    history: "La Turquie possède une économie diversifiée, classée parmi les plus grandes puissances émergentes. Les secteurs clés incluent l'automobile, le textile, le tourisme, l'agriculture et la construction. Istanbul est le principal pôle financier. Le pays souffre cependant d'une inflation chronique et d'une volatilité de la livre turque. Le tourisme représente une source de devises essentielle, avec plus de 50 millions de visiteurs par an avant la pandémie.",
    anecdotes: [
      "La Turquie est le 5e plus grand producteur mondial de ciment.",
      "Le secteur textile emploie plus d'un million de personnes.",
      "Le pont du Bosphore a été financé par des emprunts internationaux dans les années 1970."
    ]
  },
  {
    id: "droits-homme",
    name: "Droits de l'homme en Turquie",
    shortDesc: "Entre avancées et défis contemporains",
    tag: "Société",
    image: "/images/places/manifestation-istanbul.png",
    photos: [
      "/images/places/manifestation-istanbul.png",
      "/images/places/place-taksim.png",
      "/images/places/journalistes-turcs.png"
    ],
    audioTitle: "Les droits de l'homme, un débat vivant",
    audioDuration: "3 min 55 sec",
    audioSrc: "/audio/Droits_Homme_Turquie.mp3",
    history: "La Turquie est membre du Conseil de l'Europe et signataire de la Convention européenne des droits de l'homme. Le pays a connu des avancées significatives dans les années 2000, notamment en matière de réduction de la peine de mort et d'harmonisation législative avec l'Union européenne. Cependant, la situation des libertés fondamentales, de la liberté de la presse et des droits des minorités reste un sujet de préoccupation pour les organisations internationales.",
    anecdotes: [
      "La Turquie a aboli la peine de mort en 2004 dans le cadre de son processus d'adhésion à l'UE.",
      "Le parc Gezi en 2013 a été le théâtre des plus grandes manifestations depuis des décennies.",
      "La Convention d'Istanbul sur les violences faites aux femmes a été signée en 2011."
    ]
  },
  {
    id: "religions",
    name: "Religions en Turquie",
    shortDesc: "Islam, christianisme et judaïsme : une terre de coexistence",
    tag: "Culture",
    image: "/images/places/mosquee-bleue.png",
    photos: [
      "/images/places/mosquee-bleue.png",
      "/images/places/eglise-saint-georges.png",
      "/images/places/synagogue-istanbul.png"
    ],
    audioTitle: "La Turquie, carrefour des croyances",
    audioDuration: "3 min 25 sec",
    audioSrc: "/audio/Religions_Turquie.mp3",
    history: "L'islam sunnite est la religion majoritaire, pratiquée par environ 99 % de la population. La Constitution turque garantit la liberté de culte et la laïcité de l'État. La Turquie abrite pourtant des communautés chrétiennes historiques (orthodoxes grecs, arméniens, catholiques) et une petite communauté juive sépharade à Istanbul. Les Alevis, une branche chiite de l'islam, représentent 15 à 25 % de la population musulmane.",
    anecdotes: [
      "Sainte-Sophie a été église, mosquée, musée, puis de nouveau mosquée.",
      "La maison de la Vierge Marie, près d'Éphèse, est un lieu de pèlerinage chrétien.",
      "Les derviches tourneurs sont des soufis de l'ordre mevlevi fondé par Rumi."
    ]
  },
  {
    id: "coutumes-traditions",
    name: "Coutumes et traditions turques",
    shortDesc: "Hospitalité, thé et cérémonies ancestrales",
    tag: "Culture",
    image: "/images/places/the-turc.png",
    photos: [
      "/images/places/the-turc.png",
      "/images/places/mariage-turc.png",
      "/images/places/narguilé-istanbul.png"
    ],
    audioTitle: "Les traditions turques, cœur de l'hospitalité",
    audioDuration: "3 min 15 sec",
    audioSrc: "/audio/Coutumes_Turquie.mp3",
    history: "L'hospitalité turque (misafirperverlik) est un pilier de la société : offrir du thé à un visiteur est un rituel sacré. Le café turc, inscrit au patrimoine immatériel de l'UNESCO, se boit dans de petites tasses avec sa lie. Les mariages traditionnels durent plusieurs jours, avec des rituels comme le henné (kına gecesi). Le narguilé (nargile) reste une activité sociale populaire dans les cafés d'Istanbul.",
    anecdotes: [
      "Les Turcs sont les plus grands consommateurs de thé au monde, avec 3,5 kg par personne et par an.",
      "On lit l'avenir dans le marc de café turc, une tradition appelée fal.",
      "Le hammam était autrefois un lieu de rencontre social, surtout pour les femmes."
    ]
  },
  {
    id: "culture-derviche-hammam",
    name: "Culture : Derviches tourneurs et Hammam",
    shortDesc: "Deux expressions spirituelles et corporelles de l'âme turque",
    tag: "Culture",
    image: "/images/places/derviche-tourneur.png",
    photos: [
      "/images/places/derviche-tourneur.png",
      "/images/places/hammam-interieur.png",
      "/images/places/dergah-konya.png"
    ],
    audioTitle: "Derviches et hammam, corps et âme",
    audioDuration: "4 min 00 sec",
    audioSrc: "/audio/Derviche_Hammam.mp3",
    history: "Le sema des derviches tourneurs est une cérémonie soufie où les participants tournent en transe pour atteindre l'extase spirituelle. Fondée par le poète Rumi au XIIIe siècle à Konya, cette pratique est inscrite au patrimoine immatériel de l'UNESCO. Le hammam, hérité des thermes romains et perfectionné par les Ottomans, est bien plus qu'un bain : c'est un rituel de purification, de détente et de socialisation, structuré autour du göbektaşı (pierre du nombril) central.",
    anecdotes: [
      "Les derviches tournent dans le sens des aiguilles d'une montre, bras droit vers le ciel, gauche vers la terre.",
      "Un hammam traditionnel comporte trois salles de température croissante.",
      "Le tellak (masseur) utilise un gant de crêpe (kese) pour exfolier la peau."
    ]
  }
];