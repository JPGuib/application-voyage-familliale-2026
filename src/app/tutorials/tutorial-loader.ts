import { ACCUEIL_DRIVER_STEPS, type DriverStepConfig } from "./generated/driver-accueil";

export type TutorialScreen = "dashboard" | "settings" | "planning" | "guide" | "tips" | "results";

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
      id: "guide-to-tips",
      screen: "guide",
      element: '[data-tutorial-id="bottom-nav-tips"]',
      popover: {
        title: "Passer à Conseils",
        description: "Cliquez dans la barre basse pour ouvrir l'écran Conseils.",
      },
      interactive: true,
      waitForElement: 2000,
    },
    {
      id: "tips-explain",
      screen: "tips",
      element: '[data-tutorial-id="tips-title"]',
      popover: {
        title: "Écran Conseils",
        description: "Vous trouverez ici les infos pratiques transport, paiement, urgences et plus.",
      },
      waitForElement: 2000,
    },
    {
      id: "tips-to-results",
      screen: "tips",
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
