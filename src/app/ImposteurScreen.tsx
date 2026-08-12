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

const PRESET_PAIRS = [
  { vrai: "Cappadoce", faux: "DÃ©sert" },
  { vrai: "Bosphore", faux: "Fleuve" },
  { vrai: "Baklava", faux: "Chocolat" },
  { vrai: "Istanbul", faux: "Paris" },
  { vrai: "Hammam", faux: "Sauna" },
  { vrai: "Turquoise", faux: "Bleu" },
  { vrai: "Tapis", faux: "Parquet" },
  { vrai: "Derviche", faux: "Danseur" },
];

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
  const [motVrai, setMotVrai] = useState("Cappadoce");
  const [motFaux, setMotFaux] = useState("DÃ©sert");
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
    if (!trimmedName) { setError("Entrez votre prÃ©nom."); return; }
    if (mode === "join" && code.length !== 4) { setError("Le code fait 4 chiffres."); return; }
    setIsConnecting(true);
    const ws = new WebSocket(
      `${IMPOSTEUR_SERVER_URL}/ws/imposteur/${code}/${encodeURIComponent(trimmedName)}`
    );
    wsRef.current = ws;

    const slowNotice = setTimeout(() => {
      if (wsRef.current === ws) setConnectingHint("RÃ©veil du serveur, Ã§a peut prendre jusqu'Ã  50 secondesâ€¦");
    }, 6000);
    const connectTimeout = setTimeout(() => {
      if (wsRef.current === ws) {
        setError("Le serveur ne rÃ©pond pas aprÃ¨s 60 secondes. RÃ©essayez.");
        setIsConnecting(false);
        setConnectingHint(null);
        ws.close();
      }
    }, 60000);

    ws.onerror = () => { setError("Connexion impossible. VÃ©rifiez votre connexion Internet."); setIsConnecting(false); setConnectingHint(null); };
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
    if (!motVrai.trim()) { setError("Le mot vrai est obligatoire."); return; }
    setError(null);
    send({ type: "start_game", mot_vrai: motVrai.trim(), mot_faux: motFaux.trim() });
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

  return (
    <div className="w-full h-full">
      <style>{TG_SCOPED_CSS}</style>
      <div className="tg-root">

        {/* â”€â”€ SETUP â”€â”€ */}
        {step === "setup" && (
          <div className="tg-screen tg-active">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button className="tg-btn tg-btn-secondary" style={{ width: "auto", padding: "8px 14px", minHeight: 38 }} onClick={onBack}>
                â† Retour
              </button>
              <h1 style={{ margin: 0, fontSize: "1.25rem" }}>ðŸŽ­ L'Imposteur</h1>
            </div>
            <p>Multijoueur Â· Chacun son tÃ©lÃ©phone Â· Min. 4 joueurs</p>
            {error && <div style={{ background: "rgba(255,107,107,0.15)", border: "1px solid var(--tg-danger)", borderRadius: 12, padding: "10px 14px", color: "var(--tg-danger)", fontSize: "0.88rem", marginBottom: 10 }}>{error}</div>}
            <div className="tg-card">
              <h2>ðŸ‘¤ Votre prÃ©nom</h2>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre prÃ©nom" autoComplete="off" />
            </div>
            <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
              <button className={`tg-btn ${mode === "create" ? "" : "tg-btn-outline"}`} style={{ flex: 1, padding: "12px 8px", minHeight: 44 }} onClick={() => setMode("create")}>
                âž• CrÃ©er
              </button>
              <button className={`tg-btn ${mode === "join" ? "" : "tg-btn-outline"}`} style={{ flex: 1, padding: "12px 8px", minHeight: 44 }} onClick={() => setMode("join")}>
                ðŸšª Rejoindre
              </button>
            </div>
            {mode === "join" && (
              <div className="tg-card">
                <h2>ðŸ”¢ Code de la table</h2>
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
              {isConnecting ? "â³ Connexionâ€¦" : mode === "create" ? "ðŸŽ­ CrÃ©er la table" : "ðŸšª Rejoindre la table"}
            </button>
            {connectingHint && <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--tg-text-muted)", marginTop: 8 }}>{connectingHint}</p>}
          </div>
        )}

        {/* â”€â”€ LOBBY â”€â”€ */}
        {step === "lobby" && room && (
          <div className="tg-screen tg-active">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button className="tg-btn tg-btn-secondary" style={{ width: "auto", padding: "8px 14px", minHeight: 38 }} onClick={onBack}>
                â† Quitter
              </button>
              <h1 style={{ margin: 0, fontSize: "1.25rem" }}>ðŸŽ­ L'Imposteur</h1>
            </div>
            {error && <div style={{ background: "rgba(255,107,107,0.15)", border: "1px solid var(--tg-danger)", borderRadius: 12, padding: "10px 14px", color: "var(--tg-danger)", fontSize: "0.88rem", marginBottom: 10 }}>{error}</div>}
            <div className="tg-card" style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.82rem", color: "var(--tg-text-muted)" }}>NumÃ©ro de table</p>
              <div style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "0.3em", color: "var(--tg-accent)" }}>{room.code}</div>
              <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "var(--tg-text-muted)" }}>Communiquez ce code aux autres joueurs</p>
            </div>
            <h2 style={{ marginTop: 18 }}>ðŸ‘¥ Joueurs ({room.players.length}/{room.min_players_required} min.)</h2>
            {room.players.map((p) => (
              <div key={p.id} className="tg-card" style={{ padding: "11px 15px", margin: "5px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: "1.1rem" }}>{p.connected ? "ðŸŸ¢" : "ðŸ”´"}</div>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                {p.host && <span style={{ fontSize: "0.7rem", color: "var(--tg-accent)", marginLeft: "auto" }}>ANIMATEUR</span>}
                {p.id === myPlayerId && <span style={{ fontSize: "0.7rem", color: "var(--tg-text-muted)", marginLeft: p.host ? 0 : "auto" }}>MOI</span>}
              </div>
            ))}
            {isHost && (
              <>
                <h2 style={{ marginTop: 20 }}>ðŸ“ Mots du jeu</h2>
                <div className="tg-card">
                  <p style={{ margin: "0 0 10px", fontSize: "0.85rem" }}>Choisissez un thÃ¨me ou entrez vos propres mots :</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {PRESET_PAIRS.map((pair) => (
                      <button
                        key={pair.vrai}
                        onClick={() => { setMotVrai(pair.vrai); setMotFaux(pair.faux); setError(null); }}
                        style={{
                          padding: "5px 10px", borderRadius: 20,
                          border: `1px solid ${motVrai === pair.vrai ? "var(--tg-accent)" : "rgba(255,255,255,0.15)"}`,
                          background: motVrai === pair.vrai ? "rgba(232,212,77,0.15)" : "transparent",
                          color: motVrai === pair.vrai ? "var(--tg-accent)" : "var(--tg-text-muted)",
                          fontSize: "0.78rem", cursor: "pointer",
                        }}
                      >
                        {pair.vrai}
                      </button>
                    ))}
                  </div>
                  <input value={motVrai} onChange={(e) => setMotVrai(e.target.value)} placeholder="Mot vrai (ex : Cappadoce)" />
                  <input value={motFaux} onChange={(e) => setMotFaux(e.target.value)} placeholder="Mot imposteur (optionnel)" />
                  <p style={{ fontSize: "0.78rem", margin: "4px 0 0", color: "var(--tg-text-muted)" }}>
                    Laissez vide pour que l'imposteur n'ait aucun mot.
                  </p>
                </div>
              </>
            )}
            <div className="tg-spacer" />
            {isHost ? (
              <button className="tg-btn" disabled={room.players.length < room.min_players_required} onClick={startGame}>
                {room.players.length < room.min_players_required
                  ? `â³ En attente (${room.players.length}/${room.min_players_required} joueurs)`
                  : "ðŸŽ­ DÃ©marrer la partie"}
              </button>
            ) : (
              <div className="tg-card" style={{ textAlign: "center" }}>
                <p style={{ margin: 0, color: "var(--tg-text-muted)" }}>â³ En attente que l'animateur lance la partieâ€¦</p>
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ ROLE REVEAL â”€â”€ */}
        {step === "role" && myRole && (
          <div className="tg-screen tg-active" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            {!roleRevealed ? (
              <>
                <div style={{ fontSize: "3.5rem", marginBottom: 18 }}>ðŸ”’</div>
                <h2 style={{ fontSize: "1.5rem" }}>Votre rÃ´le secret</h2>
                <p>Assurez-vous d'Ãªtre seul(e) Ã  regarder votre Ã©cran avant de continuer.</p>
                <button className="tg-btn" onClick={() => setRoleRevealed(true)} style={{ marginTop: 16, maxWidth: 260 }}>
                  ðŸ‘ï¸ Voir mon rÃ´le
                </button>
              </>
            ) : (
              <>
                <div className="tg-card" style={{ width: "100%", maxWidth: 320, padding: "28px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>{myRole.is_impostor ? "ðŸŽ­" : "ðŸ§¿"}</div>
                  <h1 style={{ fontSize: "1.4rem", marginBottom: 10 }}>
                    {myRole.is_impostor ? "Vous Ãªtes l'Imposteur !" : "Vous Ãªtes un Vrai !"}
                  </h1>
                  <p style={{ fontSize: "0.9rem" }}>
                    {myRole.is_impostor
                      ? myRole.mot ? "Vous avez un mot de remplacement. Bluffez !" : "Vous ne connaissez pas le vrai mot. Bluffez !"
                      : "Vous connaissez le vrai mot. Trouvez l'imposteur !"}
                  </p>
                  <div style={{ fontSize: myRole.is_impostor && !myRole.mot ? "2.8rem" : "2.2rem", fontWeight: 800, color: "var(--tg-accent)", marginTop: 18 }}>
                    {myRole.mot || "â“"}
                  </div>
                </div>
                <button className="tg-btn" onClick={() => setStep("playing")} style={{ marginTop: 28, maxWidth: 260 }}>
                  J'ai mÃ©morisÃ© âœ“
                </button>
              </>
            )}
          </div>
        )}

        {/* â”€â”€ PLAYING â”€â”€ */}
        {step === "playing" && room && (
          <div className="tg-screen tg-active">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: "0.85rem", color: "var(--tg-text-muted)" }}>
                Tour <strong style={{ color: "var(--tg-accent)" }}>{room.round}</strong>/{room.max_rounds}
              </div>
              {isHost && (
                <button
                  onClick={() => { if (window.confirm("Terminer la partie pour tout le monde ?")) send({ type: "end_game" }); }}
                  style={{ background: "transparent", border: "1px solid rgba(255,107,107,0.4)", color: "var(--tg-danger)", borderRadius: 20, padding: "4px 12px", fontSize: "0.78rem", cursor: "pointer" }}
                >
                  ArrÃªter
                </button>
              )}
            </div>
            {error && <div style={{ background: "rgba(255,107,107,0.15)", border: "1px solid var(--tg-danger)", borderRadius: 12, padding: "10px 14px", color: "var(--tg-danger)", fontSize: "0.88rem", marginBottom: 10 }}>{error}</div>}

            {room.state === "collecting_words" && (
              <>
                <h1>Tour {room.round} Â· Votre mot</h1>
                <div className="tg-card" style={{ textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--tg-text-muted)", marginBottom: 4 }}>Votre mot secret</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--tg-accent)" }}>{myRole?.mot || "â“"}</div>
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
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>ðŸ’€</div>
                    <p style={{ margin: 0 }}>Vous avez Ã©tÃ© Ã©liminÃ©(e). Observez la suite !</p>
                  </div>
                ) : mySubmittedWord ? (
                  <div className="tg-card" style={{ textAlign: "center", borderColor: "var(--tg-success)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>âœ…</div>
                    <p style={{ margin: 0, color: "var(--tg-success)" }}>Â«{mySubmittedWord}Â» envoyÃ© â€” en attente des autresâ€¦</p>
                  </div>
                ) : (
                  <>
                    <input value={wordInput} onChange={(e) => setWordInput(e.target.value)} placeholder="Votre mot liÃ© au thÃ¨meâ€¦" maxLength={30} autoComplete="off" onKeyDown={(e) => e.key === "Enter" && submitWord()} />
                    <div className="tg-spacer" />
                    <button className="tg-btn" onClick={submitWord} disabled={!wordInput.trim()}>Envoyer mon mot â†’</button>
                  </>
                )}
                <h2 style={{ marginTop: 20, fontSize: "0.88rem" }}>Joueurs</h2>
                {room.players.map((p) => (
                  <div key={p.id} className="tg-card" style={{ padding: "9px 14px", margin: "4px 0", display: "flex", alignItems: "center", gap: 8, opacity: p.eliminated ? 0.4 : 1 }}>
                    <span style={{ fontSize: "0.95rem" }}>{p.eliminated ? "ðŸ’€" : p.connected ? "ðŸŸ¢" : "ðŸ”´"}</span>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</span>
                    {p.id === myPlayerId && <span style={{ fontSize: "0.7rem", color: "var(--tg-text-muted)", marginLeft: "auto" }}>MOI</span>}
                    {p.host && !p.eliminated && <span style={{ fontSize: "0.7rem", color: "var(--tg-accent)", marginLeft: p.id === myPlayerId ? 0 : "auto" }}>ANIMATEUR</span>}
                    {!p.eliminated && p.has_submitted && <span style={{ fontSize: "0.75rem", color: "var(--tg-success)", marginLeft: "auto" }}>âœ“</span>}
                  </div>
                ))}
              </>
            )}

            {room.state === "discussion" && (
              <>
                <h1>ðŸ“ Mots du Tour {room.round}</h1>
                <div style={{ margin: "10px 0" }}>
                  {room.current_words.map((item, i) => (
                    <div key={i} className="tg-word-slot">
                      <div style={{ fontSize: "0.78rem", color: "var(--tg-text-muted)", marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{item.word}</div>
                    </div>
                  ))}
                </div>
                <div className="tg-card" style={{ background: "rgba(0,0,0,0.3)", marginBottom: 14, textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>ðŸ’¬ Discutez entre vous. Qui est l'imposteur ?</p>
                </div>
                {isHost ? (
                  <>
                    <h2 style={{ fontSize: "0.95rem" }}>ðŸ—³ï¸ Choisissez qui Ã©liminer :</h2>
                    <div className="tg-vote-grid">
                      {room.players.filter((p) => !p.eliminated).map((p) => (
                        <div key={p.id} className="tg-vote-card" onClick={() => { if (window.confirm(`Ã‰liminer ${p.name} ?`)) send({ type: "eliminate_player", player_id: p.id }); }}>
                          <div style={{ fontSize: "2rem", marginBottom: 6 }}>{p.id === myPlayerId ? "ðŸ‘‘" : "ðŸ‘¤"}</div>
                          <strong style={{ fontSize: "0.9rem" }}>{p.name}</strong>
                          {p.id === myPlayerId && <div style={{ fontSize: "0.65rem", color: "var(--tg-text-muted)", marginTop: 2 }}>moi</div>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="tg-card" style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, color: "var(--tg-text-muted)" }}>â³ En attente de l'animateur pour dÃ©signer le suspectâ€¦</p>
                  </div>
                )}
                {room.eliminated_list.length > 0 && (
                  <>
                    <h2 style={{ marginTop: 18, fontSize: "0.85rem" }}>ðŸ’€ DÃ©jÃ  Ã©liminÃ©s</h2>
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

        {/* â”€â”€ FINISHED â”€â”€ */}
        {step === "finished" && room && (
          <div className="tg-screen tg-active">
            <div className="tg-flex-center" style={{ textAlign: "center" }}>
              {gameOver ? (
                <>
                  <h1 className={gameOver.winner === "vrais" ? "tg-result-win" : "tg-result-lose"} style={{ fontSize: "2rem", marginBottom: 14 }}>
                    {gameOver.winner === "vrais" ? "ðŸŽ‰ Les Vrais gagnent !" : gameOver.winner === "imposteur" ? "ðŸŽ­ L'Imposteur gagne !" : "Partie terminÃ©e"}
                  </h1>
                  <div className="tg-card" style={{ textAlign: "center", borderColor: gameOver.winner === "vrais" ? "var(--tg-success)" : "var(--tg-danger)", width: "100%", marginBottom: 18 }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>{gameOver.winner === "vrais" ? "ðŸ§¿" : "ðŸŽ­"}</div>
                    <p style={{ marginBottom: 4, fontSize: "0.95rem" }}>L'imposteur Ã©tait</p>
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
                <h1 style={{ marginBottom: 18 }}>Partie terminÃ©e</h1>
              )}

              {room.all_rounds.length > 0 && (
                <>
                  <h2 style={{ fontSize: "0.95rem", marginBottom: 8, width: "100%", textAlign: "left" }}>ðŸ“ RÃ©cap des mots</h2>
                  {room.all_rounds.map((roundWords, t) => (
                    <div key={t} style={{ width: "100%", marginBottom: 12 }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--tg-text-muted)", marginBottom: 6 }}>Tour {t + 1}</div>
                      {roundWords.map((item, i) => {
                        const wasImpostor = gameOver?.impostor_id === item.player_id;
                        return (
                          <div key={i} className="tg-word-slot" style={{ borderLeft: `3px solid ${wasImpostor ? "var(--tg-danger)" : "var(--tg-success)"}`, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span><strong>{item.name}</strong> : {item.word}</span>
                            {wasImpostor && <span style={{ fontSize: "0.7rem", color: "var(--tg-danger)" }}>ðŸŽ­</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {room.eliminated_list.length > 0 && (
                <>
                  <h2 style={{ fontSize: "0.95rem", marginBottom: 8, width: "100%", textAlign: "left" }}>ðŸ’€ Joueurs Ã©liminÃ©s</h2>
                  {room.eliminated_list.map((e, i) => (
                    <div key={i} className="tg-card" style={{ padding: "10px 14px", margin: "4px 0", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${e.was_impostor ? "var(--tg-danger)" : "rgba(255,255,255,0.1)"}` }}>
                      <span>{e.name} {e.was_impostor ? "ðŸŽ­" : ""}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--tg-text-muted)" }}>Tour {e.round}</span>
                    </div>
                  ))}
                </>
              )}

              <div className="tg-spacer" />
              {isHost && (
                <button className="tg-btn" onClick={() => send({ type: "play_again" })} style={{ maxWidth: 280 }}>
                  ðŸ”„ Rejouer dans ce salon
                </button>
              )}
              <button className="tg-btn tg-btn-secondary" onClick={onBack} style={{ maxWidth: 280, marginTop: 8 }}>
                ðŸ  Retour aux Jeux
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
