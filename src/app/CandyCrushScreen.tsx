import { useEffect, useRef } from "react";

/**
 * Candy Crush — portage fidèle de la version PWA autonome (index.html) fournie
 * par l'utilisateur, avec la même logique de détection de combinaisons
 * (niveaux 1/2/3) et les mêmes animations. La logique de jeu reste
 * volontairement "vanilla JS" (comme l'original) plutôt que réécrite en state
 * React, pour ne pas introduire de bug dans un algorithme déjà testé —
 * seule l'intégration (montage, styles scopés, sortie vers l'app) change.
 *
 * Toutes les classes CSS et variables sont préfixées "cc-" et scopées sous
 * .cc-root pour ne jamais entrer en collision avec le design system de
 * l'application (Tailwind / shadcn).
 */

const SCOPED_CSS = `
.cc-root {
  --cc-bg: #FBF6EB;
  --cc-surface: #F3EAD6;
  --cc-surface-raised: #FFFFFF;
  --cc-surface-muted: #F3EAD6;
  --cc-border: #E2D3AC;
  --cc-text-primary: #14252B;
  --cc-text-secondary: #4b5d63;
  --cc-text-tertiary: #8a989c;
  --cc-accent: #0F5257;
  --cc-danger: #C1442D;
  --cc-positive: #1c8f5f;
  --cc-warning: #D9A441;
  --cc-c0: #0F5257;
  --cc-c1: #C1442D;
  --cc-c2: #D9A441;
  --cc-c3: #2AA9A2;
  --cc-c4: #8B5FA3;
  --cc-c5: #3D5A73;
  --cc-c6: #E8875A;
  width: 100%;
  height: 100%;
  background: var(--cc-bg);
  color: var(--cc-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  border-radius: 20px;
}
.cc-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.cc-app { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; position: relative; }
.cc-screen { display: none; width: 100%; height: 100%; flex-direction: column; align-items: center; padding: 24px 16px; overflow-y: auto; }
.cc-screen.cc-active { display: flex; }
.cc-menu-logo { font-size: 32px; font-weight: 700; letter-spacing: 2px; margin-top: 40px; background: linear-gradient(135deg, var(--cc-c0), var(--cc-c1), var(--cc-c2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.cc-menu-sub { font-size: 14px; color: var(--cc-text-tertiary); margin-top: 8px; margin-bottom: 40px; }
.cc-copyright { font-size: 11px; color: var(--cc-text-tertiary); margin-top: 24px; letter-spacing: 0.5px; }
.cc-btn { width: 100%; max-width: 300px; padding: 16px 24px; border-radius: 14px; border: 1px solid var(--cc-border); background: var(--cc-surface-raised); color: var(--cc-text-primary); font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; text-align: center; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; }
.cc-btn:active { transform: scale(0.96); }
.cc-btn.cc-primary { background: var(--cc-text-primary); color: var(--cc-bg); border-color: var(--cc-text-primary); }
.cc-btn.cc-secondary { background: transparent; border-color: var(--cc-border); }
.cc-btn svg { width: 20px; height: 20px; }
.cc-settings-title { font-size: 22px; font-weight: 600; margin-top: 12px; margin-bottom: 4px; }
.cc-settings-sub { font-size: 13px; color: var(--cc-text-tertiary); margin-bottom: 20px; }
.cc-setting-row { width: 100%; max-width: 300px; display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--cc-border); }
.cc-setting-row label { font-size: 15px; color: var(--cc-text-secondary); }
.cc-setting-hint { font-size: 11px; color: var(--cc-text-tertiary); font-weight: 400; }
.cc-setting-row input[type="number"] { width: 64px; padding: 8px; border-radius: 10px; border: 1px solid var(--cc-border); background: var(--cc-surface); color: var(--cc-text-primary); font-size: 15px; text-align: center; font-weight: 600; }
.cc-level-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; max-width: 300px; margin: 16px 0; }
.cc-level-card { aspect-ratio: 1; border-radius: 16px; border: 1px solid var(--cc-border); background: var(--cc-surface-raised); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; position: relative; overflow: hidden; }
.cc-level-card:active { transform: scale(0.95); }
.cc-level-num { font-size: 26px; font-weight: 700; color: var(--cc-text-primary); }
.cc-level-label { font-size: 11px; color: var(--cc-text-tertiary); margin-top: 4px; text-align: center; }
.cc-level-card.cc-selected { border-color: var(--cc-accent); box-shadow: 0 0 0 2px var(--cc-accent); }
.cc-howto-box { width: 100%; max-width: 300px; background: var(--cc-surface-raised); border-radius: 16px; border: 1px solid var(--cc-border); padding: 18px; margin-bottom: 14px; }
.cc-howto-box h3 { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: var(--cc-text-primary); }
.cc-howto-box p { font-size: 14px; color: var(--cc-text-secondary); line-height: 1.6; margin: 0; }
.cc-howto-box ul { font-size: 14px; color: var(--cc-text-secondary); line-height: 1.8; padding-left: 18px; margin: 0; }
.cc-game-hud { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 4px 4px 10px; }
.cc-hud-back { width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--cc-border); background: var(--cc-surface-raised); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--cc-text-primary); font-size: 18px; }
.cc-hud-back:active { transform: scale(0.92); }
.cc-hud-score { text-align: center; }
.cc-hud-score-val { font-size: 28px; font-weight: 700; color: var(--cc-text-primary); font-variant-numeric: tabular-nums; line-height: 1; }
.cc-hud-score-label { font-size: 11px; color: var(--cc-text-tertiary); text-transform: uppercase; letter-spacing: 1px; }
.cc-hud-level { text-align: center; min-width: 46px; }
.cc-hud-level-val { font-size: 17px; font-weight: 600; color: var(--cc-text-secondary); }
.cc-board-wrap { position: relative; width: 100%; max-width: min(100%, 380px); aspect-ratio: 1; border-radius: 18px; border: 1px solid var(--cc-border); background: var(--cc-surface-muted); overflow: hidden; padding: 6px; }
.cc-board { display: grid; width: 100%; height: 100%; gap: 3px; }
.cc-cell { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--cc-surface-raised); cursor: pointer; transition: background 0.1s; }
.cc-cell:active { background: var(--cc-border); }
.cc-candy { width: 80%; height: 80%; border-radius: 50%; position: relative; transition: transform 0.18s ease, box-shadow 0.18s ease; will-change: transform; background: var(--cc-surface-raised); border: 1px solid var(--cc-border); box-shadow: 0 2px 5px rgba(20,37,43,0.12); display: flex; align-items: center; justify-content: center; font-size: var(--cc-emoji-size, 22px); line-height: 1; }
/* Les pions ne sont plus colorés par type — seul le symbole (emoji) les
   distingue désormais. --cc-c0..c6 restent définies pour les particules de
   la routine spawnParticles() lors des combinaisons. */
.cc-candy.cc-selected { box-shadow: 0 0 0 3px var(--cc-text-primary), 0 0 15px rgba(255,255,255,0.2); transform: scale(1.08); }
.cc-candy.cc-pop { animation: ccPop 0.28s ease forwards; }
@keyframes ccPop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(0); opacity: 0; } }
.cc-candy.cc-fall { animation: ccFall 0.35s ease-out; }
@keyframes ccFall { from { transform: translateY(-50px); opacity: 0.3; } to { transform: translateY(0); opacity: 1; } }
.cc-candy.cc-shake { animation: ccShake 0.3s ease; }
@keyframes ccShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.cc-game-msg { min-height: 20px; font-size: 14px; text-align: center; font-weight: 600; margin: 4px 0; }
.cc-game-msg.cc-error { color: var(--cc-danger); }
.cc-game-msg.cc-success { color: var(--cc-positive); }
.cc-overlay { position: absolute; inset: 0; background: rgba(251,246,235,0.94); backdrop-filter: blur(8px); display: none; flex-direction: column; align-items: center; justify-content: center; gap: 14px; z-index: 20; border-radius: 18px; }
.cc-overlay.cc-show { display: flex; }
.cc-overlay h2 { font-size: 24px; font-weight: 700; color: var(--cc-text-primary); margin: 0; }
.cc-overlay .cc-final-score { font-size: 44px; font-weight: 700; color: var(--cc-accent); line-height: 1; }
.cc-overlay p { font-size: 14px; color: var(--cc-text-secondary); margin: 0; }
.cc-particle { position: absolute; width: 6px; height: 6px; border-radius: 50%; pointer-events: none; animation: ccParticleFly 0.6s ease-out forwards; }
@keyframes ccParticleFly { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--cc-tx), var(--cc-ty)) scale(0); opacity: 0; } }
.cc-combo-text { position: absolute; font-size: 22px; font-weight: 700; color: var(--cc-warning); pointer-events: none; animation: ccComboUp 0.8s ease-out forwards; text-shadow: 0 2px 10px rgba(0,0,0,0.5); z-index: 15; }
@keyframes ccComboUp { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 20% { transform: translateY(-10px) scale(1.2); opacity: 1; } 100% { transform: translateY(-60px) scale(1); opacity: 0; } }
.cc-quit-row { width: 100%; max-width: 300px; display: flex; justify-content: flex-start; margin-bottom: 8px; }
`;

const MARKUP = `
<div class="cc-app">
  <div class="cc-screen cc-active" id="cc-scrMenu">
    <div class="cc-quit-row">
      <button class="cc-hud-back" data-action="quit">&#x2190;</button>
    </div>
    <div class="cc-menu-logo">BAZAR CRUSH</div>
    <div class="cc-menu-sub">🧿 Édition spéciale Turquie</div>
    <button class="cc-btn cc-primary" data-action="go-settings">Jouer</button>
    <button class="cc-btn cc-secondary" data-action="go-howto">Comment jouer</button>
    <div class="cc-copyright">(c)Julie@INSA</div>
  </div>

  <div class="cc-screen" id="cc-scrSettings">
    <div class="cc-settings-title">Paramètres</div>
    <div class="cc-settings-sub">Personnalise ta partie</div>
    <div class="cc-setting-row"><label>Lignes</label><input type="number" id="cc-setRows" value="8" min="5" max="12"></div>
    <div class="cc-setting-row"><label>Colonnes</label><input type="number" id="cc-setCols" value="8" min="5" max="12"></div>
    <div class="cc-setting-row"><label>Types de pions turcs<br><span class="cc-setting-hint">Moins = plus facile</span></label><input type="number" id="cc-setTypes" value="5" min="3" max="7"></div>
    <div class="cc-settings-sub" style="margin-top:8px;margin-bottom:4px;">Choisis ton niveau</div>
    <div class="cc-level-grid">
      <div class="cc-level-card cc-selected" data-lvl="1" data-action="select-level"><div class="cc-level-num">1</div><div class="cc-level-label">3 alignés</div></div>
      <div class="cc-level-card" data-lvl="2" data-action="select-level"><div class="cc-level-num">2</div><div class="cc-level-label">3+ alignés</div></div>
      <div class="cc-level-card" data-lvl="3" data-action="select-level"><div class="cc-level-num">3</div><div class="cc-level-label">Blocs</div></div>
    </div>
    <button class="cc-btn cc-primary" data-action="start-game" style="margin-top:8px;">Lancer la partie</button>
    <button class="cc-btn cc-secondary" data-action="go-menu">Retour</button>
  </div>

  <div class="cc-screen" id="cc-scrHowTo">
    <div class="cc-settings-title">Comment jouer</div>
    <div class="cc-howto-box">
      <h3>But du jeu</h3>
      <p>Échange deux pions turcs adjacents pour créer des alignements de même symbole. Les pions alignés disparaissent et de nouveaux tombent du haut.</p>
    </div>
    <div class="cc-howto-box">
      <h3>Les 3 niveaux</h3>
      <ul>
        <li><strong>Niveau 1</strong> : alignements de 3 pions exactement</li>
        <li><strong>Niveau 2</strong> : alignements de 3+ pions</li>
        <li><strong>Niveau 3</strong> : blocs de pions connectés (3+ en ligne)</li>
      </ul>
    </div>
    <div class="cc-howto-box">
      <h3>Contrôles</h3>
      <p><strong>Tape</strong> un pion, puis <strong>tape</strong> un voisin pour échanger. Sur mobile, tu peux aussi <strong>glisser</strong> (swipe) dans la direction voulue.</p>
    </div>
    <div class="cc-howto-box">
      <h3>Régler la difficulté</h3>
      <p>Dans les paramètres, le nombre de <strong>types de pions turcs</strong> change la difficulté : avec 3 symboles, les alignements sautent aux yeux (facile) ; avec 7 symboles, la grille est plus dense et les combinaisons plus rares (difficile).</p>
    </div>
    <button class="cc-btn cc-secondary" data-action="go-menu">Retour</button>
  </div>

  <div class="cc-screen" id="cc-scrGame">
    <div class="cc-game-hud">
      <button class="cc-hud-back" data-action="go-menu">&#x2190;</button>
      <div class="cc-hud-score">
        <div class="cc-hud-score-val" id="cc-scoreVal">0</div>
        <div class="cc-hud-score-label">score</div>
      </div>
      <div class="cc-hud-level">
        <div class="cc-hud-level-val" id="cc-levelVal">1</div>
        <div class="cc-hud-score-label">niv.</div>
      </div>
    </div>
    <div class="cc-game-msg" id="cc-gameMsg"></div>
    <div class="cc-board-wrap" id="cc-boardWrap">
      <div class="cc-board" id="cc-board"></div>
      <div class="cc-overlay" id="cc-gameOver">
        <h2>Partie terminée !</h2>
        <div class="cc-final-score" id="cc-finalScore">0</div>
        <p>points</p>
        <button class="cc-btn cc-primary" data-action="restart-game">Rejouer</button>
        <button class="cc-btn cc-secondary" data-action="go-menu">Menu</button>
      </div>
    </div>
    <div class="cc-settings-sub" style="margin-top:8px;font-size:12px;">Tape un pion puis un voisin pour échanger</div>
  </div>
</div>
`;

export function CandyCrushScreen({ onBack }: { onBack: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLDivElement = rootEl;

    let rows = 8,
      cols = 8,
      types = 5,
      level = 1,
      selectedLevel = 1,
      grid: number[][] = [],
      score = 0,
      selected: [number, number] | null = null,
      busy = false;

    const colorClasses = ["cc-c0", "cc-c1", "cc-c2", "cc-c3", "cc-c4", "cc-c5", "cc-c6"];
    const candyEmojis = ["🇹🇷", "🕌", "👳", "🏛️", "🍯", "🍬", "☕"];
    const candyColorVars = [
      "var(--cc-c0)",
      "var(--cc-c1)",
      "var(--cc-c2)",
      "var(--cc-c3)",
      "var(--cc-c4)",
      "var(--cc-c5)",
      "var(--cc-c6)",
    ];

    const $ = (id: string) => root.querySelector<HTMLElement>("#" + id);
    const show = (id: string) => {
      root.querySelectorAll(".cc-screen").forEach((s) => s.classList.remove("cc-active"));
      $(id)?.classList.add("cc-active");
    };

    function rand(n: number) {
      return Math.floor(Math.random() * n);
    }

    function createGrid() {
      do {
        grid = [];
        for (let i = 0; i < rows; i++) {
          const r: number[] = [];
          for (let j = 0; j < cols; j++) r.push(rand(types));
          grid.push(r);
        }
      } while (findAnyCombo().length > 0);
    }

    function detectL1(g: number[][], i: number, j: number) {
      const res: [number, number][] = [];
      if (j + 2 < cols && g[i][j] === g[i][j + 1] && g[i][j] === g[i][j + 2])
        res.push([i, j], [i, j + 1], [i, j + 2]);
      if (j - 2 >= 0 && g[i][j] === g[i][j - 1] && g[i][j] === g[i][j - 2])
        res.push([i, j], [i, j - 1], [i, j - 2]);
      if (i + 2 < rows && g[i][j] === g[i + 1][j] && g[i][j] === g[i + 2][j])
        res.push([i, j], [i + 1, j], [i + 2, j]);
      if (i - 2 >= 0 && g[i][j] === g[i - 1][j] && g[i][j] === g[i - 2][j])
        res.push([i, j], [i - 1, j], [i - 2, j]);
      if (i + 1 < rows && i - 1 >= 0 && g[i][j] === g[i - 1][j] && g[i][j] === g[i + 1][j])
        res.push([i, j], [i - 1, j], [i + 1, j]);
      if (j + 1 < cols && j - 1 >= 0 && g[i][j] === g[i][j - 1] && g[i][j] === g[i][j + 1])
        res.push([i, j], [i, j - 1], [i, j + 1]);
      return res;
    }

    function detectL2(g: number[][], i: number, j: number) {
      const res: [number, number][] = [];
      const v = g[i][j];
      let im = i,
        ip = i,
        c = 1;
      while (im - 1 >= 0 && g[im - 1][j] === v) {
        im--;
        c++;
      }
      while (ip + 1 < rows && g[ip + 1][j] === v) {
        ip++;
        c++;
      }
      if (c >= 3) for (let a = im; a <= ip; a++) res.push([a, j]);
      let jm = j,
        jp = j;
      c = 1;
      while (jm - 1 >= 0 && g[i][jm - 1] === v) {
        jm--;
        c++;
      }
      while (jp + 1 < cols && g[i][jp + 1] === v) {
        jp++;
        c++;
      }
      if (c >= 3) for (let a = jm; a <= jp; a++) res.push([i, a]);
      return res;
    }

    function detectL3(g: number[][], i: number, j: number) {
      const res: [number, number][] = [];
      const v = g[i][j];
      let all = false;
      let im = i,
        ip = i,
        c = 1;
      while (im - 1 >= 0 && g[im - 1][j] === v) {
        im--;
        c++;
      }
      while (ip + 1 < rows && g[ip + 1][j] === v) {
        ip++;
        c++;
      }
      if (c >= 3) {
        for (let a = im; a <= ip; a++) {
          res.push([a, j]);
          let b = j;
          while (b - 1 >= 0 && g[a][b - 1] === v) {
            res.push([a, b - 1]);
            b--;
          }
          b = j;
          while (b + 1 < cols && g[a][b + 1] === v) {
            res.push([a, b + 1]);
            b++;
          }
        }
        all = true;
      }
      if (!all) {
        let jm = j,
          jp = j;
        c = 1;
        while (jm - 1 >= 0 && g[i][jm - 1] === v) {
          jm--;
          c++;
        }
        while (jp + 1 < cols && g[i][jp + 1] === v) {
          jp++;
          c++;
        }
        if (c >= 3) {
          for (let a = jm; a <= jp; a++) {
            res.push([i, a]);
            let b = i;
            while (b - 1 >= 0 && g[b - 1][a] === v) {
              res.push([b - 1, a]);
              b--;
            }
            b = i;
            while (b + 1 < rows && g[b + 1][a] === v) {
              res.push([b + 1, a]);
              b++;
            }
          }
        }
      }
      return res;
    }

    function detect(g: number[][], i: number, j: number) {
      if (level === 1) return detectL1(g, i, j);
      if (level === 2) return detectL2(g, i, j);
      return detectL3(g, i, j);
    }

    function findAnyCombo() {
      for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
          const c = detect(grid, i, j);
          if (c.length > 0) return c;
        }
      return [];
    }

    function uniqueCoords(list: [number, number][]) {
      const m = new Map<string, [number, number]>();
      list.forEach(([i, j]) => m.set(i + "," + j, [i, j]));
      return Array.from(m.values());
    }

    function hasPossibleMove() {
      const dirs = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          for (const [di, dj] of dirs) {
            const ni = i + di,
              nj = j + dj;
            if (ni < 0 || ni >= rows || nj < 0 || nj >= cols) continue;
            const g = grid.map((r) => r.slice());
            [g[i][j], g[ni][nj]] = [g[ni][nj], g[i][j]];
            if (detect(g, ni, nj).length > 0 || detect(g, i, j).length > 0) return true;
          }
        }
      }
      return false;
    }

    function spawnParticles(x: number, y: number, color: string) {
      const wrap = $("cc-boardWrap");
      if (!wrap) return;
      for (let k = 0; k < 6; k++) {
        const p = document.createElement("div");
        p.className = "cc-particle";
        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.background = color;
        const angle = (Math.PI * 2 * k) / 6 + Math.random() * 0.5;
        const dist = 30 + Math.random() * 40;
        p.style.setProperty("--cc-tx", Math.cos(angle) * dist + "px");
        p.style.setProperty("--cc-ty", Math.sin(angle) * dist + "px");
        wrap.appendChild(p);
        setTimeout(() => p.remove(), 600);
      }
    }

    function showComboText(x: number, y: number, text: string) {
      const wrap = $("cc-boardWrap");
      if (!wrap) return;
      const el = document.createElement("div");
      el.className = "cc-combo-text";
      el.textContent = text;
      el.style.left = x - 30 + "px";
      el.style.top = y - 20 + "px";
      wrap.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }

    function removeAndFill(combo: [number, number][], chainCount: number) {
      let list = uniqueCoords(combo);
      list = list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const colsToFill = new Set<number>();
      list.forEach(([i, j]) => {
        colsToFill.add(j);
        const el = $("cc-c-" + i + "-" + j);
        if (el) {
          const candy = el.firstElementChild as HTMLElement;
          candy.classList.add("cc-pop");
          const rect = candy.getBoundingClientRect();
          const wrapRect = $("cc-boardWrap")!.getBoundingClientRect();
          spawnParticles(
            rect.left - wrapRect.left + rect.width / 2,
            rect.top - wrapRect.top + rect.height / 2,
            candyColorVars[grid[i][j]]
          );
        }
      });

      if (chainCount > 1) {
        const mid = list[Math.floor(list.length / 2)];
        const el = $("cc-c-" + mid[0] + "-" + mid[1]);
        if (el) {
          const rect = el.getBoundingClientRect();
          const wrapRect = $("cc-boardWrap")!.getBoundingClientRect();
          showComboText(rect.left - wrapRect.left + rect.width / 2, rect.top - wrapRect.top, "COMBO x" + chainCount + "!");
        }
      }

      setTimeout(() => {
        colsToFill.forEach((j) => {
          const removedInCol = list
            .filter(([, c]) => c === j)
            .map(([i]) => i)
            .sort((a, b) => a - b);
          const shift = removedInCol.length;
          const colVals: number[] = [];
          for (let i = 0; i < rows; i++) if (!removedInCol.includes(i)) colVals.push(grid[i][j]);
          for (let k = 0; k < shift; k++) colVals.unshift(rand(types));
          for (let i = 0; i < rows; i++) grid[i][j] = colVals[i];
        });
        renderBoard(true);
        score += list.length * chainCount;
        const scoreEl = $("cc-scoreVal");
        if (scoreEl) scoreEl.textContent = String(score);
        setTimeout(() => {
          const next = findAnyCombo();
          if (next.length > 0) removeAndFill(next, chainCount + 1);
          else {
            busy = false;
            if (!hasPossibleMove()) showGameOver();
            else {
              const msg = $("cc-gameMsg");
              if (msg) msg.textContent = "";
            }
          }
        }, 350);
      }, 280);
    }

    function renderBoard(animateFall = false) {
      const b = $("cc-board");
      if (!b) return;
      b.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
      b.innerHTML = "";
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const cell = document.createElement("div");
          cell.className = "cc-cell";
          cell.id = "cc-c-" + i + "-" + j;
          const candy = document.createElement("div");
          candy.className = "cc-candy " + colorClasses[grid[i][j] % colorClasses.length];
          candy.textContent = candyEmojis[grid[i][j] % candyEmojis.length];
          if (animateFall) candy.classList.add("cc-fall");
          candy.dataset.i = String(i);
          candy.dataset.j = String(j);
          cell.appendChild(candy);
          b.appendChild(cell);
        }
      }
      // Bug corrigé : la taille des emojis était calculée en % de la taille
      // de police héritée (quelques px, donc quasi invisible) au lieu de la
      // taille réelle des cases. On la mesure ici et on la fixe en px.
      const firstCell = b.firstElementChild as HTMLElement | null;
      if (firstCell) {
        const cellSize = firstCell.getBoundingClientRect().width;
        if (cellSize > 0) {
          b.style.setProperty("--cc-emoji-size", Math.round(cellSize * 0.52) + "px");
        }
      }
      attachCandyEvents();
    }

    function attachCandyEvents() {
      let startX = 0,
        startY = 0,
        startCell: HTMLElement | null = null;
      root.querySelectorAll<HTMLElement>(".cc-candy").forEach((el) => {
        el.addEventListener(
          "touchstart",
          (e) => {
            if (busy) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startCell = el;
          },
          { passive: true }
        );
        el.addEventListener(
          "touchend",
          (e) => {
            if (busy || !startCell) return;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            const i = +startCell.dataset.i!,
              j = +startCell.dataset.j!;
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
              handleSelect(i, j);
            } else if (Math.abs(dx) > Math.abs(dy)) {
              if (dx > 20) trySwap(i, j, "right");
              else if (dx < -20) trySwap(i, j, "left");
            } else {
              if (dy > 20) trySwap(i, j, "bottom");
              else if (dy < -20) trySwap(i, j, "top");
            }
            startCell = null;
          },
          { passive: true }
        );
        el.addEventListener("click", () => {
          if (busy) return;
          handleSelect(+el.dataset.i!, +el.dataset.j!);
        });
      });
    }

    function handleSelect(i: number, j: number) {
      const msg = $("cc-gameMsg");
      if (msg) {
        msg.textContent = "";
        msg.className = "cc-game-msg";
      }
      if (selected === null) {
        selected = [i, j];
        highlight(i, j, true);
      } else {
        const [si, sj] = selected;
        highlight(si, sj, false);
        if (si === i && sj === j) {
          selected = null;
          return;
        }
        if (Math.abs(si - i) + Math.abs(sj - j) === 1) {
          const dir = i < si ? "top" : i > si ? "bottom" : j < sj ? "left" : "right";
          trySwap(si, sj, dir);
        } else {
          selected = [i, j];
          highlight(i, j, true);
        }
      }
    }

    function highlight(i: number, j: number, on: boolean) {
      const el = root.querySelector<HTMLElement>("#cc-c-" + i + "-" + j + " .cc-candy");
      el?.classList.toggle("cc-selected", on);
    }

    function trySwap(i: number, j: number, dir: string) {
      if (busy) return;
      let ni = i,
        nj = j;
      if (dir === "left") nj--;
      else if (dir === "right") nj++;
      else if (dir === "top") ni--;
      else if (dir === "bottom") ni++;
      if (ni < 0 || ni >= rows || nj < 0 || nj >= cols) return;
      busy = true;
      const msg = $("cc-gameMsg");
      if (msg) {
        msg.textContent = "";
        msg.className = "cc-game-msg";
      }
      selected = null;
      highlight(i, j, false);
      [grid[i][j], grid[ni][nj]] = [grid[ni][nj], grid[i][j]];
      renderBoard();
      let combo = detect(grid, ni, nj);
      if (combo.length === 0) combo = detect(grid, i, j);
      if (combo.length === 0) {
        if (msg) {
          msg.textContent = "Mauvaise combinaison";
          msg.className = "cc-game-msg cc-error";
        }
        const el1 = root.querySelector<HTMLElement>("#cc-c-" + i + "-" + j + " .cc-candy");
        const el2 = root.querySelector<HTMLElement>("#cc-c-" + ni + "-" + nj + " .cc-candy");
        el1?.classList.add("cc-shake");
        el2?.classList.add("cc-shake");
        setTimeout(() => {
          [grid[i][j], grid[ni][nj]] = [grid[ni][nj], grid[i][j]];
          renderBoard();
          busy = false;
        }, 450);
      } else {
        if (msg) {
          msg.textContent = "+" + combo.length + " points !";
          msg.className = "cc-game-msg cc-success";
        }
        removeAndFill(combo, 1);
      }
    }

    function showGameOver() {
      const fs = $("cc-finalScore");
      if (fs) fs.textContent = String(score);
      $("cc-gameOver")?.classList.add("cc-show");
    }

    function selectLevel(lvl: number) {
      selectedLevel = lvl;
      root.querySelectorAll(".cc-level-card").forEach((c) => c.classList.remove("cc-selected"));
      root.querySelector(`.cc-level-card[data-lvl="${lvl}"]`)?.classList.add("cc-selected");
    }

    function startGame() {
      level = selectedLevel;
      rows = Math.min(12, Math.max(5, parseInt(($("cc-setRows") as HTMLInputElement)?.value) || 8));
      cols = Math.min(12, Math.max(5, parseInt(($("cc-setCols") as HTMLInputElement)?.value) || 8));
      types = Math.min(7, Math.max(3, parseInt(($("cc-setTypes") as HTMLInputElement)?.value) || 5));
      score = 0;
      selected = null;
      busy = false;
      const scoreEl = $("cc-scoreVal");
      if (scoreEl) scoreEl.textContent = "0";
      const levelEl = $("cc-levelVal");
      if (levelEl) levelEl.textContent = String(level);
      $("cc-gameOver")?.classList.remove("cc-show");
      const msg = $("cc-gameMsg");
      if (msg) msg.textContent = "";
      createGrid();
      renderBoard();
      show("cc-scrGame");
    }

    function restartGame() {
      $("cc-gameOver")?.classList.remove("cc-show");
      score = 0;
      selected = null;
      busy = false;
      const scoreEl = $("cc-scoreVal");
      if (scoreEl) scoreEl.textContent = "0";
      createGrid();
      renderBoard();
    }

    function stopGame() {
      busy = true;
    }

    function onRootClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "go-settings") show("cc-scrSettings");
      else if (action === "go-howto") show("cc-scrHowTo");
      else if (action === "go-menu") {
        show("cc-scrMenu");
        stopGame();
      } else if (action === "select-level") selectLevel(parseInt(target.dataset.lvl || "1"));
      else if (action === "start-game") startGame();
      else if (action === "restart-game") restartGame();
      else if (action === "quit") onBack();
    }

    // Empêche le pull-to-refresh du navigateur pendant le swipe sur le plateau
    function onTouchMove(e: TouchEvent) {
      if ((e.target as HTMLElement).closest(".cc-board-wrap")) e.preventDefault();
    }

    root.innerHTML = MARKUP;
    selectLevel(1);
    root.addEventListener("click", onRootClick);
    root.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      root.removeEventListener("click", onRootClick);
      root.removeEventListener("touchmove", onTouchMove);
      root.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full">
      <style>{SCOPED_CSS}</style>
      <div ref={rootRef} className="cc-root" />
    </div>
  );
}
