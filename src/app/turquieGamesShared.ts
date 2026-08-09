/**
 * Utilitaires partagés entre OrdalieScreen et ImposteurScreen (les deux jeux
 * "hot seat" — un seul téléphone passé de joueur en joueur — du pack
 * "Turquie Games"). Regroupés ici pour éviter de dupliquer deux fois le même
 * CSS scopé et les mêmes petites fonctions utilitaires.
 */

export const TG_SCOPED_CSS = `
.tg-root {
  --tg-bg: #1a1a2e;
  --tg-card: #16213e;
  --tg-primary: #e94560;
  --tg-secondary: #0f3460;
  --tg-accent: #e8d44d;
  --tg-text: #eee;
  --tg-text-muted: #aaa;
  --tg-success: #4ecdc4;
  --tg-danger: #ff6b6b;
  width: 100%;
  height: 100%;
  background: var(--tg-bg);
  color: var(--tg-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}
.tg-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.tg-screen { display: none; height: 100%; padding: 20px; padding-bottom: 32px; overflow-y: auto; flex-direction: column; animation: tgFadeIn 0.3s ease; }
.tg-screen.tg-active { display: flex; }
@keyframes tgFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tgPulse { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(233,69,96,0.7); } 50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(233,69,96,0); } }
.tg-root h1 { font-size: 1.5rem; margin-bottom: 8px; line-height: 1.2; }
.tg-root h2 { font-size: 1.15rem; margin-bottom: 10px; }
.tg-root p { color: var(--tg-text-muted); line-height: 1.5; margin-bottom: 14px; font-size: 0.92rem; }
.tg-btn { background: var(--tg-primary); color: white; border: none; padding: 15px 18px; border-radius: 14px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; margin: 7px 0; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; transition: transform 0.15s, opacity 0.15s; }
.tg-btn:active { transform: scale(0.96); opacity: 0.9; }
.tg-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.tg-btn-secondary { background: var(--tg-secondary); }
.tg-btn-outline { background: transparent; border: 2px solid var(--tg-primary); color: var(--tg-primary); }
.tg-card { background: var(--tg-card); border-radius: 16px; padding: 16px; margin: 8px 0; border: 1px solid rgba(255,255,255,0.05); }
.tg-root input, .tg-root textarea { width: 100%; padding: 13px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.25); color: var(--tg-text); font-size: 1rem; margin: 6px 0; font-family: inherit; outline: none; }
.tg-root input:focus, .tg-root textarea:focus { border-color: var(--tg-primary); }
.tg-pass-screen { background: #000; justify-content: center; align-items: center; text-align: center; }
.tg-pass-screen h2 { font-size: 1.7rem; margin-bottom: 10px; }
.tg-pass-screen p { color: #666; font-size: 1rem; }
.tg-pass-screen .tg-btn { max-width: 260px; margin-top: 26px; }
.tg-recorder { display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 18px 0; }
.tg-rec-btn { width: 84px; height: 84px; border-radius: 50%; background: var(--tg-primary); border: none; color: white; font-size: 2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(233,69,96,0.4); }
.tg-rec-btn.tg-recording { animation: tgPulse 1.2s infinite; background: #ff0000; }
.tg-timer { font-size: 2.8rem; font-weight: 800; color: var(--tg-accent); text-align: center; margin: 14px 0; font-variant-numeric: tabular-nums; }
.tg-timer.tg-small { font-size: 1.8rem; }
.tg-emoji-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 9px; margin: 14px 0; }
.tg-emoji-btn { font-size: 1.6rem; padding: 9px; background: var(--tg-card); border: 2px solid transparent; border-radius: 12px; cursor: pointer; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }
.tg-emoji-btn.tg-selected { border-color: var(--tg-accent); background: var(--tg-secondary); }
.tg-word-slot { background: var(--tg-card); padding: 14px; border-radius: 14px; margin: 7px 0; text-align: center; font-size: 1.05rem; border: 1px solid rgba(255,255,255,0.05); }
.tg-player-tag { display: inline-block; padding: 5px 13px; background: var(--tg-secondary); border-radius: 20px; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 9px; color: var(--tg-accent); }
.tg-sens-badge { display: inline-block; padding: 9px 18px; background: linear-gradient(135deg, var(--tg-primary), #ff6b6b); border-radius: 24px; font-weight: 700; margin: 9px 0; font-size: 1.02rem; }
.tg-vote-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-top: 14px; }
.tg-vote-card { background: var(--tg-card); border-radius: 16px; padding: 22px 14px; text-align: center; cursor: pointer; border: 2px solid transparent; }
.tg-vote-card:active { transform: scale(0.96); }
.tg-result-win { color: var(--tg-success); }
.tg-result-lose { color: var(--tg-danger); }
.tg-map-container { height: 280px; border-radius: 14px; margin: 10px 0; overflow: hidden; border: 2px solid var(--tg-secondary); }
.tg-map-container .leaflet-container { background: #16213e; }
.tg-dist-badge { display: inline-block; padding: 6px 13px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; margin-top: 6px; }
.tg-dist-ok { background: rgba(78,205,196,0.2); color: var(--tg-success); }
.tg-dist-ko { background: rgba(255,107,107,0.2); color: var(--tg-danger); }
.tg-step-indicator { display: flex; justify-content: center; gap: 6px; margin: 14px 0; }
.tg-step-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tg-secondary); transition: all 0.3s; }
.tg-step-dot.tg-active { background: var(--tg-primary); width: 22px; border-radius: 4px; }
.tg-audio-player { width: 100%; margin: 10px 0; border-radius: 8px; }
.tg-hidden { display: none !important; }
.tg-flex-center { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; }
.tg-spacer { flex: 1; }
`;

export function tgVibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

export function tgHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Charge Leaflet (JS + CSS) depuis le CDN une seule fois, à la demande — ni
// Ordalie ni le reste de l'application n'en ont besoin ailleurs.
let leafletLoadingPromise: Promise<void> | null = null;

export function loadLeaflet(): Promise<void> {
  if (typeof window !== "undefined" && (window as unknown as { L?: unknown }).L) {
    return Promise.resolve();
  }
  if (leafletLoadingPromise) return leafletLoadingPromise;

  leafletLoadingPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.setAttribute("data-leaflet", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger la carte (Leaflet)."));
    document.body.appendChild(script);
  });

  return leafletLoadingPromise;
}
