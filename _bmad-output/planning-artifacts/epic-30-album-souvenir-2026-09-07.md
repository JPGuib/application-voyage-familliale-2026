# Epic 30 - Album souvenir de voyage

Date : 2026-09-07

Source : `POST-SEJOUR - PSJ2 - créer un album souvenir` dans `docs/Backlog Appli.txt`.

Stories détaillées : `docs/specs-stories/epic-30/`.

## Objectif

Après la fin du voyage, permettre aux membres de la famille de transformer les souvenirs enregistrés dans l'application en un album de voyage illustré, téléchargeable au format PDF.

L'album doit raconter le séjour, pas archiver l'application : itinéraire, lieux réellement visités, photos et notes du carnet, avec une synthèse facultative des jeux. Les documents de voyage et les données sensibles restent exclus par défaut.

## Décisions de produit

- Chaque profil `proprietaire` ou `utilisateur` peut créer et télécharger son **album personnel**. Il contient le programme commun et tous les souvenirs déposés dans le carnet des lieux retenus ; un souvenir ajouté au carnet est familial par nature.
- Le propriétaire détermine les lieux effectivement réalisés : l'album ne retient qu'un lieu visible (`placeVisibilityMap` différent de `hiddenByOwner`) et marqué `seen` dans `placeSeenMap`. Un profil `visiteur` reste en lecture seule et ne peut ni contribuer ni exporter.
- Le propriétaire peut publier une **édition familiale**, construite à partir de ces mêmes contenus admissibles. Les membres authentifiés de la famille peuvent ensuite la consulter et la télécharger depuis l'application.
- La V1 ne produit aucun lien public vers un fichier PDF. Un tel lien suppose Firebase Storage ou un stockage équivalent, des URLs révocables/expirables et une politique de confidentialité adaptée aux photos de famille. Cette évolution est repoussée après validation de l'usage de l'album interne.
- Le PDF est rendu et téléchargé localement dans le navigateur. Firebase conserve les souvenirs et, pour l'édition familiale, la configuration publiée ; il ne stocke pas le binaire PDF.

## Contenu de la V1

1. Couverture : destination, dates, titre, photo de couverture optionnelle.
2. Itinéraire : étapes et frise des journées.
3. Chapitres quotidiens : lieux marqués `vu`, photo principale, notes et photos du carnet associées.
4. Souvenirs : citations attribuées à leur auteur et images autorisées.
5. Page facultative Jeux : podium, badges et défis sélectionnés, sans réponses de quiz détaillées.
6. Dernière page : participants et statistiques simples (jours, lieux vus, souvenirs, photos).

### Socle éditorial par lieu (ajout story 30.5)

Le retour utilisateur après les stories 30.1-30.4 a montré un album trop pauvre : seules les notes de carnet perso apparaissaient, sans les photos officielles, sans la présentation/histoire du lieu, ni les anecdotes déjà rédigées dans l'application, avec un rendu PDF texte brut sans rapport visuel avec l'appli. La story 30.5 corrige ce constat :

- Le contenu éditorial déjà présent par lieu dans `src/content/places.ts` (`image`, `photos`, `historyLabel`, `history`, `anecdotesLabel`, `anecdotes`) apparaît désormais **toujours** pour un lieu inclus dans l'album, même si aucun voyageur n'a écrit de note de carnet pour ce lieu. Les notes/photos de carnet s'ajoutent par-dessus ce socle, elles ne le remplacent jamais.
- Cette règle s'applique identiquement à l'album personnel (30.2/30.3) et à la source partagée de l'édition familiale (30.4), pour que les deux parcours en bénéficient sans dupliquer la logique de filtrage.
- Le rendu (aperçu HTML et export PDF) est refondu visuellement pour se rapprocher de la charte de l'appli (accent #1976d2, bandeaux de titre colorés, dégradé de couverture façon `.album-page--cover`), au lieu d'un texte brut noir/blanc.

## Données explicitement exclues

- Documents, scans, billets, réservations, assurances, coordonnées et liens externes.
- Checklist, codes, informations de récupération et données de compte.
- Chat brut et sondages.
- Souvenirs rattachés à un lieu masqué ou non marqué comme réellement visité.

## Découpage

1. **30.1 - Sources d'album et filtrage des lieux visités** : lecture dédiée de tous les carnets et filtre strict sur les lieux visibles et réellement visités.
2. **30.2 - Préparation de l'album personnel** : nouvelle rubrique post-séjour, sélection éditoriale, couverture et aperçu HTML imprimable.
3. **30.3 - Génération locale d'un PDF personnel** : composition A4, export téléchargeable, limites de poids et traitement des erreurs.
4. **30.4 - Édition familiale publiée par le propriétaire** : sélection des contenus admissibles, publication d'une configuration versionnée et téléchargement par les membres authentifiés.
5. **30.5 - Contenu éditorial et habillage visuel** : socle éditorial (présentation, anecdotes, photos officielles) toujours présent par lieu dans la source partagée, et refonte visuelle de l'aperçu HTML et du PDF pour se rapprocher de la charte de l'appli.

## Ordre recommandé

`30.1 -> 30.2 -> 30.3 -> 30.4 -> 30.5`

Les trois premières stories livrent un album personnel complet. La quatrième apporte la diffusion familiale sans créer de partage public ni de dépendance à un stockage de fichiers. La cinquième enrichit le contenu et l'habillage visuel des deux parcours (personnel et familial) sans changer leur périmètre fonctionnel.

## Contraintes techniques

- Les carnets de visite sont aujourd'hui lus lieu par lieu depuis `placeVisitLogs/$familyId/$placeId`; l'export doit ajouter une lecture ponctuelle au niveau de la famille, sans transformer le flux d'affichage normal en chargement intégral.
- Les photos sont des data URI JPEG déjà compressés et plafonnés. L'export doit imposer un nombre maximal d'images et les recomprimer/dimensionner pour garder une génération viable sur mobile.
- Le lecteur ne doit récupérer que des données accessibles à son profil Firebase. Les règles RTDB doivent protéger toute nouvelle donnée d'édition familiale.
- La sortie doit être un vrai PDF local et ne jamais envoyer les photos à un service tiers de conversion.

## Critères de réussite de l'epic

1. Un utilisateur peut télécharger un PDF personnel sans révéler les souvenirs d'un autre utilisateur.
2. Un propriétaire peut publier une édition familiale qui n'utilise que les contenus de lieux visibles et réellement visités.
3. Aucun document ou scan de voyage n'est présent dans le PDF, quel que soit le mode d'album.
4. Le parcours est utilisable sur mobile et ne bloque pas silencieusement quand le volume de photos dépasse les limites prévues.
5. L'export ne requiert ni backend applicatif ni stockage persistant de PDF pour la V1.

## Hors périmètre

- Lien public, QR code, expiration ou révocation d'un lien de téléchargement.
- Envoi par e-mail, impression papier ou commande d'un livre photo.
- Import automatique depuis Polarsteps, Google Photos ou la galerie de l'appareil.
- Montage vidéo souvenir (PSJ3) et stockage illimité de photos (C6).
