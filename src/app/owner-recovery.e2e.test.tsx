import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import App from "./App";
import { hashOwnerCode } from "./owner-code";
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

async function seedOwnerLockedBeforePhase() {
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
  localStorage.setItem("jp-owner-code-hash", await hashOwnerCode("old-1234"));
  localStorage.setItem(
    "jp-owner-recovery-hash",
    await hashOwnerRecoveryPhrase("my emergency phrase")
  );
}

describe("owner recovery minimal e2e", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("owner forgot code -> reset -> unlocks journey with the new code", async () => {
    await seedOwnerLockedBeforePhase();
    const view = render(React.createElement(App));

    fireEvent.click(screen.getByRole("button", { name: "On est partis ! 🎉" }));
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
      expect(screen.getByText(/Jour\s+\d+/i)).toBeInTheDocument();
    });

    localStorage.setItem("jp-phase", "before");
    view.unmount();
    render(React.createElement(App));

    fireEvent.click(screen.getByRole("button", { name: "On est partis ! 🎉" }));
    fireEvent.change(screen.getByPlaceholderText("Code propriétaire"), {
      target: { value: "new-9876" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+\d+/i)).toBeInTheDocument();
    });
  });
});
