import { ACCUEIL_DRIVER_STEPS, type DriverStepConfig } from "./generated/driver-accueil";
import type { Role } from "../owner-policy";
import { formatTripDayLabel } from "../trip-day-format";

export type TutorialScreen =
  | "dashboard"
  | "settings"
  | "planning"
  | "documents"
  | "guide"
  | "place"
  | "game"
  | "tips"
  | "results";

export type GlobalTutorialStep = DriverStepConfig & {
  id: string;
  screen: TutorialScreen;
  interactive?: boolean;
  waitForElement?: number;
};

const accueilBySelector = Object.fromEntries(
  ACCUEIL_DRIVER_STEPS.map((step) => [step.element, step])
) as Record<string, DriverStepConfig>;

function fromAccueil(selector: string): DriverStepConfig {
  const step = accueilBySelector[selector];
  if (step) return step;
  return {
    element: selector,
    popover: {
      title: "Découverte",
      description: "Élément de navigation du tutoriel.",
    },
  };
}

export function loadGlobalTutorialSteps(
  role: Role | null = "utilisateur",
  tripStartDate: string | null = null
): GlobalTutorialStep[] {
  const canOpenScans = role !== "visiteur";
  const guideDay2Label = formatTripDayLabel(2, tripStartDate);

  return [
    {
      id: "dashboard-intro",
      screen: "dashboard",
      ...fromAccueil('[data-tutorial-id="dashboard-today-card"]'),
      waitForElement: 1500,
    },
    {
      id: "dashboard-open-settings",
      screen: "dashboard",
      element: '[data-tutorial-id="dashboard-settings"]',
      popover: {
        title: "Ouvrir les paramètres",
        description: "Cliquez ici pour aller sur l'écran Paramètres.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "settings-explain",
      screen: "settings",
      element: '[data-tutorial-id="settings-title"]',
      popover: {
        title: "Écran Paramètres",
        description: "Ici vous gérez le profil, la sécurité et les options d'application.",
      },
      waitForElement: 2000,
    },
    {
      id: "settings-back",
      screen: "settings",
      element: '[data-tutorial-id="settings-back"]',
      popover: {
        title: "Retour Accueil",
        description: "Cliquez pour revenir à l'accueil et continuer le tutoriel.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "dashboard-open-planning",
      screen: "dashboard",
      ...fromAccueil('[data-tutorial-id="dashboard-planning"]'),
      popover: {
        title: "Ouvrir le planning",
        description: "Cliquez pour accéder au planning complet des dates du séjour.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "planning-explain",
      screen: "planning",
      element: '[data-tutorial-id="planning-title"]',
      popover: {
        title: "Écran Planning",
        description: "Vous voyez ici toutes les dates du séjour dans l'ordre chronologique.",
      },
      waitForElement: 2000,
    },
    {
      id: "planning-back",
      screen: "planning",
      element: '[data-tutorial-id="planning-back"]',
      popover: {
        title: "Retour Accueil",
        description: "Cliquez pour revenir à l'accueil et poursuivre le parcours.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "dashboard-open-documents",
      screen: "dashboard",
      element: '[data-tutorial-id="dashboard-quick-documents"]',
      popover: {
        title: "Ouvrir Documents et informations importants",
        description: "Cliquez ici pour accéder aux documents classés par catégories.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "documents-explain",
      screen: "documents",
      element: '[data-tutorial-id="documents-title"]',
      popover: {
        title: "Écran Documents et informations importants",
        description: canOpenScans
          ? "Cet écran regroupe vos vols, hébergements, transports, identité, restaurants et activités."
          : "Cet écran regroupe vos vols, hébergements, transports, identité, restaurants et activités. En profil visiteur, les scans restent non accessibles.",
      },
      waitForElement: 2000,
    },
    ...(canOpenScans
      ? [
          {
            id: "documents-open-scans",
            screen: "documents",
            element: '[data-tutorial-id="documents-open-scans"]',
            popover: {
              title: "Ouvrir les scans",
              description: "Cliquez sur le badge vert \"scan(s)\" pour ouvrir les scans/images liés à ce document.",
            },
            interactive: true,
            waitForElement: 2000,
          },
          {
            id: "documents-scans-explain",
            screen: "documents",
            element: '[data-tutorial-id="documents-scans-title"]',
            popover: {
              title: "Écran des scans",
              description: "Cet écran affiche les images du document. Vous pouvez agrandir chaque scan.",
            },
            waitForElement: 2000,
          },
          {
            id: "documents-scan-open-lightbox",
            screen: "documents",
            element: '[data-tutorial-id="documents-scan-image-0"]',
            popover: {
              title: "Agrandir un scan",
              description: "Cliquez sur la première image pour l'ouvrir en grand format.",
            },
            interactive: true,
            waitForElement: 2000,
          },
          {
            id: "documents-scan-lightbox-explain",
            screen: "documents",
            element: '[data-tutorial-id="documents-scan-lightbox"]',
            popover: {
              title: "Image agrandie",
              description: "Le scan est affiché en grand pour faciliter la lecture.",
            },
            waitForElement: 2000,
          },
          {
            id: "documents-scan-close-lightbox",
            screen: "documents",
            element: '[data-tutorial-id="documents-scan-lightbox-close"]',
            popover: {
              title: "Fermer l'image",
              description: "Cliquez ici pour revenir à la galerie des scans.",
            },
            interactive: true,
            waitForElement: 2000,
          },
          {
            id: "documents-scans-back-to-documents",
            screen: "documents",
            element: '[data-tutorial-id="documents-scans-back"]',
            popover: {
              title: "Retour aux documents",
              description: "Cliquez ici pour revenir à la fiche des documents.",
            },
            interactive: true,
            waitForElement: 2000,
          },
        ]
      : []),
    {
      id: "documents-back-home",
      screen: "documents",
      element: '[data-tutorial-id="documents-back"]',
      popover: {
        title: "Retour Accueil",
        description: "Cliquez pour revenir à l'accueil et continuer le tutoriel.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "dashboard-open-guide",
      screen: "dashboard",
      ...fromAccueil('[data-tutorial-id="dashboard-today-card"]'),
      popover: {
        title: "Aller vers le Guide",
        description: "Cliquez cette carte pour ouvrir l'écran Guide du séjour.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "guide-explain",
      screen: "guide",
      element: '[data-tutorial-id="guide-title"]',
      popover: {
        title: "Écran Guide",
        description: "Cet écran centralise les lieux à visiter pour la date sélectionnée.",
      },
      waitForElement: 2000,
    },
    {
      id: "guide-day-selector",
      screen: "guide",
      element: '[data-tutorial-id="guide-day-selector"]',
      popover: {
        title: "Changer de date",
        description: `Cliquez ici pour ouvrir la liste des dates, puis sélectionnez ${guideDay2Label}.`,
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "guide-day2",
      screen: "guide",
      element: '[data-tutorial-id="guide-day-option-2"]',
      popover: {
        title: `Passer au ${guideDay2Label}`,
        description: `Cliquez sur ${guideDay2Label} pour afficher les lieux d'Istanbul, dont Sainte-Sophie.`,
      },
      interactive: true,
      waitForElement: 2500,
    },
    {
      id: "guide-open-sainte-sophie",
      screen: "guide",
      element: '[data-tutorial-id="guide-place-sainte-sophie"]',
      popover: {
        title: "Ouvrir Sainte-Sophie",
        description: "Cliquez sur ce lieu pour découvrir sa fiche détaillée.",
      },
      interactive: true,
      waitForElement: 2500,
    },
    {
      id: "place-audio",
      screen: "place",
      element: '[data-tutorial-id="place-audio-player"]',
      popover: {
        title: "Audio du lieu",
        description: "Cette capsule audio permet d'écouter une présentation de Sainte-Sophie pour rendre la découverte plus vivante.",
      },
      waitForElement: 2500,
    },
    {
      id: "place-gallery",
      screen: "place",
      element: '[data-tutorial-id="place-gallery-title"]',
      popover: {
        title: "Galerie photo",
        description: "Ici vous retrouvez les photos du lieu, consultables en grand format.",
      },
      waitForElement: 2500,
    },
    {
      id: "place-history",
      screen: "place",
      element: '[data-tutorial-id="place-history-title"]',
      popover: {
        title: "Histoire",
        description: "Cette section présente le contexte historique du lieu.",
      },
      waitForElement: 2500,
    },
    {
      id: "place-anecdotes",
      screen: "place",
      element: '[data-tutorial-id="place-anecdotes-title"]',
      popover: {
        title: "Anecdotes",
        description: "Vous trouverez ici des faits marquants et anecdotes sur le lieu.",
      },
      waitForElement: 2500,
    },
    {
      id: "place-guided-tour",
      screen: "place",
      element: '[data-tutorial-id="place-guided-tour-cta"]',
      popover: {
        title: "Visite guidée",
        description: "Quand disponible, cette visite guidée propose des audios et des photos pour une immersion encore plus riche dans le lieu.",
      },
      waitForElement: 2500,
    },
    {
      id: "place-to-game",
      screen: "place",
      element: '[data-tutorial-id="bottom-nav-game"]',
      popover: {
        title: "Passer au Jeu",
        description: "Cliquez sur Jeu dans la barre basse pour découvrir l'écran de jeu.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "game-explain",
      screen: "game",
      element: '[data-tutorial-id="game-title"]',
      popover: {
        title: "Écran Jeu",
        description: "Le jeu du jour propose quiz, énigme et défi, avec un score cumulé.",
      },
      waitForElement: 2000,
    },
    {
      id: "game-back-home",
      screen: "game",
      element: '[data-tutorial-id="bottom-nav-dashboard"]',
      popover: {
        title: "Retour Accueil",
        description: "Revenez à l'accueil pour continuer la découverte des autres écrans.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "dashboard-open-results",
      screen: "dashboard",
      element: '[data-tutorial-id="dashboard-quick-results"]',
      popover: {
        title: "Voir les résultats",
        description: "Cliquez ici pour ouvrir la page des scores et badges de la famille.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "results-explain",
      screen: "results",
      element: '[data-tutorial-id="results-title"]',
      popover: {
        title: "Écran Résultats",
        description: "Ici vous retrouvez le podium, les badges et la progression des scores de la famille.",
      },
      waitForElement: 2000,
    },
    {
      id: "results-back-home",
      screen: "results",
      element: '[data-tutorial-id="results-back"]',
      popover: {
        title: "Quitter les résultats",
        description: "Revenez à l'accueil pour découvrir les conseils pratiques.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "dashboard-open-tips",
      screen: "dashboard",
      element: '[data-tutorial-id="dashboard-quick-tips"]',
      popover: {
        title: "Ouvrir les astuces",
        description: "Cliquez ici pour voir les conseils utiles pendant le séjour.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "tips-explain",
      screen: "tips",
      element: '[data-tutorial-id="tips-title"]',
      popover: {
        title: "Écran Astuces",
        description: "Cette page regroupe les informations pratiques pour se déplacer, payer et gérer le quotidien sur place. L'onglet Paiement s'ouvre par défaut avec le convertisseur euro-livre turque.",
      },
      waitForElement: 2000,
    },
    {
      id: "tips-converter",
      screen: "tips",
      element: '[data-tutorial-id="tips-converter-title"]',
      popover: {
        title: "Convertisseur EUR TRY",
        description: "Ce convertisseur permet d'estimer rapidement un montant en euros ou en livres turques.",
      },
      waitForElement: 2000,
    },
    {
      id: "tips-back-home",
      screen: "tips",
      element: '[data-tutorial-id="tips-back"]',
      popover: {
        title: "Retour Accueil",
        description: "Revenez à l'accueil pour terminer avec la carte et le partage photo.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "dashboard-map-preview",
      screen: "dashboard",
      ...fromAccueil('[data-tutorial-id="dashboard-map-preview"]'),
      popover: {
        title: "Carte du séjour",
        description: "Depuis l'accueil, cette carte permet de visualiser rapidement le circuit global du voyage.",
      },
      waitForElement: 2000,
    },
    {
      id: "dashboard-polarsteps",
      screen: "dashboard",
      element: '[data-tutorial-id="dashboard-polarsteps-link"]',
      popover: {
        title: "Polarsteps",
        description: "Nous y déposerons les photos du séjour pour garder un journal de voyage partagé. Le tutoriel se termine ici.",
      },
      waitForElement: 2000,
    },
  ];
}
