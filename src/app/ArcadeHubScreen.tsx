import { ChevronLeft, ChevronRight } from "lucide-react";

export function ArcadeHubScreen({
  onBack,
  onPlayTrivial,
  onPlayCandyCrush,
  onPlayOrdalie,
  onPlayImposteur,
}: {
  onBack: () => void;
  onPlayTrivial: () => void;
  onPlayCandyCrush: () => void;
  onPlayOrdalie: () => void;
  onPlayImposteur: () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="relative bg-[#0F5257] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Jeu
        </button>
        <h1 className="relative z-10 text-2xl font-black">Jeux 🕹️</h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">Choisissez à quoi jouer</p>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-3">
        <button
          onClick={onPlayTrivial}
          className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 text-left active:scale-[0.98] transition-transform shadow-sm"
        >
          <div className="text-3xl">🎲</div>
          <div className="flex-1">
            <div className="font-black text-foreground text-sm">Trivial Turquie</div>
            <div className="text-xs text-muted-foreground">
              Multijoueur en direct, chacun pour soi, 2 à 5 joueurs
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>

        <button
          onClick={onPlayCandyCrush}
          className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 text-left active:scale-[0.98] transition-transform shadow-sm"
        >
          <div className="text-3xl">🍬</div>
          <div className="flex-1">
            <div className="font-black text-foreground text-sm">Candy Crush</div>
            <div className="text-xs text-muted-foreground">
              Solo, 3 niveaux de difficulté, pour passer le temps pendant les trajets
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>

        <button
          onClick={onPlayOrdalie}
          className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 text-left active:scale-[0.98] transition-transform shadow-sm"
        >
          <div className="text-3xl">🎙️</div>
          <div className="flex-1">
            <div className="font-black text-foreground text-sm">L'Ordalie des 5 Sens</div>
            <div className="text-xs text-muted-foreground">
              Un même téléphone à se passer, 1 Gardien et 4 Chercheurs, carte et questions vocales
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>

        <button
          onClick={onPlayImposteur}
          className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 text-left active:scale-[0.98] transition-transform shadow-sm"
        >
          <div className="text-3xl">🎭</div>
          <div className="flex-1">
            <div className="font-black text-foreground text-sm">L'Imposteur Turque</div>
            <div className="text-xs text-muted-foreground">
              Un même téléphone à se passer, un mot secret, 5 joueurs, qui bluffe ?
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
