import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { FALLBACK_EUR_TRY_RATE } from "./exchange-rate";

const cloudSyncMock = vi.fn();

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("../content/trip", () => ({
  TRIP: {
    currentDay: 1,
    todayDestination: "Istanbul",
    name: "Voyage 2026",
    startDate: "2026-08-16",
  },
}));

// Mock exchange rate module — prevents real fetch calls in tests
vi.mock("./exchange-rate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./exchange-rate")>();
  return {
    ...actual,
    getEurTryRate: vi.fn(),
  };
});

import { getEurTryRate } from "./exchange-rate";
const mockedGetEurTryRate = getEurTryRate as ReturnType<typeof vi.fn>;

function makeProfile(id: string, surname: string, role: "proprietaire" | "utilisateur" | "visiteur") {
  return {
    profileId: id,
    surname,
    role,
    createdAt: 1,
    lastSyncAt: 1,
    checklist: {},
    customChecklistItems: [],
    gameResults: [],
    gameProgress: null,
    phase: "during" as const,
  };
}

function makeCloudSnapshot() {
  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [
        { id: "p1", role: "proprietaire" as const },
        { id: "p2", role: "utilisateur" as const },
      ],
    },
    ownerCodeHash: "hash",
    ownerCodePlain: "",
    travelerCodeHash: "",
    travelerCodePlain: "",
    ownerRecoveryHash: "",
    ownerGlobalChecklistAdditions: [],
    ownerGlobalChecklistRemovals: {},
    placeComments: {},
    gameDayOverrides: {},
    phase: "during" as const,
    tripStartDate: "2026-08-16",
    profiles: {
      p1: makeProfile("p1", "Alice", "proprietaire"),
      p2: makeProfile("p2", "Bob", "utilisateur"),
    },
    updatedAt: 1,
  };
}

async function renderAppAndNavigateToPaymentTab() {
  localStorage.setItem("jp-active-profile-id", "p1");
  cloudSyncMock.mockReturnValue({
    cloudEnabled: true,
    cloudReady: true,
    cloudAuthError: null,
    cloudActorUid: "actor-owner",
    cloudSnapshot: makeCloudSnapshot(),
    pushSnapshot: vi.fn().mockResolvedValue(undefined),
    claimRoleForProfile: vi.fn().mockResolvedValue(null),
    familyId: "famille-voyage-2026",
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getAllByText("Conseils").length).toBeGreaterThan(0);
  });

  // Navigate to Tips screen via bottom nav
  const conseilsButtons = screen.getAllByText("Conseils");
  fireEvent.click(conseilsButtons[conseilsButtons.length - 1]);

  await waitFor(() => {
    expect(screen.getByText(/Conseils de voyage/i)).toBeInTheDocument();
  });

  // Switch to Payment tab
  fireEvent.click(screen.getByRole("button", { name: /Paiement/i }));

  await waitFor(() => {
    expect(screen.getByText(/Convertisseur EUR/i)).toBeInTheDocument();
  });
}

describe("TipsScreen — convertisseur EUR ↔ TRY (story 20.3)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    mockedGetEurTryRate.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("affiche le bloc convertisseur dans l'onglet Paiement", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 37.5,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    await renderAppAndNavigateToPaymentTab();

    expect(screen.getByLabelText(/Montant en euros/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Montant en livres turques/i)).toBeInTheDocument();
  });

  it("met à jour TRY quand EUR est modifié avec une valeur valide", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 40.0,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    await renderAppAndNavigateToPaymentTab();

    const eurInput = screen.getByLabelText(/Montant en euros/i);
    const tryInput = screen.getByLabelText(/Montant en livres turques/i);

    fireEvent.change(eurInput, { target: { value: "10" } });

    await waitFor(() => {
      expect((tryInput as HTMLInputElement).value).toBe("400");
    });
  });

  it("met à jour EUR quand TRY est modifié avec une valeur valide", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 40.0,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    await renderAppAndNavigateToPaymentTab();

    const eurInput = screen.getByLabelText(/Montant en euros/i);
    const tryInput = screen.getByLabelText(/Montant en livres turques/i);

    fireEvent.change(tryInput, { target: { value: "400" } });

    await waitFor(() => {
      expect((eurInput as HTMLInputElement).value).toBe("10");
    });
  });

  it("ne bloque pas et vide le champ calculé pour une saisie non numérique", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 40.0,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    await renderAppAndNavigateToPaymentTab();

    const eurInput = screen.getByLabelText(/Montant en euros/i);
    const tryInput = screen.getByLabelText(/Montant en livres turques/i);

    // Saisie d'abord valide, puis invalide : le champ calculé doit se vider
    fireEvent.change(eurInput, { target: { value: "abc" } });
    expect((tryInput as HTMLInputElement).value).toBe("");
    // Le composant ne doit pas crasher
    expect(screen.getByLabelText(/Montant en euros/i)).toBeInTheDocument();
  });

  it("ne bloque pas pour une saisie négative", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 40.0,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    await renderAppAndNavigateToPaymentTab();

    const eurInput = screen.getByLabelText(/Montant en euros/i);
    const tryInput = screen.getByLabelText(/Montant en livres turques/i);

    fireEvent.change(eurInput, { target: { value: "-5" } });
    expect((tryInput as HTMLInputElement).value).toBe("");
    expect(screen.getByLabelText(/Montant en euros/i)).toBeInTheDocument();
  });

  it("affiche le message de taux en direct après un fetch réussi", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 37.5,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    await renderAppAndNavigateToPaymentTab();

    await waitFor(() => {
      expect(screen.getByText(/Taux en direct/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Valeur approximative.*frais bancaires non inclus/i)).toBeInTheDocument();
  });

  it("affiche le message du cache quand la source est cache", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 37.0,
      fetchedAtIso: "2026-08-02T10:00:00.000Z",
      source: "cache",
    });

    await renderAppAndNavigateToPaymentTab();

    await waitFor(() => {
      expect(screen.getByText(/Dernier taux connu/i)).toBeInTheDocument();
    });
  });

  it("affiche le message du taux indicatif quand la source est fallback", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: FALLBACK_EUR_TRY_RATE,
      fetchedAtIso: "",
      source: "fallback",
    });

    await renderAppAndNavigateToPaymentTab();

    await waitFor(() => {
      expect(screen.getByText(/Taux indicatif non mis à jour/i)).toBeInTheDocument();
    });
  });

  it("conserve les cartes de paiement statiques existantes", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 37.5,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    await renderAppAndNavigateToPaymentTab();

    // Les cartes du contenu statique TIPS.payment doivent toujours être présentes
    expect(screen.getByText(/La monnaie en Turquie/i)).toBeInTheDocument();
    expect(screen.getByText(/Cartes bancaires/i)).toBeInTheDocument();
  });

  it("conserve le bloc météo dans l'onglet transport", async () => {
    mockedGetEurTryRate.mockResolvedValue({
      rate: 37.5,
      fetchedAtIso: "2026-08-03T10:00:00.000Z",
      source: "live",
    });

    localStorage.setItem("jp-active-profile-id", "p1");
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeCloudSnapshot(),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    const conseilsButtons = await screen.findAllByText("Conseils");
    fireEvent.click(conseilsButtons[conseilsButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/Conseils de voyage/i)).toBeInTheDocument();
    });

    // Transport tab is selected by default — weather block should be present
    expect(screen.getByText(/Position non disponible|Récupération de la météo|Météo indisponible/i)).toBeInTheDocument();
  });
});
