import { ACCUEIL_DRIVER_STEPS, type DriverStepConfig } from "./generated/driver-accueil";

export type TutorialScreen =
  | "dashboard"
  | "settings"
  | "planning"
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

export function loadGlobalTutorialSteps(): GlobalTutorialStep[] {
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
        description: "Cliquez pour accéder au planning complet des journées.",
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
        description: "Vous voyez ici tous les jours du séjour dans l'ordre chronologique.",
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
        description: "Cet écran centralise les lieux à visiter pour la journée sélectionnée.",
      },
      waitForElement: 2000,
    },
    {
      id: "guide-day-selector",
      screen: "guide",
      element: '[data-tutorial-id="guide-day-selector"]',
      popover: {
        title: "Changer de journée",
        description: "Utilisez ce sélecteur pour afficher une autre journée du séjour.",
      },
      waitForElement: 2000,
    },
    {
      id: "guide-day2",
      screen: "guide",
      element: '[data-tutorial-id="guide-day-option-2"]',
      popover: {
        title: "Passer au Jour 2",
        description: "Cliquez sur Jour 2 pour afficher les lieux d'Istanbul, dont Sainte-Sophie.",
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
        description: "Quand disponible (comme pour Sainte-Sophie), ce bouton ouvre la visite guidée détaillée.",
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
      id: "game-to-results",
      screen: "game",
      element: '[data-tutorial-id="bottom-nav-results"]',
      popover: {
        title: "Passer aux Résultats",
        description: "Cliquez ici pour ouvrir le tableau des scores.",
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
        description: "Le podium et les scores cumulés de la famille sont disponibles ici.",
      },
      waitForElement: 2000,
    },
    {
      id: "results-back-home",
      screen: "results",
      element: '[data-tutorial-id="bottom-nav-dashboard"]',
      popover: {
        title: "Retour Accueil",
        description: "Cliquez pour revenir à l'accueil. Le tutoriel se termine ensuite.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "dashboard-end",
      screen: "dashboard",
      ...fromAccueil('[data-tutorial-id="dashboard-map-preview"]'),
      popover: {
        title: "Fin du tutoriel",
        description: "Parfait. Vous avez une vue d'ensemble des écrans principaux.",
      },
      waitForElement: 2000,
    },
  ];
}
