import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * Trivial Turquie — jeu de plateau multijoueur "chacun pour soi" (2 à 5 joueurs).
 *
 * Ce composant se connecte EN DIRECT (WebSocket) au petit serveur de jeu Python
 * (FastAPI) fourni séparément — voir /trivial-server dans le projet. Il ne passe
 * PAS par la synchronisation cloud famille (useCloudSync) : c'est une connexion
 * temps réel indépendante, propre à une partie.
 *
 * URL du serveur déployé sur Render. Peut être surchargée par la variable
 * d'environnement Vite VITE_TRIVIAL_WS_URL si besoin (ex. pour tester en
 * local contre un autre serveur).
 */
const TRIVIAL_SERVER_URL: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_TRIVIAL_WS_URL || "wss://application-voyage-familliale-2026.onrender.com";

// Dérive l'URL HTTP(S) à partir de l'URL WebSocket, pour l'appel REST /packs
// (ex. wss://mon-serveur.onrender.com -> https://mon-serveur.onrender.com)
const TRIVIAL_HTTP_URL = TRIVIAL_SERVER_URL.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");

const CATEGORY_COLOR_PALETTE = [
  "#0F5257",
  "#C1442D",
  "#D9A441",
  "#2AA9A2",
  "#8B5FA3",
  "#3D5A73",
  "#2E7D6B",
  "#D4711E",
] as const;

function buildCategoryColors(categoryKeys: string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  categoryKeys.forEach((key, idx) => {
    colors[key] = CATEGORY_COLOR_PALETTE[idx % CATEGORY_COLOR_PALETTE.length];
  });
  return colors;
}

type TPlayer = {
  id: string;
  name: string;
  color: string;
  host: boolean;
  pos: number;
  wedges: string[];
  connected: boolean;
  finished: boolean;
};

type TRoomState = {
  type: "room_state";
  code: string;
  pack_id: string;
  pack_label: string;
  state: "lobby" | "playing" | "finished" | "cancelled";
  board: string[];
  category_labels: Record<string, string>;
  players: TPlayer[];
  current_player: string | null;
  winner: string | null;
};

type TQuestion = {
  type: "question";
  player_id: string;
  category: string;
  label: string;
  question: string;
  choices: string[];
  final: boolean;
};

type TAnswerPublic = {
  type: "answer_public";
  player_id: string;
  category: string;
  correct: boolean;
  final: boolean;
  chosen_index: number;
  correct_index: number;
  bonus_replay: boolean;
};

type HostedRoomEntry = {
  code: string;
  playerName: string;
  createdAt: number;
};

type TPackInfo = { id: string; label: string };

// Utilisée si l'appel réseau à /packs échoue (serveur en train de démarrer,
// pas encore de connexion...) — évite un écran de création vide.
const FALLBACK_PACKS: TPackInfo[] = [{ id: "turquie", label: "Trivial Turquie 🇹🇷" }];

// Garde une trace locale des salons créés depuis cet appareil, pour pouvoir
// les retrouver après avoir quitté l'écran — le serveur ne connaît que les
// salons actifs, cette liste vit uniquement dans le navigateur.
const HOSTED_ROOMS_KEY = "trivial_turquie_hosted_rooms";
const MAX_HOSTED_ROOMS = 5;

function loadHostedRooms(): HostedRoomEntry[] {
  try {
    const raw = localStorage.getItem(HOSTED_ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHostedRoom(entry: HostedRoomEntry) {
  try {
    const current = loadHostedRooms().filter((r) => r.code !== entry.code);
    const next = [entry, ...current].slice(0, MAX_HOSTED_ROOMS);
    localStorage.setItem(HOSTED_ROOMS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadHostedRooms();
  }
}

function removeHostedRoom(code: string) {
  try {
    const next = loadHostedRooms().filter((r) => r.code !== code);
    localStorage.setItem(HOSTED_ROOMS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadHostedRooms();
  }
}

export function TrivialGameScreen({
  defaultPlayerName,
  onBack,
}: {
  defaultPlayerName: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"setup" | "lobby" | "playing" | "finished" | "cancelled">("setup");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(defaultPlayerName || "");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [connectingHint, setConnectingHint] = useState<string | null>(null);
  const [room, setRoom] = useState<TRoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [question, setQuestion] = useState<TQuestion | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    correct: boolean;
    chosenIndex: number;
    correctIndex: number;
    bonusReplay: boolean;
  } | null>(null);
  const [diceMessage, setDiceMessage] = useState<string>("");
  const [hostedRooms, setHostedRooms] = useState<HostedRoomEntry[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [availablePacks, setAvailablePacks] = useState<TPackInfo[]>(FALLBACK_PACKS);
  const [selectedPack, setSelectedPack] = useState<string>("turquie");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setHostedRooms(loadHostedRooms());
  }, []);

  useEffect(() => {
    fetch(`${TRIVIAL_HTTP_URL}/packs`)
      .then((res) => res.json())
      .then((packs: TPackInfo[]) => {
        if (Array.isArray(packs) && packs.length > 0) {
          setAvailablePacks(packs);
          setSelectedPack(packs[0].id);
        }
      })
      .catch(() => {
        // Le serveur n'est pas joignable pour l'instant : on garde la liste
        // de secours (pack Turquie), l'erreur réelle apparaîtra de toute
        // façon à la tentative de connexion.
      });
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const connect = (code: string) => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Entrez votre prénom.");
      return;
    }
    if (mode === "join" && code.length !== 4) {
      setError("Le code fait 4 chiffres.");
      return;
    }
    if (TRIVIAL_SERVER_URL.includes("your-trivial-server.example.com")) {
      setError(
        "Le serveur de jeu n'est pas encore configuré : renseignez TRIVIAL_SERVER_URL dans TrivialGameScreen.tsx (ou VITE_TRIVIAL_WS_URL) avec l'URL de votre déploiement Render."
      );
      return;
    }

    setIsConnecting(true);
    setIsSocketReady(false);
    setDiceMessage("");
    const packQuery = code === "NEW" ? `?pack=${encodeURIComponent(selectedPack)}` : "";
    const ws = new WebSocket(`${TRIVIAL_SERVER_URL}/ws/${code}/${encodeURIComponent(trimmedName)}${packQuery}`);
    wsRef.current = ws;

    // Le plan gratuit Render peut mettre jusqu'à ~50s à "réveiller" le
    // service après une période d'inactivité : on affiche un message
    // rassurant avant d'abandonner, plutôt qu'une erreur prématurée.
    const slowNotice = setTimeout(() => {
      if (wsRef.current === ws && myPlayerId === null) {
        setConnectingHint("Réveil du serveur, ça peut prendre jusqu'à 50 secondes...");
      }
    }, 6000);

    const connectTimeout = setTimeout(() => {
      if (wsRef.current === ws && myPlayerId === null) {
        setError("Le serveur ne répond toujours pas après 60 secondes. Vérifiez l'URL configurée, ou réessayez.");
        setIsConnecting(false);
        setConnectingHint(null);
        ws.close();
      }
    }, 60000);

    ws.onopen = () => {
      setIsSocketReady(true);
    };

    ws.onerror = () => {
      setError("Connexion au serveur de jeu impossible. Vérifiez l'URL configurée et votre connexion Internet.");
      setIsConnecting(false);
      setIsSocketReady(false);
      setConnectingHint(null);
    };

    ws.onclose = () => {
      setIsConnecting(false);
      setIsSocketReady(false);
      setConnectingHint(null);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "joined":
          clearTimeout(connectTimeout);
          clearTimeout(slowNotice);
          setIsConnecting(false);
          setIsSocketReady(true);
          setConnectingHint(null);
          setMyPlayerId(data.player_id);
          setStep("lobby");
          break;
        case "error":
          setIsConnecting(false);
          setError(data.message);
          break;
        case "room_state": {
          const state = data as TRoomState;
          setRoom(state);
          if (state.state === "lobby") setStep("lobby");
          else if (state.state === "playing") setStep("playing");
          else if (state.state === "finished") setStep("finished");
          else if (state.state === "cancelled") setStep("cancelled");
          break;
        }
        case "moved":
          setDiceMessage(`🎲 ${data.roll}`);
          break;
        case "info":
          setDiceMessage(data.message);
          break;
        case "question":
          setQuestion(data as TQuestion);
          setSelectedChoice(null);
          setAnswerResult(null);
          break;
        case "answer_public": {
          const payload = data as TAnswerPublic;
          setAnswerResult({
            correct: payload.correct,
            chosenIndex: payload.chosen_index,
            correctIndex: payload.correct_index,
            bonusReplay: payload.bonus_replay,
          });
          setTimeout(() => {
            setQuestion(null);
            setAnswerResult(null);
          }, 1800);
          break;
        }
        default:
          break;
      }
    };
  };

  const send = (payload: Record<string, unknown>): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("Connexion perdue avec le serveur. Rejoignez à nouveau la partie.");
      return false;
    }
    ws.send(JSON.stringify(payload));
    return true;
  };

  const endGame = () => {
    if (window.confirm("Terminer la partie pour tout le monde ? Cette action est irréversible.")) {
      send({ type: "end_game" });
    }
  };

  const me = room?.players.find((p) => p.id === myPlayerId) || null;
  const isMyTurn = room?.current_player === myPlayerId;
  const currentPlayer = room?.players.find((p) => p.id === room?.current_player) || null;
  const categoryKeys = room
    ? (() => {
        const fromBoard = Array.from(new Set(room.board)).slice(0, 6);
        return fromBoard.length > 0 ? fromBoard : Object.keys(room.category_labels).slice(0, 6);
      })()
    : [];
  const categoryColors = buildCategoryColors(categoryKeys);

  useEffect(() => {
    if (!room || !me?.host) return;
    if (room.state === "cancelled" || room.state === "finished") {
      setHostedRooms(removeHostedRoom(room.code));
      return;
    }
    setHostedRooms(saveHostedRoom({ code: room.code, playerName: me.name, createdAt: Date.now() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code, room?.state, me?.host]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="relative bg-[#0F5257] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <div className="relative z-10 flex items-center justify-between mb-3">
          <button onClick={onBack} className="flex items-center gap-1 text-white/80 text-sm font-bold">
            <ChevronLeft size={18} /> Jeu
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1 text-white/80 text-sm font-bold border border-white/30 rounded-full px-3 py-1"
          >
            ❓ Règles
          </button>
        </div>
        <h1 className="relative z-10 text-2xl font-black">{room?.pack_label ?? "Trivial Turquie 🎲"}</h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          {room ? `Salon ${room.code}` : "Chacun pour soi · 2 à 5 joueurs"}
        </p>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      {step === "setup" && (
        <div className="flex-1 px-6 py-6 flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre prénom"
            maxLength={16}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
          />

          <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
            <button
              onClick={() => setMode("create")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                mode === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Créer
            </button>
            <button
              onClick={() => setMode("join")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition-colors ${
                mode === "join" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Rejoindre
            </button>
          </div>

          {mode === "join" && (
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Code à 4 chiffres"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm tracking-widest"
            />
          )}

          {mode === "create" && (
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Rubrique
              </div>
              <div className="flex flex-col gap-2">
                {availablePacks.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`text-left rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                      selectedPack === pack.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground"
                    }`}
                  >
                    {pack.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => connect(mode === "create" ? "NEW" : codeInput)}
            disabled={isConnecting}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-black active:scale-95 transition-transform disabled:opacity-60"
          >
            {isConnecting ? "Connexion..." : mode === "create" ? "Créer la partie" : "Rejoindre la partie"}
          </button>
          {connectingHint && (
            <p className="text-xs text-center font-bold" style={{ color: "#0F5257" }}>
              {connectingHint}
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Chaque joueur ouvre cet écran depuis son propre téléphone pour rejoindre le même salon.
          </p>

          {hostedRooms.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Vos parties récentes
              </div>
              <div className="flex flex-col gap-2">
                {hostedRooms.map((r) => (
                  <div
                    key={r.code}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="font-black text-sm">{r.code}</div>
                      <div className="text-xs text-muted-foreground">Créée par {r.playerName}</div>
                    </div>
                    <button
                      onClick={() => {
                        setMode("join");
                        setCodeInput(r.code);
                        connect(r.code);
                      }}
                      className="text-xs font-bold text-primary px-3 py-2 rounded-lg border border-primary"
                    >
                      Rejoindre
                    </button>
                    <button
                      onClick={() => setHostedRooms(removeHostedRoom(r.code))}
                      className="text-xs text-muted-foreground px-2"
                      aria-label="Oublier cette partie"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "lobby" && room && (
        <div className="flex-1 px-6 py-6 flex flex-col gap-4">
          <div className="text-center">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Code du salon
            </div>
            <div className="text-4xl font-black text-primary">{room.code}</div>
          </div>

          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                <div className="font-bold text-sm">
                  {p.name}
                  {p.id === myPlayerId ? " (vous)" : ""}
                </div>
                {p.host && (
                  <div className="ml-auto text-xs text-muted-foreground font-bold">Hôte</div>
                )}
              </div>
            ))}
          </div>

          {me?.host ? (
            <button
              onClick={() => {
                setError(null);
                send({ type: "start" });
              }}
              disabled={room.players.length < 2}
              className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-black active:scale-95 transition-transform disabled:opacity-40"
            >
              Lancer la partie
            </button>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              En attente que l&apos;hôte lance la partie…
            </p>
          )}
          {me?.host && (
            <button
              onClick={endGame}
              className="w-full bg-transparent border border-destructive text-destructive rounded-2xl py-3 font-bold active:scale-95 transition-transform"
            >
              Terminer la partie
            </button>
          )}
        </div>
      )}

      {step === "playing" && room && (
        <div className="flex-1 px-6 py-6 flex flex-col gap-4">
          <div className="text-center">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Au tour de
            </div>
            <div className="text-xl font-black">{currentPlayer?.name || "—"}</div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {categoryKeys.map((key) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: categoryColors[key] }} />
                {room.category_labels[key] ?? key}
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-3 h-3 rounded-full" style={{ background: p.color, opacity: p.connected ? 1 : 0.35 }} />
                <div className="font-bold text-sm">
                  {p.name}
                  {p.id === myPlayerId ? " (vous)" : ""}
                  {room.current_player === p.id ? " 👉" : ""}
                </div>
                <div className="ml-auto flex gap-1">
                  {categoryKeys.map((cat) => (
                    <div
                      key={cat}
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{
                        background: p.wedges.includes(cat) ? categoryColors[cat] : "var(--border)",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setDiceMessage("");
              setError(null);
              send({ type: "roll" });
            }}
            disabled={!isMyTurn || !isSocketReady}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-black active:scale-95 transition-transform disabled:opacity-40"
          >
            {isMyTurn ? "Lancer le dé" : "En attente…"}
          </button>
          {diceMessage && (
            <p className="text-center text-sm font-bold text-muted-foreground">{diceMessage}</p>
          )}
          {me?.host && (
            <button
              onClick={endGame}
              className="w-full bg-transparent border border-destructive text-destructive rounded-2xl py-3 font-bold active:scale-95 transition-transform mt-2"
            >
              Terminer la partie
            </button>
          )}
        </div>
      )}

      {step === "finished" && room && (
        <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="text-6xl">🏆</div>
          <h2 className="text-2xl font-black">
            {room.players.find((p) => p.id === room.winner)?.name || "Un joueur"}
          </h2>
          <p className="text-muted-foreground">a remporté {room.pack_label} !</p>
          <button
            onClick={onBack}
            className="mt-4 bg-primary text-primary-foreground rounded-2xl py-3 px-8 font-black active:scale-95 transition-transform"
          >
            Retour au jeu
          </button>
        </div>
      )}

      {step === "cancelled" && (
        <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="text-6xl">🚪</div>
          <h2 className="text-xl font-black">Partie terminée</h2>
          <p className="text-muted-foreground">
            L&apos;hôte a mis fin à la partie, ou elle a été fermée après une longue inactivité.
          </p>
          <button
            onClick={onBack}
            className="mt-4 bg-primary text-primary-foreground rounded-2xl py-3 px-8 font-black active:scale-95 transition-transform"
          >
            Retour au jeu
          </button>
        </div>
      )}

      {question && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-[420px] max-h-[85vh] overflow-y-auto bg-background rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: categoryColors[question.category] ?? "#0F5257" }}
              >
                {question.label}
                {question.final ? " · QUESTION FINALE" : ""}
              </div>
              {question.player_id !== myPlayerId && (
                <div className="text-xs font-bold text-muted-foreground">
                  👀 {room?.players.find((p) => p.id === question.player_id)?.name || "..."}
                </div>
              )}
            </div>
            <div className="text-lg font-black leading-snug">{question.question}</div>
            <div className="flex flex-col gap-2">
              {question.choices.map((choice, idx) => {
                const isCorrect = answerResult && idx === answerResult.correctIndex;
                const isChosenWrong = answerResult && idx === answerResult.chosenIndex && !answerResult.correct;
                const isMyTurnToAnswer = question.player_id === myPlayerId;
                return (
                  <button
                    key={idx}
                    disabled={!isMyTurnToAnswer || selectedChoice !== null}
                    onClick={() => {
                      setSelectedChoice(idx);
                      send({ type: "answer", choice: idx });
                    }}
                    className={`text-left rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                      isCorrect
                        ? "bg-[#e4f4ee] border-[#2a9d6f] text-[#1c6e4e]"
                        : isChosenWrong
                        ? "bg-destructive/10 border-destructive text-destructive"
                        : "bg-card border-border"
                    } ${!isMyTurnToAnswer ? "opacity-90" : ""}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {answerResult && (
              <div
                className={`text-center text-sm font-black ${
                  answerResult.correct ? "text-[#1c6e4e]" : "text-destructive"
                }`}
              >
                {answerResult.correct
                  ? answerResult.bonusReplay
                    ? "✅ Bonne réponse ! Bonus : rejoue 🎲"
                    : "✅ Bonne réponse !"
                  : "❌ Mauvaise réponse."}
              </div>
            )}
            {!answerResult && question.player_id !== myPlayerId && (
              <div className="text-center text-xs text-muted-foreground">En attente de sa réponse…</div>
            )}
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-[420px] max-h-[85vh] overflow-y-auto bg-background rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Règles du jeu</h2>
              <button
                onClick={() => setShowRules(false)}
                className="text-sm font-bold text-muted-foreground border border-border rounded-full px-3 py-1"
              >
                Fermer
              </button>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <div>
                <div className="font-black mb-1">🎯 But du jeu</div>
                <p className="text-muted-foreground">
                  Chacun pour soi, de 2 à 5 joueurs. Soyez le premier à collecter les 6 tuiles de
                  catégorie, puis à réussir une question finale pour gagner la partie.
                </p>
              </div>

              <div>
                <div className="font-black mb-1">🎲 Déroulement d'un tour</div>
                <p className="text-muted-foreground">
                  À votre tour, lancez le dé : vous avancez sur le plateau et atterrissez sur une
                  case liée à l'une des 6 catégories. Une question de cette catégorie s'affiche —
                  chez vous en version cliquable, chez les autres joueurs en lecture seule, pour
                  suivre la partie en direct.
                </p>
              </div>

              <div>
                <div className="font-black mb-1">🏅 Catégorie pas encore acquise</div>
                <p className="text-muted-foreground">
                  <strong>Bonne réponse</strong> → vous gagnez la tuile de cette catégorie, le tour
                  passe au joueur suivant.
                  <br />
                  <strong>Mauvaise réponse</strong> → pas de tuile, le tour passe au joueur suivant.
                  Vous aurez d'autres occasions d'y retomber.
                </p>
              </div>

              <div>
                <div className="font-black mb-1">🎁 Catégorie déjà acquise</div>
                <p className="text-muted-foreground">
                  Retomber sur une catégorie que vous avez déjà validée vous repose quand même une
                  question (différente de la précédente) :
                  <br />
                  <strong>Bonne réponse</strong> → bonus, vous rejouez immédiatement !
                  <br />
                  <strong>Mauvaise réponse</strong> → le tour passe normalement au joueur suivant.
                </p>
              </div>

              <div>
                <div className="font-black mb-1">🏆 Question finale</div>
                <p className="text-muted-foreground">
                  Une fois les 6 tuiles obtenues, votre prochain lancer de dé déclenche directement
                  une question finale dans une catégorie tirée au sort. Bonne réponse = victoire.
                  Mauvaise réponse = vous continuez à jouer normalement, et retenterez au prochain
                  tour.
                </p>
              </div>

              <div>
                <div className="font-black mb-1">🚪 Terminer une partie</div>
                <p className="text-muted-foreground">
                  L'hôte peut à tout moment mettre fin à la partie pour tout le monde via le bouton
                  "Terminer la partie". Une partie oubliée se ferme aussi automatiquement après un
                  moment d'inactivité.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full bg-primary text-primary-foreground rounded-2xl py-3 font-black active:scale-95 transition-transform mt-2"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
