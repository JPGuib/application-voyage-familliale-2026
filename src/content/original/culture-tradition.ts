// Contenu de la rubrique "Culture et Tradition". Même structure que
// src/content/places.ts, src/content/histoire.ts et
// src/content/geographie-economie.ts : chaque entrée peut avoir des photos,
// un texte, et un audio associé.
//
// ⚠️ Contenu d'exemple à remplacer : les textes et images ci-dessous sont des
// placeholders. Pense à déposer les fichiers audio dans public/audio/ (ex:
// public/audio/culture-cuisine.mp3) pour qu'ils fonctionnent.

export const CULTURE_TRADITION_TOPICS = [
  {
    id: "cuisine-turque",
    name: "La cuisine turque",
    shortDesc: "Kebabs, mezze, thé et café : un patrimoine culinaire riche",
    tag: "Gastronomie",
    image:
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Un festin de saveurs",
    audioDuration: "2 min 40 sec",
    audioSrc: "/audio/culture-cuisine.mp3",
    history:
      "Texte d'exemple : à remplacer par une présentation des plats emblématiques de la cuisine turque et de leurs origines régionales.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
  {
    id: "hospitalite-coutumes",
    name: "Hospitalité et coutumes",
    shortDesc: "Les traditions qui rythment la vie quotidienne",
    tag: "Tradition",
    image:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "L'art de recevoir",
    audioDuration: "2 min 20 sec",
    audioSrc: "/audio/culture-hospitalite.mp3",
    history:
      "Texte d'exemple : à remplacer par une présentation des codes de l'hospitalité turque et des coutumes sociales à connaître en voyage.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
  {
    id: "musique-artisanat",
    name: "Musique et artisanat",
    shortDesc: "Tapis, céramiques et musiques traditionnelles",
    tag: "Art",
    image:
      "https://images.unsplash.com/photo-1528543606781-2f6e6857f318?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1528543606781-2f6e6857f318?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Les arts populaires",
    audioDuration: "2 min 15 sec",
    audioSrc: "/audio/culture-musique-artisanat.mp3",
    history:
      "Texte d'exemple : à remplacer par une présentation de l'artisanat traditionnel turc (tapis, céramiques d'Iznik...) et des musiques populaires.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
];
