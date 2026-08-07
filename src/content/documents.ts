export const DOCUMENT_CATEGORIES = [
  "VOLS",
  "HEBERGEMENT",
  "RESTAURANT",
  "ACTIVITES",
  "TRANSPORTS",
  "IDENTITE",
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
    category: "IDENTITE",
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
  },
  {
    id: "reservation-transfert-aeroport",
    category: "TRANSPORTS",
    title: "Transfert aéroport IST → hébergement",
    tag: "Navette",
    day: 1,
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
];
