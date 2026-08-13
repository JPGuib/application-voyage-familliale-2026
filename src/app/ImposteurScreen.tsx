import { useEffect, useRef, useState } from "react";
import { TG_SCOPED_CSS } from "./turquieGamesShared";

const IMPOSTEUR_SERVER_URL: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_TRIVIAL_WS_URL || "wss://application-voyage-familliale-2026.onrender.com";

type IPlayer = {
  id: string;
  name: string;
  host: boolean;
  connected: boolean;
  eliminated: boolean;
  has_submitted: boolean;
};

type IWord = { player_id: string; name: string; word: string };
type IEliminated = { player_id: string; name: string; round: number; was_impostor: boolean };

type IRoomState = {
  type: "room_state";
  code: string;
  state: "lobby" | "collecting_words" | "discussion" | "finished";
  round: number;
  max_rounds: number;
  players: IPlayer[];
  active_count: number;
  submitted_count: number;
  current_words: IWord[];
  all_rounds: IWord[][];
  eliminated_list: IEliminated[];
  winner: "vrais" | "imposteur" | null;
  min_players_required: number;
};

type IGameOver = {
  type: "game_over";
  winner: "vrais" | "imposteur" | null;
  impostor_id: string;
  impostor_name: string;
  mot_vrai: string;
  mot_faux: string;
};

export function ImposteurScreen({
  defaultPlayerName,
  onBack,
}: {
  defaultPlayerName: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"setup" | "lobby" | "role" | "playing" | "finished">("setup");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(defaultPlayerName || "");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingHint, setConnectingHint] = useState<string | null>(null);
  const [room, setRoom] = useState<IRoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<{ is_impostor: boolean; mot: string } | null>(null);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [mySubmittedWord, setMySubmittedWord] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<IGameOver | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stepRef = useRef(step);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => () => { wsRef.current?.close(); }, []);

  // Reset word input at the start of each new collection round
  useEffect(() => {
    if (room?.state === "collecting_words") {
      setMySubmittedWord(null);
      setWordInput("");
    }
  }, [room?.round, room?.state]);

  // Step transitions driven by server room state (avoids stale closure in onmessage)
  useEffect(() => {
    if (!room) return;
    if (room.state === "lobby" && (stepRef.current === "playing" || stepRef.current === "finished" || stepRef.current === "role")) {
      setMyRole(null);
      setRoleRevealed(false);
      setWordInput("");
      setMySubmittedWord(null);
      setGameOver(null);
      setStep("lobby");
    } else if (room.state === "collecting_words" && stepRef.current !== "role") {
      setStep("playing");
    } else if (room.state === "discussion") {
      setStep("playing");
    } else if (room.state === "finished") {
      setStep("finished");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.state]);

  const connect = (code: string) => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Entrez votre prénom."); return; }
    if (mode === "join" && code.length !== 4) { setError("Le code fait 4 chiffres."); return; }
    setIsConnecting(true);
    const ws = new WebSocket(
      `${IMPOSTEUR_SERVER_URL}/ws/imposteur/${code}/${encodeURIComponent(trimmedName)}`
    );
    wsRef.current = ws;

    const slowNotice = setTimeout(() => {
      if (wsRef.current === ws) setConnectingHint("Réveil du serveur, ça peut prendre jusqu'à 50 secondes…");
    }, 6000);
    const connectTimeout = setTimeout(() => {
      if (wsRef.current === ws) {
        setError("Le serveur ne répond pas après 60 secondes. Réessayez.");
        setIsConnecting(false);
        setConnectingHint(null);
        ws.close();
      }
    }, 60000);

    ws.onerror = () => { setError("Connexion impossible. Vérifiez votre connexion Internet."); setIsConnecting(false); setConnectingHint(null); };
    ws.onclose = () => { setIsConnecting(false); setConnectingHint(null); };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      switch (data.type) {
        case "joined":
          clearTimeout(connectTimeout); clearTimeout(slowNotice);
          setIsConnecting(false); setConnectingHint(null);
          setMyPlayerId(data.player_id as string);
          setStep("lobby");
          break;
        case "error":
          setIsConnecting(false);
          setError(data.message as string);
          break;
        case "room_state":
          setRoom(data as IRoomState);
          break;
        case "role_assignment":
          setMyRole({ is_impostor: data.is_impostor as boolean, mot: data.mot as string });
          setRoleRevealed(false);
          setStep("role");
          break;
        case "game_over":
          setGameOver(data as IGameOver);
          break;
        default: break;
      }
    };
  };

  const send = (payload: Record<string, unknown>) => wsRef.current?.send(JSON.stringify(payload));

  const startGame = () => {
    setError(null);
    send({ type: "start_game" });
  };

  const submitWord = () => {
    const w = wordInput.trim();
    if (!w || mySubmittedWord) return;
    send({ type: "submit_word", word: w });
    setMySubmittedWord(w);
  };

  const me = room?.players.find((p) => p.id === myPlayerId) ?? null;
  const isHost = me?.host ?? false;
  const isEliminated = me?.eliminated ?? false;
  const tableCode = room?.code ?? null;

  return (
    <div className="w-full h-full">
      <style>{TG_SCOPED_CSS}</style>
      <div className="tg-root">

        {/* ── SETUP ── */}
        {step === "setup" && (
          <div className="tg-screen tg-active">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button className="tg-btn tg-btn-secondary" style={{ width: "auto", padding: "8px 14px", minHeight: 38 }} onClick={onBack}>
                ← Retour
              </button>
              <h1 style={{ margin: 0, fontSize: "1.25rem" }}>🎭 L'Imposteur</h1>
            </div>
            <p>Multijoueur · Chacun son téléphone · Min. 4 joueurs</p>
            {error && <div style={{ background: "rgba(255,107,107,0.15)", border: "1px solid var(--tg-danger)", borderRadius: 12, padding: "10px 14px", color: "var(--tg-danger)", fontSize: "0.88rem", marginBottom: 10 }}>{error}</div>}
            <div className="tg-card">
              <h2>👤 Votre prénom</h2>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prénom" autoComplete="off" />
            </div>
            <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
              <button className={`tg-btn ${mode === "create" ? "" : "tg-btn-outline"}`} style={{ flex: 1, padding: "12px 8px", minHeight: 44 }} onClick={() => setMode("create")}>
                ➕ Créer
              </button>
              <button className={`tg-btn ${mode === "join" ? "" : "tg-btn-outline"}`} style={{ flex: 1, padding: "12px 8px", minHeight: 44 }} onClick={() => setMode("join")}>
                🚪 Rejoindre
              </button>
            </div>
            {mode === "join" && (
              <div className="tg-card">
                <h2>🔢 Code de la table</h2>
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  inputMode="numeric"
                  maxLength={4}
                  style={{ textAlign: "center", fontSize: "2rem", letterSpacing: "0.4em" }}
                />
              </div>
            )}
            <div className="tg-spacer" />
            <button className="tg-btn" disabled={isConnecting} onClick={() => connect(mode === "create" ? "NEW" : codeInput)}>
              {isConnecting ? "⏳ Connexion…" : mode === "create" ? "🎭 Créer la table" : "🚪 Rejoindre la table"}
            </button>
            {connectingHint && <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--tg-text-muted)", marginTop: 8 }}>{connectingHint}</p>}
          </div>
        )}

        {/* ── LOBBY ── */}
        {step === "lobby" && room && (
          <div className="tg-screen tg-active">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button className="tg-btn tg-btn-secondary" style={{ width: "auto", padding: "8px 14px", minHeight: 38 }} onClick={onBack}>
                ← Quitter
              </button>
              <h1 style={{ margin: 0, fontSize: "1.25rem" }}>🎭 L'Imposteur</h1>
            </div>
            {error && <div style={{ background: "rgba(255,107,107,0.15)", border: "1px solid var(--tg-danger)", borderRadius: 12, padding: "10px 14px", color: "var(--tg-danger)", fontSize: "0.88rem", marginBottom: 10 }}>{error}</div>}
            <div className="tg-card" style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.82rem", color: "var(--tg-text-muted)" }}>Numéro de table</p>
              <div style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "0.3em", color: "var(--tg-accent)" }}>{room.code}</div>
              <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "var(--tg-text-muted)" }}>Communiquez ce code aux autres joueurs</p>
            </div>
            <h2 style={{ marginTop: 18 }}>👥 Joueurs ({room.players.length}/{room.min_players_required} min.)</h2>
            {room.players.map((p) => (
              <div key={p.id} className="tg-card" style={{ padding: "11px 15px", margin: "5px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: "1.1rem" }}>{p.connected ? "🟢" : "🔴"}</div>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                {p.host && <span style={{ fontSize: "0.7rem", color: "var(--tg-accent)", marginLeft: "auto" }}>ANIMATEUR</span>}
                {p.id === myPlayerId && <span style={{ fontSize: "0.7rem", color: "var(--tg-text-muted)", marginLeft: p.host ? 0 : "auto" }}>MOI</span>}
              </div>
            ))}
            {isHost && (
              <>
                <div className="tg-card" style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--tg-text-muted)" }}>🎲 Un thème sera tiré au sort automatiquement au démarrage.</p>
                </div>
              </>
            )}
            <div className="tg-spacer" />
            {isHost ? (
              <button className="tg-btn" disabled={room.players.length < room.min_players_required} onClick={startGame}>
                {room.players.length < room.min_players_required
                  ? `⏳ En attente (${room.players.length}/${room.min_players_required} joueurs)`
                  : "🎭 Démarrer la partie"}
              </button>
            ) : (
              <div className="tg-card" style={{ textAlign: "center" }}>
                <p style={{ margin: 0, color: "var(--tg-text-muted)" }}>⏳ En attente que l'animateur lance la partie…</p>
              </div>
            )}
          </div>
        )}

        {/* ── ROLE REVEAL ── */}
        {step === "role" && myRole && (
          <div className="tg-screen tg-active" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            {tableCode && (
              <div
                className="tg-card"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  textAlign: "center",
                  padding: "10px 14px",
                  marginBottom: 12,
                }}
              >
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--tg-text-muted)" }}>Table</p>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "0.2em", color: "var(--tg-accent)" }}>{tableCode}</div>
              </div>
            )}
            {!roleRevealed ? (
              <>
                <div style={{ fontSize: "3.5rem", marginBottom: 18 }}>🔒</div>
                <h2 style={{ fontSize: "1.5rem" }}>Votre rôle secret</h2>
                <p>Assurez-vous d'être seul(e) à regarder votre écran avant de continuer.</p>
                <button className="tg-btn" onClick={() => setRoleRevealed(true)} style={{ marginTop: 16, maxWidth: 260 }}>
                  👁️ Voir mon rôle
                </button>
              </>
            ) : (
              <>
                <div className="tg-card" style={{ width: "100%", maxWidth: 320, padding: "28px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>{myRole.is_impostor ? "🎭" : "🧿"}</div>
                  <h1 style={{ fontSize: "1.4rem", marginBottom: 10 }}>
                    {myRole.is_impostor ? "Vous êtes l'Imposteur !" : "Vous êtes un Vrai !"}
                  </h1>
                  <p style={{ fontSize: "0.9rem" }}>
                    {myRole.is_impostor
                      ? myRole.mot ? "Vous avez un mot de remplacement. Bluffez !" : "Vous ne connaissez pas le vrai mot. Bluffez !"
                      : "Vous connaissez le vrai mot. Trouvez l'imposteur !"}
                  </p>
                  <div style={{ fontSize: myRole.is_impostor && !myRole.mot ? "2.8rem" : "2.2rem", fontWeight: 800, color: "var(--tg-accent)", marginTop: 18 }}>
                    {myRole.mot || "❓"}
                  </div>
                </div>
                <button className="tg-btn" onClick={() => setStep("playing")} style={{ marginTop: 28, maxWidth: 260 }}>
                  J'ai mémorisé ✓
                </button>
              </>
            )}
          </div>
        )}

        {/* ── PLAYING ── */}
        {step === "playing" && room && (
          <div className="tg-screen tg-active">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: "0.72rem", color: "var(--tg-text-muted)" }}>
                  Table <strong style={{ color: "var(--tg-accent)", letterSpacing: "0.12em" }}>{room.code}</strong>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--tg-text-muted)" }}>
                  Tour <strong style={{ color: "var(--tg-accent)" }}>{room.round}</strong>/{room.max_rounds}
                </div>
              </div>
              {isHost && (
                <button
                  onClick={() => { if (window.confirm("Terminer la partie pour tout le monde ?")) send({ type: "end_game" }); }}
                  style={{ background: "transparent", border: "1px solid rgba(255,107,107,0.4)", color: "var(--tg-danger)", borderRadius: 20, padding: "4px 12px", fontSize: "0.78rem", cursor: "pointer" }}
                >
                  Arrêter
                </button>
              )}
            </div>
            {error && <div style={{ background: "rgba(255,107,107,0.15)", border: "1px solid var(--tg-danger)", borderRadius: 12, padding: "10px 14px", color: "var(--tg-danger)", fontSize: "0.88rem", marginBottom: 10 }}>{error}</div>}

            {room.state === "collecting_words" && (
              <>
                <h1>Tour {room.round} · Votre mot</h1>
                <div className="tg-card" style={{ textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--tg-text-muted)", marginBottom: 4 }}>Votre mot secret</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--tg-accent)" }}>{myRole?.mot || "❓"}</div>
                </div>
                <div className="tg-card" style={{ textAlign: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--tg-text-muted)", marginBottom: 6 }}>Mots soumis</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{room.submitted_count} / {room.active_count}</div>
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                    {room.players.filter((p) => !p.eliminated).map((p) => (
                      <div key={p.id} title={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.has_submitted ? "var(--tg-success)" : p.id === myPlayerId ? "var(--tg-accent)" : "rgba(255,255,255,0.25)", transition: "background 0.3s" }} />
                        <span style={{ fontSize: "0.6rem", color: "var(--tg-text-muted)" }}>{p.name.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {isEliminated ? (
                  <div className="tg-card" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>💀</div>
                    <p style={{ margin: 0 }}>Vous avez été éliminé(e). Observez la suite !</p>
                  </div>
                ) : mySubmittedWord ? (
                  <div className="tg-card" style={{ textAlign: "center", borderColor: "var(--tg-success)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
                    <p style={{ margin: 0, color: "var(--tg-success)" }}>«{mySubmittedWord}» envoyé — en attente des autres…</p>
                  </div>
                ) : (
                  <>
                    <input value={wordInput} onChange={(e) => setWordInput(e.target.value)} placeholder="Votre mot lié au thème…" maxLength={30} autoComplete="off" onKeyDown={(e) => e.key === "Enter" && submitWord()} />
                    <div className="tg-spacer" />
                    <button className="tg-btn" onClick={submitWord} disabled={!wordInput.trim()}>Envoyer mon mot →</button>
                  </>
                )}
                <h2 style={{ marginTop: 20, fontSize: "0.88rem" }}>Joueurs</h2>
                {room.players.map((p) => (
                  <div key={p.id} className="tg-card" style={{ padding: "9px 14px", margin: "4px 0", display: "flex", alignItems: "center", gap: 8, opacity: p.eliminated ? 0.4 : 1 }}>
                    <span style={{ fontSize: "0.95rem" }}>{p.eliminated ? "💀" : p.connected ? "🟢" : "🔴"}</span>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</span>
                    {p.id === myPlayerId && <span style={{ fontSize: "0.7rem", color: "var(--tg-text-muted)", marginLeft: "auto" }}>MOI</span>}
                    {p.host && !p.eliminated && <span style={{ fontSize: "0.7rem", color: "var(--tg-accent)", marginLeft: p.id === myPlayerId ? 0 : "auto" }}>ANIMATEUR</span>}
                    {!p.eliminated && p.has_submitted && <span style={{ fontSize: "0.75rem", color: "var(--tg-success)", marginLeft: "auto" }}>✓</span>}
                  </div>
                ))}
              </>
            )}

            {room.state === "discussion" && (
              <>
                <h1>📝 Mots du Tour {room.round}</h1>
                <div style={{ margin: "10px 0" }}>
                  {room.current_words.map((item, i) => (
                    <div key={i} className="tg-word-slot">
                      <div style={{ fontSize: "0.78rem", color: "var(--tg-text-muted)", marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{item.word}</div>
                    </div>
                  ))}
                </div>
                <div className="tg-card" style={{ background: "rgba(0,0,0,0.3)", marginBottom: 14, textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>💬 Discutez entre vous. Qui est l'imposteur ?</p>
                </div>
                {isHost ? (
                  <>
                    <h2 style={{ fontSize: "0.95rem" }}>🗳️ Choisissez qui éliminer :</h2>
                    <div className="tg-vote-grid">
                      {room.players.filter((p) => !p.eliminated).map((p) => (
                        <div key={p.id} className="tg-vote-card" onClick={() => { if (window.confirm(`Éliminer ${p.name} ?`)) send({ type: "eliminate_player", player_id: p.id }); }}>
                          <div style={{ fontSize: "2rem", marginBottom: 6 }}>{p.id === myPlayerId ? "👑" : "👤"}</div>
                          <strong style={{ fontSize: "0.9rem" }}>{p.name}</strong>
                          {p.id === myPlayerId && <div style={{ fontSize: "0.65rem", color: "var(--tg-text-muted)", marginTop: 2 }}>moi</div>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="tg-card" style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, color: "var(--tg-text-muted)" }}>⏳ En attente de l'animateur pour désigner le suspect…</p>
                  </div>
                )}
                {room.eliminated_list.length > 0 && (
                  <>
                    <h2 style={{ marginTop: 18, fontSize: "0.85rem" }}>💀 Déjà éliminés</h2>
                    {room.eliminated_list.map((e, i) => (
                      <div key={i} className="tg-card" style={{ padding: "8px 14px", margin: "4px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.9rem" }}>{e.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--tg-text-muted)" }}>Tour {e.round}</span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── FINISHED ── */}
        {step === "finished" && room && (
          <div className="tg-screen tg-active">
            <div className="tg-flex-center" style={{ textAlign: "center" }}>
              <div className="tg-card" style={{ width: "100%", textAlign: "center", padding: "10px 14px", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--tg-text-muted)" }}>Table</p>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "0.2em", color: "var(--tg-accent)" }}>{room.code}</div>
              </div>
              {gameOver ? (
                <>
                  <h1 className={gameOver.winner === "vrais" ? "tg-result-win" : "tg-result-lose"} style={{ fontSize: "2rem", marginBottom: 14 }}>
                    {gameOver.winner === "vrais" ? "🎉 Les Vrais gagnent !" : gameOver.winner === "imposteur" ? "🎭 L'Imposteur gagne !" : "Partie terminée"}
                  </h1>
                  <div className="tg-card" style={{ textAlign: "center", borderColor: gameOver.winner === "vrais" ? "var(--tg-success)" : "var(--tg-danger)", width: "100%", marginBottom: 18 }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>{gameOver.winner === "vrais" ? "🧿" : "🎭"}</div>
                    <p style={{ marginBottom: 4, fontSize: "0.95rem" }}>L'imposteur était</p>
                    <p style={{ fontSize: "1.3rem", fontWeight: 700, color: gameOver.winner === "vrais" ? "var(--tg-success)" : "var(--tg-danger)", marginBottom: 12 }}>{gameOver.impostor_name}</p>
                    <p style={{ margin: 0, color: "var(--tg-text-muted)", fontSize: "0.9rem" }}>
                      Mot vrai : <strong style={{ color: "var(--tg-text)" }}>{gameOver.mot_vrai}</strong>
                    </p>
                    {gameOver.mot_faux && (
                      <p style={{ margin: "4px 0 0", color: "var(--tg-text-muted)", fontSize: "0.9rem" }}>
                        Mot imposteur : <strong style={{ color: "var(--tg-text)" }}>{gameOver.mot_faux}</strong>
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <h1 style={{ marginBottom: 18 }}>Partie terminée</h1>
              )}

              {room.all_rounds.length > 0 && (
                <>
                  <h2 style={{ fontSize: "0.95rem", marginBottom: 8, width: "100%", textAlign: "left" }}>📝 Récap des mots</h2>
                  {room.all_rounds.map((roundWords, t) => (
                    <div key={t} style={{ width: "100%", marginBottom: 12 }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--tg-text-muted)", marginBottom: 6 }}>Tour {t + 1}</div>
                      {roundWords.map((item, i) => {
                        const wasImpostor = gameOver?.impostor_id === item.player_id;
                        return (
                          <div key={i} className="tg-word-slot" style={{ borderLeft: `3px solid ${wasImpostor ? "var(--tg-danger)" : "var(--tg-success)"}`, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span><strong>{item.name}</strong> : {item.word}</span>
                            {wasImpostor && <span style={{ fontSize: "0.7rem", color: "var(--tg-danger)" }}>🎭</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {room.eliminated_list.length > 0 && (
                <>
                  <h2 style={{ fontSize: "0.95rem", marginBottom: 8, width: "100%", textAlign: "left" }}>💀 Joueurs éliminés</h2>
                  {room.eliminated_list.map((e, i) => (
                    <div key={i} className="tg-card" style={{ padding: "10px 14px", margin: "4px 0", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${e.was_impostor ? "var(--tg-danger)" : "rgba(255,255,255,0.1)"}` }}>
                      <span>{e.name} {e.was_impostor ? "🎭" : ""}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--tg-text-muted)" }}>Tour {e.round}</span>
                    </div>
                  ))}
                </>
              )}

              <div className="tg-spacer" />
              {isHost && (
                <button className="tg-btn" onClick={() => send({ type: "play_again" })} style={{ maxWidth: 280 }}>
                  🔄 Rejouer dans ce salon
                </button>
              )}
              <button className="tg-btn tg-btn-secondary" onClick={onBack} style={{ maxWidth: 280, marginTop: 8 }}>
                🏠 Retour aux Jeux
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
