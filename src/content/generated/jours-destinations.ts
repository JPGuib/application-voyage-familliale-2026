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
    "destination": "Turquie",
    "visites_prevues": ""
  },
  {
    "jour": 2,
    "destination": "Istanbul",
    "visites_prevues": "Sainte-Sophie, Citerne Basilique, Kadiko�, Le Bosphore"
  },
  {
    "jour": 3,
    "destination": "Istanbul",
    "visites_prevues": "Mosqu�e Bleue, Place Taksim, Quartier de P�ra"
  },
  {
    "jour": 4,
    "destination": "Cappadoce",
    "visites_prevues": "Cappadoce"
  },
  {
    "jour": 5,
    "destination": "Pamukkale",
    "visites_prevues": "Pamukkale"
  },
  {
    "jour": 6,
    "destination": "Site d'Ephèse",
    "visites_prevues": "Site d'Ephèse"
  },
  {
    "jour": 7,
    "destination": "Izmir",
    "visites_prevues": "Izmir"
  },
  {
    "jour": 8,
    "destination": "Bursa",
    "visites_prevues": "Bursa"
  }
];
