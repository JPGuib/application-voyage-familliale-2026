export const DOCUMENT_CATEGORIES = [
  "VOLS",
  "HEBERGEMENT",
  "RESTAURANT",
  "ACTIVITES",
  "TRANSPORTS",
  "IDENTITE",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type TravelDocument = {
  id: string;
  category: DocumentCategory;
  title: string;
  content: string;
  tag?: string;
  day?: number;
  details?: string[];
  scans?: string[];
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
      "/images/Vol/Nantes Paris.webp",
      "/images/Vol/Avion aller JPG.webp",
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
      "/images/Vol/Paris Istanbul.webp",
      "/images/Vol/Avion aller Thomas.webp",
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
    scans: [
      "/images/Vol/Istanbul Nantes.webp",
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
  },
  {
    id: "assurance-voyage-famille",
    category: "IDENTITE",
    title: "Assurance voyage familiale",
    tag: "Santé",
    content:
      "Contrat d'assistance médicale et rapatriement.\n" +
      "**Compagnie** : Assurance Voyage Europe\n" +
      "**Numéro de police** : AVF-TR-2026-8841\n" +
      "**Téléphone urgence** : +33 1 70 00 00 00",
    details: [
      "Conserver la carte d'assuré dans chaque sac cabine",
      "Numéro d'assistance disponible 24h/24",
      "Couverture santé + bagages",
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
