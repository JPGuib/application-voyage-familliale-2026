import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import App from "./App";
import { hashOwnerCode, verifyOwnerCode } from "./owner-code";
import { hashOwnerRecoveryPhrase } from "./owner-recovery";

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => ({
    cloudEnabled: false,
    cloudReady: true,
    cloudAuthError: null,
    cloudActorUid: null,
    cloudSnapshot: null,
    pushSnapshot: vi.fn().mockResolvedValue(undefined),
    claimRoleForProfile: vi.fn().mockResolvedValue(null),
    familyId: null,
  }),
}));

async function seedOwnerSession(options?: { withRecoveryPhrase?: boolean }) {
  const ownerCodeHash = await hashOwnerCode("old-1234");

  localStorage.setItem(
    "jp-profile",
    JSON.stringify({ id: "owner-1", surname: "Maman", role: "proprietaire" })
  );
  localStorage.setItem(
    "jp-family-state",
    JSON.stringify({
      version: 1,
      ownerProfileId: "owner-1",
      profiles: [{ id: "owner-1", role: "proprietaire" }],
    })
  );
  localStorage.setItem("jp-phase", "before");
  localStorage.setItem("jp-owner-code-hash", ownerCodeHash);

  if (options?.withRecoveryPhrase ?? true) {
    const recoveryHash = await hashOwnerRecoveryPhrase("my emergency phrase");
    localStorage.setItem("jp-owner-recovery-hash", recoveryHash);
  } else {
    localStorage.removeItem("jp-owner-recovery-hash");
  }

  return ownerCodeHash;
}

describe("owner recovery phrase integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Code oublie CTA and allows reset with correct phrase", async () => {
    const previousHash = await seedOwnerSession();
    render(React.createElement(App));

    fireEvent.click(screen.getByRole("button", { name: "On est partis ! 🎉" }));

    expect(screen.getByRole("button", { name: "Code oublié ?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Code oublié ?" }));
    fireEvent.change(screen.getByPlaceholderText("Phrase de récupération"), {
      target: { value: "my emergency phrase" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau code propriétaire"), {
      target: { value: "new-9876" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau code"), {
      target: { value: "new-9876" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser le code" }));

    await waitFor(() => {
      expect(screen.queryByText("Validation propriétaire")).not.toBeInTheDocument();
      expect(screen.getByText(/Jour\s+\d+/i)).toBeInTheDocument();
    });

    const nextHash = localStorage.getItem("jp-owner-code-hash") || "";
    expect(nextHash).not.toBe(previousHash);
    await expect(verifyOwnerCode("new-9876", nextHash)).resolves.toBe(true);
    await expect(verifyOwnerCode("old-1234", nextHash)).resolves.toBe(false);
  });

  it("rejects reset when recovery phrase is incorrect", async () => {
    const previousHash = await seedOwnerSession();
    render(React.createElement(App));

    fireEvent.click(screen.getByRole("button", { name: "On est partis ! 🎉" }));
    fireEvent.click(screen.getByRole("button", { name: "Code oublié ?" }));
    fireEvent.change(screen.getByPlaceholderText("Phrase de récupération"), {
      target: { value: "wrong phrase" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau code propriétaire"), {
      target: { value: "new-9876" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau code"), {
      target: { value: "new-9876" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser le code" }));

    await waitFor(() => {
      expect(screen.getByText("Phrase incorrecte. Le code propriétaire n'a pas été modifié.")).toBeInTheDocument();
    });

    const nextHash = localStorage.getItem("jp-owner-code-hash") || "";
    expect(nextHash).toBe(previousHash);
    await expect(verifyOwnerCode("old-1234", nextHash)).resolves.toBe(true);
  });

  it("redirects to settings with guidance when no recovery phrase is configured", async () => {
    await seedOwnerSession({ withRecoveryPhrase: false });
    render(React.createElement(App));

    fireEvent.click(screen.getByRole("button", { name: "On est partis ! 🎉" }));
    fireEvent.click(screen.getByRole("button", { name: "Code oublié ?" }));

    await waitFor(() => {
      expect(screen.getByText("Profil & paramètres ⚙️")).toBeInTheDocument();
      expect(screen.getByText("Aucune phrase configurée pour le moment.")).toBeInTheDocument();
    });
  });
});
