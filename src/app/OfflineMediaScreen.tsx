import { useMemo, useState } from "react";
import { ChevronLeft, Download, RefreshCcw } from "lucide-react";
import {
  OFFLINE_SECTION_ORDER,
  downloadAllOfflineMedia,
  downloadOfflineMediaSection,
  listFailedSectionUrls,
  readOfflineDownloadRegistry,
  type OfflineDownloadRegistry,
  type OfflineSectionKey,
} from "./offline-media";

const SECTION_LABELS: Record<OfflineSectionKey, string> = {
  "stay-guide": "Guide du sejour",
  "important-documents": "Documents importants",
  history: "Histoire",
  "geography-economy": "Geographie et economie",
  "culture-tradition": "Culture et tradition",
  tips: "Conseils",
};

function statusLabel(status: "not-downloaded" | "partial" | "complete"): string {
  if (status === "complete") {
    return "complete";
  }
  if (status === "partial") {
    return "partial";
  }
  return "not downloaded";
}

function statusChipClass(status: "not-downloaded" | "partial" | "complete"): string {
  if (status === "complete") {
    return "bg-[#E8F5E9] text-[#2E7D32]";
  }
  if (status === "partial") {
    return "bg-[#FFF8E1] text-[#F57F17]";
  }
  return "bg-[#ECEFF1] text-[#455A64]";
}

export function OfflineMediaScreen({
  isOnline,
  onBack,
}: {
  isOnline: boolean;
  onBack: () => void;
}) {
  const [registry, setRegistry] = useState<OfflineDownloadRegistry>(() => readOfflineDownloadRegistry());
  const [busyScope, setBusyScope] = useState<OfflineSectionKey | "all" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<{
    scope: OfflineSectionKey | "all";
    section: OfflineSectionKey;
    completed: number;
    total: number;
    percent: number;
  } | null>(null);

  const totals = useMemo(() => {
    return OFFLINE_SECTION_ORDER.reduce(
      (acc, key) => {
        const section = registry.sectionProgress[key];
        acc.total += section.total;
        acc.completed += section.completed;
        acc.failed += section.failed;
        return acc;
      },
      { total: 0, completed: 0, failed: 0 }
    );
  }, [registry]);

  const handleDownloadAll = async () => {
    if (!isOnline) {
      setFeedback("Connect to the internet to refresh the offline cache.");
      return;
    }

    setBusyScope("all");
    setFeedback("Download started. Please keep this screen open.");
    const totalToProcess = OFFLINE_SECTION_ORDER.reduce((acc, sectionKey) => {
      return acc + (registry.sectionProgress[sectionKey]?.total ?? 0);
    }, 0);
    const sectionDone = new Map<OfflineSectionKey, number>();
    for (const sectionKey of OFFLINE_SECTION_ORDER) {
      sectionDone.set(sectionKey, 0);
    }

    if (totalToProcess > 0) {
      setActiveProgress({
        scope: "all",
        section: "stay-guide",
        completed: 0,
        total: totalToProcess,
        percent: 0,
      });
    } else {
      setActiveProgress(null);
    }
    try {
      const result = await downloadAllOfflineMedia({
        onProgress: (event) => {
          sectionDone.set(event.section, event.completed);
          const completedAcrossSections = Array.from(sectionDone.values()).reduce((acc, value) => acc + value, 0);
          const percent = totalToProcess > 0
            ? Math.min(100, Math.round((completedAcrossSections / totalToProcess) * 100))
            : 100;
          setActiveProgress({
            scope: "all",
            section: event.section,
            completed: completedAcrossSections,
            total: totalToProcess,
            percent,
          });
        },
      });
      setRegistry(result.registry);
      if (result.failed > 0) {
        setFeedback(`Download finished with ${result.failed} failed resources. Retry the partial sections.`);
      } else {
        setFeedback("Offline media download completed.");
      }
    } finally {
      setActiveProgress(null);
      setBusyScope(null);
    }
  };

  const handleDownloadSection = async (section: OfflineSectionKey) => {
    if (!isOnline) {
      setFeedback("Connect to the internet to refresh the offline cache.");
      return;
    }

    setBusyScope(section);
    setFeedback(`Section ${SECTION_LABELS[section]} download started.`);
    const sectionTotal = registry.sectionProgress[section]?.total ?? 0;
    if (sectionTotal > 0) {
      setActiveProgress({
        scope: section,
        section,
        completed: 0,
        total: sectionTotal,
        percent: 0,
      });
    } else {
      setActiveProgress(null);
    }
    try {
      const result = await downloadOfflineMediaSection(section, {
        onProgress: (event) => {
          const percent = event.total > 0
            ? Math.min(100, Math.round((event.completed / event.total) * 100))
            : 100;
          setActiveProgress({
            scope: section,
            section: event.section,
            completed: event.completed,
            total: event.total,
            percent,
          });
        },
      });
      setRegistry(result.registry);

      if (result.failed > 0) {
        const failedUrls = listFailedSectionUrls(result.registry, section);
        const sample = failedUrls.slice(0, 2).join(" | ");
        setFeedback(
          `Section ${SECTION_LABELS[section]} remains partial (${result.failed} failed). ${sample ? `Examples: ${sample}` : ""}`
        );
      } else {
        setFeedback(`Section ${SECTION_LABELS[section]} is now complete.`);
      }
    } finally {
      setActiveProgress(null);
      setBusyScope(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-[#2E7D32] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-white/85 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="text-2xl font-black">Offline media</h1>
        <p className="text-sm opacity-90 mt-1">Download and track section cache readiness</p>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto pb-28">
        {!isOnline && (
          <div className="rounded-2xl border border-[#F57F17] bg-[#FFF8E1] px-4 py-3 text-sm font-semibold text-[#8D6E63]">
            You are offline. Existing cache remains available, but new downloads are disabled.
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Global progress</p>
          <p className="text-sm font-semibold text-foreground mt-2">
            {totals.completed}/{totals.total} resources cached
          </p>
          <p className="text-xs text-muted-foreground mt-1">Failed resources: {totals.failed}</p>
          <button
            type="button"
            disabled={!isOnline || busyScope !== null}
            onClick={handleDownloadAll}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#2E7D32] px-3 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            <Download size={14} /> Download all
          </button>
          {activeProgress && activeProgress.scope === "all" && (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs font-bold text-foreground">
                Downloading {SECTION_LABELS[activeProgress.section]}: {activeProgress.completed}/{activeProgress.total} ({activeProgress.percent}%)
              </p>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-[#2E7D32]"
                  style={{ width: `${activeProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {OFFLINE_SECTION_ORDER.map((sectionKey) => {
            const section = registry.sectionProgress[sectionKey];
            const sectionBusy = busyScope === sectionKey;
            const status = section.status;
            return (
              <div
                key={sectionKey}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-foreground">{SECTION_LABELS[sectionKey]}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {section.completed}/{section.total} cached · {section.failed} failed
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide ${statusChipClass(status)}`}>
                    {statusLabel(status)}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={!isOnline || busyScope !== null}
                    onClick={() => handleDownloadSection(sectionKey)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground disabled:opacity-50"
                  >
                    {status === "partial" ? <RefreshCcw size={14} /> : <Download size={14} />}
                    {status === "partial" ? "Retry" : "Download"}
                  </button>
                  {sectionBusy && (
                    <span className="self-center text-xs text-muted-foreground">
                      {activeProgress && activeProgress.scope === sectionKey
                        ? `Downloading... ${activeProgress.completed}/${activeProgress.total} (${activeProgress.percent}%)`
                        : "Downloading..."}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {feedback && (
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs font-semibold text-foreground">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}
