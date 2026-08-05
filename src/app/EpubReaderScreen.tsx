import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Moon, Sun, Upload } from "lucide-react";
import ePub from "epubjs";
import { EPUB_LIBRARY, type EpubLibraryItem } from "../content/epub-library";

type EpubReaderScreenProps = {
  profileId: string;
  onBack: () => void;
};

type ReaderSource = {
  key: string;
  label: string;
  source: string | ArrayBuffer;
};

type SavedBookLocation = {
  cfi: string;
  updatedAt: number;
};

type ReaderPreferences = {
  fontScale: number;
  darkMode: boolean;
};

const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontScale: 100,
  darkMode: false,
};

function loadReaderPreferences(profileId: string): ReaderPreferences {
  try {
    const raw = localStorage.getItem(`jp-epub-prefs-${profileId}`);
    if (!raw) {
      return DEFAULT_READER_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>;
    const fontScale = Number(parsed.fontScale);
    const darkMode = Boolean(parsed.darkMode);

    if (!Number.isFinite(fontScale)) {
      return { ...DEFAULT_READER_PREFERENCES, darkMode };
    }

    return {
      fontScale: Math.max(85, Math.min(150, Math.round(fontScale))),
      darkMode,
    };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

function loadBookLocations(profileId: string): Record<string, SavedBookLocation> {
  try {
    const raw = localStorage.getItem(`jp-epub-locations-${profileId}`);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, SavedBookLocation>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function EpubReaderScreen({ profileId, onBack }: EpubReaderScreenProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const [selectedLibraryBookId, setSelectedLibraryBookId] = useState<string>(EPUB_LIBRARY[0]?.id ?? "");
  const [uploadedSource, setUploadedSource] = useState<ReaderSource | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [bookLocations, setBookLocations] = useState<Record<string, SavedBookLocation>>(() =>
    loadBookLocations(profileId)
  );
  const [preferences, setPreferences] = useState<ReaderPreferences>(() =>
    loadReaderPreferences(profileId)
  );

  const selectedLibraryBook: EpubLibraryItem | null = useMemo(
    () => EPUB_LIBRARY.find((book) => book.id === selectedLibraryBookId) ?? null,
    [selectedLibraryBookId]
  );

  const activeSource: ReaderSource | null = useMemo(() => {
    if (uploadedSource) {
      return uploadedSource;
    }

    if (!selectedLibraryBook) {
      return null;
    }

    return {
      key: `library:${selectedLibraryBook.id}`,
      label: selectedLibraryBook.title,
      source: selectedLibraryBook.url,
    };
  }, [selectedLibraryBook, uploadedSource]);

  useEffect(() => {
    setBookLocations(loadBookLocations(profileId));
    setPreferences(loadReaderPreferences(profileId));
  }, [profileId]);

  useEffect(() => {
    localStorage.setItem(`jp-epub-prefs-${profileId}`, JSON.stringify(preferences));
  }, [preferences, profileId]);

  useEffect(() => {
    localStorage.setItem(`jp-epub-locations-${profileId}`, JSON.stringify(bookLocations));
  }, [bookLocations, profileId]);

  useEffect(() => {
    if (!activeSource || !viewerRef.current) {
      return;
    }

    let destroyed = false;
    setIsLoading(true);
    setError(null);
    setCurrentLocation(null);

    const init = async () => {
      try {
        const book = ePub(activeSource.source);
        const rendition = book.renderTo(viewerRef.current as HTMLDivElement, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          allowScriptedContent: false,
        });

        bookRef.current = book;
        renditionRef.current = rendition;

        rendition.themes.default({
          body: {
            "line-height": "1.6",
          },
        });
        rendition.themes.fontSize(`${preferences.fontScale}%`);
        rendition.themes.override("color", preferences.darkMode ? "#E5E7EB" : "#111827");
        rendition.themes.override("background", preferences.darkMode ? "#111827" : "#FFFFFF");

        const savedCfi = bookLocations[activeSource.key]?.cfi;
        await rendition.display(savedCfi || undefined);

        rendition.on("relocated", (location: any) => {
          const cfi = location?.start?.cfi;
          if (!cfi || destroyed) {
            return;
          }

          setCurrentLocation(cfi);
          setBookLocations((previous) => ({
            ...previous,
            [activeSource.key]: {
              cfi,
              updatedAt: Date.now(),
            },
          }));
        });

        await book.ready;
        const metadata = await book.loaded.metadata;
        if (!destroyed) {
          setBookTitle(metadata?.title || activeSource.label);
        }
      } catch {
        if (!destroyed) {
          setError(
            "Impossible d'ouvrir cet EPUB. Verifie le chemin du fichier ou importe-le depuis ton appareil."
          );
        }
      } finally {
        if (!destroyed) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      destroyed = true;
      try {
        renditionRef.current?.destroy();
      } catch {
        // noop
      }
      try {
        bookRef.current?.destroy();
      } catch {
        // noop
      }
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [activeSource, preferences.darkMode, preferences.fontScale]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      setUploadedSource({
        key: `upload:${file.name}`,
        label: file.name,
        source: arrayBuffer,
      });
      setError(null);
    } catch {
      setError("Le fichier selectionne n'a pas pu etre charge.");
    } finally {
      event.currentTarget.value = "";
    }
  };

  const goPreviousPage = () => {
    void renditionRef.current?.prev();
  };

  const goNextPage = () => {
    void renditionRef.current?.next();
  };

  const locationDate = activeSource ? bookLocations[activeSource.key]?.updatedAt : undefined;
  const locationFormatted = locationDate
    ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
        new Date(locationDate)
      )
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-black text-foreground"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Liseuse EPUB
          </p>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <select
            value={selectedLibraryBookId}
            onChange={(event) => {
              setUploadedSource(null);
              setSelectedLibraryBookId(event.target.value);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
          >
            {EPUB_LIBRARY.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-black text-foreground">
            <Upload size={14} />
            Importer un EPUB
            <input type="file" accept=".epub,application/epub+zip" className="hidden" onChange={handleUpload} />
          </label>

          <button
            onClick={() =>
              setPreferences((previous) => ({
                ...previous,
                darkMode: !previous.darkMode,
              }))
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-black text-foreground"
          >
            {preferences.darkMode ? <Sun size={14} /> : <Moon size={14} />}
            {preferences.darkMode ? "Mode clair" : "Mode nuit"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-extrabold text-muted-foreground">Taille</label>
          <input
            type="range"
            min={85}
            max={150}
            step={5}
            value={preferences.fontScale}
            onChange={(event) =>
              setPreferences((previous) => ({
                ...previous,
                fontScale: Number(event.target.value),
              }))
            }
          />
          <span className="text-xs font-bold text-foreground">{preferences.fontScale}%</span>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">{bookTitle || activeSource?.label || "Aucun livre"}</p>
          {locationFormatted && <p>Derniere position enregistree: {locationFormatted}</p>}
          {currentLocation && <p className="truncate">Position courante: {currentLocation}</p>}
        </div>
      </div>

      <div className={`relative flex-1 ${preferences.darkMode ? "bg-slate-900" : "bg-slate-100"}`}>
        <div ref={viewerRef} className="absolute inset-0" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="rounded-xl bg-card px-4 py-2 text-sm font-bold text-foreground">Chargement du livre...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 top-4 rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
        <button
          onClick={goPreviousPage}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-black text-foreground"
        >
          <ChevronLeft size={18} />
          Precedent
        </button>
        <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          <BookOpen size={14} />
          Lecture
        </p>
        <button
          onClick={goNextPage}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-black text-foreground"
        >
          Suivant
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
