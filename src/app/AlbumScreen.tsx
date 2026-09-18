import { useState, useEffect } from "react";
import type { AlbumSource } from "../types/cloud";
import { useAlbumDraft } from "../hooks/useAlbumDraft";
import { canAccessAlbumComposition, getAlbumAccessDeniedMessage } from "./album-access";
import {
  ALBUM_CONTENT_SECTIONS,
  ALBUM_NO_COVER_PHOTO_ID,
  filterAlbumContent,
  findFallbackCoverPhoto,
  escapeAndLimitText,
  isPhotoBudgetReduced,
  isPhotoQualityDegraded,
  listCoverPhotoOptions,
  resolveEffectiveCoverPhoto,
  selectBudgetedCarnetPhotos,
} from "./albumUtils";
import {
  calculateExportLimit,
  collectPdfImages,
  exportAlbumAsPdf,
  preparePdfImages,
} from "../services/pdf-export";
import { formatPrimaryTripDayLabel, formatTripDayLabel } from "./trip-day-format";
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
    toggleContentItem,
    updateGameSummary,
    updateTheme,
    clearDraft,
  } = useAlbumDraft(
    profileId,
    Object.keys(albumSource.eligiblePlaces),
    Object.keys(albumSource.contentTopics ?? {})
  );

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

  // Photos sélectionnables comme couverture (story 30.7) : photos officielles
  // des lieux inclus ET photos personnelles du carnet, dans l'ordre
  // chronologique du voyage (retour utilisateur : "je ne sais pas comment
  // est choisie la première photo, il serait préférable qu'elle soit choisie
  // par l'utilisateur").
  const coverPhotoOptions = listCoverPhotoOptions(filteredContent.places, filteredContent.entries);

  // Topics de contenu admissibles (Histoire / Géographie et économie /
  // Culture et tradition, story 30.8), groupés par rubrique pour la sélection
  // à la carte — mêmes topics quel que soit le brouillon (pas de notion de
  // "vu"/visibilité pour ces rubriques, contrairement aux lieux).
  const contentTopicEntries = Object.entries(albumSource.contentTopics ?? {});

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

            {/* Photo de couverture (story 30.7) : choix visuel explicite,
                plutôt qu'un repli automatique invisible pour le voyageur. */}
            <div className="form-group">
              <label>Photo de couverture</label>
              <div className="cover-photo-picker">
                <button
                  type="button"
                  className={`cover-photo-option cover-photo-option--placeholder ${
                    draft.coverPhotoId === "" ? "selected" : ""
                  }`}
                  onClick={() => updateCoverPhoto("")}
                >
                  <span>Choix automatique</span>
                  <span className="cover-photo-option-hint">1ère photo, dans l'ordre du voyage</span>
                </button>
                <button
                  type="button"
                  className={`cover-photo-option cover-photo-option--placeholder ${
                    draft.coverPhotoId === ALBUM_NO_COVER_PHOTO_ID ? "selected" : ""
                  }`}
                  onClick={() => updateCoverPhoto(ALBUM_NO_COVER_PHOTO_ID)}
                >
                  <span>Aucune photo</span>
                </button>
                {coverPhotoOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={`cover-photo-option ${draft.coverPhotoId === option.id ? "selected" : ""}`}
                    onClick={() => updateCoverPhoto(option.id)}
                    aria-label={`Choisir cette photo de ${option.placeName} comme couverture`}
                    aria-pressed={draft.coverPhotoId === option.id}
                  >
                    <img src={option.src} alt="" />
                    <span>{option.placeName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu à inclure, à la carte (story 30.8) : chaque rubrique
                (lieux, Histoire, Géographie et économie, Culture et
                tradition, résultats de jeu) est une section indépendante,
                qu'on peut inclure entièrement, partiellement, ou pas du
                tout — sans case "section entière", une section non désirée
                se traduit simplement par aucun de ses éléments cochés. */}
            <section className="album-section">
              <h3 className="album-section-title">Lieux visités</h3>
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
            </section>

            {ALBUM_CONTENT_SECTIONS.map((contentSection) => {
              const topicsInSection = contentTopicEntries.filter(
                ([, topic]) => topic.section === contentSection.id
              );
              if (topicsInSection.length === 0) {
                return null;
              }
              return (
                <section className="album-section" key={contentSection.id}>
                  <h3 className="album-section-title">{contentSection.label}</h3>
                  <div className="locations-list">
                    {topicsInSection.map(([key, topic]) => (
                      <div key={key} className="location-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={draft.includedContentIds.has(key)}
                            onChange={() => toggleContentItem(key)}
                          />
                          <span className="location-name">{topic.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Option des résultats de jeu */}
            {Object.values(albumSource.gameResults).some((entries) => entries.length > 0) && (
              <section className="album-section">
                <h3 className="album-section-title">Résultats du jeu</h3>
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
              </section>
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
  const resolvedCoverPhoto = resolveEffectiveCoverPhoto(content.places, content.entries, draft.coverPhotoId);
  const hasLocations = Object.keys(content.places).length > 0;
  const hasContentTopics = Object.keys(content.contentTopics).length > 0;
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
          {resolvedCoverPhoto && (
            <div className="cover-image">
              <img src={resolvedCoverPhoto.src} alt="Couverture" />
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
        const chapterDayLabel = formatPrimaryTripDayLabel(place.jour, source.tripStartDate, { format: "short" });

        return (
          <div key={placeId} className="album-page">
            <div className="page-content">
              <h3 className="place-title chapter-band">{escapeAndLimitText(place.name, 100)}</h3>
              {chapterDayLabel && <span className="chapter-day-label">{chapterDayLabel.toUpperCase()}</span>}

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

      {/* Chapitres par rubrique de contenu (Histoire / Géographie et
          économie / Culture et tradition, story 30.8) : même principe que
          les chapitres par lieu ci-dessus (socle éditorial toujours affiché,
          souvenirs de carnet texte seul en plus), sans jour ni avis de la
          famille ni guide de visite détaillé (notions propres aux lieux). */}
      {hasContentTopics &&
        Object.entries(content.contentTopics).map(([key, topic]) => {
          const topicEntries = content.contentEntries[key] ?? {};
          const noteTexts = Object.values(topicEntries)
            .map((entry) => entry.text?.trim())
            .filter((text): text is string => Boolean(text));
          const hasPresentation = Boolean(topic.history && topic.history.trim());
          const hasAnecdotes = Boolean(topic.anecdotes && topic.anecdotes.length > 0);
          const editorialPhotos = (topic.photos ?? []).slice(0, content.photoBudgetPerPlace.editorial);
          const hasGallery = editorialPhotos.length > 0;
          const hasNotes = noteTexts.length > 0;
          const sectionLabel = ALBUM_CONTENT_SECTIONS.find((s) => s.id === topic.section)?.label ?? "";

          return (
            <div key={key} className="album-page">
              <div className="page-content">
                <h3 className="place-title chapter-band">{escapeAndLimitText(topic.name, 100)}</h3>
                {sectionLabel && <span className="chapter-day-label">{sectionLabel.toUpperCase()}</span>}

                {hasPresentation && (
                  <div className="place-presentation">
                    {topic.historyLabel && <h4>{escapeAndLimitText(topic.historyLabel, 100)}</h4>}
                    <p>{escapeAndLimitText(topic.history || "", 1000)}</p>
                  </div>
                )}

                {hasAnecdotes && (
                  <div className="place-anecdotes">
                    <h4>{escapeAndLimitText(topic.anecdotesLabel || "Anecdotes", 100)}</h4>
                    <ul>
                      {(topic.anecdotes ?? []).map((anecdote, index) => (
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
                  </div>
                )}

                {hasNotes && (
                  <div className="entries-list">
                    {noteTexts.map((text, index) => (
                      <div key={index} className="entry-item">
                        <p className="entry-text">{escapeAndLimitText(text, 500)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!hasPresentation && !hasAnecdotes && !hasGallery && !hasNotes && (
                  <p className="album-empty-message">Aucun souvenir détaillé pour cette rubrique.</p>
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
            {content.gameSummary.dailyResultsByProfile && (
              <div className="game-results-detail">
                <h4>Scores et détails par journée</h4>
                {Object.entries(content.gameSummary.dailyResultsByProfile)
                  .filter(([profileId]) => content.gameSummary?.profiles?.[profileId]?.role === "utilisateur")
                  .flatMap(([profileId, entries]) => entries.map((entry) => ({
                    profileId,
                    surname: content.gameSummary?.profiles?.[profileId]?.surname ?? profileId,
                    entry,
                  })))
                  .sort((left, right) => left.entry.day - right.entry.day || left.surname.localeCompare(right.surname, "fr"))
                  .map(({ surname, entry }) => (
                    <div className="game-result-card" key={`${surname}-${entry.day}`}>
                      <strong>{surname} · Jour {entry.day}</strong>
                      <span>{entry.location} · {entry.totalScore} pts</span>
                      <small>
                        Quiz : {entry.correctCount} bonnes réponses · Énigme : {entry.riddleSolved ? "gagnée" : "perdue"} · Défi : {entry.challengeDone ? "réalisé" : "non réalisé"}
                      </small>
                      {entry.riddleAnswer && <small>Réponse énigme : {entry.riddleAnswer}</small>}
                      {entry.challengeResponse && <small>Réponse défi : {entry.challengeResponse}</small>}
                    </div>
                  ))}
              </div>
            )}
            {content.gameSummary.badgesByProfile && (
              <div className="game-results-detail">
                <h4>Badges gagnés</h4>
                {Object.entries(content.gameSummary.badgesByProfile).map(([profileId, badges]) => (
                  <div className="game-badge-person" key={profileId}>
                    <strong>{content.gameSummary?.profiles?.[profileId]?.surname ?? profileId}</strong>
                    <div className="game-badges">
                      {badges.map((badge) => <span className="game-badge-chip" key={badge.name}>{badge.icon} {badge.name}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {content.gameSummary.destinationChallenge && (
              <div className="game-results-detail">
                <h4>Challenge destination</h4>
                <p>Destination correcte : <strong>{content.gameSummary.destinationChallenge.destination}</strong></p>
                {content.gameSummary.destinationChallenge.results
                  .filter((result) => result.role !== "proprietaire")
                  .map((result) => (
                    <div className="game-result-card" key={`destination-${result.profileId}`}>
                      <strong>{result.surname} · {result.points} pts</strong>
                      <small>Propositions : {result.proposals.length > 0 ? result.proposals.join(", ") : "Aucune proposition"}</small>
                      <small>{result.isCorrect ? `Bonne réponse${result.rank ? ` · choix ${result.rank}` : ""}` : "Incorrect"}</small>
                    </div>
                  ))}
              </div>
            )}
            {content.gameSummary.sharedChallenges && content.gameSummary.sharedChallenges.length > 0 && (
              <div className="game-results-detail">
                <h4>Défis partagés</h4>
                {content.gameSummary.sharedChallenges.flatMap((challengeDay) => challengeDay.entries.map((entry) => (
                  <div className="game-result-card" key={`shared-${challengeDay.day}-${entry.profileId}`}>
                    <strong>{entry.surname} · Jour {challengeDay.day}</strong>
                    <span>{entry.response}</span>
                    <small>{entry.reactions.map((reaction) => `${reaction.emoji} ${reaction.count}`).join("  ") || "Aucune réaction"}{entry.bestVoters.length > 0 ? `  🏆 ${entry.bestVoters.length}` : ""}</small>
                  </div>
                )))}
              </div>
            )}
          </div>
        </div>
      )}

      {!hasLocations && !hasContentTopics && !content.gameSummary && (
        <div className="album-page album-page--empty-content">
          <div className="page-content">
            <h3 className="place-title">Souvenirs personnels</h3>
            <p className="album-empty-message">
              Aucun souvenir n'est encore disponible pour les lieux et rubriques sélectionnés. La
              couverture et l'itinéraire restent prêts pour votre album.
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
