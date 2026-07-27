// Contenu de la rubrique "Géographie et Économie". Même structure que
// src/content/places.ts et src/content/histoire.ts : chaque entrée peut
// avoir des photos, un texte, et un audio associé.
//
// ⚠️ Contenu d'exemple à remplacer : les textes et images ci-dessous sont des
// placeholders. Pense à déposer les fichiers audio dans public/audio/ (ex:
// public/audio/geographie-releif.mp3) pour qu'ils fonctionnent.

export const GEOGRAPHIE_ECONOMIE_TOPICS = [
  {
    id: "relief-climat",
    name: "Relief et climat",
    shortDesc: "Un pays à cheval entre deux continents et plusieurs climats",
    tag: "Géographie",
    image:
      "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Un relief spectaculaire",
    audioDuration: "2 min 30 sec",
    audioSrc: "/audio/geographie-relief-climat.mp3",
    history:
      "Texte d'exemple : à remplacer par une présentation du relief turc (plateaux anatoliens, montagnes du Taurus, littoraux) et de la diversité climatique du pays.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
  {
    id: "bosphore-detroits",
    name: "Le Bosphore et les Dardanelles",
    shortDesc: "Les détroits qui relient (et séparent) l'Europe et l'Asie",
    tag: "Géographie",
    image:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Entre deux mers",
    audioDuration: "2 min 10 sec",
    audioSrc: "/audio/geographie-bosphore.mp3",
    history:
      "Texte d'exemple : à remplacer par une explication du rôle stratégique du Bosphore et des Dardanelles, tant sur le plan géographique qu'économique et militaire.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
  {
    id: "economie-turque",
    name: "L'économie turque aujourd'hui",
    shortDesc: "Industrie, tourisme et agriculture d'un pays en pleine croissance",
    tag: "Économie",
    image:
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Une économie en mouvement",
    audioDuration: "2 min 50 sec",
    audioSrc: "/audio/geographie-economie-turque.mp3",
    history:
      "Texte d'exemple : à remplacer par un aperçu des grands secteurs économiques turcs (textile, automobile, tourisme, agriculture) et de leur poids respectif.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
];
