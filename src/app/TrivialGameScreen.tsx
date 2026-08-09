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
 * ⚠️ À CONFIGURER avant mise en prod : le serveur doit être hébergé quelque part
 * d'accessible en HTTPS (Render, Fly.io, Railway...) pour pouvoir ouvrir une
 * connexion "wss://" depuis l'application, servie elle-même en HTTPS — un
 * navigateur mobile bloque les connexions "ws://" non sécurisées depuis une
 * page HTTPS (contenu mixte). Renseignez l'URL ci-dessous, ou définissez la
 * variable d'environnement Vite VITE_TRIVIAL_WS_URL.
 */
const TRIVIAL_SERVER_URL: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_TRIVIAL_WS_URL || "wss://your-trivial-server.example.com";

const CATEGORY_COLORS: Record<string, string> = {
  histoire: "#0F5257",
  gastronomie: "#C1442D",
  langue: "#D9A441",
  geographie: "#2AA9A2",
  culture: "#8B5FA3",
  souvenirs: "#3D5A73",
};

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
  state: "lobby" | "playing" | "finished";
  board: string[];
  category_labels: Record<string, string>;
  players: TPlayer[];
  current_player: string | null;
  winner: string | null;
};

type TQuestion = {
  type: "question";
  category: string;
  label: string;
  question: string;
  choices: string[];
  final: boolean;
};

type TAnswerResult = {
  type: "answer_result";
  correct: boolean;
  answer: number;
};

export function TrivialGameScreen({
  defaultPlayerName,
  onBack,
}: {
  defaultPlayerName: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"setup" | "lobby" | "playing" | "finished">("setup");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(defaultPlayerName || "");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<TRoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [question, setQuestion] = useState<TQuestion | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<TAnswerResult | null>(null);
  const [diceMessage, setDiceMessage] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

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

    const ws = new WebSocket(`${TRIVIAL_SERVER_URL}/ws/${code}/${encodeURIComponent(trimmedName)}`);
    wsRef.current = ws;

    ws.onerror = () => {
      setError("Connexion au serveur de jeu impossible. Réessayez dans un instant.");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "joined":
          setMyPlayerId(data.player_id);
          setStep("lobby");
          break;
        case "error":
          setError(data.message);
          break;
        case "room_state": {
          const state = data as TRoomState;
          setRoom(state);
          if (state.state === "lobby") setStep("lobby");
          else if (state.state === "playing") setStep("playing");
          else if (state.state === "finished") setStep("finished");
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
        case "answer_result":
          setAnswerResult(data as TAnswerResult);
          setTimeout(() => {
            setQuestion(null);
            setAnswerResult(null);
          }, 1600);
          break;
        default:
          break;
      }
    };
  };

  const send = (payload: Record<string, unknown>) => {
    wsRef.current?.send(JSON.stringify(payload));
  };

  const me = room?.players.find((p) => p.id === myPlayerId) || null;
  const isMyTurn = room?.current_player === myPlayerId;
  const currentPlayer = room?.players.find((p) => p.id === room?.current_player) || null;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="relative bg-[#0F5257] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Jeu
        </button>
        <h1 className="relative z-10 text-2xl font-black">Trivial Turquie 🎲</h1>
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

          <button
            onClick={() => connect(mode === "create" ? "NEW" : codeInput)}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-black active:scale-95 transition-transform"
          >
            {mode === "create" ? "Créer la partie" : "Rejoindre la partie"}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Chaque joueur ouvre cet écran depuis son propre téléphone pour rejoindre le même salon.
          </p>
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
              onClick={() => send({ type: "start" })}
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
            {Object.entries(room.category_labels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[key] }} />
                {label}
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
                  {Object.keys(room.category_labels).map((cat) => (
                    <div
                      key={cat}
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{
                        background: p.wedges.includes(cat) ? CATEGORY_COLORS[cat] : "var(--border)",
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
              send({ type: "roll" });
            }}
            disabled={!isMyTurn}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-black active:scale-95 transition-transform disabled:opacity-40"
          >
            {isMyTurn ? "Lancer le dé" : "En attente…"}
          </button>
          {diceMessage && (
            <p className="text-center text-sm font-bold text-muted-foreground">{diceMessage}</p>
          )}
        </div>
      )}

      {step === "finished" && room && (
        <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center text-center gap-3">
          <div className="text-6xl">🏆</div>
          <h2 className="text-2xl font-black">
            {room.players.find((p) => p.id === room.winner)?.name || "Un joueur"}
          </h2>
          <p className="text-muted-foreground">a remporté le Trivial Turquie !</p>
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
          <div className="w-full max-w-[420px] bg-background rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl">
            <div
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: CATEGORY_COLORS[question.category] }}
            >
              {question.label}
              {question.final ? " · QUESTION FINALE" : ""}
            </div>
            <div className="text-lg font-black leading-snug">{question.question}</div>
            <div className="flex flex-col gap-2">
              {question.choices.map((choice, idx) => {
                const isCorrect = answerResult && idx === answerResult.answer;
                const isWrongSelected =
                  answerResult && idx === selectedChoice && !answerResult.correct && idx !== answerResult.answer;
                return (
                  <button
                    key={idx}
                    disabled={selectedChoice !== null}
                    onClick={() => {
                      setSelectedChoice(idx);
                      send({ type: "answer", choice: idx });
                    }}
                    className={`text-left rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                      isCorrect
                        ? "bg-[#e4f4ee] border-[#2a9d6f] text-[#1c6e4e]"
                        : isWrongSelected
                        ? "bg-destructive/10 border-destructive text-destructive"
                        : "bg-card border-border"
                    }`}
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
                {answerResult.correct ? "Bonne réponse !" : "Raté cette fois-ci."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
