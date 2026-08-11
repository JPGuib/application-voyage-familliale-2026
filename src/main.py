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
        "categories": ["histoire", "gastronomie", "langue", "geographie", "culture", "souvenirs"],
        "category_labels": {
            "histoire": "Histoire & Empire ottoman",
            "gastronomie": "Gastronomie",
            "langue": "Langue & expressions",
            "geographie": "Geographie",
            "culture": "Culture & traditions",
            "souvenirs": "Vecu du groupe",
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
}

QUESTIONS_BY_PACK: dict[str, dict] = {}
for pack_id, pack_def in PACKS.items():
    with open(BASE_DIR / pack_def["questions_file"], encoding="utf-8") as f:
        QUESTIONS_BY_PACK[pack_id] = json.load(f)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Une partie oubliee (personne ne joue plus, onglet ferme sans "Terminer")
# est fermee automatiquement au bout d'un moment pour ne pas laisser tourner
# des salons morts indefiniment en memoire.
ROOM_LOBBY_TIMEOUT_SECONDS = 30 * 60       # 30 min sans demarrer la partie
ROOM_INACTIVITY_TIMEOUT_SECONDS = 3 * 60 * 60  # 3h sans aucune action


@app.on_event("startup")
async def start_cleanup_task():
    asyncio.create_task(cleanup_stale_rooms_loop())


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


@app.get("/health")
async def health():
    # Utilisé par les hébergeurs (Render, Railway...) pour vérifier que le
    # service est vivant, et pratique pour verifier rapidement le déploiement.
    return {"status": "ok", "rooms": len(rooms)}


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


app.mount("/", StaticFiles(directory=str(BASE_DIR / "static"), html=True), name="static")
