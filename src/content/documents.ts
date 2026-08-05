export type DocumentCategory =
  | "Hébergement"
  | "Assurance/Santé"
  | "Réservations diverses";

export type TravelDocument = {
  id: string;
  category: DocumentCategory;
  title: string;
  content: string;
  details?: string[];
};

export const DOCUMENTS: TravelDocument[] = [
  {
    id: "hotel-istanbul-kadikoy",
    category: "Hébergement",
    title: "Istanbul - Hôtel Kadikoy",
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
    category: "Assurance/Santé",
    title: "Assurance voyage familiale",
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
    category: "Réservations diverses",
    title: "Transfert aéroport IST → hébergement",
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
];
