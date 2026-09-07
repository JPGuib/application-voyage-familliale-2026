import { useState, useCallback, useEffect } from "react";
import type { AlbumDraft } from "../types/cloud";

/**
 * Format de sérialisation pour AlbumDraft en localStorage.
 * Les Sets sont convertis en arrays pour la sérialisation JSON.
 */
type AlbumDraftSerialized = Omit<AlbumDraft, "includedLocationIds"> & {
  includedLocationIds: string[];
};

/**
 * Clé localStorage pour un profil spécifique.
 * Format : `album-draft-{profileId}`
 */
function getStorageKey(profileId: string): string {
  return `album-draft-${profileId}`;
}

/**
 * Initialise un brouillon vide avec les valeurs par défaut.
 */
function createEmptyDraft(profileId: string): AlbumDraft {
  const now = Date.now();
  return {
    profileId,
    title: "",
    subtitle: "",
    coverPhotoId: "",
    includedLocationIds: new Set(),
    includeGameSummary: false,
    theme: "default",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Sérialise un AlbumDraft pour localStorage (convertit Set en array).
 */
function serializeDraft(draft: AlbumDraft): AlbumDraftSerialized {
  return {
    profileId: draft.profileId,
    title: draft.title,
    subtitle: draft.subtitle,
    coverPhotoId: draft.coverPhotoId,
    includedLocationIds: Array.from(draft.includedLocationIds),
    includeGameSummary: draft.includeGameSummary,
    theme: draft.theme,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

/**
 * Désérialise un AlbumDraft depuis localStorage (convertit array en Set).
 */
function deserializeDraft(data: unknown): AlbumDraft | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validation basique des champs obligatoires
  if (
    typeof obj.profileId !== "string" ||
    typeof obj.title !== "string" ||
    typeof obj.subtitle !== "string" ||
    typeof obj.coverPhotoId !== "string" ||
    !Array.isArray(obj.includedLocationIds) ||
    typeof obj.includeGameSummary !== "boolean" ||
    typeof obj.theme !== "string" ||
    typeof obj.createdAt !== "number" ||
    typeof obj.updatedAt !== "number"
  ) {
    return null;
  }

  // Valider que includedLocationIds contient uniquement des strings
  if (!obj.includedLocationIds.every((id) => typeof id === "string")) {
    return null;
  }

  return {
    profileId: obj.profileId,
    title: obj.title,
    subtitle: obj.subtitle,
    coverPhotoId: obj.coverPhotoId,
    includedLocationIds: new Set(obj.includedLocationIds),
    includeGameSummary: obj.includeGameSummary,
    theme: obj.theme,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

/**
 * Hook pour gérer le brouillon d'album personnel par profil.
 *
 * Stockage : localStorage avec clé unique par profil (album-draft-{profileId}).
 * Isolation : le brouillon d'un profil n'est jamais visible quand un autre profil
 *            ouvre l'album sur le même appareil (AC7).
 *
 * @param profileId Identifiant du profil propriétaire du brouillon
 * @returns Objet { draft, updateTitle, updateSubtitle, updateCoverPhoto, 
 *                  toggleLocation, updateGameSummary, updateTheme, clearDraft }
 */
export function useAlbumDraft(profileId: string) {
  const [draft, setDraft] = useState<AlbumDraft>(() => {
    try {
      const storageKey = getStorageKey(profileId);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const deserialized = deserializeDraft(parsed);
        if (deserialized && deserialized.profileId === profileId) {
          return deserialized;
        }
      }
    } catch {
      // Ignore parsing errors, fall through to empty draft
    }
    return createEmptyDraft(profileId);
  });

  /**
   * Persiste le brouillon en localStorage après chaque changement.
   * Appelé via useEffect pour garantir la cohérence.
   */
  useEffect(() => {
    try {
      const storageKey = getStorageKey(profileId);
      const serialized = serializeDraft(draft);
      localStorage.setItem(storageKey, JSON.stringify(serialized));
    } catch {
      // Ignore storage errors silently (quota exceeded, etc.)
    }
  }, [draft, profileId]);

  /**
   * Met à jour le titre du brouillon.
   */
  const updateTitle = useCallback((title: string) => {
    setDraft((prev) => ({
      ...prev,
      title,
      updatedAt: Date.now(),
    }));
  }, []);

  /**
   * Met à jour le sous-titre du brouillon.
   */
  const updateSubtitle = useCallback((subtitle: string) => {
    setDraft((prev) => ({
      ...prev,
      subtitle,
      updatedAt: Date.now(),
    }));
  }, []);

  /**
   * Met à jour la photo de couverture sélectionnée.
   */
  const updateCoverPhoto = useCallback((coverPhotoId: string) => {
    setDraft((prev) => ({
      ...prev,
      coverPhotoId,
      updatedAt: Date.now(),
    }));
  }, []);

  /**
   * Bascule l'inclusion/exclusion d'un lieu.
   * Si le lieu est inclus, il est supprimé de includedLocationIds.
   * Si le lieu n'est pas inclus, il est ajouté.
   */
  const toggleLocation = useCallback((locationId: string) => {
    setDraft((prev) => {
      const newIncluded = new Set(prev.includedLocationIds);
      if (newIncluded.has(locationId)) {
        newIncluded.delete(locationId);
      } else {
        newIncluded.add(locationId);
      }
      return {
        ...prev,
        includedLocationIds: newIncluded,
        updatedAt: Date.now(),
      };
    });
  }, []);

  /**
   * Met à jour l'option d'inclusion des résultats de jeu.
   */
  const updateGameSummary = useCallback((includeGameSummary: boolean) => {
    setDraft((prev) => ({
      ...prev,
      includeGameSummary,
      updatedAt: Date.now(),
    }));
  }, []);

  /**
   * Met à jour le thème visuel prédéfini.
   */
  const updateTheme = useCallback((theme: string) => {
    setDraft((prev) => ({
      ...prev,
      theme,
      updatedAt: Date.now(),
    }));
  }, []);

  /**
   * Vide complètement le brouillon (réinitialise aux valeurs par défaut).
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey(profileId));
    } catch {
      // Ignore removal errors
    }
    setDraft(createEmptyDraft(profileId));
  }, [profileId]);

  return {
    draft,
    updateTitle,
    updateSubtitle,
    updateCoverPhoto,
    toggleLocation,
    updateGameSummary,
    updateTheme,
    clearDraft,
  };
}
