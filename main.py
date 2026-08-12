"""
Trivial Turquie & autres packs - backend de jeu multijoueur (2 a 5 joueurs)
Chacun pour soi. Lancer avec: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import json
import random
import string
import asyncio
import time
from pathlib import Path
from typing import Optional

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).parent
BOARD_SIZE = 24  # 24 cases, 4 tours de chaque categorie (packs a 6 categories)
COLORS = ["#e63946", "#2a9d8f", "#f4a261", "#457b9d", "#a663cc"]

# ─────────────────────────────────────────────────────────────────────────
# Registre des "packs" de thèmes. Pour ajouter une nouvelle rubrique, voir
# les instructions détaillées dans README.md ("Ajouter une rubrique").
# ─────────────────────────────────────────────────────────────────────────
PACKS: dict[str, dict] = {
    "turquie": {
        "label": "Trivial Turquie 🇹🇷",
        "categories": ["histoire", "gastronomie", "langue", "geographie", "culture", "Istanbul"],
        "category_labels": {
            "histoire": "Histoire & Empire ottoman",
            "gastronomie": "Gastronomie",
            "langue": "Langue & expressions",
            "geographie": "Geographie",
            "culture": "Culture & traditions",
            "Istanbul": "Istanbul",
        },
        "questions_file": "questions_turquie.json",
    },
    "culture-generale": {
        "label": "Culture Générale 🧠",
        "categories": ["histoire", "geographie", "sciences", "divertissement", "sports", "litterature"],
        "category_labels": {
            "histoire": "Histoire",
            "geographie": "Géographie",
            "sciences": "Sciences & Nature",
            "divertissement": "Divertissement",
            "sports": "Sports & Loisirs",
            "litterature": "Littérature",
        },
        "questions_file": "questions_culture_generale.json",
    },
    "disney": {
        "label": "Quiz Disney ✨",
        "categories": ["films_classiques", "pixar", "princesses", "parcs", "personnages", "musique"],
        "category_labels": {
            "films_classiques": "Films Classiques",
            "pixar": "Univers Pixar",
            "princesses": "Princesses Disney",
            "parcs": "Parcs Disney",
            "personnages": "Personnages & Vilains",
            "musique": "Musique & Chansons",
        },
        "questions_file": "questions_disney.json",
    },
    "musique": {
        "label": "Quiz Musique 🎤",
        "categories": ["annees_80", "annees_90", "annees_2000", "annees_2010", "annees_2020", "scene_francophone"],
        "category_labels": {
            "annees_80": "Années 80",
            "annees_90": "Années 90",
            "annees_2000": "Années 2000",
            "annees_2010": "Années 2010",
            "annees_2020": "Années 2020",
            "scene_francophone": "Scène Francophone",
        },
        "questions_file": "questions_musique.json",
    },
    "cinema": {
        "label": "Quiz Cinéma 🎬",
        "categories": ["films_francais", "films_etrangers", "acteurs", "dessins_animes", "super_heros", "personnages_dessins_animes"],
        "category_labels": {
            "films_francais": "Films Français",
            "films_etrangers": "Films Étrangers",
            "acteurs": "Acteurs & Actrices",
            "dessins_animes": "Dessins Animés",
            "super_heros": "Super Héros",
            "personnages_dessins_animes": "Personnages de Dessins Animés",
        },
        "questions_file": "questions_cinema.json",
    },
    "Grand classique familial": {
        "label": "Grand classique familial 🏰",
        "categories": ["Cinéma & séries", "Musique", "Géographie et voyages", "Animaux", "Cuisine et gastronomie", "Culture Générale"],
        "category_labels": {
            "cinema_series": "Cinéma & séries",
            "musique": "Musique",
            "geographie_voyages": "Géographie et voyages",
            "animaux": "Animaux",
            "cuisine_gastronomie": "Cuisine et gastronomie",
            "culture_generale": "Culture Générale",
        },
        "questions_file": "pack_1_grand_classique_familial.json",
    },
    "Tour du monde": {
        "label": "Tour du monde 🌍",
        "categories": ["France", "Pays du monde", "Monuments", "Cuisine du monde", "Langues & expressions", "Voyages insolites"],
        "category_labels": {
            "france": "France",
            "pays_du_monde": "Pays du monde",
            "monuments": "Monuments",
            "cuisine_du_monde": "Cuisine du monde",
            "langues_expressions": "Langues & expressions",
            "voyages_insolites": "Voyages insolites",
        },
        "questions_file": "pack_4_tour_du_monde.json",
    },
    "Pop Culture": {
            "label": "Pop Culture 🎬",
            "categories": ["Films", "Séries", "Musique", "Jeux vidéo", "Super-héros", "Personnes fictifs"],
            "category_labels": {
                "films": "Films",
                "series": "Séries",
                "musique": "Musique",
                "jeux_video": "Jeux vidéo",
                "super_heros": "Super-héros",
                "personnes_fictifs": "Personnes fictifs",
            },
            "questions_file": "pack_5_pop_culture.json",
    },
    "Neurones en famille": {
                "label": "Neurones en famille 🧠",
                "categories": ["Logiques et chiffres", "Culture générale", "Trouver l'intrus", "Enigmes", "Plus ou moins", "Questions rapides"],
                "category_labels": {
                    "logiques_chiffres": "Logiques et chiffres",
                    "culture_generale": "Culture générale",
                    "trouver_intrus": "Trouver l'intrus",
                    "enigmes": "Enigmes",
                    "plus_ou_moins": "Plus ou moins",
                    "questions_rapides": "Questions rapides",
                },
                "questions_file": "pack_6_neurones_famille.json",
        },
        "Générations": {
                    "label": "Générations 🎬",
                    "categories": ["Années 60-70", "Années 80", "Année 90", "Années 2000", "Aujourd'hui", "Toutes générations"],
                    "category_labels": {
                        "annees_60_70": "Années 60-70",
                        "annees_80": "Années 80",
                        "annee_90": "Année 90",
                        "annees_2000": "Années 2000",
                        "aujourdhui": "Aujourd'hui",
                        "toutes_generations": "Toutes générations",
                    },
                    "questions_file": "pack_8_generations.json",
        },
        "Sport": {
                            "label": "Sport 🏅",
                            "categories": ["Football", "Sports mécaniques", "Tennis & sports de raquette", "Sports collectifs", "jeux olympiques et grands champions", "Sport insolite & records"],
                            "category_labels": {
                                "football": "Football",
                                "sports_mecaniques": "Sports mécaniques",
                                "tennis_sports_raquette": "Tennis & sports de raquette",
                                "sports_collectifs": "Sports collectifs",
                                "jeux_olympiques_grands_champions": "Jeux olympiques et grands champions",
                                "sport_insolite_records": "Sport insolite & records",
                            },
                            "questions_file": "pack_9_sport.json",
        },  
}
QUESTIONS_BY_PACK: dict[str, dict] = {}
for pack_id, pack_def in PACKS.items():
    with open(BASE_DIR / pack_def["questions_file"], encoding="utf-8") as f:
        QUESTIONS_BY_PACK[pack_id] = json.load(f)

# Une partie oubliee (personne ne joue plus, onglet ferme sans "Terminer")
# est fermee automatiquement au bout d'un moment pour ne pas laisser tourner
# des salons morts indefiniment en memoire.
ROOM_LOBBY_TIMEOUT_SECONDS = 30 * 60       # 30 min sans demarrer la partie
ROOM_INACTIVITY_TIMEOUT_SECONDS = 3 * 60 * 60  # 3h sans aucune action


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(cleanup_stale_rooms_loop())
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def cleanup_stale_rooms_loop():
    while True:
        await asyncio.sleep(5 * 60)
        now = time.monotonic()
        stale_codes = []
        for code, room in rooms.items():
            elapsed = now - room.last_activity
            timeout = (
                ROOM_LOBBY_TIMEOUT_SECONDS
                if room.state == "lobby"
                else ROOM_INACTIVITY_TIMEOUT_SECONDS
            )
            if elapsed > timeout:
                stale_codes.append(code)
        for code in stale_codes:
            room = rooms.pop(code, None)
            if room is None:
                continue
            room.state = "cancelled"
            try:
                await broadcast(room, room.public_state())
            except Exception:
                pass
        # Nettoyage des salons Imposteur inactifs
        stale_imp_codes = [
            c for c, r in imposteur_rooms.items()
            if (now - r.last_activity) > (
                ROOM_LOBBY_TIMEOUT_SECONDS if r.state == "lobby"
                else ROOM_INACTIVITY_TIMEOUT_SECONDS
            )
        ]
        for code in stale_imp_codes:
            imposteur_rooms.pop(code, None)


@app.get("/health")
async def health():
    return {"status": "ok", "rooms": len(rooms), "imposteur_rooms": len(imposteur_rooms)}


@app.get("/packs")
async def list_packs():
    # Le front interroge cet endpoint pour afficher les rubriques
    # disponibles au moment de créer une partie — ajouter un pack ici (et
    # dans PACKS) suffit, aucune modification du frontend n'est necessaire.
    return [{"id": pid, "label": pdef["label"]} for pid, pdef in PACKS.items()]


def build_board(categories: list[str]):
    # repartit les 6 categories du pack sur 24 cases, ordre mélangé mais fixe pour la session
    cells = []
    for _ in range(BOARD_SIZE // len(categories)):
        cats = categories[:]
        random.shuffle(cats)
        cells.extend(cats)
    return cells


class Player:
    def __init__(self, pid: str, name: str, color: str, host: bool = False):
        self.id = pid
        self.name = name
        self.color = color
        self.host = host
        self.pos = 0
        self.wedges = set()
        self.ws: Optional[WebSocket] = None
        self.connected = True
        self.finished = False  # a gagne

    def public(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "host": self.host,
            "pos": self.pos,
            "wedges": sorted(self.wedges),
            "connected": self.connected,
            "finished": self.finished,
        }


class Room:
    def __init__(self, code: str, pack_id: str):
        self.code = code
        self.pack_id = pack_id
        pack = PACKS[pack_id]
        self.categories = pack["categories"]
        self.category_labels = pack["category_labels"]
        self.questions = QUESTIONS_BY_PACK[pack_id]
        self.players: dict[str, Player] = {}
        self.order: list[str] = []
        self.turn_index = 0
        self.state = "lobby"  # lobby | playing | finished | cancelled
        self.board = build_board(self.categories)
        self.used_questions: dict[str, set[int]] = {c: set() for c in self.categories}
        self.pending_question: Optional[dict] = None  # question en attente de reponse
        self.winner: Optional[str] = None
        self.lock = asyncio.Lock()
        self.last_activity = time.monotonic()

    def add_player(self, name: str) -> Player:
        pid = f"p{len(self.players) + 1}_{random.randint(1000,9999)}"
        color = COLORS[len(self.players) % len(COLORS)]
        host = len(self.players) == 0
        player = Player(pid, name, color, host)
        self.players[pid] = player
        self.order.append(pid)
        return player

    def current_player(self) -> Optional[Player]:
        if not self.order:
            return None
        pid = self.order[self.turn_index % len(self.order)]
        return self.players.get(pid)

    def advance_turn(self):
        n = len(self.order)
        if n == 0:
            return
        for _ in range(n):
            self.turn_index = (self.turn_index + 1) % n
            p = self.players[self.order[self.turn_index]]
            if p.connected and not p.finished:
                return

    def public_state(self):
        return {
            "type": "room_state",
            "code": self.code,
            "pack_id": self.pack_id,
            "pack_label": PACKS[self.pack_id]["label"],
            "state": self.state,
            "board": self.board,
            "category_labels": self.category_labels,
            "players": [self.players[pid].public() for pid in self.order],
            "current_player": self.order[self.turn_index] if self.order else None,
            "winner": self.winner,
            "ended_by_host": self.state == "cancelled",
        }

    def pick_question(self, category: str):
        # random.choice pioche uniformement parmi les questions pas encore
        # posees dans cette partie pour cette categorie : l'ordre de sortie
        # est donc aleatoire, jamais sequentiel. Une fois le stock epuise, on
        # relache le suivi et on recommence a piocher aleatoirement dans tout
        # le lot (les memes questions peuvent alors ressortir, dans un ordre
        # a nouveau aleatoire).
        bank = self.questions.get(category, [])
        used = self.used_questions[category]
        available = [i for i in range(len(bank)) if i not in used]
        if not available:
            used.clear()
            available = list(range(len(bank)))
        idx = random.choice(available)
        used.add(idx)
        q = bank[idx]
        choices = list(enumerate(q["choices"]))
        random.shuffle(choices)
        # remap correct answer index after shuffle
        new_answer_pos = next(i for i, (orig_i, _) in enumerate(choices) if orig_i == q["answer"])
        shuffled_choices = [c[1] for c in choices]
        return {
            "category": category,
            "question": q["q"],
            "choices": shuffled_choices,
            "answer": new_answer_pos,
        }


rooms: dict[str, Room] = {}


def make_room_code() -> str:
    while True:
        code = "".join(random.choices(string.digits, k=4))
        if code not in rooms:
            return code


async def broadcast(room: Room, message: dict):
    dead = []
    for pid in room.order:
        p = room.players[pid]
        if p.ws is not None:
            try:
                await p.ws.send_json(message)
            except Exception:
                dead.append(pid)
    for pid in dead:
        room.players[pid].connected = False
        room.players[pid].ws = None


async def send_to(player: Player, message: dict):
    if player.ws is not None:
        try:
            await player.ws.send_json(message)
        except Exception:
            player.connected = False
            player.ws = None


@app.websocket("/ws/{code}/{player_name}")
async def ws_endpoint(websocket: WebSocket, code: str, player_name: str):
    await websocket.accept()
    code = code.upper()
    create_new = code == "NEW"

    if create_new:
        pack_id = websocket.query_params.get("pack", "turquie")
        if pack_id not in PACKS:
            pack_id = "turquie"
        code = make_room_code()
        room = Room(code, pack_id)
        rooms[code] = room
    else:
        room = rooms.get(code)
        if room is None:
            await websocket.send_json({"type": "error", "message": "Salon introuvable."})
            await websocket.close()
            return
        if room.state != "lobby" and player_name not in [room.players[p].name for p in room.order]:
            await websocket.send_json({"type": "error", "message": "La partie a deja commence."})
            await websocket.close()
            return
        if len(room.players) >= 5 and player_name not in [room.players[p].name for p in room.order]:
            await websocket.send_json({"type": "error", "message": "Salon complet (5 joueurs max)."})
            await websocket.close()
            return

    # reconnexion si meme nom
    existing = next((room.players[p] for p in room.order if room.players[p].name == player_name), None)
    if existing:
        existing.ws = websocket
        existing.connected = True
        player = existing
    else:
        player = room.add_player(player_name)
        player.ws = websocket

    await websocket.send_json({"type": "joined", "player_id": player.id, "code": room.code})
    await broadcast(room, room.public_state())

    try:
        while True:
            data = await websocket.receive_json()
            await handle_message(room, player, data)
    except WebSocketDisconnect:
        player.connected = False
        player.ws = None
        await broadcast(room, room.public_state())


async def handle_message(room: Room, player: Player, data: dict):
    msg_type = data.get("type")
    room.last_activity = time.monotonic()

    async with room.lock:
        if msg_type == "end_game":
            if not player.host:
                await send_to(player, {"type": "error", "message": "Seul l'hote peut terminer la partie."})
                return
            room.state = "cancelled"
            await broadcast(room, room.public_state())
            return

        if msg_type == "start":
            if not player.host:
                await send_to(player, {"type": "error", "message": "Seul l'hote peut lancer la partie."})
                return
            if len(room.players) < 2:
                await send_to(player, {"type": "error", "message": "Il faut au moins 2 joueurs."})
                return
            room.state = "playing"
            room.turn_index = 0
            await broadcast(room, room.public_state())
            return

        if room.state != "playing":
            return

        current = room.current_player()
        if current is None or current.id != player.id:
            await send_to(player, {"type": "error", "message": "Ce n'est pas votre tour."})
            return

        if msg_type == "roll":
            if room.pending_question is not None:
                return
            # si le joueur a deja toutes les parts du pack, on tente la question finale
            if len(player.wedges) == len(room.categories):
                category = random.choice(room.categories)
                q = room.pick_question(category)
                room.pending_question = {"player_id": player.id, "final": True, **q}
                await broadcast(room, {
                    "type": "question", "player_id": player.id, "category": q["category"],
                    "label": room.category_labels[q["category"]],
                    "question": q["question"], "choices": q["choices"], "final": True,
                })
                await broadcast(room, {"type": "info", "message": f"{player.name} tente la question finale !"})
                return

            roll = random.randint(1, 6)
            player.pos = (player.pos + roll) % BOARD_SIZE
            category = room.board[player.pos]
            await broadcast(room, {"type": "moved", "player_id": player.id, "roll": roll, "pos": player.pos, "category": category})

            q = room.pick_question(category)
            room.pending_question = {"player_id": player.id, "final": False, **q}
            await broadcast(room, {
                "type": "question", "player_id": player.id, "category": q["category"],
                "label": room.category_labels[q["category"]],
                "question": q["question"], "choices": q["choices"], "final": False,
            })
            return

        if msg_type == "answer":
            pq = room.pending_question
            if pq is None or pq["player_id"] != player.id:
                return
            choice = data.get("choice")
            correct = choice == pq["answer"]
            already_had_wedge = pq["category"] in player.wedges
            bonus_replay = False
            if correct and not pq["final"]:
                player.wedges.add(pq["category"])
                if already_had_wedge:
                    # Bonus : la tuile est deja acquise, une bonne reponse
                    # supplementaire fait rejouer le meme joueur au lieu de
                    # passer la main.
                    bonus_replay = True
            if correct and pq["final"]:
                player.finished = True
                room.winner = player.id
                room.state = "finished"

            await broadcast(room, {
                "type": "answer_public", "player_id": player.id, "category": pq["category"],
                "correct": correct, "final": pq["final"],
                "chosen_index": choice, "correct_index": pq["answer"],
                "bonus_replay": bonus_replay,
            })

            room.pending_question = None

            if room.state == "finished":
                await broadcast(room, room.public_state())
                return

            if not bonus_replay:
                room.advance_turn()
            await broadcast(room, room.public_state())
            return


# ─────────────────────────────────────────────────────────────────────────
# Jeu de l'Imposteur — multijoueur WebSocket  (/ws/imposteur/{code}/{name})
# Chaque joueur reste sur son propre téléphone. Min. 4 voyageurs.
# ─────────────────────────────────────────────────────────────────────────

IMPOSTEUR_MIN_PLAYERS = 4
IMPOSTEUR_MAX_PLAYERS = 10

imposteur_rooms: dict[str, "ImposteurRoom"] = {}


class ImposteurPlayer:
    def __init__(self, pid: str, name: str, host: bool = False):
        self.id = pid
        self.name = name
        self.host = host
        self.ws: Optional[WebSocket] = None
        self.connected = True
        self.eliminated = False
        self.is_impostor = False
        self.current_word: Optional[str] = None

    def public(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "host": self.host,
            "connected": self.connected,
            "eliminated": self.eliminated,
            "has_submitted": self.current_word is not None,
        }


class ImposteurRoom:
    def __init__(self, code: str):
        self.code = code
        self.state = "lobby"  # lobby | collecting_words | discussion | finished
        self.players: dict[str, ImposteurPlayer] = {}
        self.order: list[str] = []
        self.impostor_id: Optional[str] = None
        self.mot_vrai = ""
        self.mot_faux = ""
        self.round = 0
        self.max_rounds = 3
        self.rounds_history: list[list[dict]] = []
        self.eliminated_list: list[dict] = []
        self.winner: Optional[str] = None  # "vrais" | "imposteur"
        self.lock = asyncio.Lock()
        self.last_activity = time.monotonic()

    def add_player(self, name: str) -> "ImposteurPlayer":
        pid = f"imp{len(self.players) + 1}_{random.randint(1000, 9999)}"
        host = len(self.players) == 0
        player = ImposteurPlayer(pid, name, host)
        self.players[pid] = player
        self.order.append(pid)
        return player

    def active_players(self) -> list["ImposteurPlayer"]:
        return [self.players[pid] for pid in self.order if not self.players[pid].eliminated]

    def public_state(self) -> dict:
        active = self.active_players()
        submitted = sum(1 for p in active if p.current_word is not None)
        current_words: list[dict] = []
        if self.state == "discussion" and self.rounds_history:
            current_words = self.rounds_history[-1]
        all_rounds = self.rounds_history if self.state == "finished" else []
        return {
            "type": "room_state",
            "code": self.code,
            "state": self.state,
            "round": self.round,
            "max_rounds": self.max_rounds,
            "players": [self.players[pid].public() for pid in self.order],
            "active_count": len(active),
            "submitted_count": submitted,
            "current_words": current_words,
            "all_rounds": all_rounds,
            "eliminated_list": self.eliminated_list,
            "winner": self.winner,
            "min_players_required": IMPOSTEUR_MIN_PLAYERS,
        }


def make_imposteur_code() -> str:
    while True:
        code = "".join(random.choices(string.digits, k=4))
        if code not in imposteur_rooms:
            return code


async def broadcast_imposteur(room: "ImposteurRoom", message: dict) -> None:
    dead: list[str] = []
    for pid in room.order:
        p = room.players[pid]
        if p.ws is not None:
            try:
                await p.ws.send_json(message)
            except Exception:
                dead.append(pid)
    for pid in dead:
        room.players[pid].connected = False
        room.players[pid].ws = None


async def send_to_imp(player: "ImposteurPlayer", message: dict) -> None:
    if player.ws is not None:
        try:
            await player.ws.send_json(message)
        except Exception:
            player.connected = False
            player.ws = None


@app.websocket("/ws/imposteur/{code}/{player_name}")
async def ws_imposteur_endpoint(websocket: WebSocket, code: str, player_name: str):
    await websocket.accept()
    code = code.upper()
    create_new = code == "NEW"

    if create_new:
        code = make_imposteur_code()
        room = ImposteurRoom(code)
        imposteur_rooms[code] = room
    else:
        room = imposteur_rooms.get(code)
        if room is None:
            await websocket.send_json({"type": "error", "message": "Salon introuvable."})
            await websocket.close()
            return
        if room.state != "lobby" and player_name not in [room.players[p].name for p in room.order]:
            await websocket.send_json({"type": "error", "message": "La partie a deja commence."})
            await websocket.close()
            return
        if len(room.players) >= IMPOSTEUR_MAX_PLAYERS and player_name not in [room.players[p].name for p in room.order]:
            await websocket.send_json({"type": "error", "message": f"Salon complet ({IMPOSTEUR_MAX_PLAYERS} joueurs max)."})
            await websocket.close()
            return

    existing = next((room.players[p] for p in room.order if room.players[p].name == player_name), None)
    if existing:
        existing.ws = websocket
        existing.connected = True
        player = existing
        if room.state != "lobby" and room.impostor_id:
            mot = room.mot_faux if player.is_impostor else room.mot_vrai
            await send_to_imp(player, {"type": "role_assignment", "is_impostor": player.is_impostor, "mot": mot})
    else:
        player = room.add_player(player_name)
        player.ws = websocket

    await websocket.send_json({"type": "joined", "player_id": player.id, "code": room.code})
    await broadcast_imposteur(room, room.public_state())

    try:
        while True:
            data = await websocket.receive_json()
            await handle_imposteur_message(room, player, data)
    except WebSocketDisconnect:
        player.connected = False
        player.ws = None
        await broadcast_imposteur(room, room.public_state())


async def handle_imposteur_message(room: "ImposteurRoom", player: "ImposteurPlayer", data: dict) -> None:
    msg_type = data.get("type")
    room.last_activity = time.monotonic()

    async with room.lock:
        if msg_type == "end_game":
            if not player.host:
                await send_to_imp(player, {"type": "error", "message": "Seul l'hote peut terminer la partie."})
                return
            room.state = "finished"
            room.winner = None
            await broadcast_imposteur(room, room.public_state())
            return

        if msg_type == "play_again":
            if not player.host or room.state != "finished":
                return
            room.state = "lobby"
            room.round = 0
            room.impostor_id = None
            room.mot_vrai = ""
            room.mot_faux = ""
            room.rounds_history = []
            room.eliminated_list = []
            room.winner = None
            for p in room.players.values():
                p.eliminated = False
                p.is_impostor = False
                p.current_word = None
            await broadcast_imposteur(room, room.public_state())
            return

        if msg_type == "start_game":
            if not player.host:
                await send_to_imp(player, {"type": "error", "message": "Seul l'hote peut lancer la partie."})
                return
            active = room.active_players()
            if len(active) < IMPOSTEUR_MIN_PLAYERS:
                await send_to_imp(player, {"type": "error", "message": f"Il faut au moins {IMPOSTEUR_MIN_PLAYERS} joueurs."})
                return
            if room.state != "lobby":
                return
            mot_vrai = str(data.get("mot_vrai", "")).strip()
            mot_faux = str(data.get("mot_faux", "")).strip()
            if not mot_vrai:
                await send_to_imp(player, {"type": "error", "message": "Le mot vrai est obligatoire."})
                return
            room.mot_vrai = mot_vrai
            room.mot_faux = mot_faux
            impostor = random.choice(active)
            room.impostor_id = impostor.id
            impostor.is_impostor = True
            for pid in room.order:
                p = room.players[pid]
                mot = mot_faux if p.is_impostor else mot_vrai
                await send_to_imp(p, {"type": "role_assignment", "is_impostor": p.is_impostor, "mot": mot})
            room.state = "collecting_words"
            room.round = 1
            room.rounds_history = []
            for p in active:
                p.current_word = None
            await broadcast_imposteur(room, room.public_state())
            return

        if msg_type == "submit_word":
            if room.state != "collecting_words" or player.eliminated:
                return
            if player.current_word is not None:
                return  # déjà soumis
            word = str(data.get("word", "")).strip()
            if not word:
                await send_to_imp(player, {"type": "error", "message": "Veuillez ecrire un mot."})
                return
            if len(word) > 30:
                await send_to_imp(player, {"type": "error", "message": "Mot trop long (30 caracteres max)."})
                return
            player.current_word = word
            active = room.active_players()
            all_submitted = all(p.current_word is not None for p in active)
            await broadcast_imposteur(room, room.public_state())
            if all_submitted:
                round_words = [
                    {"player_id": p.id, "name": p.name, "word": p.current_word}
                    for p in [room.players[pid] for pid in room.order if not room.players[pid].eliminated]
                ]
                room.rounds_history.append(round_words)
                room.state = "discussion"
                for p in active:
                    p.current_word = None
                await broadcast_imposteur(room, room.public_state())
            return

        if msg_type == "eliminate_player":
            if not player.host or room.state != "discussion":
                return
            target_id = str(data.get("player_id", ""))
            target = room.players.get(target_id)
            if target is None or target.eliminated:
                return
            target.eliminated = True
            room.eliminated_list.append({
                "player_id": target.id,
                "name": target.name,
                "round": room.round,
                "was_impostor": target.is_impostor,
            })
            active = room.active_players()
            impostor = room.players.get(room.impostor_id) if room.impostor_id else None
            if impostor and impostor.eliminated:
                room.state = "finished"
                room.winner = "vrais"
            elif len(active) <= 2:
                room.state = "finished"
                room.winner = "imposteur"
            elif room.round >= room.max_rounds:
                room.state = "finished"
                room.winner = "imposteur"
            else:
                room.round += 1
                room.state = "collecting_words"
                for p in room.active_players():
                    p.current_word = None
            if room.state == "finished":
                await broadcast_imposteur(room, {
                    "type": "game_over",
                    "winner": room.winner,
                    "impostor_id": room.impostor_id,
                    "impostor_name": impostor.name if impostor else "?",
                    "mot_vrai": room.mot_vrai,
                    "mot_faux": room.mot_faux,
                })
            await broadcast_imposteur(room, room.public_state())
            return


app.mount("/", StaticFiles(directory=str(BASE_DIR / "static"), html=True), name="static")
