// Fichier généré automatiquement par scripts/convert-jours-destinations.mjs — ne pas éditer à la main.
// Régénéré à chaque build (voir "prebuild" dans package.json) à partir de docs/jours-destinations.csv

export type JourDestination = {
  jour: number;
  destination: string;
  visites_prevues: string;
  [key: string]: string | number;
};

export const JOURS_DESTINATIONS: JourDestination[] = [
  {
    "jour": 1,
    "destination": "Istanbul",
    "visites_prevues": "Istanbul, Palais de Topkapi"
  },
  {
    "jour": 2,
    "destination": "Cappadoce",
    "visites_prevues": "Cappadoce"
  },
  {
    "jour": 3,
    "destination": "Pamukkale",
    "visites_prevues": "Pamukkale"
  },
  {
    "jour": 4,
    "destination": "Site d'Éphèse",
    "visites_prevues": "Site d'Éphèse"
  },
  {
    "jour": 5,
    "destination": "Izmir",
    "visites_prevues": "Izmir"
  },
  {
    "jour": 6,
    "destination": "Bursa",
    "visites_prevues": "Bursa"
  }
];
