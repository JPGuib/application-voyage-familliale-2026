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
  day?: number;
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
      "Bagages à main : 12 kg max",
      "Bagages soute : 23 kg max",
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
      "Bagages à main : 12 kg max",
      "Bagages soute : 23 kg max",
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
      "Bagages à main : 12 kg max",
      "Bagages soute : 30 kg max",
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
      "Réservation : numéro de réservation",
      "Parking : numéro de parking",
      ],
    links: [
      {
        label: "Accès à la réservation",
        url: "https://www.nantes.aeroport.fr/parking",
      },
    ],
  },
  {
    id: "hotel-istanbul-kadikoy",
    category: "HEBERGEMENT",
    title: "Istanbul - Hôtel Kadikoy",
    tag: "Jour 1 à 4",
    day: 1,
    content:
      "Réservation famille pour le séjour à Istanbul.\n" +
      "**Nom de réservation** : Famille Guionie\n" +
      "**Code de confirmation** : IST-KDK-2026\n" +
      "**Adresse** : Quartier Kadikoy, Istanbul",
    details: [
      "Check-in à partir de 15h00",
      "Check-out avant 11h00",
      "Petit-déjeuner inclus",
    ],
    links: [
      {
        label: "Voir l'hôtel sur Google Maps",
        url: "https://www.google.com/maps/search/?api=1&query=40.9909,29.0303",
      },
    ],
    gps: "40.9909,29.0303",
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
    category: "BANQUE",
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
    category: "PAPIERS",
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
      "Il faut sortir par la **poste n°9** une fois bagages récupérés et formalités de douane passées",
      "**Il ne faut pas descendre à l'étage -2 !**",
      "Notre assistant nous accueillera à la sortie avec un panneau de **Voyage Privé**",
      "En cas d'urgence, il faut appeler le voyagiste au +90 545 344 55 08",
      "Le point de rencontre et le plan sont indiqués sur le scan ci-dessous",
    ],
    scans: [
      "/images/guide/Information Transfert 1.webp",
      "/images/guide/Information Transfert 2.webp",
    ],  
  },
  {
    id: "reservation-transfert-aeroport",
    category: "TRANSPORTS",
    title: "Transfert retour → Aéroport IST",
    tag: "Transfert",
    day: 9,
    content:
      "Navette réservée pour l'arrivée de nuit à Istanbul.\n" +
      "**Prestataire** : Istanbul Shuttle\n" +
      "**Référence** : SH-IST-3412\n" +
      "**Point de rendez-vous** : sortie terminal international",
    details: [
      "Chauffeur avec pancarte nom de famille",
      "Valable pour 5 passagers + bagages",
    ],
  },
  {
    id: "restaurant-a-completer",
    category: "RESTAURANT",
    title: "Réservations restaurants",
    tag: "À compléter",
    content:
      "Ajoutez ici vos réservations de restaurants.\n" +
      "Utilisez **texte en gras** avec la syntaxe **comme ceci**.",
  },
  {
    id: "activites-a-completer",
    category: "ACTIVITES",
    title: "Activités réservées",
    tag: "À compléter",
    content:
      "Ajoutez ici vos activités (billets, horaires, points de rendez-vous).\n" +
      "Exemple : **Croisière Bosphore** - départ 18h30.",
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
