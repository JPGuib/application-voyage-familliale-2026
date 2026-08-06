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
    setFeedback(null);
    try {
      const result = await downloadAllOfflineMedia();
      setRegistry(result.registry);
      if (result.failed > 0) {
        setFeedback(`Download finished with ${result.failed} failed resources. Retry the partial sections.`);
      } else {
        setFeedback("Offline media download completed.");
      }
    } finally {
      setBusyScope(null);
    }
  };

  const handleDownloadSection = async (section: OfflineSectionKey) => {
    if (!isOnline) {
      setFeedback("Connect to the internet to refresh the offline cache.");
      return;
    }

    setBusyScope(section);
    setFeedback(null);
    try {
      const result = await downloadOfflineMediaSection(section);
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
                    <span className="self-center text-xs text-muted-foreground">Downloading...</span>
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
