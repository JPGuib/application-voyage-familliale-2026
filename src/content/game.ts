export const QUESTION_POINTS = 20;
export const RIDDLE_POINTS = 20;
export const CHALLENGE_POINTS = 20;

export type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
  expl: string;
};

export type DailyRiddle = {
  question: string;
  answer: string;
  hint: string;
};

export type DailyChallenge = {
  title: string;
  description: string;
  note: string;
};

const POLARSTEPS_NOTE =
  "Si vous en avez envie, notez la réponse ou partagez ce souvenir sur Polarsteps pour garder une trace de la journée.";

// Le quiz, l'énigme et le défi final changent chaque jour en fonction des
// lieux et activités prévus ce jour-là (voir src/content/places.ts).
export const QUESTIONS_BY_DAY: Record<number, QuizQuestion[]> = {
  1: [
    {
      q: "Quel est le numéro du vol Nantes → Paris ?",
      options: ["AF1390", "TO3421", "AF7507", "AF123"],
      correct: 2,
      expl: "Le vol AF7507 relie Nantes à Paris Charles de Gaulle à 19h45.",
    },
    {
      q: "Quel est le numéro du vol Paris → Istanbul ?",
      options: ["AF7507", "AF1390", "TO3421", "TK1980"],
      correct: 1,
      expl: "Le vol AF1390 décolle de Paris CDG à 22h55 pour Istanbul.",
    },
    {
      q: "Quel est le poids maximum autorisé pour un bagage en soute à l'aller ?",
      options: ["15 kg", "23 kg", "30 kg", "40 kg"],
      correct: 1,
      expl: "Les bagages en soute sont limités à 23 kg maximum pour les vols aller.",
    },
    {
      q: "Istanbul, votre destination, se situe sur deux continents. Lesquels ?",
      options: [
        "Europe et Afrique",
        "Europe et Asie",
        "Asie et Afrique",
        "Amérique et Europe",
      ],
      correct: 1,
      expl: "Istanbul est une ville transcontinentale, traversée par le détroit du Bosphore.",
    },
  ],
  2: [
    {
      q: "Que signifie « Sainte-Sophie » en grec ?",
      options: ["Ville sainte", "Sagesse divine", "Lumière céleste", "Église mère"],
      correct: 1,
      expl: "« Sainte-Sophie » signifie « Sagesse divine » en grec.",
    },
    {
      q: "Combien de colonnes soutiennent la Citerne Basilique ?",
      options: ["100", "212", "336", "500"],
      correct: 2,
      expl: "La Citerne Basilique repose sur 336 colonnes.",
    },
    {
      q: "Combien de lampes compte le grand lustre en cristal du palais de Dolmabahçe ?",
      options: ["250", "500", "750", "1000"],
      correct: 2,
      expl: "Le lustre de Dolmabahçe compte 750 lampes, en cristal de Bohême.",
    },
    {
      q: "Quel architecte a construit la mosquée Süleymaniye ?",
      options: ["Sinan", "Ahmet Ier", "Mehmed II", "Mimar Kemal"],
      correct: 0,
      expl: "Sinan, architecte impérial, considérait la Süleymaniye comme son chef-d'œuvre.",
    },
    {
      q: "Quelles mers relie le détroit du Bosphore ?",
      options: [
        "Mer Égée et Méditerranée",
        "Mer Noire et mer de Marmara",
        "Mer Rouge et Méditerranée",
        "Mer Noire et mer Égée",
      ],
      correct: 1,
      expl: "Le Bosphore relie la mer Noire à la mer de Marmara.",
    },
  ],
  3: [
    {
      q: "Quel sultan a fait construire le palais de Topkapi ?",
      options: ["Soliman le Magnifique", "Mehmed II", "Ahmet Ier", "Atatürk"],
      correct: 1,
      expl: "Mehmed II a fait construire Topkapi à partir de 1459, après la conquête de Constantinople.",
    },
    {
      q: "Combien de minarets compte la Mosquée Bleue ?",
      options: ["2", "4", "6", "8"],
      correct: 2,
      expl: "Ses six minarets ont provoqué un scandale à l'époque de sa construction.",
    },
    {
      q: "D'où vient l'obélisque de Théodose, sur la place de l'Hippodrome ?",
      options: ["Grèce", "Égypte antique", "Rome", "Perse"],
      correct: 1,
      expl: "Cet obélisque égyptien date du XVe siècle av. J.-C. et fut érigé ici en 390.",
    },
    {
      q: "En quelle année la Tour de Galata a-t-elle été construite ?",
      options: ["1204", "1348", "1453", "1550"],
      correct: 1,
      expl: "La Tour de Galata fut construite en 1348 par les Génois.",
    },
    {
      q: "Que signifie « Taksim » en turc ?",
      options: ["Distribution", "Place", "Rassemblement", "Carrefour"],
      correct: 0,
      expl: "« Taksim » signifie « distribution », car l'eau y était distribuée à la ville.",
    },
  ],
  4: [
    {
      q: "En quelle année le Grand Bazar a-t-il été fondé ?",
      options: ["1350", "1455", "1600", "1700"],
      correct: 1,
      expl: "Le Grand Bazar fut fondé peu après la conquête de Constantinople, en 1455.",
    },
    {
      q: "Combien de boutiques compte environ le Grand Bazar ?",
      options: ["1 000", "2 500", "plus de 4 000", "10 000"],
      correct: 2,
      expl: "Le Grand Bazar compte plus de 4 000 boutiques réparties sur 61 rues couvertes.",
    },
    {
      q: "Depuis quelle année Ankara est-elle la capitale de la Turquie ?",
      options: ["1920", "1923", "1930", "1950"],
      correct: 1,
      expl: "Ankara est devenue capitale le 13 octobre 1923, sous l'impulsion d'Atatürk.",
    },
    {
      q: "Pourquoi Ankara a-t-elle été choisie comme capitale plutôt qu'Istanbul ?",
      options: [
        "Sa position centrale et stratégique",
        "Sa taille plus grande",
        "Sa proximité avec la mer",
        "Son climat plus doux",
      ],
      correct: 0,
      expl: "Sa position centrale et stratégique symbolisait la naissance d'une Turquie moderne.",
    },
  ],
  5: [
    {
      q: "Quel pourcentage du sel consommé en Turquie provient du lac Tuz ?",
      options: ["30 %", "50 %", "70 %", "90 %"],
      correct: 2,
      expl: "Le lac Tuz fournit près de 70 % du sel consommé en Turquie.",
    },
    {
      q: "Combien de personnes pouvaient se réfugier dans une ville souterraine comme Derinkuyu ?",
      options: ["5 000", "10 000", "20 000", "50 000"],
      correct: 2,
      expl: "Derinkuyu et Kaymaklı pouvaient abriter jusqu'à 20 000 personnes sur plusieurs niveaux.",
    },
    {
      q: "Quelle est la hauteur du mât du drapeau turc à Anıtkabir ?",
      options: ["20 m", "25 m", "33,53 m", "40 m"],
      correct: 2,
      expl: "Le mât mesure 33,53 m, le plus haut mât d'un seul tenant d'Europe.",
    },
    {
      q: "Combien pèse le sarcophage d'Atatürk à Anıtkabir ?",
      options: ["10 tonnes", "25 tonnes", "40 tonnes", "60 tonnes"],
      correct: 2,
      expl: "Le sarcophage pèse 40 tonnes et est fait d'un seul bloc de pierre.",
    },
  ],
  6: [
    {
      q: "D'où viendrait le mot « Cappadoce » ?",
      options: ["Du grec", "Du vieux perse", "De l'arabe", "Du turc"],
      correct: 1,
      expl: "« Cappadoce » viendrait du vieux perse et signifierait « le pays des beaux chevaux ».",
    },
    {
      q: "En quelle année le musée en plein air de Göreme a-t-il été classé à l'UNESCO ?",
      options: ["1975", "1985", "1995", "2005"],
      correct: 1,
      expl: "Göreme est classé au patrimoine mondial de l'UNESCO depuis 1985.",
    },
    {
      q: "Pourquoi les vols en montgolfière ont-ils lieu tôt le matin ?",
      options: [
        "Pour profiter des vents les plus calmes",
        "Pour éviter la chaleur",
        "Pour des raisons légales",
        "Pour voir le lever du soleil uniquement",
      ],
      correct: 0,
      expl: "Les vols ont lieu à l'aube pour profiter des vents les plus calmes.",
    },
    {
      q: "Que signifie « Güvercinlik », l'une des vallées de Cappadoce ?",
      options: [
        "Vallée des croyants",
        "Vallée des pigeons",
        "Vallée des fées",
        "Vallée sacrée",
      ],
      correct: 1,
      expl: "« Güvercinlik » signifie « vallée des pigeons », en référence aux pigeonniers creusés dans la falaise.",
    },
  ],
  7: [
    {
      q: "Quel ordre religieux est associé à la ville de Konya ?",
      options: ["Derviches tourneurs", "Franciscains", "Jésuites", "Soufis blancs"],
      correct: 0,
      expl: "Konya abrite le mausolée de Rûmi, fondateur de l'ordre des derviches tourneurs.",
    },
    {
      q: "Combien de chameaux pouvait accueillir le caravansérail de Sultanhan ?",
      options: ["100", "200", "400", "600"],
      correct: 2,
      expl: "Le Sultanhan pouvait accueillir jusqu'à 400 chameaux dans ses écuries.",
    },
    {
      q: "Que signifie « Pamukkale » en turc ?",
      options: [
        "Château de coton",
        "Fontaine blanche",
        "Montagne sacrée",
        "Rivière de lait",
      ],
      correct: 0,
      expl: "« Pamukkale » signifie « Château de coton », en raison de ses terrasses blanches.",
    },
    {
      q: "Aux ruines de quelle cité antique le site de Pamukkale est-il associé ?",
      options: ["Troie", "Hiérapolis", "Pergame", "Milet"],
      correct: 1,
      expl: "Le site de Pamukkale est associé aux ruines de l'ancienne cité de Hiérapolis.",
    },
  ],
  8: [
    {
      q: "Quelle bibliothèque antique se trouve à Éphèse ?",
      options: [
        "Bibliothèque de Celsius",
        "Bibliothèque d'Alexandrie",
        "Bibliothèque de Pergame",
        "Bibliothèque de Topkapi",
      ],
      correct: 0,
      expl: "La bibliothèque de Celsius abritait jusqu'à 12 000 rouleaux de parchemin.",
    },
    {
      q: "Combien de spectateurs pouvait accueillir le grand théâtre d'Éphèse ?",
      options: ["10 000", "15 000", "24 000", "30 000"],
      correct: 2,
      expl: "Le théâtre d'Éphèse pouvait accueillir 24 000 spectateurs.",
    },
    {
      q: "Quelle déesse était vénérée à Éphèse, dans l'une des Sept Merveilles du monde ?",
      options: ["Athéna", "Artémis", "Aphrodite", "Héra"],
      correct: 1,
      expl: "Le temple d'Artémis à Éphèse était l'une des Sept Merveilles du monde antique.",
    },
    {
      q: "Combien d'habitants comptait Éphèse à son apogée ?",
      options: ["50 000", "100 000", "250 000", "500 000"],
      correct: 2,
      expl: "Éphèse comptait jusqu'à 250 000 habitants à son apogée.",
    },
  ],
  9: [
    {
      q: "Bursa fut la première capitale de quel empire ?",
      options: ["Byzantin", "Ottoman", "Perse", "Romain"],
      correct: 1,
      expl: "Bursa fut la première capitale de l'Empire ottoman, conquise en 1326.",
    },
    {
      q: "Quelle montagne domine la ville de Bursa ?",
      options: ["Mont Ararat", "Mont Uludağ", "Mont Nemrut", "Mont Erciyes"],
      correct: 1,
      expl: "Bursa est nichée au pied du Mont Uludağ, l'antique Olympe de Mysie.",
    },
    {
      q: "Quelle est la longueur totale du pont d'Osmangazi ?",
      options: ["1 550 m", "2 000 m", "2 682 m", "3 200 m"],
      correct: 2,
      expl: "Le pont d'Osmangazi mesure 2 682 mètres au total, avec une travée centrale de 1 550 m.",
    },
    {
      q: "Grâce au pont, la traversée du golfe d'Izmit (2h en ferry) se fait maintenant en combien de temps ?",
      options: ["3 minutes", "6 minutes", "15 minutes", "30 minutes"],
      correct: 1,
      expl: "Le temps de traversée est passé de 2 heures en ferry à seulement 6 minutes.",
    },
  ],
  10: [
    {
      q: "Quel est le numéro du vol retour Istanbul → Nantes ?",
      options: ["TO3421", "AF1390", "AF7507", "TK1980"],
      correct: 0,
      expl: "Le vol retour TO3421 relie Istanbul à Nantes, départ à 14h00.",
    },
    {
      q: "Quelle compagnie aérienne assure le vol retour ?",
      options: ["Air France", "Turkish Airlines", "Transavia", "Pegasus"],
      correct: 2,
      expl: "Le vol retour TO3421 est opéré par Transavia.",
    },
    {
      q: "Quel est le poids maximum des bagages en soute pour le vol retour ?",
      options: ["23 kg", "25 kg", "30 kg", "32 kg"],
      correct: 2,
      expl: "Les bagages en soute sont limités à 30 kg maximum pour le vol retour.",
    },
    {
      q: "À quelle heure décolle le vol retour ?",
      options: ["10h00", "12h00", "14h00", "16h00"],
      correct: 2,
      expl: "Le vol retour décolle à 14h00 pour une arrivée à 17h10.",
    },
    {
      q: "Quelle bibliothèque d'Éphèse conservait jusqu'à 12 000 rouleaux de parchemin ?",
      options: [
        "Bibliothèque de Celsius",
        "Bibliothèque d'Alexandrie",
        "Bibliothèque de Pergame",
        "Bibliothèque impériale",
      ],
      correct: 0,
      expl: "La bibliothèque de Celsius, à Éphèse, abritait jusqu'à 12 000 rouleaux de parchemin.",
    },
    {
      q: "Combien de colonnes soutiennent la Citerne Basilique d'Istanbul ?",
      options: ["212", "250", "336", "400"],
      correct: 2,
      expl: "La Citerne Basilique est un immense réservoir souterrain soutenu par 336 colonnes.",
    },
    {
      q: "Que signifie « Pamukkale » en turc ?",
      options: ["Colline blanche", "Château de coton", "Temple de l'eau", "Ville de marbre"],
      correct: 1,
      expl: "Pamukkale signifie littéralement « château de coton » en turc.",
    },
    {
      q: "En quelle année la République turque a-t-elle été proclamée ?",
      options: ["1453", "1923", "1928", "1934"],
      correct: 1,
      expl: "La République turque a été proclamée en 1923 sous l'impulsion de Mustafa Kemal Atatürk.",
    },
    {
      q: "Quel est considéré comme le premier traité de paix écrit de l'histoire ?",
      options: [
        "Le traité de Lausanne",
        "Le traité de Kadesh",
        "Le traité de Versailles",
        "Le traité de Sèvres",
      ],
      correct: 1,
      expl: "Le traité hittite-égyptien de Kadesh (1258 av. J.-C.) est souvent présenté comme le premier traité de paix écrit de l'histoire.",
    },
    {
      q: "Combien de sites classés au patrimoine mondial de l'UNESCO la Turquie abrite-t-elle ?",
      options: ["7", "12", "19", "29"],
      correct: 2,
      expl: "La rubrique Histoire indique que la Turquie abrite 19 sites classés au patrimoine mondial de l'UNESCO.",
    },
    {
      q: "Quelle est la monnaie de la Turquie ?",
      options: ["Le dinar turc", "La lire turque", "L'euro anatolien", "Le manat"],
      correct: 1,
      expl: "La monnaie officielle du pays est la lire turque (TRY).",
    },
    {
      q: "Quelle ville a été choisie comme capitale en 1923 pour marquer la rupture avec l'ère ottomane ?",
      options: ["Istanbul", "Izmir", "Ankara", "Bursa"],
      correct: 2,
      expl: "Ankara a été choisie comme capitale en 1923 pour symboliser la Turquie moderne voulue par Atatürk.",
    },
    {
      q: "Environ combien de mosquées compte la Turquie ?",
      options: ["8 000", "20 000", "50 000", "Plus de 80 000"],
      correct: 3,
      expl: "La rubrique Culture et Tradition indique que la Turquie compte plus de 80 000 mosquées.",
    },
  ],
};

export const RIDDLES_BY_DAY: Record<number, DailyRiddle> = {
  1: {
    question:
      "Je suis une ville qui se trouve à la fois en Europe et en Asie. Qui suis-je ?",
    answer: "Istanbul",
    hint: "Vous y atterrissez cette nuit, après une escale à Paris.",
  },
  2: {
    question:
      "Mon nom signifie « hors les murs » en grec, car j'étais autrefois en dehors des remparts de Constantinople. Qui suis-je ?",
    answer: "Chora",
    hint: "Je suis une église byzantine, célèbre pour mes mosaïques du XIVe siècle.",
  },
  3: {
    question:
      "Selon la légende, un homme se serait envolé depuis moi avec des ailes artificielles pour traverser le Bosphore. Qui suis-je ?",
    answer: "Galata",
    hint: "Je domine le quartier de Péra depuis 1348.",
  },
  4: {
    question:
      "Je suis un immense marché couvert d'Istanbul, fondé peu après la conquête de Constantinople. Qui suis-je ?",
    answer: "Bazar",
    hint: "Plus de 4 000 boutiques sont réparties sur mes 61 rues couvertes.",
  },
  5: {
    question:
      "Je suis une ville souterraine de Cappadoce pouvant abriter jusqu'à 20 000 personnes. Qui suis-je ?",
    answer: "Derinkuyu",
    hint: "Avec Kaymaklı, je suis l'une des plus célèbres cités souterraines.",
  },
  6: {
    question:
      "Coiffées de basalte, on m'appelle « cheminée de fée ». Dans quelle région se trouve-t-on ?",
    answer: "Cappadoce",
    hint: "Un paysage lunaire façonné par des millions d'années d'érosion volcanique.",
  },
  7: {
    question:
      "Je suis un site blanc éblouissant formé par des sources thermales, où Cléopâtre aurait pris ses bains. Qui suis-je ?",
    answer: "Pamukkale",
    hint: "Mon nom signifie « Château de coton ».",
  },
  8: {
    question:
      "Je conservais jusqu'à 12 000 rouleaux de parchemin à Éphèse. Qui suis-je ?",
    answer: "Celsius",
    hint: "Je suis une bibliothèque antique, célèbre par sa façade monumentale.",
  },
  9: {
    question:
      "Je porte le nom du fondateur de l'Empire ottoman et j'enjambe le golfe d'Izmit. Qui suis-je ?",
    answer: "Osmangazi",
    hint: "Je suis un pont suspendu inauguré en 2016.",
  },
  10: {
    question:
      "Je suis un pays à cheval entre l'Europe et l'Asie, où vous avez vécu ce voyage. Qui suis-je ?",
    answer: "Turquie",
    hint: "Son nom donne aussi celui d'un grand oiseau de Noël... mais ce n'est qu'une coïncidence !",
  },
};

export const CHALLENGES_BY_DAY: Record<number, DailyChallenge> = {
  1: {
    title: "Défi souvenir du jour",
    description:
      "Chacun cite une attente ou une curiosité sur le voyage en Turquie, puis l'équipe choisit celle qui donne le plus envie de partir.",
    note: POLARSTEPS_NOTE,
  },
  2: {
    title: "Défi souvenir du jour",
    description:
      "Chacun raconte le lieu d'Istanbul qui l'a le plus marqué aujourd'hui et doit citer un détail précis appris sur ce lieu.",
    note: POLARSTEPS_NOTE,
  },
  3: {
    title: "Défi souvenir du jour",
    description:
      "Faites le vote familial du monument le plus impressionnant du jour et justifiez le choix gagnant avec un fait vu dans l'application ou pendant la visite.",
    note: POLARSTEPS_NOTE,
  },
  4: {
    title: "Défi souvenir du jour",
    description:
      "Chaque joueur donne l'objet ou l'ambiance qu'il retient le plus du Grand Bazar ou du trajet vers Ankara, puis l'équipe choisit le souvenir du jour.",
    note: POLARSTEPS_NOTE,
  },
  5: {
    title: "Défi souvenir du jour",
    description:
      "Reconstituez ensemble la journée en 3 étapes clés entre Ankara et la Cappadoce, avec au moins un chiffre ou un fait exact dans votre récit.",
    note: POLARSTEPS_NOTE,
  },
  6: {
    title: "Défi souvenir du jour",
    description:
      "Chacun choisit son paysage préféré de Cappadoce et explique pourquoi en citant un détail sur Göreme, les vallées ou les montgolfières.",
    note: POLARSTEPS_NOTE,
  },
  7: {
    title: "Défi souvenir du jour",
    description:
      "Faites un mini récit de route: un fait sur Konya, un fait sur le caravansérail et un fait sur Pamukkale, dans l'ordre de la journée.",
    note: POLARSTEPS_NOTE,
  },
  8: {
    title: "Défi souvenir du jour",
    description:
      "Chaque joueur dit ce qu'il retiendrait pour raconter Éphèse à quelqu'un qui n'y est jamais allé, avec un monument ou un chiffre précis.",
    note: POLARSTEPS_NOTE,
  },
  9: {
    title: "Défi souvenir du jour",
    description:
      "Choisissez le moment le plus marquant entre Bursa et le pont d'Osmangazi, puis défendez-le avec un fait historique ou technique exact.",
    note: POLARSTEPS_NOTE,
  },
  10: {
    title: "Défi final du voyage",
    description:
      "Chacun partage son meilleur souvenir du voyage et l'équipe désigne le top 3 final avec, pour chaque souvenir, un fait précis appris pendant le séjour.",
    note: POLARSTEPS_NOTE,
  },
};

export function getQuestionsForDay(day: number): QuizQuestion[] {
  return QUESTIONS_BY_DAY[day] ?? QUESTIONS_BY_DAY[1];
}

export function getRiddleForDay(day: number): DailyRiddle {
  return RIDDLES_BY_DAY[day] ?? RIDDLES_BY_DAY[1];
}

export function getChallengeForDay(day: number): DailyChallenge {
  return CHALLENGES_BY_DAY[day] ?? CHALLENGES_BY_DAY[1];
}
