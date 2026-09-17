import { useState, useEffect } from "react";
import type { AlbumSource } from "../types/cloud";
import { useAlbumDraft } from "../hooks/useAlbumDraft";
import { canAccessAlbumComposition, getAlbumAccessDeniedMessage } from "./album-access";
import {
  filterAlbumContent,
  findFallbackCoverPhoto,
  findPhotoSource,
  escapeAndLimitText,
  isPhotoBudgetReduced,
  isPhotoQualityDegraded,
  selectBudgetedCarnetPhotos,
} from "./albumUtils";
import {
  calculateExportLimit,
  collectPdfImages,
  exportAlbumAsPdf,
  preparePdfImages,
} from "../services/pdf-export";
import { formatTripDayLabel } from "./trip-day-format";
import { isValidTripStartDate } from "./trip-day";
import { JOURS_DESTINATIONS } from "../content/generated/jours-destinations";
import { TRIP_MAP_IMAGE_PATH } from "../content/trip";
import "../styles/album.css";

/**
 * Formate la plage de dates du voyage (1er jour -> dernier jour défini,
 * story 30.6) pour la couverture de l'aperçu, même logique que
 * `formatTripDateRangeLabel` dans src/services/pdf-export.ts (aperçu HTML et
 * PDF doivent rester cohérents).
 */
function formatTripDateRangeLabel(tripStartDate: string | null, lastTripDay: number | null): string | null {
  if (!isValidTripStartDate(tripStartDate)) {
    return null;
  }
  const startLabel = formatTripDayLabel(1, tripStartDate, { format: "long" });
  if (!lastTripDay || lastTripDay <= 1) {
    return startLabel;
  }
  const endLabel = formatTripDayLabel(lastTripDay, tripStartDate, { format: "long" });
  return `${startLabel} — ${endLabel}`;
}

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
  } = useAlbumDraft(profileId, Object.keys(albumSource.eligiblePlaces));

  const [activeTab, setActiveTab] = useState<"composition" | "preview">("composition");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<string>("");

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

  const handleExportPdf = async () => {
    setExportError(null);
    setIsExporting(true);
    setExportProgress("Préparation des images...");

    try {
      const imageList = collectPdfImages(filteredContent);
      const preparedImages = preparePdfImages(imageList);
      const limitCheck = calculateExportLimit({
        imageCount: preparedImages.valid.length,
        preparedBytes: preparedImages.valid.reduce(
          (sum, image) => sum + (image.fileSize ?? image.src.length),
          0
        ),
      });

      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason);
      }

      await exportAlbumAsPdf(draft, filteredContent, albumSource, (phase) => {
        const messages: Record<string, string> = {
          preparing: "Préparation des images...",
          rendering: "Composition des pages PDF...",
          download: "Téléchargement en cours...",
        };
        setExportProgress(messages[phase] ?? "Traitement en cours...");
      });

      setExportProgress("Téléchargement terminé.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
      setExportError(reason);
      setExportProgress("");
    } finally {
      setIsExporting(false);
    }
  };

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
                {Object.entries(albumSource.eligiblePlaces).length === 0 ? (
                  <p className="empty-state">
                    Aucun lieu marqué comme visité. Sélectionnez un itinéraire pour continuer.
                  </p>
                ) : (
                  Object.entries(albumSource.eligiblePlaces).map(([placeId, place]) => (
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
              <button
                className="btn-primary"
                onClick={handleExportPdf}
                disabled={isExporting}
                aria-label="Télécharger le PDF"
              >
                {isExporting ? "Export en cours..." : "Télécharger le PDF"}
              </button>
              <button className="btn-secondary" onClick={clearDraft}>
                Réinitialiser
              </button>
            </div>
            {exportError && <p className="album-export-error">{exportError}</p>}
            {exportProgress && <p className="album-export-progress">{exportProgress}</p>}
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="album-preview">
            <AlbumPreview content={filteredContent} draft={draft} source={albumSource} />
            <div className="album-actions album-actions--preview">
              <button
                className="btn-primary"
                onClick={handleExportPdf}
                disabled={isExporting}
                aria-label="Télécharger le PDF"
              >
                {isExporting ? "Export en cours..." : "Télécharger le PDF"}
              </button>
              <button className="btn-secondary" onClick={() => setActiveTab("composition")}>
                Modifier l'album
              </button>
            </div>
            {exportError && <p className="album-export-error">{exportError}</p>}
            {exportProgress && <p className="album-export-progress">{exportProgress}</p>}
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
  source: AlbumSource;
}

function AlbumPreview({ content, draft, source }: AlbumPreviewProps) {
  const selectedCoverSource = findPhotoSource(content.entries, draft.coverPhotoId);
  const hasLocations = Object.keys(content.places).length > 0;
  // Voyage riche en lieux : le budget de photos par lieu est réduit et/ou la
  // qualité des photos est dégradée à l'export (story 30.5, export
  // adaptatif). L'aperçu doit annoncer fidèlement ce qui sera dans le PDF,
  // sans jamais bloquer l'affichage (mention informative non bloquante).
  const showAdaptiveExportNotice =
    isPhotoBudgetReduced(content.photoBudgetPerPlace) || isPhotoQualityDegraded(content.photoQualityTier);

  const tripDateRangeLabel = formatTripDateRangeLabel(source.tripStartDate, source.lastTripDay);

  // Planning jour par jour (story 30.6) : un jour n'est affiché que s'il
  // contient au moins un lieu inclus dans l'album, pour rester compact (même
  // logique que la page planning du PDF, cf. pdf-export.ts).
  const includedPlaceEntries = Object.entries(content.places);
  const daysWithIncludedPlaces = JOURS_DESTINATIONS.filter((dayEntry) =>
    includedPlaceEntries.some(([, place]) => place.jour.includes(dayEntry.jour))
  );

  return (
    <div className="album-preview-container">
      {/* Page de couverture */}
      <div className="album-page album-page--cover">
        <div className="album-cover">
          {selectedCoverSource && (
            <div className="cover-image">
              <img src={selectedCoverSource} alt="Couverture" />
            </div>
          )}
          <div className="cover-text">
            <h2 className="cover-title">{escapeAndLimitText(draft.title || "Mon Album", 100)}</h2>
            {draft.subtitle && (
              <p className="cover-subtitle">{escapeAndLimitText(draft.subtitle, 100)}</p>
            )}
            {tripDateRangeLabel && <p className="cover-dates">{tripDateRangeLabel}</p>}
          </div>
        </div>
      </div>

      {/* Circuit du voyage (story 30.6) : même photo que le tableau de bord. */}
      <div className="album-page">
        <div className="page-content">
          <h3 className="place-title chapter-band">Circuit du voyage</h3>
          <div className="trip-map-image">
            <img src={TRIP_MAP_IMAGE_PATH} alt="Circuit du voyage" />
          </div>
        </div>
      </div>

      {/* Planning jour par jour, conservé même lorsque le carnet est vide */}
      <div className="album-page album-page--itinerary">
        <div className="page-content">
          <h3 className="place-title chapter-band">Planning du voyage</h3>
          {daysWithIncludedPlaces.length > 0 ? (
            <ul className="itinerary-list">
              {daysWithIncludedPlaces.map((dayEntry) => {
                const placeNames = includedPlaceEntries
                  .filter(([, place]) => place.jour.includes(dayEntry.jour))
                  .map(([, place]) => place.name);
                return (
                  <li key={dayEntry.jour}>
                    <span className="itinerary-day-label">
                      {formatTripDayLabel(dayEntry.jour, source.tripStartDate).toUpperCase()}
                    </span>
                    <strong>{escapeAndLimitText(dayEntry.destination, 100)}</strong>
                    {placeNames.length > 0 && (
                      <span>{escapeAndLimitText(placeNames.join(" · "), 300)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="album-empty-message">
              Aucun lieu marqué comme visité n'est sélectionné. Vous pouvez conserver cet album
              minimal et ajouter l'itinéraire plus tard.
            </p>
          )}
        </div>
      </div>

      {/* Chapitres par lieu : le socle éditorial (présentation, anecdotes,
          photos officielles) est toujours affiché pour un lieu inclus, même
          sans note de carnet associée (règle métier story 30.5). Les
          souvenirs personnels s'ajoutent par-dessus quand ils existent. */}
      {hasLocations && Object.entries(content.places).map(([placeId, place]) => {
        const placeEntries = content.entries[placeId] ?? {};
        const hasNotes = Object.keys(placeEntries).length > 0;
        const hasPresentation = Boolean(place.history && place.history.trim());
        const hasAnecdotes = Boolean(place.anecdotes && place.anecdotes.length > 0);
        const editorialPhotos = (place.photos ?? []).slice(0, content.photoBudgetPerPlace.editorial);
        const carnetPhotos = selectBudgetedCarnetPhotos(placeEntries, content.photoBudgetPerPlace.carnet);
        const hasGallery = editorialPhotos.length > 0 || carnetPhotos.length > 0;
        const placeComments = Object.values(content.comments[placeId] ?? {});
        const hasComments = placeComments.length > 0;
        const guideSections = place.guideSections ?? [];
        const hasGuide = guideSections.length > 0;

        return (
          <div key={placeId} className="album-page">
            <div className="page-content">
              <h3 className="place-title chapter-band">{escapeAndLimitText(place.name, 100)}</h3>

              {hasPresentation && (
                <div className="place-presentation">
                  {place.historyLabel && <h4>{escapeAndLimitText(place.historyLabel, 100)}</h4>}
                  <p>{escapeAndLimitText(place.history || "", 1000)}</p>
                </div>
              )}

              {hasAnecdotes && (
                <div className="place-anecdotes">
                  <h4>{escapeAndLimitText(place.anecdotesLabel || "Anecdotes", 100)}</h4>
                  <ul>
                    {(place.anecdotes ?? []).map((anecdote, index) => (
                      <li key={index}>{escapeAndLimitText(anecdote, 300)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hasGallery && (
                <div className="photo-gallery">
                  {editorialPhotos.map((src, index) => (
                    <img key={`editorial-${index}`} src={src} alt="" />
                  ))}
                  {carnetPhotos.map((photo) => (
                    <img key={photo.id} src={photo.src} alt="" />
                  ))}
                </div>
              )}

              {hasNotes && (
                <div className="entries-list">
                  {Object.entries(placeEntries).map(([entryId, entry]) => {
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
              )}

              {hasComments && (
                <div className="place-comments">
                  <h4>Avis de la famille</h4>
                  {placeComments.map((comment) => {
                    const reactionLabel =
                      comment.reaction === "like"
                        ? "J'aime"
                        : comment.reaction === "dislike"
                          ? "J'aime pas"
                          : "Commentaire";
                    return (
                      <div key={comment.commentId} className="comment-item">
                        <div className="comment-item-header">
                          <strong>{escapeAndLimitText(comment.authorSurnameSnapshot || "Anonyme", 60)}</strong>
                          <span>{reactionLabel}</span>
                        </div>
                        {comment.text ? (
                          <p>{escapeAndLimitText(comment.text, 500)}</p>
                        ) : (
                          <p className="comment-item-empty">Réaction sans commentaire.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {hasGuide && (
                <div className="place-guide">
                  <h4>Guide de visite détaillé</h4>
                  {guideSections.map((section, index) => (
                    <div key={index} className="place-guide-section">
                      {section.title && <h5>{escapeAndLimitText(section.title, 150)}</h5>}
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{escapeAndLimitText(paragraph, 2000)}</p>
                      ))}
                      {section.bullets.length > 0 && (
                        <ul>
                          {section.bullets.map((bullet, bulletIndex) => (
                            <li key={bulletIndex}>{escapeAndLimitText(bullet, 500)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!hasPresentation && !hasAnecdotes && !hasGallery && !hasNotes && !hasComments && !hasGuide && (
                <p className="album-empty-message">Aucun souvenir détaillé pour ce lieu.</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Page des résultats de jeu */}
      {content.gameSummary && (
        <div className="album-page">
          <div className="page-content">
            <h3 className="game-title chapter-band">Résultats de Jeu</h3>
            <p className="game-summary">
              Score total : <strong>{content.gameSummary.totalScore}</strong>
            </p>
            {content.gameSummary.badges.length > 0 && (
              <ul className="game-badges">
                {content.gameSummary.badges.map((badge) => (
                  <li key={badge}>{badge}</li>
                ))}
              </ul>
            )}
            {content.gameSummary.podium.length > 0 && (
              <div className="game-podium">
                <h4>Podium familial</h4>
                <ol>
                  {content.gameSummary.podium.map((entry) => (
                    <li key={`${entry.profileId}-${entry.rank}`}>
                      {entry.surname} : {entry.totalScore} pts
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasLocations && !content.gameSummary && (
        <div className="album-page album-page--empty-content">
          <div className="page-content">
            <h3 className="place-title">Souvenirs personnels</h3>
            <p className="album-empty-message">
              Aucun souvenir n'est encore disponible pour les lieux sélectionnés. La couverture
              et l'itinéraire restent prêts pour votre album.
            </p>
          </div>
        </div>
      )}

      {/* Infos de pagination */}
      <div className="album-preview-info">
        <p>
          Estimation : <strong>{content.estimatedPageCount} pages A4</strong>,{" "}
          <strong>{content.estimatedImageCount} images</strong>
        </p>
        {showAdaptiveExportNotice && (
          <p className="album-preview-adaptive-notice">
            Voyage riche en lieux : certaines photos sont réduites en qualité/nombre pour garder un
            PDF téléchargeable, tous les lieux restent inclus.
          </p>
        )}
      </div>
    </div>
  );
}
