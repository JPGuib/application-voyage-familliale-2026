import { useState, useEffect } from "react";
import type { AlbumSource } from "../types/cloud";
import { useAlbumDraft } from "../hooks/useAlbumDraft";
import { canAccessAlbumComposition, getAlbumAccessDeniedMessage } from "./album-access";
import { filterAlbumContent, findFallbackCoverPhoto, escapeAndLimitText } from "./albumUtils";

export interface AlbumScreenProps {
  profileId: string;
  currentDay: number;
  lastDefinedDay: number | null;
  role: "proprietaire" | "utilisateur" | "visiteur" | null;
  albumSource: AlbumSource;
  onClose?: () => void;
}

/**
 * AlbumScreen : Permettre à chaque voyageur de composer et prévisualiser
 * son album personnel après le séjour (story 30.2).
 *
 * Fonctionnalités :
 * - Composition de l'album (titre, photo de couverture, sélection des lieux)
 * - Aperçu responsive en pages A4
 * - Gestion locale du brouillon par profil (AC7)
 * - Vérification des droits d'accès (AC1, AC2)
 */
export function AlbumScreen({
  profileId,
  currentDay,
  lastDefinedDay,
  role,
  albumSource,
  onClose,
}: AlbumScreenProps) {
  // Vérifier l'accès
  const hasAccess = canAccessAlbumComposition(role, currentDay, lastDefinedDay);

  // Utiliser le hook de gestion du brouillon AVANT l'early return
  const {
    draft,
    updateTitle,
    updateSubtitle,
    updateCoverPhoto,
    toggleLocation,
    updateGameSummary,
    updateTheme,
    clearDraft,
  } = useAlbumDraft(profileId);

  const [activeTab, setActiveTab] = useState<"composition" | "preview">("composition");

  if (!hasAccess) {
    const errorMessage = getAlbumAccessDeniedMessage(role, currentDay, lastDefinedDay);
    return (
      <div className="album-screen album-screen--denied">
        <div className="album-denied-container">
          <h2>Accès refusé</h2>
          <p>{errorMessage}</p>
          {onClose && <button onClick={onClose}>Fermer</button>}
        </div>
      </div>
    );
  }

  // Filtrer le contenu selon la sélection du brouillon
  const filteredContent = filterAlbumContent(albumSource, draft);

  // Gérer la photo de couverture manquante
  useEffect(() => {
    if (filteredContent.coverPhotoMissing && draft.coverPhotoId) {
      const fallback = findFallbackCoverPhoto(filteredContent.entries);
      if (fallback) {
        updateCoverPhoto(fallback);
      } else {
        updateCoverPhoto("");
      }
    }
  }, [filteredContent.coverPhotoMissing, draft.coverPhotoId, filteredContent.entries, updateCoverPhoto]);

  // Construire la liste des photos disponibles pour le sélecteur de couverture
  const availablePhotos: Array<{ id: string; label: string }> = [
    { id: "", label: "Pas de couverture avec photo" },
  ];

  for (const placeEntries of Object.values(filteredContent.entries)) {
    for (const entry of Object.values(placeEntries)) {
      if (typeof entry === "object" && entry !== null && "photos" in entry) {
        const e = entry as { photos?: Record<string, unknown> };
        if (e.photos) {
          for (const photoId of Object.keys(e.photos)) {
            availablePhotos.push({
              id: photoId,
              label: `Photo de ${e && "placeId" in e ? "lieu" : "souvenir"}`,
            });
          }
        }
      }
    }
  }

  return (
    <div className="album-screen">
      <div className="album-container">
        {/* Header */}
        <div className="album-header">
          <h1>Album Souvenir</h1>
          <div className="album-header-actions">
            {onClose && (
              <button className="btn-close" onClick={onClose} aria-label="Fermer">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation entre composition et aperçu */}
        <div className="album-tabs">
          <button
            className={`tab ${activeTab === "composition" ? "active" : ""}`}
            onClick={() => setActiveTab("composition")}
          >
            Composition
          </button>
          <button
            className={`tab ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            Aperçu ({filteredContent.estimatedPageCount} pages)
          </button>
        </div>

        {/* Composition Tab */}
        {activeTab === "composition" && (
          <div className="album-composition">
            {/* Titre */}
            <div className="form-group">
              <label htmlFor="album-title">Titre *</label>
              <input
                id="album-title"
                type="text"
                maxLength={100}
                value={draft.title}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Donnez un titre à votre album"
              />
              <span className="char-count">{draft.title.length} / 100</span>
            </div>

            {/* Sous-titre */}
            <div className="form-group">
              <label htmlFor="album-subtitle">Sous-titre (optionnel)</label>
              <input
                id="album-subtitle"
                type="text"
                maxLength={100}
                value={draft.subtitle}
                onChange={(e) => updateSubtitle(e.target.value)}
                placeholder="Ajoutez un sous-titre"
              />
              <span className="char-count">{draft.subtitle.length} / 100</span>
            </div>

            {/* Photo de couverture */}
            <div className="form-group">
              <label htmlFor="cover-photo">Photo de couverture</label>
              <select
                id="cover-photo"
                value={draft.coverPhotoId}
                onChange={(e) => updateCoverPhoto(e.target.value)}
              >
                {availablePhotos.map((photo) => (
                  <option key={photo.id} value={photo.id}>
                    {photo.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection des lieux */}
            <div className="form-group">
              <label>Lieux à inclure</label>
              <div className="locations-list">
                {Object.entries(filteredContent.places).length === 0 ? (
                  <p className="empty-state">
                    Aucun lieu marqué comme visité. Sélectionnez un itinéraire pour continuer.
                  </p>
                ) : (
                  Object.entries(filteredContent.places).map(([placeId, place]) => (
                    <div key={placeId} className="location-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.includedLocationIds.has(placeId)}
                          onChange={() => toggleLocation(placeId)}
                        />
                        <span className="location-name">{place.name}</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Option des résultats de jeu */}
            {Object.keys(albumSource.gameResults[profileId] || {}).length > 0 && (
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.includeGameSummary}
                    onChange={(e) => updateGameSummary(e.target.checked)}
                  />
                  <span>Inclure les résultats de jeu</span>
                </label>
                <p className="help-text">
                  Synthèse : score personnel, badges et podium familial (réponses détaillées exclues)
                </p>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="album-actions">
              <button className="btn-primary" onClick={() => setActiveTab("preview")}>
                Voir l'aperçu
              </button>
              <button className="btn-secondary" onClick={clearDraft}>
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="album-preview">
            <AlbumPreview content={filteredContent} draft={draft} profileId={profileId} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Composant d'aperçu de l'album en pages A4 responsive.
 */
interface AlbumPreviewProps {
  content: ReturnType<typeof filterAlbumContent>;
  draft: ReturnType<typeof useAlbumDraft>["draft"];
  profileId: string;
}

function AlbumPreview({ content, draft, profileId }: AlbumPreviewProps) {
  if (
    Object.keys(content.places).length === 0 &&
    Object.keys(content.entries).length === 0 &&
    !content.gameSummary
  ) {
    return (
      <div className="album-preview-empty">
        <p>
          Aucun contenu à afficher. Sélectionnez des lieux et ajoutez du contenu pour voir
          l'aperçu.
        </p>
      </div>
    );
  }

  return (
    <div className="album-preview-container">
      {/* Page de couverture */}
      <div className="album-page album-page--cover">
        <div className="album-cover">
          {draft.coverPhotoId && (
            <div className="cover-image">
              <img src={draft.coverPhotoId} alt="Couverture" />
            </div>
          )}
          <div className="cover-text">
            <h2 className="cover-title">{escapeAndLimitText(draft.title || "Mon Album", 100)}</h2>
            {draft.subtitle && (
              <p className="cover-subtitle">{escapeAndLimitText(draft.subtitle, 100)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pages de contenu */}
      {Object.entries(content.entries).map(([placeId, entries]) => (
        <div key={placeId} className="album-page">
          <div className="page-content">
            <h3 className="place-title">
              {escapeAndLimitText(content.places[placeId]?.name || placeId, 100)}
            </h3>
            <div className="entries-list">
              {Object.entries(entries).map(([entryId, entry]) => {
                if (typeof entry !== "object" || entry === null) return null;
                const e = entry as Record<string, unknown>;
                return (
                  <div key={entryId} className="entry-item">
                    {e.text && (
                      <p className="entry-text">{escapeAndLimitText(String(e.text), 500)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Page des résultats de jeu */}
      {content.gameSummary && (
        <div className="album-page">
          <div className="page-content">
            <h3 className="game-title">Résultats de Jeu</h3>
            <p className="game-summary">(Synthèse des performances et badges)</p>
          </div>
        </div>
      )}

      {/* Infos de pagination */}
      <div className="album-preview-info">
        <p>
          Estimation : <strong>{content.estimatedPageCount} pages A4</strong>,{" "}
          <strong>{content.estimatedImageCount} images</strong>
        </p>
      </div>
    </div>
  );
}
