// Rubrique "Culture et Tradition" — version enrichie
// Structure identique à src/content/places.ts, src/content/histoire.ts
// et src/content/geographie-economie.ts.
//
// ⚠️ Les fichiers audio doivent être déposés dans public/audio/ pour
// fonctionner (ex: public/audio/culture-mosquees.mp3).

export const CULTURE_TRADITION_TOPICS = [
  {
    id: "mosquees",
    name: "Les mosquées",
    shortDesc: "Splendeurs architecturales et lieux de recueillement",
    tag: "Architecture",
    image:
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&h=500&fit=crop&auto=format",
      "/images/Culture/Mosquee 1.webp",
      "/images/Culture/Mosquee 2.webp",
    ],
    audioTitle: "Coupole et minaret",
    audioDuration: "3 min 10 sec",
    audioSrc: "/audio/Culture/Les_mosquees.mp3",
    history:
      "La Turquie compte plus de 80 000 mosquées, dont certaines figurent parmi les plus belles du monde islamique. La Mosquée Bleue (Sultanahmet) à Istanbul, édifiée au XVIIe siècle sous Ahmed Ier, est célèbre pour ses six minarets et ses 20 000 carreaux d'Iznik. La mosquée Süleymaniye, chef-d'œuvre de Sinan, domine la Corne d'Or avec une élégance austère. L'ancienne basilique Sainte-Sophie, transformée en mosquée puis en musée, est aujourd'hui de nouveau un lieu de prière ouvert aux visiteurs. Chaque mosquée est un espace de recueillement où la lumière filtre à travers les vitraux et où la calligraphie ottomane orne les murs.",
    anecdotes: [
      "La Mosquée Bleue doit son surnom aux 20 000 carreaux de faïence d'Iznik qui tapissent son intérieur, aux motifs floraux dominés par le bleu de cobalt.",
      "À l'entrée de nombreuses mosquées, vous trouverez des étagères de chaussures parfois si bien remplies qu'il faut s'y prendre à deux fois pour repérer ses sandales au milieu de milliers de paires.",
    ],
  },
  {
    id: "tenue-mosquees",
    name: "La tenue vestimentaire pour les mosquées",
    shortDesc: "Comment s'habiller pour visiter un lieu de culte",
    tag: "Pratique",
    image:
      "/images/Culture/Vestimentaire 1.webp",
    photos: [
      "/images/Culture/Vestimentaire 1.webp",
      "/images/Culture/Vestimentaire 2.webp",
    ],
    audioTitle: "Respect et modestie",
    audioDuration: "2 min 05 sec",
    audioSrc: "/audio/Culture/Tenue_Mosquee.mp3",
    history:
      "La visite d'une mosquée en Turquie obéit à quelques règles de modestie simples mais essentielles. Les hommes et les femmes doivent couvrir leurs épaules et leurs genoux. Les femmes doivent en outre se couvrir les cheveux : un foulard ou un châle suffit amplement. Les chaussures se retirent à l'entrée, car on pénètre pieds nus ou en chaussettes sur les tapis de prière. La plupart des grandes mosquées touristiques mettent à disposition des paniers de tissus pour couvrir les jambes ou les épaules si nécessaire. Porter une tenue ample et en tissu respirant est conseillé, surtout en été lorsque la chaleur se fait sentir sous les coupoles.",
    anecdotes: [
      "Dans les mosquées les plus fréquentées, les distributeurs automatiques de sacs en plastique pour les chaussures font parfois plus recette que les distributeurs de boissons à l'extérieur.",
      "Il arrive que des guides locaux prêtent leur propre écharpe aux voyageurs oubliés, avec le sourire et un petit conseil sur le meilleur angle pour photographier le dôme.",
    ],
  },
  {
    id: "Santé",
    name: "La santé en Turquie",
    shortDesc: "Un système de santé très développé",
    tag: "Pratique",
    image:
      "/images/Culture/soins-turquie.webp",
    photos: [
      "/images/Culture/soins-turquie.webp",
      "/images/Culture/hopital istanbul.webp",
    ],
    historyLabel: "Présentation",
    history:
      "Le système de santé en Turquie est très développé, la sécurité sociale est gratuite et pour tous. Le pays est d’ailleurs une des destinations les plus importante au monde pour le tourisme médical. Il n’y a pas de vaccin obligatoire nécessaire à prévoir avant votre séjour. Il y a peu de risques sanitaires importants mais les plus courant sont l’hépatite A et la typhoïde et d’autres maladies transmises par l’alimentation et l’eau. Nous vous déconseillons de boire l’eau du robinet qui n’est généralement pas potable car trop chlorée.\n"+
      "On trouve en Turquie de nombreuses pharmacies (en turc « eczane ») qui vendent des médicaments souvent sans ordonnances à des prix bon marché.\n"+
      "Si toutefois vous devez vous rendre à l’hôpital, la Turquie possède de nombreux hôpitaux publics. Il y a également des cliniques privées modernes dans les grandes villes à des tarifs plus onéreux.",
    anecdotesLabel: "Numéros d'urgence",
    anecdotes: [
      "112 : ambulance",
      "155 : police",
      "110 : pompiers",
      "177 : Feu de forêt",
    ],
  },
  {
    id: "chats-istanbul",
    name: "Les chats à Istanbul",
    shortDesc: "Les véritables maîtres de la ville",
    tag: "Vie locale",
    image:
      "/images/Culture/Chat.webp",
    photos: [
      "/images/Culture/Chat.webp",
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Miaulements sur le Bosphore",
    audioDuration: "2 min 45 sec",
    audioSrc: "/audio/Culture/les_chats.mp3",
    history:
      "Istanbul est une ville de chats. On les croise partout : installés sur les murets du Grand Bazar, dormant sur les coussins des terrasses, ou guettant les poissons au bord du Bosphore. Cette cohabitation ancestrale remonte à l'époque ottomane, où les chats étaient appréciés pour chasser les rongeurs des navires et des entrepôts. Aujourd'hui, les habitants nourrissent les matous du quartier, installent des abris en hiver et les soignent. La municipalité a même mis en place des distributeurs automatiques de croquettes. Les chats d'Istanbul ne sont ni errants ni domestiques : ils sont simplement citoyens à part entière, respectés et choyés par toute la ville.",
    anecdotes: [
      "Le célèbre chat orange du marché aux épices, tombé d'une étagère de safran en 2016, est devenu une star locale dont la photo circule encore sur les réseaux sociaux turcs.",
      "Dans certains quartiers, les commerçants laissent volontairement une chaise vide devant leur boutique, non pas pour les clients, mais pour le chat du voisin qui y fait sa sieste chaque après-midi.",
    ],
  },
  {
    id: "plats-culinaires",
    name: "Les plats culinaires turcs",
    shortDesc: "Kebabs, mezze, baklava et autres délices",
    tag: "Gastronomie",
    image:
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=800&h=500&fit=crop&auto=format",
      "/images/Culture/Culinaire 1.webp",
      "/images/Culture/Culinaire 2.webp",
      "/images/Culture/Culinaire 3.webp",
    ],
    audioTitle: "Un festin de saveurs",
    audioDuration: "3 min 20 sec",
    audioSrc: "/audio/Culture/Les_plats.mp3",
    history:
      "La cuisine turque est l'un des trois grands patrimoines gastronomiques du monde, aux côtés de la française et de la chinoise. Elle puise ses racines dans la tradition nomade des steppes d'Asie centrale, enrichie par les influences ottomanes, arabes, perses et méditerranéennes. Le kebab, dans ses multiples déclinaisons (döner, şiş, adana), est bien sûr le plus célèbre, mais la table turque offre bien plus : les mezze (houmous, caviar d'aubergine, dolma), le manti (raviolis turcs), le lahmacun (pizza fine à la viande hachée), et le poisson grillé au bord du Bosphore. Le repas se termine invariablement par un baklava feuilleté au miel et aux pistaches, arrosé d'un café turc si fort qu'on dit qu'il en reste sur la moustache.",
    anecdotes: [
      "Le baklava de Gaziantep est le seul au monde à bénéficier d'une indication géographique protégée par l'UE, au même titre que le champagne ou le parmesan.",
      "Le café turc traditionnel est servi avec la mousse intacte ; si vous la mangez avec une cuillère, le serveur comprendra immédiatement que vous n'êtes pas du coin.",
    ],
  },
  {
    id: "maillots-bain",
    name: "Maillots de bain dans les hôtels et à la plage",
    shortDesc: "Codes vestimentaires et pratiques balnéaires",
    tag: "Pratique",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&auto=format",
    ],
    audioTitle: "Entre Bikini et Burqini",
    audioDuration: "2 min 30 sec",
    audioSrc: "/audio/Culture/Maillot_bain.mp3",
    history:
      "La Turquie, et particulièrement sa côte égéenne et méditerranéenne, est une destination balnéaire très prisée où le maillot de bain est la norme dans les hôtels, les stations balnéaires et les plages publiques. Les complexes hôteliers internationaux et les plages touristiques d'Antalya, Bodrum ou Çeşme accueillent les touristes en bikini ou en maillot sans problème. Cependant, dans certaines plages plus locales ou dans des régions conservatrices de l'Anatolie, les familles turques préfèrent des tenues de bain plus couvrantes, et le burqini (maillot intégral) y est parfois porté. Dans les hammams traditionnels, la tenue est un simple pestemal (sorte de serviette) et le maillot de bain moderne est interdit. Comme toujours en Turquie, observer l'environnement et suivre l'exemple des locaux est la meilleure approche.",
    anecdotes: [
      "Dans certains hôtels tout compris de la côte égéenne, les touristes étrangers découvrent parfois avec surprise que le petit-déjeuner se prolonge jusqu'à 10h, mais que la plage est déjà prise d'assaut dès 7h du matin par les retraités allemands réservant leurs transats avec une serviette.",
      "Le burqini, inventé en Australie, a connu un succès inattendu en Turquie, où certaines marques locales en proposent des versions colorées et stylées, parfois vendues à côté des bikinis dans les boutiques de plage.",
    ],
  },
 {
    id: "hammam-bains-turcs",
    name: "Les Hammam et bains turcs",
    shortDesc: "Rituel millénaire de purification, de détente et de socialisation",
    tag: "Bien-être",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop&auto=format",
    photos: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&h=500&fit=crop&auto=format",
      "/images/Culture/hammam_traditionnel.webp",
    ],
    audioTitle: "Vapeur et marbre",
    audioDuration: "3 min 15 sec",
    audioSrc: "/audio/Culture/Les_Hammam.mp3",
    history:
      "Le hammam, ou bain turc, est bien plus qu'un simple lieu de toilette : c'est un rituel social et spirituel hérité des Romains, perfectionné par les Ottomans. Dans l'architecture ottomane, chaque quartier possédait son hammam, souvent construit à côté d'une mosquée. L'espace se divise en trois pièces chauffées à des températures croissantes : le camekan (vestiaire), le soğukluk (salle tiède) et le hararet (salle chaude) avec son grand göbek taşı — la pierre de marbre chauffée au centre où l'on s'étend pour se faire frotter et savonner par le tellak (masseur). La purification du corps précède celle de l'âme, et la visite au hammam reste aujourd'hui un moment de détente partagé entre amis, familles ou avant un mariage, où les futures mariées y passent la veille des noces dans une cérémonie appelée kına gecesi.",
    anecdotes: [
      "Dans le hammam Çemberlitaş d'Istanbul, construit en 1584 par l'architecte Sinan, on raconte que les femmes de la cour ottomane venaient y tenir conseil et régler leurs querelles dans la chaleur anonyme de la vapeur.",
      "Le savon noir (kese) utilisé pour le gommage est si efficace que les habitués du hammam prétendent qu'on y perd non seulement sa peau morte, mais aussi parfois un bronzage acquis trois semaines plus tôt.",
    ],
  },
  {
    id: "derviche-tourneurs",
    name: "Les derviches tourneurs",
    shortDesc: "La danse mystique soufie, poésie en mouvement vers l'infini",
    tag: "Spiritualité",
    image:
      "/images/Culture/derviche_tourneur.webp",
    photos: [
      "/images/Culture/derviche_tourneur.webp",
    ],
    audioTitle: "La roue vers l'Absolu",
    audioDuration: "2 min 50 sec",
    audioSrc: "/audio/Culture/Les_derviches_tourneurs.mp3",
    history:
      "La cérémonie des derviches tourneurs, ou Sema, est une pratique soufie née au XIIIe siècle sous l'impulsion de Jalal ad-Din Rumi, fondateur de l'ordre mevlevi à Konya. La danse n'est pas un spectacle mais une méditation active : le derviche, vêtu d'une longue jupe blanche symbolisant le linceul, tourne sur lui-même la tête inclinée et les bras ouverts — la main droite vers le ciel pour recevoir la grâce divine, la gauche vers la terre pour la transmettre. La rotation, toujours dans le sens inverse des aiguilles d'une montre, symbolise les planètes en orbite autour du soleil et l'âme tournant vers Dieu. Bien que l'ordre mevlevi ait été interdit en 1925 par Atatürk, la Sema a été réhabilitée comme patrimoine culturel immatériel de l'UNESCO en 2008 et se pratique aujourd'hui dans des cadres touristiques et spirituels, notamment à Konya et à Istanbul.",
    anecdotes: [
      "À Konya, lors du festival annuel de Mevlana en décembre, des milliers de derviches tournent simultanément dans la grande salle de la Mevlana Museum, créant un murmure de tissus blancs si hypnotique que certains spectateurs oublient de cligner des yeux pendant des minutes entières.",
      "Avant chaque cérémonie, les derviches retirent leurs manteaux noirs symbolisant le tombeau terrestre pour révéler leurs robes blanches — un passage de la mort à la résurrection spirituelle qui dure exactement le temps d'un soupir collectif dans la salle.",
    ],
  },
  {
    id: "sport-panorama",
    name: "Le sport en Turquie",
    shortDesc: "Du football enflammé aux traditions nomades, une nation en mouvement",
    tag: "Sport",
    image:
      "/images/Culture/Turquie sport.webp",
    photos: [
      "/images/Culture/Turquie sport.webp",
      "/images/Culture/Sport en Turquie altero.webp",
    ],
    audioTitle: "Une nation en mouvement",
    audioDuration: "4 min 20 sec",
    audioSrc: "/audio/Culture/Le_sport_en_Turquie.mp3",
    history:
      "Le sport en Turquie est bien plus qu'une simple activité de loisir : c'est un vecteur d'identité nationale, de fierté collective et de cohésion sociale. Le football domine largement le paysage sportif, avec trois clubs historiques à Istanbul — Galatasaray, Fenerbahçe et Beşiktaş — dont les derbies sont parmi les plus intenses au monde. Galatasaray reste le seul club turc à avoir soulevé une Coupe d'Europe, en 2000. À côté du football, le volley-ball connaît un essor spectaculaire, particulièrement chez les femmes : la ligue turque (Sultanlar Ligi) attire les meilleures joueuses mondiales et le VakıfBank Istanbul domine la scène européenne. L'équitation perpétue des traditions millénaires, du cirit nomade inscrit à l'UNESCO aux randonnées en Cappadoce. Le tennis, longtemps en retrait, a pris son envol grâce à des tournois ATP et WTA de renom à Istanbul et Antalya. Au-delà de ces disciplines, la lutte à l'huile (yağlı güreş) de Kırkpınar, les sports nautiques sur les côtes égéenne et méditerranéenne, le basket-ball et le handball complètent un écosystème riche et diversifié, porté par une fédération turque qui investit massivement dans les infrastructures et les centres de formation.",
    anecdotes: [
      "Le stade Türk Telekom Arena de Galatasaray détient le record du monde de bruit dans une enceinte sportive : 131,76 décibels en 2011, soit l'équivalent sonore d'un décollage d'avion à quelques mètres.",
      "Lors du festival de lutte à l'huile de Kırkpınar, qui se tient depuis 1361 près d'Edirne, les lutteurs s'enduisent d'huile d'olive de la tête aux pieds et s'affrontent sur l'herbe pendant des heures, dans une tradition si ancienne qu'elle a survécu à l'Empire ottoman, à la République et à l'ère numérique.",
    ],
  },
  {
    id: "football-turquie",
    name: "Le football",
    shortDesc: "Ferveur populaire, derby légendaires et stades mythiques",
    tag: "Sport",
    image:
      "/images/Culture/foot/Equipe foot turc.webp",
    photos: [
      "/images/Culture/foot/Equipe foot turc.webp",
      "/images/Culture/foot/fenerbahce.webp",
      "/images/Culture/foot/galatasaray.webp",
      "/images/Culture/foot/Vodafone park basiktas.webp",
      "/images/Culture/foot/tifo.webp",
      "/images/Culture/foot/Ultra foot.webp",
      "/images/Culture/foot/Ecussons.webp",
      "/images/Culture/foot/Ecussons 2.webp",
      "/images/Culture/foot/Arda Turan.webp",
      "/images/Culture/foot/Didier drogba.webp",
      "/images/Culture/foot/Mauro Icardi.webp",
        ],
    audioTitle: "Cendres et flammes",
    audioDuration: "3 min 30 sec",
    audioSrc: "/audio/Culture/football_turc.mp3",
    history:
      "Le football est le sport roi en Turquie, véritable religion laïque qui mobilise des millions de passionnés chaque week-end. Le pays compte trois géants historiques basés à Istanbul : Galatasaray (fondé en 1905), Fenerbahçe (1907) et Beşiktaş (1903), dont les confrontations, notamment le derby de l'intercontinental entre Galatasaray et Fenerbahçe, sont parmi les plus intenses au monde. Galatasaray est le seul club turc à avoir remporté une Coupe d'Europe, en 2000, en soulevant la Coupe UEFA face à Arsenal. Le stade Türk Telekom Arena de Galatasaray est célèbre pour son record du monde de décibels en 2011 (131,76 dB), tandis que le Vodafone Park de Beşiktaş, niché au bord du Bosphore, offre l'un des panoramas les plus spectaculaires du football mondial. La Süper Lig turque attire chaque année des stars internationales, de Didier Drogba à Wesley Sneijder, et les tribunes turques restent célèbres pour leurs tifos monumentaux et leurs chants ininterrompus pendant 90 minutes.",
    anecdotes: [
      "En 1996, lors du célèbre 'match des cendres' entre Galatasaray et Leeds United, les supporters de Galatasaray ont accueilli les Anglais avec des cercueils et des croix sur les tribunes, créant une ambiance si hostile que les joueurs de Leeds ont dû être escortés par l'armée turque jusqu'à leur hôtel.",
      "Le stade de Beşiktaş est le seul au monde où les supporters peuvent voir un but d'un côté et, en levant les yeux, apercevoir un bateau cargo traversant le détroit du Bosphore de l'autre.",
    ],
  },
  {
    id: "cirit-javelot-turc",
    name: "Le Cirit — Javelot turc",
    shortDesc: "L'art ancestral du javelot à cheval, patrimoine immatériel de l'UNESCO",
    tag: "Tradition",
    image:
      "/images/Culture/cirit/Cirit 5.webp",
    photos: [
      "/images/Culture/cirit/Cirit 5.webp",
      "/images/Culture/cirit/Cirit 2.webp",
      "/images/Culture/cirit/Cirit 3.webp",
      "/images/Culture/cirit/Cirit 4.webp",
      "/images/Culture/cirit/Cirit 6.webp",
      "/images/Culture/cirit/Cirit 7.webp",
      "/images/Culture/cirit/Cirit 8.webp",    
    ],
    audioTitle: "Le sifflet du javelot",
    audioDuration: "3 min 10 sec",
    audioSrc: "/audio/Culture/Le_cirit.mp3",
    history:
      "Le cirit (prononcé 'djirit') est un jeu équestre ancestral originaire des steppes d'Asie centrale, adopté puis perfectionné par les Ottomans dès le XIVe siècle. Pratiqué à cheval par deux équipes rivales, il consiste à lancer un javelot en bois de mûrier de 70 à 100 cm vers un adversaire, qui doit l'esquiver tout en maintenant sa monture au galop. Le jeu servait autrefois d'entraînement militaire pour les spahis, les cavaliers ottomans d'élite, développant leur adresse, leur courage et leur synchronisation avec leur cheval. Interdit sous la République par Atatürk en 1926 au nom de la modernisation, le cirit a été réhabilité dans les années 1980 et inscrit en 2017 sur la liste représentative du patrimoine culturel immatériel de l'humanité par l'UNESCO. Aujourd'hui, il se pratique principalement dans l'est de l'Anatolie, notamment à Erzurum, Kars et dans la région de la mer Noire, lors de festivals estivaux où les cavaliers, vêtus de costumes traditionnels colorés, s'affrontent devant des foules en délire.",
    anecdotes: [
      "Lors du festival de cirit d'Erzurum en 2019, un cavalier de soixante-treize ans a esquivé trente-sept javelots consécutifs sans toucher terre, établissant un record local qui fait encore l'objet de débats passionnés dans les cafés de la ville.",
      "Le javelot de cirit est fabriqué exclusivement en bois de mûrier, car selon la tradition, ce bois ne se brise jamais en deux morceaux égaux — symbole de la résilience du peuple turc face aux épreuves.",
    ],
  },
  {
    id: "volley-ball-turquie",
    name: "Le volley-ball",
    shortDesc: "Des tribunes en feu et un niveau européen de premier plan",
    tag: "Sport",
    image:
      "/images/Culture/VB/vb 1.webp",
    photos: [
      "/images/Culture/VB/vb 1.webp",
      "/images/Culture/VB/vb 2.webp",
      "/images/Culture/VB/vb 3.webp",
      "/images/Culture/VB/vb 4.webp",
      "/images/Culture/VB/vb 5.webp",      
    ],
    audioTitle: "Smash sur le Bosphore",
    audioDuration: "2 min 55 sec",
    audioSrc: "/audio/Culture/volley-ball_turc.mp3",
    history:
      "Le volley-ball est le deuxième sport le plus populaire en Turquie, et le pays compte aujourd'hui parmi les grandes nations mondiales de la discipline, particulièrement chez les femmes. La ligue turque (Vestel Venus Sultanlar Ligi) est considérée comme l'une des meilleures au monde, attirant chaque saison les plus grandes stars internationales. Le club de VakıfBank Istanbul a remporté la Ligue des champions de la CEV à plusieurs reprises et domine le volleyball européen depuis plus d'une décennie. Les tribunes turques de volley-ball sont légendaires pour leur ambiance : les supporters chantent sans interruption, les salles sont pleines à craquer, et les matchs opposant VakıfBank à Eczacıbaşı ou Fenerbahçe attirent des foules comparables à celles des derbies de football. La fédération turque a massivement investi dans les infrastructures et les centres de formation, produisant une génération de joueuses turques de classe mondiale comme Eda Erdem, capitaine emblématique de l'équipe nationale.",
    anecdotes: [
      "Lors de la finale de la Ligue des champions 2018 à Bucarest, les supporters de VakıfBank ont fait le déplacement en charter depuis Istanbul avec leurs propres batteries de percussions, transformant la salle roumaine en un stade du Bosphore à 800 kilomètres de chez eux.",
      "La légende veut que lors du premier match de volley-ball disputé en Turquie, en 1919 à Istanbul, les joueurs utilisaient un filet de pêche emprunté aux marins du Bosphore et une balle cousue main par les sœurs d'un des participants.",
    ],
  },
];
