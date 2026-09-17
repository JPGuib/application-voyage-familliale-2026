export const TRIP = {
  name: "Turquie, entre Orient et Occident 🇹🇷",
  totalDays: 9,
  currentDay: 1,
  todayDestination: "Istanbul",
  todaySubtitle: "Sultanahmet & Bosphore",
  surveyDestination: "Turquie",
};

// Image "circuit du voyage" affichée sur le tableau de bord (aperçu + lightbox,
// cf. src/app/App.tsx) et reprise en 2e page de l'album souvenir (cf.
// src/services/pdf-export.ts). Constante partagée pour éviter de dupliquer ce
// chemin (avec son paramètre de cache-busting) à plusieurs endroits.
export const TRIP_MAP_IMAGE_PATH = "/images/Carte du voyage.webp?v=20260811";
