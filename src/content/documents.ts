export const DOCUMENT_CATEGORIES = [
  "VOLS",
  "TRANSPORTS",
  "SEJOUR",
  "HEBERGEMENT",
  "RESTAURANT",
  "ACTIVITES",
  "PAPIERS",
  "ASSURANCE",
  "BANQUE",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type TravelDocumentLink = {
  label: string;
  url: string;
};

export type TravelDocument = {
  id: string;
  category: DocumentCategory;
  title: string;
  content: string;
  tag?: string;
  day?: number | number[];
  details?: string[];
  scans?: string[];
  links?: TravelDocumentLink[];
  gps?: string;
};

export const DOCUMENTS: TravelDocument[] = [
  {
    id: "vol-nantes-paris-af7507",
    category: "VOLS",
    title: "Nantes → Paris",
    tag: "AF7507",
    day: 1,
    content:
      "Vol **AF7507** de Nantes (NTE) à Paris Charles de Gaulle (CDG).\n" +
      "Départ à **19h45** pour une arrivée à **20h55**.\n" +
      "Arrivée à Charles de Gaulle terminal **2F**.\n" +
      "**Réservation** : ZT59SQ",
    details: [
      "Petit sac : 40 x 30 x 15 cm",
      "Valise cabine : 55 x 25 x 35 cm",
      "Valide soute : 158 cm (sommes des 3 dimensions)",
      "Poids cabine (sac + valise): 12 kg max",
      "Poids soute : 23 kg max",
    ],
    scans: [
      "/images/Vol/Avion aller JPG.webp",
      "/images/Vol/Avion aller KG.webp",
      "/images/Vol/Avion aller Thomas.webp",
      "/images/Vol/Avion aller Emma.webp",
      "/images/Vol/Avion aller Julie.webp",
    ],
    links: [
      {
        label: "Accès à la réservation",
        url: "https://wwws.airfrance.fr/trip/trip-details/371a6c00-10f2-4c91-92ac-b7d6564bae1e",
      },
    ],
  },
  {
    id: "vol-paris-istanbul-af1390",
    category: "VOLS",
    title: "Paris → Istanbul",
    tag: "AF1390",
    day: 1,
    content:
      "Vol **AF1390** de Paris Charles de Gaulle (CDG) à Istanbul (IST).\n" +
      "Départ à **22h55** pour une arrivée à **03h30**.\n" +
      "Départ depuis Charles de Gaulle terminal **2E**.\n" +
      "**Réservation** : ZT59SQ",
    details: [
 "Petit sac : 40 x 30 x 15 cm",
      "Valise cabine : 55 x 25 x 35 cm",
      "Valide soute : 158 cm (sommes des 3 dimensions)",
      "Poids cabine (sac + valise): 12 kg max",
      "Poids soute : 23 kg max",
    ],
    scans: [
      "/images/Vol/Avion aller JPG.webp",
      "/images/Vol/Avion aller KG.webp",
      "/images/Vol/Avion aller Thomas.webp",
      "/images/Vol/Avion aller Emma.webp",
      "/images/Vol/Avion aller Julie.webp",
    ],
    links: [
      {
        label: "Accès à la réservation",
        url: "https://wwws.airfrance.fr/trip/trip-details/371a6c00-10f2-4c91-92ac-b7d6564bae1e",
      },
    ],
  },
  {
    id: "vol-istanbul-nantes-to3421",
    category: "VOLS",
    title: "Istanbul → Nantes",
    tag: "TO3421",
    day: 10,
    content:
      "Vol Transavia **TO3421** de Istanbul (IST) à Nantes (NTE).\n" +
      "Départ à **14h00** pour une arrivée à **17h10**.\n" +
      "**Sièges** : 15D, 15E, 15F, 16E, 16F\n" +
      "Priority boarding.\n" +
      "**Réservation** : XBGN4C",
    details: [
      "Petit sac : 40 x 30 x 20 cm",
      "Valise cabine : 55 x 25 x 40 cm",
      "Valide soute : 168 cm (sommes des 3 dimensions)",
      "Poids cabine (sac + valise): 10 kg max",
      "Poids soute : 30 kg max",
    ],
    links: [
      {
        label: "Accès à la réservation",
        url: "https://customerlogin.transavia.com/379fb04b-964b-4985-965c-2d9097eef215/b2c_1a_customer_signuporsignin/oauth2/v2.0/authorize?client_id=ed9a43b5-64fb-47b1-abac-bc510a1802e5&redirect_uri=https%3A%2F%2Fwww.transavia.com%2Fapi%2Fpersonalaccountauth%2Fcallback&response_type=code&scope=openid%20https%3A%2F%2Ftransaviacustomerprod.onmicrosoft.com%2Fshared-api%2Fcustomer.profile.read&code_challenge_method=S256&code_challenge=NlBXc6f0dODwkm5-5kjZpEejRRYBY5FbSzeylqp4opo&state=OpenIdConnect.AuthenticationProperties%3DL2dwjWMIX3JHTgkzmG0Kw2tdO5NCicdthlMO2uc_mXisWeI8SWktD8X5DGrvqhhCxmUgAZ_H1hS_dZRvhKPfjxJILknEhSs4EYGlY3nG-qNeoOJpRaJfAD1-OBRe1tdA-5MJn5WviRFUbCPuNUiwTyRbseMQlkE5NjAoRtRjQDTTsmbpKp_4ipOrnmSYCY7YH1Ngnxfs4XJeD4-DW22_TMLbkeFbel7L0sEm6mxnl_W5ArpggbNKqHQnUt9L5W08mfEplCbouyaVvtDyB1NjtzGjkLE-U0fpog5i1Toaz4LE2lsffdobU36UVmVMzw12ILi54v2RArB5ckoR3knk6tof_Nxw91IzrebLxWXbW3BtclMhU5rstFdW5w2BGLN0qQjCRaZT_ibEDOvM6JpUEuxE1MXRoqzt71sWnqy8dlJGgVVRdaJ8U9RQ-nJ_fvi9HX3CEBPoQa2ylX84Eb8KNNxa_GVAJe__dS3HbIdF8g3zOr12MhsbcjaTX6UiBEu_yIC0F2SI1mumMGols1XEmMBXyVKTCHjse7l23huMcGc&response_mode=form_post&ui_locales=fr-FR&locale=fr-FR&x-client-SKU=ID_NET461&x-client-ver=5.7.0.0",
      },
    ],
    scans: [
      "/images/Vol/Vol retour JPG.webp",
      "/images/Vol/Vol retour KG.webp",
      "/images/Vol/Vol retour Thomas.webp",
      "/images/Vol/Vol retour Emma.webp",
      "/images/Vol/Vol retour Julie.webp", 
    ],
  },
  {
    id: "Parking-aeroport-Nantes",
    category: "VOLS",
    title: "Parking Nantes Atlantique",
    tag: "Parking",
    content:
      "Parking aéroport de Nantes Atlantique réservés :",
    details: [
      "Réservation : FLE1300704",
      "Parking : P7 Eco",
      ],
    links: [
      {
        label: "Accès à la réservation",
        url: "https://reservationparking.nantes.aeroport.fr/mon-compte/identification",
      },
    ],
    scans: [
      "/images/Vol/Parking QRCode.webp",
      "/images/Vol/Parking 1.webp",
      "/images/Vol/Parking 2.webp",
    ],
  },
  {
    id: "hotel-istanbul-windsor",
    category: "HEBERGEMENT",
    title: "Istanbul - Windsor Hotel & Convention Center",
    tag: "Instanbul",
    day: [2, 3, 9],
    content:
      "Réservation famille pour le séjour à Istanbul.\n" +
      "**Hôtel** : Windsor Hotel & Convention Center – Bayrampaşa\n" +
      "**Catégorie** : 5 étoiles\n" +
      "**Adresse** : Yenidoğan, Erciyes Sokağı No: 7, 34030 Bayrampaşa/İstanbul, Turquie\n" +
      "**Téléphone** : +90 212 674 44 00",
    details: [
      "Check-in à partir de 14h00",
      "Check-out avant 12h00",
      "Hôtel 5 étoiles",
    ],
    links: [
      {
        label: "Site officiel de l'hôtel",
        url: "https://www.windsoristanbul.com/",
      },
    ],
    gps: "41.04431,28.91344",
},
{
  id: "hotel-ankara-hiltonsa",
  category: "HEBERGEMENT",
  title: "Ankara - HiltonSA",
  tag: "Ankara",
  day: 4,
  content:
    "Réservation famille pour le séjour à Ankara.\n" +
    "**Hôtel** : Ankara HiltonSA\n" +
    "**Catégorie** : 5 étoiles\n" +
    "**Adresse** : Kavaklıdere, Tahran Cd. No:12, 06700 Çankaya/Ankara, Turquie\n" +
    "**Téléphone** : +90 312 455 00 00",
  details: [
    "Check-in à partir de 14h00",
    "Check-out avant 12h00",
    "Hôtel 5 étoiles",
  ],
  links: [
    {
      label: "Site officiel de l'hôtel",
      url: "https://www.hilton.com/en/hotels/ankhitw-ankara-hiltonsa/",
    },
  ],
  gps: "39.90168,32.86437",
},
{
  id: "hotel-cappadoce-burcu-kaya",
  category: "HEBERGEMENT",
  title: "Cappadoce - Burcu Kaya Hotel",
  tag: "Cappadoce",
  day: [5, 6],
  content:
    "Réservation famille pour le séjour en Cappadoce.\n" +
    "**Hôtel** : Burcu Kaya Hotel\n" +
    "**Catégorie** : 4 étoiles\n" +
    "**Adresse** : Bahçelievler Mah. İsmail Yavuz Cad. 19/1, 50650 Ortahisar/Ürgüp/Nevşehir, Turquie\n" +
    "**Téléphone** : +90 384 343 32 00",
  details: [
    "Hôtel 4 étoiles",
    "Situé à Ortahisar, au cœur de la Cappadoce",
    "Hôtel de style traditionnel cappadocien",
  ],
  links: [
    {
      label: "Site officiel de l'hôtel",
      url: "https://burcukayahotel.com/",
    },
  ],
  gps: "38.62519,34.86333",
},

{
  id: "hotel-pamukkale-pam-thermal",
  category: "HEBERGEMENT",
  title: "Pamukkale - Pam Thermal Hotel",
  tag: "Pamukkale",
  day:7,
  content:
    "Réservation famille pour le séjour à Pamukkale.\n" +
    "**Hôtel** : Pam Thermal Hotel\n" +
    "**Catégorie** : 5 étoiles\n" +
    "**Adresse** : Karahayıt, 120. Sağlık Sk No:5/1, 20190 Pamukkale/Denizli, Turquie\n" +
    "**Téléphone** : +90 258 404 01 32",
  details: [
    "Hôtel 5 étoiles",
    "Situé à Karahayıt, à proximité de Pamukkale",
    "Station thermale",
  ],
  links: [
    {
      label: "Site officiel de l'hôtel",
      url: "https://www.pamthermal.com/",
    },
  ],
  gps: "37.96271,29.10789",
},
{
  id: "hotel-izmir-park-inn",
  category: "HEBERGEMENT",
  title: "Izmir - Park Inn by Radisson",
  tag: "Izmir",
  day: 8,
  content:
    "Réservation famille pour le séjour à Izmir.\n" +
    "**Hôtel** : Park Inn by Radisson İzmir\n" +
    "**Catégorie** : 4 étoiles\n" +
    "**Adresse** : Alsancak Mahallesi, Cumhuriyet Blv No:124, 35210 Konak/İzmir, Turquie\n" +
    "**Téléphone** : +90 232 404 42 42",
  details: [
    "Check-in à partir de 14h00",
    "Check-out avant 12h00",
    "Hôtel 4 étoiles",
    "Situé à proximité du front de mer de Kordon",
  ],
  links: [
    {
      label: "Site officiel de l'hôtel",
      url: "https://www.radissonhotels.com/tr-tr/oteller/park-inn-izmir",
    },
  ],
  gps: "38.427069,27.1331611",
},
  {
    id: "assurance-voyage-famille",
    category: "ASSURANCE",
    title: "Assurance Matmut",
    tag: "Assurance",
    content:
      "Contrat d'assistance.\n" +
      "**Compagnie** : MATMUT\n" +
      "**Numéro sociétaire** : 590204005028G\n" +
      "Depuis la France  : 0 800 30 20 30\n" +
      "Depuis l'étranger +33 5 49 34 83 47\n" +
      "Téléphone urgence : +33 1 70 00 00 00",
    details: [
      "Conserver la carte d'assuré dans chaque sac cabine",
      "Numéro d'assistance disponible 24h/24",
    ],
    scans: [
      "/images/Vol/Memo matmut 1.webp",
      "/images/Vol/Memo matmut 2.webp",
    ],
  },
  {
    id: "passeports-famille",
    category: "PAPIERS",
    title: "Passeports",
    tag: "Passeports",
    content:
      "Numéros de passeport :",
    details: [
      "JP : 25EE06870 - expire le 01/07/2035",
      "KG : 25DK73206 - expire le 10/06/2035",
      "Emma : 21CA91950 - expire le 06/06/2031",
      "Thomas : 25CE42308 - expire le 16/03/2035",
      "Julie : 26AH17517 - expire le 18/02/2036",
    ],
    scans: [
      "/images/tips/Passeport JPG.webp",
      "/images/tips/Passeport KG.webp",
      "/images/tips/Passeport Thomas.webp",
      "/images/tips/Passeport Emma.webp",
      "/images/tips/Passeport Julie.webp",
    ]
  },
  {
    id: "LCL",
    category: "BANQUE",
    title: "Service carte CB LCL",
    tag: "Banque",
    content:
      "Déclarer le vol ou la perte de votre carte 24h/24",
    details: [
      "Depuis l'appli LCL Mes comptes",
      "Par téléphone (France et Etranger) : +33 9 69 32 03 10",
      ],
  },
  {
    id: "reservation-transfert-aeroport",
    category: "TRANSPORTS",
    title: "Transfert aéroport IST → hébergement",
    tag: "Transfert",
    day: 1,
    content:
      "Navette réservée par le voyagiste pour le transfert de l'aéroport d'Istanbul (IST) vers l'hôtel",
    details: [
      "Il faut sortir par la poste n°9 une fois bagages récupérés et formalités de douane passées",
      "Il ne faut pas descendre à l'étage -2 !",
      "Notre assistant nous accueillera à la sortie avec un panneau de Voyage Privé",
      "En cas d'urgence, il faut appeler le voyagiste au +90 545 344 55 08",
      "Le point de rencontre et le plan sont indiqués sur le scan ci-dessous",
    ],
    scans: [
      "/images/guide/Information Transfert 1.webp",
      "/images/guide/Information Transfert 2.webp",
    ],  
  },
  {
    id: "Navettes-Bateau-Istanbul",
    category: "TRANSPORTS",
    title: "Navettes bateau Istanbul",
    tag: "Navettes",
    content:
    "Les bateaux-navettes sont l'un des moyens les plus agréables de se déplacer à Istanbul. Ils permettent notamment de traverser le Bosphore entre la rive européenne et la rive asiatique, tout en profitant d'une superbe vue sur la ville.",
    details: [
    "Les principales lignes relient notamment Eminönü, Karaköy, Beşiktaş, Üsküdar et Kadıköy",
    "Les bateaux permettent de passer très facilement d'une rive à l'autre du Bosphore",
    "Le trajet entre l'Europe et l'Asie ne prend généralement que quelques dizaines de minutes",
    "L'Istanbulkart peut être utilisée pour régler les trajets sur les transports publics, y compris les ferries municipaux",
    "Il est conseillé de se placer à l'extérieur ou sur le pont supérieur lorsque cela est possible pour profiter de la vue",
    "Les horaires et les fréquences varient selon les lignes et les jours de la semaine",
    "Attention à bien vérifier le quai et la destination affichée avant de monter à bord",
    "Ces navettes sont des transports en commun et non des croisières touristiques : elles permettent néanmoins de découvrir Istanbul depuis le Bosphore à moindre coût",
    ],
    scans: [
      "/images/guide/Carte ferry Istanbul sehirhatrali.webp",
    ],
    links: [
      {
        label: "Carte des ferries d'Istanbul",
        url: "https://www.sehirhatlari.istanbul"
      },
    ],    
},
  {
    id: "restaurant-vina-garden",
    category: "RESTAURANT",
    title: "Sultanahmet - La Vina Garden 1864 Restaurant",
    tag: "Réservé",
    day: 2,
    content:
      "**Nom** : La Vina Garden 1864 Restaurant\n" +
      "**Description** : Situé dans le quartier historique de Sultanahmet, La Vina Garden 1864 propose une cuisine raffinée dans un cadre élégant. C'est une adresse à réserver pour profiter d'un dîner de qualité au cœur de la vieille ville.\n" +
      "**Adresse** : Sultanahmet, Istanbul, Turquie",
    details: [
      "Réservation confirmée à 19h30/20h via whatsapp.",
      "Situé à Sultanahmet, à proximité des principaux monuments.",
      "Le restaurant propose une carte mêlant cuisine turque traditionnelle et créations modernes.",
      "Idéal pour aller ensuite se promener dans le quartier de Sultanahmet après le dîner.",
    ],
    links: [
      {
        label: "Site du restaurant",
        url: "https://www.lavina1864.com/",
      },
      {
        label: "Avis tripadvisor restaurant",
        url: "https://www.tripadvisor.fr/Restaurant_Review-g293974-d28117312-Reviews-La_Vina_Garden_1864_Restaurant-Istanbul.html",
      }
    ],
    gps: "41.0040927,28.9787788",
    scans: [
      "/images/guide/VinaGarden resa.webp",
    ]
  },
  {
    id: "restaurant-tershane",
    category: "RESTAURANT",
    title: "Karaköy - Tershane Restaurant",
    tag: "Réservé",
    day: 3,
    content:
      "**Nom** : Tershane Restaurant\n" +
      "**Description** : Installé au 8ᵉ étage de l'Hotel Momento, dans le quartier de Karaköy, Tershane propose une cuisine turque contemporaine autour des mezzés, des kebabs et des grillades de viande. L'établissement bénéficie du Bib Gourmand du Guide Michelin et offre une belle vue sur les toits et les monuments historiques d'Istanbul. La terrasse située au 9ᵉ étage permet de profiter encore davantage de la vue.\n" +
      "**Adresse** : Arap Cami Mahallesi, Tersane Caddesi No:24, Hotel Momento, Karaköy/Beyoğlu, Istanbul, Turquie",
    details: [
      "Réservation confirmée pour le dîner.", 
      "Restaurant situé au 8ᵉ étage de l'Hotel Momento, dans le quartier de Karaköy.",
      "Le restaurant possède un Bib Gourmand du Guide Michelin, récompensant une cuisine de qualité à bon rapport qualité-prix.",
      "La carte met notamment à l'honneur les mezzés, les kebabs et les grillades d'agneau préparées au feu.",
      "Les grandes baies vitrées offrent une vue sur le panorama historique d'Istanbul.",
      "La terrasse du 9ᵉ étage offre une vue encore plus spectaculaire et permet de prendre un verre avant ou après le repas.",
      "La cuisine ouverte permet d'observer les chefs préparer les plats.",
    ],
    links: [
      {
        label: "Guide Michelin",
        url: "https://guide.michelin.com/fr/fr/istanbul-province/istanbul/restaurant/tershane",
      },
      {
        label: "Avis Tripadvisor restaurant",
        url: "https://www.tripadvisor.fr/Restaurant_Review-g293974-d15222680-Reviews-Tershane_Karakoy-Istanbul.html",
      }
    ],
    gps: "41.0252,28.9744",
    scans: [
      "/images/Jour 3/Tershane - 1.webp",
      "/images/Jour 3/Tershane - 2.webp",
    ]
  },
  {
    id: "restaurant-muutto",
    category: "RESTAURANT",
    title: "Galataport - Muutto Anatolian Tapas Bar",
    tag: "Réservé",
    day: 3,
    content:
      "**Nom** : Muutto Anatolian Tapas Bar\n" +
      "**Description** : Situé au cœur de Galataport, Muutto Anatolian Tapas Bar propose une cuisine originale inspirée des tapas espagnoles et revisitée avec les saveurs, les produits et les traditions culinaires de l'Anatolie. L'adresse offre un cadre moderne et animé, avec une terrasse donnant directement sur le front de mer et les bateaux du Bosphore.\n" +
      "**Adresse** : Kılıçali Paşa, Meclis-i Mebusan Caddesi No:8, Galataport, Beyoğlu, Istanbul, Turquie",
    details: [
      "Réservation confirmée pour le dîner.",
      "Restaurant situé au cœur de Galataport, facilement accessible depuis le quartier de Karaköy.",
      "La cuisine mélange l'esprit des tapas avec des ingrédients et des recettes inspirés de différentes régions d'Anatolie.",
      "Le concept est particulièrement adapté au partage : plusieurs plats peuvent être commandés au milieu de la table.",
      "Parmi les spécialités proposées : assortiment de mezzés anatoliens, tapas végétariennes, tapas de poisson ou de viande, pide, brochettes et poissons grillés.",
      "La terrasse située côté mer est particulièrement agréable pour profiter de l'ambiance de Galataport et de la vue sur les bateaux.",
      "Le restaurant est également recommandé par le Guide Michelin, qui souligne notamment son travail de réinterprétation des tapas à travers la cuisine turque.",
      ],
    links: [
      {
        label: "Site du restaurant",
        url: "https://www.muutto.com.tr/",
      },
      {
        label: "Menu Galataport",
        url: "https://www.muutto.com.tr/en/menu?menu=galataport",
      },
      {
        label: "Guide Michelin",
        url: "https://guide.michelin.com/gb/en/istanbul-province/istanbul/restaurant/muutto-anatolian-tapas-bar",
      },
      ],
      gps: "41.0278,28.9821",
      scans: [
        "/images/Jour 3/Muutto - 1.webp",
      ],
  },
  {
    id: "restaurant-happena",
    category: "RESTAURANT",
    title: "Göreme - Happena Restaurant",
    tag: "Réservé",
    day: 5,
    content:  
      "**Description** : Installé dans le Kelebek Special Cave Hotel, Happena propose une cuisine turque inspirée des traditions anciennes de l'Anatolie et notamment de la civilisation hittite. Les recettes s'appuient sur des textes anciens et mettent à l'honneur les épices traditionnelles, les viandes grillées et les cuissons au feu de bois. Le restaurant bénéficie d'un Bib Gourmand du Guide Michelin et ses terrasses offrent une magnifique vue panoramique sur Göreme.\n" +
      "**Adresse** : Aydınlı Mahallesi, Yavuz Sokak No:1, Göreme, Nevşehir, Turquie",
    details: [
      "Réservation confirmée pour le dîner.",
      "Restaurant situé dans le Kelebek Special Cave Hotel, sur les hauteurs de Göreme.",
      "Le restaurant possède un Bib Gourmand du Guide Michelin, récompensant une cuisine de qualité à bon rapport qualité-prix.",
      "La cuisine s'inspire de la gastronomie des Hittites et des anciennes traditions culinaires anatoliennes.",
      "Les plats utilisent notamment des épices traditionnelles et des viandes grillées ou cuites au feu de bois.",
      "Une des spécialités mises en avant est l'agneau cuit au feu de bois, accompagné de pain pita, d'une sauce au miel et au gingembre et de pickles et raisins fermentés.",
      "Les terrasses du restaurant offrent une vue spectaculaire sur Göreme et ses paysages de Cappadoce.",
      "Le cadre troglodytique et traditionnel du Kelebek Special Cave Hotel renforce le caractère particulièrement dépaysant du restaurant.",
      ],
    links: [
    {
      label: "Guide Michelin",
      url: "https://guide.michelin.com/fr/fr/nevsehir/nevsehir-merkez_2821449/restaurant/happena",
    },
    {
      label: "Avis Tripadvisor restaurant",
      url: "https://www.tripadvisor.fr/Restaurant_Review-g297983-d25448629-Reviews-Happena_Cappadocia-Goreme_Nevsehir_Province_Cappadocia.html",
    },
    ],
    gps: "38.6446,34.8272",
    scans: [
      "/images/Jour 5/Happena - 1.webp",
      "/images/Jour 5/Happena - 2.webp",
      ]
  },
  {
    id: "restaurant-kaira-rooftop",
    category: "RESTAURANT",
    title: "Göreme - Kaira Rooftop Bar & Restaurant",
    tag: "Réservé",
    day: 5,
    content:
      "Un dîner avec vue sur les cheminées de fées.\n" +
      "**Nom** : Kaira Rooftop Bar & Restaurant\n" +
      "**Description** : Situé au cœur de Göreme, le Kaira Rooftop Bar & Restaurant offre l'une des plus belles vues sur les célèbres cheminées de fées de Cappadoce. Depuis sa terrasse panoramique, les visiteurs profitent d'un cadre exceptionnel, particulièrement au coucher du soleil, tout en dégustant une cuisine turque généreuse accompagnée de quelques spécialités internationales.\n" +
      "**Adresse** : Göreme, Cappadoce, Turquie",
    details: [
      "ATTENTION : réservation non faite, venir vers 18h30/19h00 pour avoir une table pour 5 avec vue sur couché du soleil.",
      "Terrasse panoramique offrant une vue spectaculaire sur Göreme et les cheminées de fées.",
      "Le coucher du soleil est le moment le plus prisé.",
      "Cuisine turque traditionnelle, grillades, mezzés et quelques plats internationaux.",
      "Situé à quelques minutes à pied du centre de Göreme, il est facilement accessible après une balade dans le village.",
    ],
    links: [
      { 
        label: "Avis tripadvisor restaurant",
        url: "https://www.tripadvisor.fr/Restaurant_Review-g297983-d25997073-Reviews-Kaira_Rooftop_Bar_Restaurant-Goreme_Nevsehir_Province_Cappadocia.html",
      },
    ],
    gps: "38.6439,34.8283",
  },
  {
    id: "restaurant-sky-rooftop",
    category: "RESTAURANT",
    title: "Göreme - Sky Cappadocia Rooftop & Restaurant",
    tag: "Non réservé",
    day: 5,
    content:
      "Une vue imprenable sur Göreme au coucher du soleil.\n" +
      "**Nom** : Sky Cappadocia Rooftop & Restaurant\n" +
      "**Description** : Perché sur les hauteurs de Göreme, le Sky Cappadocia Rooftop & Restaurant offre une vue panoramique exceptionnelle sur les vallées et les célèbres cheminées de fées. Sa terrasse est particulièrement appréciée au moment du coucher du soleil, lorsque les falaises volcaniques se parent de teintes dorées. La carte met à l'honneur les saveurs de la cuisine turque, accompagnées d'une belle sélection de vins et de cocktails, dans une ambiance élégante et décontractée.\n" +
      "**Adresse** : Göreme, Cappadoce, Turquie",
    details: [
      "Pas de réservation faite, il faudra se rendre sur place.",
      "L'un des meilleurs endroits de Göreme pour admirer le coucher du soleil.",
      "Terrasse avec vue panoramique sur les vallées et les habitations troglodytiques.",
      "Cuisine turque, mezzés, grillades et cocktails servis dans une ambiance lounge.",
      "Il est conseillé de réserver une table en terrasse, particulièrement entre avril et octobre.",
    ],
    links: [
      {
        label: "Avis tripadvisor restaurant",
        url: "https://www.tripadvisor.fr/Restaurant_Review-g297983-d33133833-Reviews-Sky_Cappadocia_Rooftop_Restaurant-Goreme_Nevsehir_Province_Cappadocia.html",
      },
    ],
    gps: "38.6437,34.8277",
  },
  {
    id: "restaurant-nana-cappadocia",
    category: "RESTAURANT",
    title: "Göreme - NANA Cappadocia Restaurant",
    tag: "Réservé",
    day: 6,
    content:
      "Un dîner en terrasse au cœur de Göreme.\n" +
      "**Nom** : NANA Cappadocia Restaurant\n" +
      "**Description** : Situé au cœur de Göreme, NANA Cappadocia Restaurant séduit par sa terrasse offrant une vue sur le village et les paysages emblématiques de la Cappadoce. Dans une ambiance chaleureuse et élégante, le restaurant propose une cuisine turque mettant à l'honneur les spécialités locales, préparées avec des produits frais. C'est une adresse idéale pour terminer une journée d'exploration en profitant d'un dîner face aux reliefs uniques de la région.\n" +
      "**Adresse** : İsali - Gaferli, Göreme, Cappadoce, Turquie",
    details: [
      "Réservation confirmée via WhatsApp.",
      "Jeudi 21 août à 19 h 15.",
      "Table réservée en terrasse pour 5 personnes.",
      "Situé dans le quartier d'İsali - Gaferli, à quelques minutes à pied du centre de Göreme.",
      "Le restaurant est réputé pour son cadre agréable, particulièrement au coucher du soleil.",
    ],
    links: [
      {
        label: "Site du restaurant & bar",
        url: "https://nanacappadocia.com/gallery/",
      },
    ],
    gps: "38.641846,34.829168",
    scans: [
      "/images/Jour 6/Reservation Nana Cappadoce.webp",
    ]
  },
  {
    id: "restaurant-numero-10-ortahisar",
    category: "RESTAURANT",
    title: "Ortahisar - Restaurant N°10",
    tag: "Non réservé",
    day: 6,
    content:
      "Une soirée conviviale au cœur d'Ortahisar.\n" +
      "**Nom** : Restaurant N°10\n" +
      "**Description** : Situé à Ortahisar, à proximité de l'hôtel, le Restaurant N°10 propose une expérience conviviale au cœur d'un des villages emblématiques de Cappadoce. Ortahisar est connu pour son imposante forteresse rocheuse qui domine la vallée et ses ruelles authentiques bordées de maisons traditionnelles. Après une journée de découverte des paysages cappadociens, ce restaurant offre une halte agréable pour profiter de la cuisine locale dans une ambiance chaleureuse.\n" +
      "**Adresse** : Ulus Meydanı Kaledibi Sok. Ortahisar, Ürgüp, Nevşehir, Turquie",
    details: [
      "Demande de réservation effectuée par SMS, confirmation en attente.",
      "Horaire souhaité : 19 h 15.",
      "Restaurant situé à proximité de l'hôtel, pratique pour une soirée sans déplacement.",
      "Adresse : Ulus Meydanı Kaledibi Sok. Ortahisar, Ürgüp, Nevşehir, Turquie.",
      "Ortahisar est célèbre pour sa grande forteresse naturelle creusée dans la roche volcanique.",
    ],
    links: [
      {
        label: "Avis tripadvisor restaurant",
        url: "https://www.tripadvisor.fr/Restaurant_Review-g297987-d10682874-Reviews-No_10_Restaurant-Ortahisar_Nevsehir_Province_Cappadocia.html",
      },
    ],
    gps: "38.6177,34.8719",
  },
  {
    id: "Montgolfiere-rainbow-balloons",
    category: "ACTIVITES",
    title: "Tour en montgolfière",
    day: 5,
    tag: "Résevé",
    content:
      "Vol en montgolfière au lever du soleil à Göreme.\n" +
      "Départ vers 4h30 pour une durée de 3h30 environ.",
    details: [
      "Réservation via Getyourguide (réf : GYGVN276568A)",
      "Pin: GLLjwTcr",
      "ANNULER VIA APPLI GETYOURGUIDE sur le téléphone AVANT LE 19 AOÜT POUR AVOIR REMBOURSEMENT TOTAL ET AVANT LE 17 AOUT POUR NE RIEN PAYER DU TOUT",
    ],
    scans: [
      "/images/Guide/Montgolfière jour 5 - 1.webp",
      "/images/Guide/Montgolfière jour 5 - 2.webp",
    ]
  },
  {
    id: "Montgolfiere-discovery-balloons",
    category: "ACTIVITES",
    title: "Tour en montgolfière",
    day: 6,
    tag: "Résevé",
    content:
      "Vol en montgolfière au lever du soleil à Göreme.\n" +
      "Départ vers 4h30 pour une durée de 3h30 environ.",
    details: [
      "Réservation via Tripadvisor (réf : 1408043143)",
      "ANNULER VIA APPLI TRIPADVISOR sur site internet avec ordinateur ou appli AVANT LE 19 AOÜT POUR NE RIEN PAYER DU TOUT",
    ],
    scans: [
      "/images/Guide/Montgolfière jour 6 - 1.webp",
      "/images/Guide/Montgolfière jour 6 - 2.webp",
    ]
  },
  {
    id: "Montgolfiere-Nazar-balloons",
    category: "ACTIVITES",
    title: "Tour en montgolfière",
    day: 7,
    tag: "Résevé",
    content:
      "Vol en montgolfière au lever du soleil à Göreme.\n" +
      "Départ vers 4h30 pour une durée de 3h30 environ.",
    details: [
      "Réservation via Getyourguide (réf : GYGVN28H76B3)",
      "adresse hôtel envoyée par whatsapp"
      "ANNULER VIA APPLI GETYOURGUIDE sur site internet avec ordinateur ou appli AVANT LE 19 AOÜT POUR NE RIEN PAYER DU TOUT",
    ],
    scans: [
      "/images/Guide/Montgolfière jour 7 - 1.webp",
      "/images/Guide/Montgolfière jour 7 - 2.webp",
    ]
  },
  {
    id: "programme-sejour",
    category: "SEJOUR",
    title: "Détail du programme",
    tag: "sejour",
    content:
      "Voir scans des éléments du programme de voyage envoyé par l'agence.",
    scans: [
      "/images/guide/Détail du programme 1.webp",
      "/images/guide/Détail du programme 2.webp",
      "/images/guide/Détail du programme 3.webp",
      "/images/guide/Détail du programme 4.webp",
    ]
  },
  {
    id: "information-sejour",
    category: "SEJOUR",
    title: "Informations sur le séjour",
    tag: "sejour",
    content:
      "Information importante données par le voyagiste concernant le séjour.",
    details: [
      "Voyage privé booking : 104904700VPFR",
      "Prestataire : DELUKS TURIZM",
      "Adresse : 19 Mayis Mah. 19 Mayis Cad. No: 2, Kadikoy, Istanbul",
    ],
    scans: [
      "/images/guide/Information Tour 1.webp",
      "/images/guide/Information Tour 2.webp",
      "/images/guide/Nom du prestataire voyage.webp",
    ],
  },
   {
    id: "eSIM-gratuire",
    category: "SEJOUR",
    title: "Informations sur l'eSIM gratuite",
    tag: "sejour",
    content:
      "2 Go d'eSIM gratuite.",
    details: [
      "Fournisseur : Hubby eSIM",
      "Code promo : FY544M6ZKY",
      "Il faut télécharger l'application Hubby eSIM sur le téléphone et activer l'eSIM avec le code promo.",
    ],
    scans: [
      "/images/guide/esim 2 Go gratuite 1.webp",
      "/images/guide/esim 2 Go gratuite 2.webp",
      "/images/guide/Information esim 2Go 1.webp",
    ],
  },
  {
    id: "Pourboire",
    category: "SEJOUR",
    title: "Pourboire",
    tag: "sejour",
    content:
      "Informations sur le pourboire.",
    details: [
      "Pourboire pour le guide, le chauffeur, et les taxes de séjour à régler sur place au guide",
      "60 € par personne, soit 350 € pour la famille de 5 personnes",
    ],
    scans: [
      "/images/guide/Information pourboire.webp",
    ],
  },

  
];
