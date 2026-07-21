// Contenu de la rubrique "Histoire". Même structure que src/content/places.ts :
// chaque entrée peut avoir des photos, un texte, et un audio associé.
//
// ⚠️ Contenu d'exemple à remplacer : les textes et images ci-dessous sont des
// placeholders. Pense à déposer les fichiers audio dans public/audio/ (ex:
// public/audio/histoire-empire-ottoman.mp3) pour qu'ils fonctionnent.

export const HISTOIRE_TOPICS = [
  {
    id: "empire-ottoman",
    name: "L'Empire ottoman",
    shortDesc: "Six siècles d'histoire, de ses débuts à sa chute",
    tag: "Époque",
    image:
      "https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Splendeur ottomane",
    audioDuration: "3 min 00 sec",
    audioSrc: "/audio/histoire-empire-ottoman.mp3",
    history:
      "Texte d'exemple : à remplacer par un résumé de l'histoire de l'Empire ottoman, de sa fondation à sa disparition en 1922, en passant par ses grandes conquêtes et son organisation politique.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
  {
    id: "byzance",
    name: "Byzance et Constantinople",
    shortDesc: "L'héritage de l'Empire romain d'Orient",
    tag: "Époque",
    image:
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "La cité aux sept collines",
    audioDuration: "2 min 45 sec",
    audioSrc: "/audio/histoire-byzance.mp3",
    history:
      "Texte d'exemple : à remplacer par un résumé de l'histoire de Byzance/Constantinople, capitale de l'Empire romain d'Orient pendant plus de mille ans avant la conquête ottomane de 1453.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
  {
    id: "vie-quotidienne",
    name: "Vie quotidienne et traditions",
    shortDesc: "Us, coutumes et vie de tous les jours en Turquie",
    tag: "Culture",
    image:
      "https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Le quotidien turc",
    audioDuration: "2 min 30 sec",
    audioSrc: "/audio/histoire-vie-quotidienne.mp3",
    history:
      "Texte d'exemple : à remplacer par une description des traditions, du thé, du hammam, des marchés et de la vie de famille en Turquie.",
    anecdotes: [
      "Anecdote d'exemple à remplacer.",
      "Deuxième anecdote d'exemple à remplacer.",
    ],
  },
];
