import { useRef, useState } from "react";
import { TG_SCOPED_CSS, tgVibrate } from "./turquieGamesShared";

type MotEntry = { nom: string; mot: string; isImposteur: boolean };
type Vote = { voter: number; suspect: number };

type ImposteurScreenId = "setup" | "pass" | "role" | "mot" | "affichage" | "vote" | "result";

export function ImposteurScreen({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<ImposteurScreenId>("setup");
  const [noms, setNoms] = useState(["Joueur 1", "Joueur 2", "Joueur 3", "Joueur 4", "Joueur 5"]);
  const [motVrai, setMotVrai] = useState("Cappadoce");
  const [motFaux, setMotFaux] = useState("Désert");
  const [imposteurIndex, setImposteurIndex] = useState(-1);

  const [currentRole, setCurrentRole] = useState(0);
  const [currentTour, setCurrentTour] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [mots, setMots] = useState<MotEntry[][]>([[], [], []]);
  const [motInput, setMotInput] = useState("");
  const [votes, setVotes] = useState<Vote[]>([]);

  const [passTitle, setPassTitle] = useState("Passez le téléphone");
  const [passSubtitle, setPassSubtitle] = useState("Au joueur suivant");
  const passCallback = useRef<() => void>(() => {});

  const [discussTime, setDiscussTime] = useState(60);
  const discussIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function showPass(subtitle: string, cb: () => void) {
    setPassTitle("📱 Passez le téléphone");
    setPassSubtitle(subtitle);
    passCallback.current = cb;
    setScreen("pass");
  }

  function startGame() {
    const impIdx = Math.floor(Math.random() * 5);
    setImposteurIndex(impIdx);
    setCurrentRole(0);
    setCurrentTour(1);
    setCurrentPlayer(0);
    setMots([[], [], []]);
    setVotes([]);
    goToRole(0, impIdx);
  }

  function goToRole(idx: number, impIdx: number) {
    if (idx >= 5) {
      goToPlayerMot(0, 1, [[], [], []]);
      return;
    }
    const nom = noms[idx];
    showPass(`À ${nom}`, () => {
      setCurrentRole(idx);
      setScreen("role");
    });
    // impIdx passé pour l'appel initial (state pas encore commis au premier rendu)
    setImposteurIndex(impIdx);
  }

  function nextRole() {
    goToRole(currentRole + 1, imposteurIndex);
  }

  function goToPlayerMot(playerIdx: number, tour: number, motsState: MotEntry[][]) {
    if (playerIdx >= 5) {
      showWords(tour, motsState);
      return;
    }
    const nom = noms[playerIdx];
    showPass(`À ${nom}`, () => {
      setCurrentPlayer(playerIdx);
      setCurrentTour(tour);
      setMotInput("");
      setScreen("mot");
    });
  }

  function validerMot() {
    const mot = motInput.trim();
    if (!mot) {
      tgVibrate([50, 50, 50]);
      alert("Veuillez écrire un mot");
      return;
    }
    setMots((prev) => {
      const next = prev.map((t) => [...t]);
      next[currentTour - 1] = [
        ...next[currentTour - 1],
        { nom: noms[currentPlayer], mot, isImposteur: currentPlayer === imposteurIndex },
      ];
      goToPlayerMot(currentPlayer + 1, currentTour, next);
      return next;
    });
  }

  function showWords(tour: number, motsState: MotEntry[][]) {
    setCurrentTour(tour);
    setMots(motsState);
    setScreen("affichage");
    setDiscussTime(60);
    if (discussIntervalRef.current) clearInterval(discussIntervalRef.current);
    discussIntervalRef.current = setInterval(() => {
      setDiscussTime((t) => {
        if (t <= 1) {
          if (discussIntervalRef.current) clearInterval(discussIntervalRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function nextTourOrVote() {
    if (discussIntervalRef.current) clearInterval(discussIntervalRef.current);
    if (currentTour < 3) {
      goToPlayerMot(0, currentTour + 1, mots);
    } else {
      setCurrentPlayer(0);
      goToVote(0, []);
    }
  }

  function goToVote(playerIdx: number, votesState: Vote[]) {
    if (playerIdx >= 5) {
      setVotes(votesState);
      setScreen("result");
      return;
    }
    const nom = noms[playerIdx];
    showPass(`Vote de ${nom}`, () => {
      setCurrentPlayer(playerIdx);
      setVotes(votesState);
      setScreen("vote");
    });
  }

  function castVote(suspectIdx: number) {
    tgVibrate(30);
    const next = [...votes, { voter: currentPlayer, suspect: suspectIdx }];
    goToVote(currentPlayer + 1, next);
  }

  // ── Résultat ──
  const counts: Record<number, number> = {};
  votes.forEach((v) => {
    counts[v.suspect] = (counts[v.suspect] || 0) + 1;
  });
  let maxVotes = -1;
  let suspectIndex = -1;
  Object.entries(counts).forEach(([idx, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      suspectIndex = parseInt(idx, 10);
    }
  });
  const isCorrect = suspectIndex === imposteurIndex && maxVotes > 0;
  const imposteurNom = noms[imposteurIndex];
  const isImposteurCurrent = currentRole === imposteurIndex;
  const roleIsImposteur = currentRole === imposteurIndex;
  const motCourant = isImposteurCurrent ? motFaux || "❓" : motVrai;

  return (
    <div className="w-full h-full">
      <style>{TG_SCOPED_CSS}</style>
      <div className="tg-root">
        {/* SETUP */}
        <div className={`tg-screen ${screen === "setup" ? "tg-active" : ""}`}>
          <h1>🎭 L'Imposteur Turque</h1>
          <p>5 joueurs. Un mot commun. Un imposteur. 3 tours.</p>
          <div className="tg-card">
            <h2>👥 Les joueurs</h2>
            {noms.map((n, i) => (
              <input
                key={i}
                value={n}
                onChange={(e) => {
                  const next = [...noms];
                  next[i] = e.target.value;
                  setNoms(next);
                }}
                placeholder={`Joueur ${i + 1}`}
              />
            ))}
          </div>
          <div className="tg-card">
            <h2>📝 Mots</h2>
            <input value={motVrai} onChange={(e) => setMotVrai(e.target.value)} placeholder="Mot vrai (ex: Cappadoce)" />
            <input
              value={motFaux}
              onChange={(e) => setMotFaux(e.target.value)}
              placeholder="Mot de l'imposteur (optionnel)"
            />
            <p style={{ fontSize: "0.8rem", color: "#888", margin: "4px 0 0" }}>
              Laissez vide pour que l'imposteur n'ait aucun mot.
            </p>
          </div>
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={startGame}>
            🎭 Démarrer la partie
          </button>
          <button className="tg-btn tg-btn-secondary" onClick={onBack}>
            ← Retour
          </button>
        </div>

        {/* PASS */}
        <div className={`tg-screen tg-pass-screen ${screen === "pass" ? "tg-active" : ""}`}>
          <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>📱</div>
          <h2>{passTitle}</h2>
          <p>{passSubtitle}</p>
          <button className="tg-btn" onClick={() => passCallback.current()}>
            C'est moi →
          </button>
        </div>

        {/* ROLE */}
        <div className={`tg-screen ${screen === "role" ? "tg-active" : ""}`}>
          <div className="tg-flex-center" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.05rem", color: "var(--tg-text-muted)", marginBottom: 10 }}>Rôle de</div>
            <h2 style={{ fontSize: "1.7rem", marginBottom: 20 }}>{noms[currentRole]}</h2>
            <div className="tg-card" style={{ width: "100%", maxWidth: 320, padding: "26px 18px" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>{roleIsImposteur ? "🎭" : "🧿"}</div>
              <h1 style={{ fontSize: "1.35rem", marginBottom: 10 }}>
                {roleIsImposteur ? "Vous êtes l'Imposteur" : "Vous êtes un Vrai"}
              </h1>
              <p style={{ fontSize: "0.92rem" }}>
                {roleIsImposteur
                  ? `Vous ne connaissez pas le vrai mot. Bluffez pour survivre !${motFaux ? " (mot leurre)" : ""}`
                  : "Vous connaissez le vrai mot. Démasquez l'imposteur !"}
              </p>
              <div
                style={{
                  fontSize: roleIsImposteur && !motFaux ? "2.6rem" : "2rem",
                  fontWeight: 800,
                  color: "var(--tg-accent)",
                  marginTop: 20,
                }}
              >
                {roleIsImposteur ? (motFaux || "❓") : motVrai}
              </div>
            </div>
            <button className="tg-btn" onClick={nextRole} style={{ marginTop: 36, maxWidth: 260 }}>
              J'ai mémorisé →
            </button>
          </div>
        </div>

        {/* MOT */}
        <div className={`tg-screen ${screen === "mot" ? "tg-active" : ""}`}>
          <div className="tg-player-tag">{noms[currentPlayer]}</div>
          <h1>
            Tour <span style={{ color: "var(--tg-accent)" }}>{currentTour}</span>
          </h1>
          <p>Écrivez UN mot lié au lieu sans être trop évident :</p>
          <div className="tg-card" style={{ textAlign: "center", margin: "16px 0", border: "2px solid var(--tg-secondary)" }}>
            <div style={{ fontSize: "2.4rem", marginBottom: 6 }}>{motCourant}</div>
            <p style={{ color: "var(--tg-text-muted)", fontSize: "0.9rem", margin: 0 }}>
              {isImposteurCurrent ? (motFaux ? "Votre mot (leurre)" : "Vous ne connaissez pas le mot") : "Votre mot"}
            </p>
          </div>
          <input
            value={motInput}
            onChange={(e) => setMotInput(e.target.value)}
            placeholder="Votre mot..."
            maxLength={25}
            autoComplete="off"
          />
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={validerMot}>
            Envoyer →
          </button>
        </div>

        {/* AFFICHAGE */}
        <div className={`tg-screen ${screen === "affichage" ? "tg-active" : ""}`}>
          <h1>
            📝 Mots du Tour <span style={{ color: "var(--tg-accent)" }}>{currentTour}</span>
          </h1>
          <div style={{ margin: "14px 0" }}>
            {mots[currentTour - 1]?.map((item, i) => (
              <div key={i} className="tg-word-slot">
                <div style={{ fontSize: "0.8rem", color: "var(--tg-text-muted)", marginBottom: 4 }}>{item.nom}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{item.mot}</div>
              </div>
            ))}
          </div>
          <div className="tg-card" style={{ textAlign: "center", marginTop: 14 }}>
            <p style={{ marginBottom: 8, fontSize: "0.9rem" }}>Temps de discussion</p>
            <div className="tg-timer tg-small">{discussTime}</div>
          </div>
          <p style={{ textAlign: "center", color: "var(--tg-text-muted)", fontSize: "0.9rem", marginTop: 10 }}>
            Discutez pour identifier l'imposteur, puis appuyez sur Continuer.
          </p>
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={nextTourOrVote}>
            Continuer →
          </button>
        </div>

        {/* VOTE */}
        <div className={`tg-screen ${screen === "vote" ? "tg-active" : ""}`}>
          <div className="tg-player-tag">Votre vote</div>
          <h1>🗳️ Qui est l'imposteur ?</h1>
          <p>Cliquez sur le joueur que vous suspectez :</p>
          <div className="tg-vote-grid">
            {noms.map(
              (n, i) =>
                i !== currentPlayer && (
                  <div key={i} className="tg-vote-card" onClick={() => castVote(i)}>
                    <div style={{ fontSize: "2.1rem", marginBottom: 8 }}>👤</div>
                    <strong style={{ fontSize: "1.05rem" }}>{n}</strong>
                  </div>
                )
            )}
          </div>
          <div className="tg-spacer" />
        </div>

        {/* RESULT */}
        <div className={`tg-screen ${screen === "result" ? "tg-active" : ""}`}>
          <div className="tg-flex-center" style={{ textAlign: "center" }}>
            <h1 className={isCorrect ? "tg-result-win" : "tg-result-lose"} style={{ fontSize: "2rem", marginBottom: 18 }}>
              {isCorrect ? "🎉 Les Vrais gagnent !" : "🎭 L'Imposteur gagne !"}
            </h1>
            <div style={{ width: "100%" }}>
              {isCorrect ? (
                <div className="tg-card" style={{ textAlign: "center", borderColor: "var(--tg-success)", background: "rgba(78,205,196,0.08)" }}>
                  <div style={{ fontSize: "2.6rem", marginBottom: 10 }}>🧿</div>
                  <p style={{ fontSize: "1.05rem", marginBottom: 8 }}>L'imposteur était bien</p>
                  <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--tg-success)", marginBottom: 14 }}>{imposteurNom}</p>
                  <p style={{ margin: 0, color: "var(--tg-text-muted)" }}>
                    Le mot était : <strong style={{ color: "var(--tg-text)" }}>{motVrai}</strong>
                  </p>
                </div>
              ) : (
                <div className="tg-card" style={{ textAlign: "center", borderColor: "var(--tg-danger)", background: "rgba(255,107,107,0.08)" }}>
                  <div style={{ fontSize: "2.6rem", marginBottom: 10 }}>🎭</div>
                  <p style={{ fontSize: "1.05rem", marginBottom: 8 }}>L'imposteur était</p>
                  <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--tg-danger)", marginBottom: 14 }}>{imposteurNom}</p>
                  {suspectIndex >= 0 && (
                    <p style={{ marginBottom: 8, color: "var(--tg-text-muted)" }}>
                      Vote majoritaire pour <strong style={{ color: "var(--tg-text)" }}>{noms[suspectIndex]}</strong>
                    </p>
                  )}
                  <p style={{ margin: 0, color: "var(--tg-text-muted)" }}>
                    Le mot était : <strong style={{ color: "var(--tg-text)" }}>{motVrai}</strong>
                  </p>
                </div>
              )}

              <h2 style={{ margin: "22px 0 10px", fontSize: "1rem" }}>🗳️ Récap des votes</h2>
              {votes.map((v, i) => (
                <div key={i} className="tg-card" style={{ padding: "11px 15px", margin: "6px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--tg-text-muted)", fontSize: "0.9rem" }}>{noms[v.voter]}</span>
                    <span style={{ fontWeight: 600 }}>→ {noms[v.suspect]}</span>
                  </div>
                </div>
              ))}

              <h2 style={{ margin: "22px 0 10px", fontSize: "1rem" }}>📝 Tous les mots</h2>
              {mots.map(
                (tourMots, t) =>
                  tourMots.length > 0 && (
                    <div key={t} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: "0.85rem", color: "var(--tg-text-muted)", marginBottom: 6 }}>Tour {t + 1}</div>
                      {tourMots.map((item, i) => (
                        <div
                          key={i}
                          className="tg-word-slot"
                          style={{
                            borderLeft: `3px solid ${item.isImposteur ? "var(--tg-danger)" : "var(--tg-success)"}`,
                            textAlign: "left",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>
                            <strong>{item.nom}</strong> : {item.mot}
                          </span>
                          {item.isImposteur && <span style={{ fontSize: "0.72rem", color: "var(--tg-danger)" }}>IMPOSTEUR</span>}
                        </div>
                      ))}
                    </div>
                  )
              )}
            </div>
            <div className="tg-spacer" />
            <button className="tg-btn" onClick={onBack}>
              🏠 Retour aux Jeux
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
