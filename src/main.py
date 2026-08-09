"""
Trivial Turquie - backend de jeu multijoueur (2 a 5 joueurs)
Chacun pour soi. Lancer avec: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import json
import random
import string
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).parent
CATEGORIES = ["histoire", "gastronomie", "langue", "geographie", "culture", "souvenirs"]
CATEGORY_LABELS = {
    "histoire": "Histoire & Empire ottoman",
    "gastronomie": "Gastronomie",
    "langue": "Langue & expressions",
    "geographie": "Geographie",
    "culture": "Culture & traditions",
    "souvenirs": "Vecu du groupe",
}
BOARD_SIZE = 24  # 24 cases, 4 tours de chaque categorie
COLORS = ["#e63946", "#2a9d8f", "#f4a261", "#457b9d", "#a663cc"]

with open(BASE_DIR / "questions.json", encoding="utf-8") as f:
    QUESTIONS = json.load(f)

app = FastAPI()


@app.get("/health")
async def health():
    # Utilisé par les hébergeurs (Render, Railway...) pour vérifier que le
    # service est vivant, et pratique pour verifier rapidement le déploiement.
    return {"status": "ok", "rooms": len(rooms)}


def build_board():
    # repartit les 6 categories sur 24 cases, dans un ordre mélangé mais fixe pour la session
    cells = []
    for _ in range(BOARD_SIZE // len(CATEGORIES)):
        cats = CATEGORIES[:]
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
    def __init__(self, code: str):
        self.code = code
        self.players: dict[str, Player] = {}
        self.order: list[str] = []
        self.turn_index = 0
        self.state = "lobby"  # lobby | playing | finished
        self.board = build_board()
        self.used_questions: dict[str, set[int]] = {c: set() for c in CATEGORIES}
        self.pending_question: Optional[dict] = None  # question en attente de reponse
        self.winner: Optional[str] = None
        self.lock = asyncio.Lock()

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
            "state": self.state,
            "board": self.board,
            "category_labels": CATEGORY_LABELS,
            "players": [self.players[pid].public() for pid in self.order],
            "current_player": self.order[self.turn_index] if self.order else None,
            "winner": self.winner,
        }

    def pick_question(self, category: str):
        bank = QUESTIONS.get(category, [])
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
        code = make_room_code()
        room = Room(code)
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

    async with room.lock:
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
            # si le joueur a deja les 6 parts, on tente la question finale
            if len(player.wedges) == len(CATEGORIES):
                category = random.choice(CATEGORIES)
                q = room.pick_question(category)
                room.pending_question = {"player_id": player.id, "final": True, **q}
                await send_to(player, {
                    "type": "question", "category": q["category"],
                    "label": CATEGORY_LABELS[q["category"]],
                    "question": q["question"], "choices": q["choices"], "final": True,
                })
                await broadcast(room, {"type": "info", "message": f"{player.name} tente la question finale !"})
                return

            roll = random.randint(1, 6)
            player.pos = (player.pos + roll) % BOARD_SIZE
            category = room.board[player.pos]
            await broadcast(room, {"type": "moved", "player_id": player.id, "roll": roll, "pos": player.pos, "category": category})

            if category in player.wedges:
                # deja la part -> pas de nouvelle question, tour suivant
                room.advance_turn()
                await broadcast(room, room.public_state())
                return

            q = room.pick_question(category)
            room.pending_question = {"player_id": player.id, "final": False, **q}
            await send_to(player, {
                "type": "question", "category": q["category"],
                "label": CATEGORY_LABELS[q["category"]],
                "question": q["question"], "choices": q["choices"], "final": False,
            })
            return

        if msg_type == "answer":
            pq = room.pending_question
            if pq is None or pq["player_id"] != player.id:
                return
            choice = data.get("choice")
            correct = choice == pq["answer"]
            if correct and not pq["final"]:
                player.wedges.add(pq["category"])
            if correct and pq["final"]:
                player.finished = True
                room.winner = player.id
                room.state = "finished"

            await send_to(player, {"type": "answer_result", "correct": correct, "answer": pq["answer"]})
            await broadcast(room, {
                "type": "answer_public", "player_id": player.id, "category": pq["category"],
                "correct": correct, "final": pq["final"],
            })

            room.pending_question = None

            if room.state == "finished":
                await broadcast(room, room.public_state())
                return

            room.advance_turn()
            await broadcast(room, room.public_state())
            return


app.mount("/", StaticFiles(directory=str(BASE_DIR / "static"), html=True), name="static")
