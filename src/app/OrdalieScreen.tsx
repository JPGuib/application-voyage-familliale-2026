import { useEffect, useRef, useState } from "react";
import { TG_SCOPED_CSS, tgVibrate, tgHaversine, loadLeaflet } from "./turquieGamesShared";

type Question = {
  joueur: string;
  sens: string;
  audioURL: string | null;
  audioBlob: Blob | null;
  emoji: string | null;
  textFallback: string;
};

type Pin = { joueur: string; lat: number; lng: number } | null;

type OrdalieScreenId =
  | "setup"
  | "lieu"
  | "sens"
  | "pass"
  | "question"
  | "reponse"
  | "recap"
  | "carte"
  | "result";

const SENS_LIST = ["Odeur", "Bruit", "Texture", "Goût"];
const EMOJIS = ["👍", "👎", "🤔", "❤️", "🔥", "❄️", "🌊", "🌸", "💀", "✨", "🌙", "☀️", "🌧️", "🍃", "🪨", "🧿", "🍵", "🍖", "🧂", "🍯", "🌶️", "🍋", "🥛", "🍷", "🎵"];
const TURKEY_CENTER: [number, number] = [38.9637, 35.2433];

export function OrdalieScreen({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<OrdalieScreenId>("setup");
  const [gardien, setGardien] = useState("Joueur 1");
  const [chercheurs, setChercheurs] = useState(["Joueur 2", "Joueur 3", "Joueur 4", "Joueur 5"]);
  const [lieuNom, setLieuNom] = useState("");
  const [lieuPos, setLieuPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentChercheur, setCurrentChercheur] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pins, setPins] = useState<Pin[]>([null, null, null, null]);

  const [passTitle, setPassTitle] = useState("Passez le téléphone");
  const [passSubtitle, setPassSubtitle] = useState("Au joueur suivant");
  const passCallback = useRef<() => void>(() => {});

  const [isRecording, setIsRecording] = useState(false);
  const [recTimeLeft, setRecTimeLeft] = useState(7);
  const [recStatus, setRecStatus] = useState("Appuyez pour enregistrer");
  const [hasAudioSupport, setHasAudioSupport] = useState(true);
  const [textFallback, setTextFallback] = useState("");
  const [currentAudioURL, setCurrentAudioURL] = useState<string | null>(null);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const [discussTime, setDiscussTime] = useState(60);
  const discussIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pinDraft, setPinDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapLieuContainerRef = useRef<HTMLDivElement>(null);
  const mapCarteContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerInstanceRef = useRef<any>(null);

  // Charge Leaflet une fois qu'on arrive sur l'écran "lieu" ou "carte"
  useEffect(() => {
    if (screen !== "lieu" && screen !== "carte") return;
    let cancelled = false;
    setMapReady(false);
    loadLeaflet()
      .then(() => {
        if (!cancelled) setMapReady(true);
      })
      .catch(() => {
        // Pas de connexion : la carte ne peut pas s'afficher, le jeu reste
        // utilisable pour le reste (on retente plus tard avec du réseau).
      });
    return () => {
      cancelled = true;
    };
  }, [screen]);

  // Initialise la carte Leaflet une fois chargée, sur l'écran "lieu"
  useEffect(() => {
    if (screen !== "lieu" || !mapReady || !mapLieuContainerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapLieuContainerRef.current).setView(TURKEY_CENTER, 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapInstanceRef.current = map;
    markerInstanceRef.current = null;

    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      if (markerInstanceRef.current) map.removeLayer(markerInstanceRef.current);
      markerInstanceRef.current = L.marker(e.latlng).addTo(map);
      setLieuPos({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [screen, mapReady]);

  // Initialise la carte Leaflet sur l'écran "carte" (devinette), pour le
  // chercheur courant
  useEffect(() => {
    if (screen !== "carte" || !mapReady || !mapCarteContainerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    setPinDraft(null);
    const map = L.map(mapCarteContainerRef.current).setView(TURKEY_CENTER, 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapInstanceRef.current = map;
    markerInstanceRef.current = null;

    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      if (markerInstanceRef.current) map.removeLayer(markerInstanceRef.current);
      markerInstanceRef.current = L.marker(e.latlng).addTo(map);
      setPinDraft({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [screen, mapReady, currentChercheur]);

  function showPass(title: string, subtitle: string, cb: () => void) {
    setPassTitle(title);
    setPassSubtitle(subtitle);
    passCallback.current = cb;
    setScreen("pass");
  }

  function goStart() {
    setScreen("lieu");
  }

  function saveLieu() {
    if (!lieuNom.trim()) {
      tgVibrate([50, 50, 50]);
      alert("Veuillez nommer le lieu");
      return;
    }
    if (!lieuPos) {
      tgVibrate([50, 50, 50]);
      alert("Veuillez placer un pin sur la carte");
      return;
    }
    setScreen("sens");
  }

  function startQuestions() {
    setCurrentChercheur(0);
    setQuestions([]);
    goToQuestion(0);
  }

  function resetRecordingUI() {
    setIsRecording(false);
    setRecStatus("Appuyez pour enregistrer");
    setRecTimeLeft(7);
    setCurrentAudioURL(null);
    setCurrentAudioBlob(null);
    setHasAudioSupport(true);
    setTextFallback("");
  }

  function goToQuestion(idx: number) {
    if (idx >= 4) {
      showRecap();
      return;
    }
    const ch = chercheurs[idx];
    showPass("📱 Passez le téléphone", `À ${ch}`, () => {
      resetRecordingUI();
      setCurrentChercheur(idx);
      setScreen("question");
    });
  }

  function toggleRecording() {
    if (!isRecording) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          recorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const url = URL.createObjectURL(blob);
            setCurrentAudioURL(url);
            setCurrentAudioBlob(blob);
          };
          recorder.start();
          setIsRecording(true);
          setRecStatus("Enregistrement en cours...");
          tgVibrate(50);

          let timeLeft = 7;
          setRecTimeLeft(timeLeft);
          recIntervalRef.current = setInterval(() => {
            timeLeft--;
            setRecTimeLeft(timeLeft);
            if (timeLeft <= 0) stopRecording();
          }, 1000);
        })
        .catch(() => {
          setHasAudioSupport(false);
          setRecStatus("Micro indisponible — écrivez ci-dessous");
        });
    } else {
      stopRecording();
    }
  }

  function stopRecording() {
    if (recIntervalRef.current) clearInterval(recIntervalRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecStatus("Enregistrement terminé");
    tgVibrate(50);
  }

  function validerQuestion() {
    if (!currentAudioURL && !hasAudioSupport && !textFallback.trim()) {
      alert("Veuillez écrire une question");
      return;
    }
    const sens = SENS_LIST[currentChercheur];
    const q: Question = {
      joueur: chercheurs[currentChercheur],
      sens,
      audioURL: currentAudioURL,
      audioBlob: currentAudioBlob,
      emoji: null,
      textFallback: textFallback.trim(),
    };
    setQuestions((prev) => {
      const next = [...prev];
      next[currentChercheur] = q;
      return next;
    });
    setSelectedEmoji(null);
    showPass("📱 Passez le téléphone", `Au Gardien (${gardien})`, () => {
      setScreen("reponse");
    });
  }

  function validerReponse() {
    if (!selectedEmoji) return;
    setQuestions((prev) => {
      const next = [...prev];
      next[currentChercheur] = { ...next[currentChercheur], emoji: selectedEmoji };
      return next;
    });
    const nextIdx = currentChercheur + 1;
    goToQuestion(nextIdx);
  }

  function showRecap() {
    setScreen("recap");
    setDiscussTime(60);
    if (discussIntervalRef.current) clearInterval(discussIntervalRef.current);
    discussIntervalRef.current = setInterval(() => {
      setDiscussTime((t) => {
        if (t <= 1) {
          if (discussIntervalRef.current) clearInterval(discussIntervalRef.current);
          goToCarte();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function goToCarte() {
    if (discussIntervalRef.current) clearInterval(discussIntervalRef.current);
    setCurrentChercheur(0);
    setPins([null, null, null, null]);
    goToPin(0);
  }

  function goToPin(idx: number) {
    if (idx >= 4) {
      setScreen("result");
      return;
    }
    const ch = chercheurs[idx];
    showPass("📱 Passez le téléphone", `À ${ch}`, () => {
      setCurrentChercheur(idx);
      setScreen("carte");
    });
  }

  function validerPin() {
    if (!pinDraft) {
      tgVibrate([50, 50, 50]);
      alert("Veuillez placer un pin sur la carte");
      return;
    }
    setPins((prev) => {
      const next = [...prev];
      next[currentChercheur] = { joueur: chercheurs[currentChercheur], lat: pinDraft.lat, lng: pinDraft.lng };
      return next;
    });
    goToPin(currentChercheur + 1);
  }

  // ── Résultat ──
  const results = pins.map((pin) => {
    if (!pin || !lieuPos) return null;
    const dist = tgHaversine(lieuPos.lat, lieuPos.lng, pin.lat, pin.lng);
    return { joueur: pin.joueur, dist, isClose: dist <= 500 };
  });
  const allClose = results.every((r) => r && r.isClose);

  useEffect(() => {
    if (screen !== "result") return;
    tgVibrate(allClose ? [100, 50, 100, 50, 200] : [200, 100, 200]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    return () => {
      if (recIntervalRef.current) clearInterval(recIntervalRef.current);
      if (discussIntervalRef.current) clearInterval(discussIntervalRef.current);
    };
  }, []);

  const stepIndex = { setup: 0, lieu: 1, sens: 2, question: 3 }[screen as "setup" | "lieu" | "sens" | "question"] ?? -1;

  return (
    <div className="w-full h-full">
      <style>{TG_SCOPED_CSS}</style>
      <div className="tg-root">
        {/* SETUP */}
        <div className={`tg-screen ${screen === "setup" ? "tg-active" : ""}`}>
          <div className="tg-step-indicator">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`tg-step-dot ${stepIndex === i ? "tg-active" : ""}`} />
            ))}
          </div>
          <h1>🎙️ L'Ordalie des 5 Sens</h1>
          <p>5 joueurs : 1 Gardien du Souvenir et 4 Chercheurs.</p>
          <div className="tg-card">
            <h2>👤 Gardien du Souvenir</h2>
            <input value={gardien} onChange={(e) => setGardien(e.target.value)} placeholder="Nom du Gardien" />
          </div>
          <div className="tg-card">
            <h2>🔍 Les 4 Chercheurs</h2>
            {chercheurs.map((c, i) => (
              <input
                key={i}
                value={c}
                onChange={(e) => {
                  const next = [...chercheurs];
                  next[i] = e.target.value;
                  setChercheurs(next);
                }}
                placeholder={`Chercheur ${i + 1}`}
              />
            ))}
          </div>
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={goStart}>
            Continuer →
          </button>
          <button className="tg-btn tg-btn-secondary" onClick={onBack}>
            ← Retour
          </button>
        </div>

        {/* LIEU */}
        <div className={`tg-screen ${screen === "lieu" ? "tg-active" : ""}`}>
          <div className="tg-step-indicator">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`tg-step-dot ${stepIndex === i ? "tg-active" : ""}`} />
            ))}
          </div>
          <h1>📍 Le Lieu Secret</h1>
          <p>Gardien, définissez le moment précis du voyage que les Chercheurs doivent retrouver.</p>
          <div className="tg-card">
            <input
              value={lieuNom}
              onChange={(e) => setLieuNom(e.target.value)}
              placeholder="Ex: Le thé à la menthe sur la corniche d'Antalya"
            />
          </div>
          <p>Placez le pin sur la carte (Turquie) :</p>
          <div className="tg-map-container" ref={mapLieuContainerRef}>
            {!mapReady && (
              <div style={{ padding: 16, fontSize: 13, color: "var(--tg-text-muted)" }}>Chargement de la carte…</div>
            )}
          </div>
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={saveLieu}>
            Valider le lieu →
          </button>
        </div>

        {/* SENS */}
        <div className={`tg-screen ${screen === "sens" ? "tg-active" : ""}`}>
          <div className="tg-step-indicator">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`tg-step-dot ${stepIndex === i ? "tg-active" : ""}`} />
            ))}
          </div>
          <h1>🎯 Attribution des Sens</h1>
          <p>Chaque Chercheur reçoit un sens unique pour poser sa question.</p>
          {chercheurs.map((c, i) => (
            <div key={i} className="tg-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1 }}>
                <strong>{c}</strong>
              </div>
              <div className="tg-sens-badge" style={{ margin: 0, fontSize: "0.9rem", padding: "7px 14px" }}>
                {SENS_LIST[i]}
              </div>
            </div>
          ))}
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={startQuestions}>
            🎙️ Commencer l'Ordalie
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

        {/* QUESTION */}
        <div className={`tg-screen ${screen === "question" ? "tg-active" : ""}`}>
          <div className="tg-player-tag">Chercheur</div>
          <h1>Enregistrez votre question</h1>
          <div className="tg-sens-badge">{SENS_LIST[currentChercheur]}</div>
          <p>
            Vous êtes le Chercheur "{SENS_LIST[currentChercheur]}". Posez une question de 7 secondes max.
          </p>
          <div className="tg-recorder">
            <button className={`tg-rec-btn ${isRecording ? "tg-recording" : ""}`} onClick={toggleRecording}>
              🎙️
            </button>
            <div style={{ color: "var(--tg-text-muted)", fontSize: "0.9rem" }}>{recStatus}</div>
            <div className="tg-timer tg-small">{recTimeLeft}</div>
          </div>
          {currentAudioURL && <audio className="tg-audio-player" controls src={currentAudioURL} />}
          {!hasAudioSupport && (
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--tg-danger)" }}>Micro non disponible. Écrivez votre question :</p>
              <textarea
                rows={2}
                value={textFallback}
                onChange={(e) => setTextFallback(e.target.value)}
                placeholder="Votre question..."
              />
            </div>
          )}
          <div className="tg-spacer" />
          <button
            className="tg-btn"
            disabled={!currentAudioURL && (hasAudioSupport || !textFallback.trim())}
            onClick={validerQuestion}
          >
            Valider →
          </button>
        </div>

        {/* REPONSE */}
        <div className={`tg-screen ${screen === "reponse" ? "tg-active" : ""}`}>
          <div className="tg-player-tag" style={{ background: "linear-gradient(135deg, var(--tg-accent), #f0e68c)", color: "#1a1a2e" }}>
            Gardien
          </div>
          <h1>Répondez par emoji</h1>
          <p>Écoutez la question et choisissez un emoji :</p>
          {questions[currentChercheur]?.audioURL ? (
            <audio className="tg-audio-player" controls src={questions[currentChercheur].audioURL!} />
          ) : (
            <div className="tg-card" style={{ fontStyle: "italic", color: "var(--tg-text-muted)" }}>
              "{questions[currentChercheur]?.textFallback}"
            </div>
          )}
          <div className="tg-emoji-grid">
            {EMOJIS.map((e) => (
              <button
                key={e}
                className={`tg-emoji-btn ${selectedEmoji === e ? "tg-selected" : ""}`}
                onClick={() => {
                  setSelectedEmoji(e);
                  tgVibrate(20);
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="tg-spacer" />
          <button className="tg-btn" disabled={!selectedEmoji} onClick={validerReponse}>
            Valider la réponse →
          </button>
        </div>

        {/* RECAP */}
        <div className={`tg-screen ${screen === "recap" ? "tg-active" : ""}`}>
          <h1>📋 Récapitulatif</h1>
          <p>Voici les 4 questions et leurs réponses. Discutez en équipe !</p>
          {questions.map((q, i) => (
            <div key={i} className="tg-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div className="tg-player-tag" style={{ margin: 0 }}>
                  {q.joueur}
                </div>
                <div className="tg-sens-badge" style={{ margin: 0, fontSize: "0.8rem", padding: "4px 10px" }}>
                  {q.sens}
                </div>
              </div>
              {q.audioURL ? (
                <audio className="tg-audio-player" controls src={q.audioURL} />
              ) : (
                <div style={{ fontStyle: "italic", color: "var(--tg-text-muted)", padding: "8px 0" }}>"{q.textFallback}"</div>
              )}
              <div style={{ fontSize: "2rem", marginTop: 8 }}>{q.emoji || "❓"}</div>
            </div>
          ))}
          <div className="tg-card" style={{ textAlign: "center", marginTop: 20 }}>
            <p style={{ marginBottom: 8, fontSize: "0.9rem" }}>Temps de discussion</p>
            <div className="tg-timer">{discussTime}</div>
          </div>
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={goToCarte}>
            Passer à la carte →
          </button>
        </div>

        {/* CARTE */}
        <div className={`tg-screen ${screen === "carte" ? "tg-active" : ""}`}>
          <div className="tg-player-tag">{chercheurs[currentChercheur]}</div>
          <h1>📍 Placez votre pin</h1>
          <p>Placez un marqueur sur la carte pour deviner le lieu :</p>
          <div className="tg-map-container" ref={mapCarteContainerRef}>
            {!mapReady && (
              <div style={{ padding: 16, fontSize: 13, color: "var(--tg-text-muted)" }}>Chargement de la carte…</div>
            )}
          </div>
          <div className="tg-spacer" />
          <button className="tg-btn" onClick={validerPin}>
            Valider ma position →
          </button>
        </div>

        {/* RESULT */}
        <div className={`tg-screen ${screen === "result" ? "tg-active" : ""}`}>
          <div className="tg-flex-center" style={{ textAlign: "center" }}>
            <h1 className={allClose ? "tg-result-win" : "tg-result-lose"} style={{ fontSize: "2rem", marginBottom: 18 }}>
              {allClose ? "🎉 Victoire !" : "💔 Défaite..."}
            </h1>
            <div style={{ width: "100%" }}>
              <div className="tg-card" style={{ textAlign: "center", marginBottom: 18 }}>
                <div style={{ fontSize: "2.3rem", marginBottom: 8 }}>📍</div>
                <h2 style={{ marginBottom: 6 }}>Le lieu était</h2>
                <p style={{ fontSize: "1.15rem", color: "var(--tg-text)", margin: 0, fontWeight: 600 }}>{lieuNom}</p>
              </div>
              <h2 style={{ margin: "18px 0 10px", fontSize: "1.05rem" }}>Résultats des Chercheurs</h2>
              {results.map(
                (r, i) =>
                  r && (
                    <div
                      key={i}
                      className="tg-card"
                      style={{ borderLeft: `4px solid ${r.isClose ? "var(--tg-success)" : "var(--tg-danger)"}` }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{r.joueur}</strong>
                        <span className={`tg-dist-badge ${r.isClose ? "tg-dist-ok" : "tg-dist-ko"}`}>
                          {r.isClose ? "✅" : "❌"} {Math.round(r.dist)} m
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>{r.isClose ? "Dans la zone !" : "Trop loin..."}</p>
                    </div>
                  )
              )}
              <div
                className="tg-card"
                style={{
                  textAlign: "center",
                  marginTop: 18,
                  background: allClose ? "rgba(78,205,196,0.1)" : "rgba(255,107,107,0.1)",
                  borderColor: allClose ? "var(--tg-success)" : "var(--tg-danger)",
                }}
              >
                <p
                  style={{
                    color: allClose ? "var(--tg-success)" : "var(--tg-danger)",
                    fontSize: "1.05rem",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {allClose ? "Tous les Chercheurs ont trouvé !" : "Certains Chercheurs étaient trop loin."}
                </p>
              </div>
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
