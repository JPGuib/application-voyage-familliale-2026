import { describe, it, expect } from "vitest";
import {
  canAccessAlbumComposition,
  getAlbumAccessDeniedMessage,
  shouldShowAlbumMenuItem,
} from "./album-access";

describe("Album Access Control", () => {
  describe("canAccessAlbumComposition", () => {
    it("always allows owner access regardless of trip phase", () => {
      // Before trip
      expect(canAccessAlbumComposition("proprietaire", 1, 10)).toBe(true);
      // During trip
      expect(canAccessAlbumComposition("proprietaire", 5, 10)).toBe(true);
      // After trip
      expect(canAccessAlbumComposition("proprietaire", 11, 10)).toBe(true);
    });

    it("allows user access only after trip ends (AC1)", () => {
      // Before trip ends: day 5 of 10
      expect(canAccessAlbumComposition("utilisateur", 5, 10)).toBe(false);

      // On last day: day 10 of 10
      expect(canAccessAlbumComposition("utilisateur", 10, 10)).toBe(false);

      // After trip ends: day 11 of 10
      expect(canAccessAlbumComposition("utilisateur", 11, 10)).toBe(true);
    });

    it("never allows visitor access (AC2)", () => {
      // Before trip
      expect(canAccessAlbumComposition("visiteur", 1, 10)).toBe(false);
      // During trip
      expect(canAccessAlbumComposition("visiteur", 5, 10)).toBe(false);
      // After trip
      expect(canAccessAlbumComposition("visiteur", 11, 10)).toBe(false);
    });

    it("denies access to null role (not authenticated)", () => {
      expect(canAccessAlbumComposition(null, 5, 10)).toBe(false);
    });

    it("handles null lastDefinedDay (trip duration unknown)", () => {
      // Owner still has access
      expect(canAccessAlbumComposition("proprietaire", 1, null)).toBe(true);

      // User never has access if trip duration is unknown
      expect(canAccessAlbumComposition("utilisateur", 1, null)).toBe(false);
      expect(canAccessAlbumComposition("utilisateur", 100, null)).toBe(false);
    });
  });

  describe("getAlbumAccessDeniedMessage", () => {
    it("shows visitor-specific message", () => {
      const msg = getAlbumAccessDeniedMessage("visiteur", 5, 10);
      expect(msg).toContain("voyageurs");
    });

    it("shows post-trip message for user before trip ends", () => {
      const msg = getAlbumAccessDeniedMessage("utilisateur", 5, 10);
      expect(msg).toContain("après la fin du voyage");
    });

    it("shows generic message when user has access", () => {
      const msg = getAlbumAccessDeniedMessage("utilisateur", 11, 10);
      // After trip, user can access, so we should still return a message
      // (this function is called when access is denied)
      expect(msg).toBeTruthy();
    });

    it("shows generic message for null role", () => {
      const msg = getAlbumAccessDeniedMessage(null, 5, 10);
      expect(msg).toBeTruthy();
    });
  });

  describe("shouldShowAlbumMenuItem", () => {
    it("shows album menu for owner at any time", () => {
      expect(shouldShowAlbumMenuItem("proprietaire", 1, 10)).toBe(true);
      expect(shouldShowAlbumMenuItem("proprietaire", 5, 10)).toBe(true);
      expect(shouldShowAlbumMenuItem("proprietaire", 11, 10)).toBe(true);
    });

    it("shows album menu for user only after trip ends", () => {
      expect(shouldShowAlbumMenuItem("utilisateur", 5, 10)).toBe(false);
      expect(shouldShowAlbumMenuItem("utilisateur", 10, 10)).toBe(false);
      expect(shouldShowAlbumMenuItem("utilisateur", 11, 10)).toBe(true);
    });

    it("never shows album menu for visitor", () => {
      expect(shouldShowAlbumMenuItem("visiteur", 1, 10)).toBe(false);
      expect(shouldShowAlbumMenuItem("visiteur", 11, 10)).toBe(false);
    });

    it("hides album menu when role is null", () => {
      expect(shouldShowAlbumMenuItem(null, 5, 10)).toBe(false);
    });
  });
});
