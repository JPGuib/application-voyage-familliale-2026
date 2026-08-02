// Contenu de la rubrique "Géographie et Économie". Même structure que
// src/content/places.ts et src/content/histoire.ts : chaque entrée peut
// avoir des photos, un texte, et un audio associé.
//
// ⚠️ Contenu d'exemple à remplacer : les textes et images ci-dessous sont des
// placeholders. Pense à déposer les fichiers audio dans public/audio/ (ex:
// public/audio/geographie-releif.mp3) pour qu'ils fonctionnent.

export const GEOGRAPHIE_ECONOMIE_TOPICS = [
    {
    id: "carte-identite",
    name: "Carte d'identité de la Turquie",
    shortDesc: "Les fondamentaux d'une nation entre deux continents",
    tag: "Général",
    image: "/images/Geographie/Drapeau image 1.webp",
    photos: [
      "/images/Geographie/Drapeau image 1.webp",
      "/images/Geographie/Drapeau image 2.webp"
    ],
    audioTitle: "La Turquie en chiffres et en symboles",
    audioDuration: "3 min 30 sec",
    audioSrc: "/audio/geographie/Carte_identite_Turquie.mp3",
    history: "La République de Turquie (Türkiye Cumhuriyeti) est un État transcontinental à cheval entre l'Europe et l'Asie. Sa capitale, Ankara, a été choisie par Mustafa Kemal Atatürk en 1923 pour marquer la rupture avec l'ère ottomane dominée par Istanbul. Le pays s'étend sur 783 562 km² et compte environ 86 millions d'habitants. Sa langue officielle est le turc, écrit en alphabet latin depuis 1928, et sa monnaie est la lire turque (TRY). Le drapeau turc, rouge vif orné d'un croissant et d'une étoile blancs, trouve ses origines dans les bannières ottomanes. L'hymne national, İstiklâl Marşı (La Marche de l'Indépendance), composé par Mehmet Akif Ersoy, célèbre la résistance nationale. La fête nationale est célébrée le 29 octobre, date de la proclamation de la République en 1923. La Turquie est membre fondateur de l'OTAN (1952), de l'OCDE, du Conseil de l'Europe et du G20. Elle entretient des relations complexes avec l'Union européenne, dont elle est candidate officielle depuis 1999.",
    anecdotes: [
      "Le nom officiel du pays est passé de 'Turkey' à 'Türkiye' en 2022 à la demande d'Erdoğan.",
      "Ankara n'était qu'un village de 30 000 habitants avant d'être choisie comme capitale.",
      "Le croissant et l'étoile du drapeau turc ne sont pas des symboles religieux à l'origine, mais militaires ottomans."
    ]
  },
  {
    id: "Geographie",
    name: "Plateaux, chaînes montagneuses et détroits stratégiques",
    shortDesc: "Une terre modelée par les plaques tectoniques et les volcans",
    tag: "Géographie et géologie",
    image: "/images/Geographie/Géologie 1.webp",
    photos: [
      "/images/Geographie/Géologie 1.webp",
      "/images/Geographie/Géologie 2.webp",
      "/images/Geographie/Relief.webp"
    ],
    audioTitle: "La Turquie, laboratoire géologique du monde",
    audioDuration: "4 min 10 sec",
    audioSrc: "/audio/geographie/Geographie.mp3",
    historyLabel:"Présentation",
    history: 
      "Le relief turc est dominé par le vaste plateau anatolien, une surface élevée et ondulée qui occupe le centre du pays. Ce plateau est encadré par deux grandes barrières montagneuses : les chaînes du Pontique au nord, qui longent la mer Noire sur plus de 1 000 km et culminent à 3 937 m au Kaçkar Dağı, et les chaînes du Taurus au sud, s'étendant le long des côtes méditerranéennes avec des sommets dépassant 3 700 m. Le point culminant du pays est le mont Ararat (Ağrı Dağı), volcan éteint de 5 137 m situé à l'extrême est, réputé être le lieu d'échouage de l'Arche de Noé selon la Bible. Les détroits du Bosphore et des Dardanelles constituent des passages stratégiques entre l'Europe et l'Asie, reliant la mer Noire à la mer Égée. La mer de Marmara, entièrement située sur le territoire turc, relie ces deux détroits. Le pays possède plus de 8 300 km de littoral répartis entre quatre mers, offrant une variété de paysages côtiers allant des falaises escarpées aux plages de sable fin.\n"+
      "La Turquie est l'un des pays les plus actifs sismiquement au monde, situé au cœur de la ceinture alpine où s'affrontent les plaques arabes, africaine, indienne et eurasienne. Ce ballet tectonique, amorcé il y a 65 millions d'années, a façonné des paysages d'une diversité exceptionnelle. Le sol turc renferme des affleurements de roches précambriennes datant de plus de 540 millions d'années. En Anatolie centrale, la province volcanique a engendré les célèbres cheminées de fées de Cappadoce : des colonnes de tuf volcanique coiffées de basalte, sculptées par l'érosion sur des millions d'années. À Pamukkale, des sources thermales ont déposé des terrasses de travertin blanc éblouissant. Le pays compte également des failles majeures comme la faille nord-anatolienne et la faille est-anatolienne, responsables de tremblements de terre dévastateurs, dont celui de Kahramanmaraş en février 2023. Les volcans éteints comme l'Erciyes Dağı (3 917 m) et le Hasandağ (3 268 m) dominent encore le paysage cappadocien.\n",
    anecdotes: [
      "Les cheminées de fées de Cappadoce se forment à un rythme de 2 à 3 cm par millénaire.",
      "Pamukkale signifie littéralement 'château de coton' en turc, en référence à sa couleur blanche immaculée.",
      "Le tuf volcanique de Cappadoce est si tendre (dureté 2-4 sur l'échelle de Mohs) qu'on peut le sculpter à la main.",
      "Le mont Ararat est interdit d'ascension la plupart de l'année pour des raisons militaires, n'étant ouvert que quelques semaines en été.",
      "Le Bosphore sépare l'Europe de l'Asie sur seulement 700 m à son point le plus étroit.",
      "Les chaînes du Taurus abritent encore des populations nomades yörüks qui pratiquent la transhumance estivale."
    ]
  },
  {
    id: "environnement",
    name: "Environnement en Turquie",
    shortDesc: "Entre forêts luxuriantes, steppes arides et zones humides protégées",
    tag: "Environnement",
    image: "/images/Geographie/Environnement.webp",
    photos: [
      "/images/Geographie/Environnement.webp"
    ],
    audioTitle: "La nature turque, entre préservation et défis",
    audioDuration: "3 min 55 sec",
    audioSrc: "/audio/geographie/Environnement.mp3",
    history: "La Turquie abrite plus d'une douzaine d'écorégions distinctes selon le WWF, allant des forêts tempérées de feuillus de la côte de la mer Noire aux steppes arides de l'Anatolie centrale, en passant par les forêts méditerranéennes de conifères et les prairies alpines. Le pays compte environ 300 zones protégées, dont 44 parcs nationaux. Parmi les plus emblématiques figurent le parc national du mont Ararat (88 000 hectares), le parc national du lac Beyşehir (86 000 hectares) et le parc national de Yedigöller aux sept lacs. La protection de l'avifaune a fait d'importants progrès, avec plus d'une douzaine de sites Ramsar reconnus pour leur importance pour les oiseaux migrateurs. En juillet 2025, la Turquie a adopté une loi historique sur le climat, ouvrant la voie à un système d'échange de quotas d'émission (SEQE) national dont la phase pilote devrait débuter en 2026. Cependant, le pays fait face à des défis environnementaux majeurs : urbanisation galopante, pression touristique sur les sites fragiles comme la Cappadoce, et hausse des émissions de gaz à effet de serre.",
    anecdotes: [
      "Les forêts de la mer Noire sont les plus humides de Turquie, recevant jusqu'à 2 500 mm de pluie par an.",
      "Le parc national du mont Nemrut est classé au patrimoine mondial de l'UNESCO pour sa valeur naturelle et culturelle.",
      "Des cèdres vieux de 2 000 ans sont protégés comme monuments naturels près de Finike, sur la côte méditerranéenne."
    ]
  },
  {
    id: "climat",
    name: "Climat de la Turquie",
    shortDesc: "Quatre climats distincts pour un pays aux mille facettes météorologiques",
    tag: "Climat",
    image: "/images/Geographie/Climat.webp",
    photos: [
      "/images/Geographie/Climat.webp"
    ],
    audioTitle: "Du soleil méditerranéen aux blizzards de l'Est",
    audioDuration: "3 min 40 sec",
    audioSrc: "/audio/geographie/Climat_de_la_Turquie.mp3",
    history: "La Turquie présente quatre grands types climatiques qui coexistent sur son territoire. Sur les côtes égéenne et méditerranéenne, le climat est de type méditerranéen : hivers doux et pluvieux, étés chauds et secs, avec des températures estivales dépassant les 30°C et des précipitations annuelles comprises entre 580 et 1 300 mm. La côte de la mer Noire connaît un climat pontique océanique, unique en Turquie par ses pluies abondantes toute l'année — jusqu'à 2 500 mm dans l'est — et ses étés frais. L'intérieur des terres, sur le plateau anatolien, est soumis à un climat continental rigoureux : hivers glaciaux où les températures peuvent chuter à -30°C à -40°C dans l'est, avec une couverture neigeuse pouvant durer 120 jours, et étés torrides et secs avec à peine 400 mm de pluie annuelle à Ankara. Les régions montagneuses de l'Anti-Taurus ajoutent une dimension alpine à cette mosaïque, avec des villages parfois isolés par les tempêtes de neige. Mai est généralement le mois le plus humide, tandis que juillet et août sont les plus secs sur l'ensemble du territoire.",
    anecdotes: [
      "La température record de froid en Turquie est de -45,6°C, enregistrée dans la région égéenne.",
      "La côte de la mer Noire est la seule région du pays où il pleut abondamment en été.",
      "Les plaines de Konya et Malatya sont les zones les plus arides, avec moins de 300 mm de pluie par an."
    ]
  },
  {
    id: "demographie",
    name: "Démographie de la Turquie",
    shortDesc: "86 millions d'habitants, une population jeune et en mutation",
    tag: "Société",
    image: "/images/Geographie/Démographie 1.webp",
    photos: [
      "/images/Geographie/Démographie 1.webp",
      "/images/Geographie/Démographie 2.webp"
    ],
    audioTitle: "Les Turcs d'aujourd'hui et de demain",
    audioDuration: "3 min 50 sec",
    audioSrc: "/audio/geographie/Demographie.mp3",
    history: "Avec environ 86 millions d'habitants en 2025, la Turquie est le deuxième pays le plus peuplé du Moyen-Orient après l'Iran. Sa population est remarquablement jeune, avec une médiane d'âge d'environ 33 ans, bien que le vieillissement progressif et la baisse de la natalité commencent à modifier cette donne. L'urbanisation est massive : 93,6% de la population réside dans les centres provinciaux et de district, et plus de 75% vivent en ville. Istanbul, capitale économique et culturelle, concentre à elle seule plus de 15 millions d'habitants, en faisant la plus grande ville d'Europe. Outre la majorité turque, le pays abrite des communautés kurdes (15-20%), arabes, arméniennes, grecques et juives. La diaspora turque en Europe dépasse les 5 millions de personnes, dont 800 000 en France. Le taux d'alphabétisation excède les 95%, héritage direct des réformes d'Atatürk. Les projections démographiques estiment que la population turque atteindra environ 104 millions d'habitants d'ici 2050, avant d'entamer une phase de déclin.",
    anecdotes: [
      "Istanbul est la seule métropole au monde située sur deux continents.",
      "La Turquie a été l'un des premiers pays à accorder le droit de vote aux femmes, en 1934.",
      "Le pays accueille le plus grand nombre de réfugiés au monde, avec plus de 3 millions de Syriens."
    ]
  },
  {
    id: "economie",
    name: "Économie de la Turquie",
    shortDesc: "Une puissance émergente entre croissance et instabilité monétaire",
    tag: "Économie",
    image: "/images/Geographie/Economie 1.webp",
    photos: [
      "/images/Geographie/Economie 1.webp",
      "/images/Geographie/Economie 2.webp"
    ],
    audioTitle: "L'économie turque, moteur de l'Anatolie",
    audioDuration: "4 min 00 sec",
    audioSrc: "/audio/geographie/Economie.mp3",
    history: "La Turquie possède une économie diversifiée et industrialisée, classée parmi les plus grandes puissances émergentes du monde. Son PIB s'élève à environ 1 597 milliards de dollars en 2025, avec une croissance de 3,2% en 2024 et un PIB par habitant en parité de pouvoir d'achat de 41 914 USD. Les secteurs clés incluent l'automobile, le textile, le tourisme, l'agriculture, la construction et, plus récemment, l'industrie de la défense avec des drones de renommée mondiale comme ceux de Baykar. Le secteur textile emploie plus d'un million de personnes et représente près de 20% des exportations, plaçant le pays parmi les dix premiers exportateurs mondiaux. Le tourisme constitue une source de devises essentielle, ayant attiré plus de 50 millions de visiteurs par an avant la pandémie. Cependant, l'économie turque souffre d'une inflation chronique (34,9% en 2025, en baisse selon les projections), d'une volatilité extrême de la lire turque et d'un déficit chronique de la balance courante. La Bourse d'Istanbul est devenue le refuge des épargnants face à l'inflation galopante. Le pays est également le cinquième producteur mondial de ciment.",
    anecdotes: [
      "La Bourse d'Istanbul a enregistré l'une des meilleures performances mondiales en 2022, malgré l'inflation record.",
      "Le secteur des drones militaires turcs, incarné par Baykar, exporte vers plus de 30 pays.",
      "Le pont du Bosphore a été financé par des emprunts internationaux dans les années 1970 et a été remboursé en 12 ans."
    ]
  },
  {
    id: "politique",
    name: "Politique en Turquie",
    shortDesc: "D'une république parlementaire à un régime présidentiel fort",
    tag: "Politique",
    image: "/images/Geographie/Politique 1.webp",
    photos: [
      "/images/Geographie/Politique 1.webp",
      "/images/Geographie/Politique 2.webp"
    ],
    audioTitle: "Le pouvoir et les institutions turques",
    audioDuration: "4 min 15 sec",
    audioSrc: "/audio/geographie/Politique.mp3",
    history: "La Turquie est une république fondée en 1923 sur les principes de laïcité, de nationalisme et de modernisation. Sa Constitution, adoptée en 1982, a été profondément amendée par le référendum de 2017 qui a instauré un régime présidentiel fort, concentrant les pouvoirs exécutifs entre les mains du président de la République. Recep Tayyip Erdoğan, au pouvoir depuis 2003 d'abord comme Premier ministre puis comme président depuis 2014, domine la vie politique turque. Le Parlement, la Grande Assemblée Nationale (TBMM), compte 600 députés élus pour cinq ans. Le Parti de la Justice et du Développement (AKP) est au pouvoir depuis 2002. La Turquie est membre fondateur de l'OTAN (1952) et candidate à l'adhésion à l'Union européenne depuis 1999, bien que les négociations soient pratiquement gelées. Le pays est également membre du Conseil de l'Europe et signataire de la Convention européenne des droits de l'homme. La vie politique turque est marquée par des tensions autour des libertés fondamentales, de la liberté de la presse, des droits des minorités et du rôle de la religion dans la société.",
    anecdotes: [
      "Le palais présidentiel d'Ankara, inauguré en 2014, compte 1 150 pièces sur une surface de 200 000 m².",
      "La Turquie est le seul pays musulman membre de l'OTAN depuis sa création en 1952.",
      "Le parc Gezi en 2013 a été le théâtre des plus grandes manifestations depuis des décennies, rassemblant des millions de personnes."
    ]
  }
];
