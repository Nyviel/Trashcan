const { nanoid } = require("./utils/nanoid");
const skribbl = require("./games/skribbl");
const codenames = require("./games/codenames");
const fakeArtist = require("./games/fake-artist");
const garticPhone = require("./games/gartic-phone");
const musicQuiz = require("./games/music-quiz");

const rooms = new Map();

const GAMES = {
	skribbl,
	codenames,
	"fake-artist": fakeArtist,
	"gartic-phone": garticPhone,
	"music-quiz": musicQuiz,
};

function createRoom(hostId, hostName) {
	const code = nanoid(6);
	const room = {
		code,
		hostId,
		players: [{ id: hostId, name: hostName, score: 0 }],
		game: null,
		selectedGame: "skribbl", // lobby selection, separate from active game
		gameState: null,
		status: "lobby", // lobby | playing | ended
	};
	rooms.set(code, room);
	return room;
}

function getRoom(code) {
	return rooms.get(code.toUpperCase()) || null;
}

function getRoomByPlayerId(playerId) {
	for (const room of rooms.values()) {
		if (room.players.find((p) => p.id === playerId)) return room;
	}
	return null;
}

function addPlayer(room, player) {
	if (!room.players.find((p) => p.id === player.id)) {
		room.players.push({ ...player, score: 0 });
	}
}

function removePlayer(room, playerId) {
	room.players = room.players.filter((p) => p.id !== playerId);
	if (room.players.length === 0) {
		rooms.delete(room.code);
		return null;
	}
	// Pass host to next player if host left
	if (room.hostId === playerId && room.players.length > 0) {
		room.hostId = room.players[0].id;
	}
	return room;
}

function safeRoom(room) {
	return {
		code: room.code,
		hostId: room.hostId,
		players: room.players,
		game: room.game,
		selectedGame: room.selectedGame || "skribbl",
		status: room.status,
	};
}

function registerRoomHandlers(io, socket) {
	// ── Create room ──────────────────────────────────────────────
	socket.on("room:create", ({ name }, cb) => {
		const room = createRoom(socket.id, name);
		socket.join(room.code);
		cb({ ok: true, room: safeRoom(room) });
		console.log(`[room] created ${room.code} by ${name}`);
	});

	// ── Join room ────────────────────────────────────────────────
	socket.on("room:join", ({ code, name }, cb) => {
		const room = getRoom(code);
		if (!room) return cb({ ok: false, error: "Room not found" });
		if (room.status === "playing")
			return cb({ ok: false, error: "Game already in progress" });

		addPlayer(room, { id: socket.id, name });
		socket.join(room.code);
		io.to(room.code).emit("room:updated", safeRoom(room));
		cb({ ok: true, room: safeRoom(room) });
		console.log(`[room] ${name} joined ${room.code}`);
	});

	// ── Reconnect (same name, different socket) ──────────────────
	socket.on("room:rejoin", ({ code, name }, cb) => {
		const room = getRoom(code);
		if (!room) return cb({ ok: false, error: "Room not found" });

		const existing = room.players.find((p) => p.name === name);
		if (existing) {
			existing.id = socket.id;
			if (room.hostId === existing.id) room.hostId = socket.id;
		} else {
			addPlayer(room, { id: socket.id, name });
		}
		socket.join(room.code);
		io.to(room.code).emit("room:updated", safeRoom(room));

		// If game is in progress, send current game state
		if (room.status === "playing" && room.gameState) {
			const gameModule = GAMES[room.game];
			if (gameModule?.getClientState) {
				socket.emit(
					"game:state",
					gameModule.getClientState(room, socket.id),
				);
			}
		}
		cb({ ok: true, room: safeRoom(room) });
	});

	// ── Start game ───────────────────────────────────────────────
	socket.on("game:start", ({ game, config }, cb) => {
		const room = getRoomByPlayerId(socket.id);
		if (!room) return cb?.({ ok: false, error: "Not in a room" });
		if (room.hostId !== socket.id)
			return cb?.({ ok: false, error: "Only the host can start" });
		if (room.players.length < 2)
			return cb?.({ ok: false, error: "Need at least 2 players" });

		const gameModule = GAMES[game];
		if (!gameModule) return cb?.({ ok: false, error: "Unknown game" });

		room.game = game;
		room.status = "playing";
		room.gameState = gameModule.init(room, config);

		io.to(room.code).emit("room:updated", safeRoom(room));
		gameModule.start(io, socket, room);
		cb?.({ ok: true });
		console.log(`[game] started ${game} in ${room.code}`);
	});

	// ── Host selects game in lobby ────────────────────────────────
	socket.on("lobby:selectGame", ({ game }) => {
		const room = getRoomByPlayerId(socket.id);
		if (!room || room.hostId !== socket.id || room.status !== "lobby")
			return;
		room.selectedGame = game;
		socket.to(room.code).emit("lobby:gameSelected", { game });
	});

	// ── Return to lobby ──────────────────────────────────────────
	socket.on("game:returnToLobby", () => {
		const room = getRoomByPlayerId(socket.id);
		if (!room || room.hostId !== socket.id) return;
		room.status = "lobby";
		room.game = null;
		room.gameState = null;
		room.players.forEach((p) => (p.score = 0));
		io.to(room.code).emit("room:updated", safeRoom(room));
		io.to(room.code).emit("game:returnedToLobby");
	});

	// ── Disconnect ───────────────────────────────────────────────
	socket.on("disconnect", () => {
		const room = getRoomByPlayerId(socket.id);
		if (!room) return;
		const updated = removePlayer(room, socket.id);
		if (updated) {
			io.to(room.code).emit("room:updated", safeRoom(updated));
		}
	});

	// ── Delegate game events ─────────────────────────────────────
	socket.onAny((event, ...args) => {
		if (!event.includes(":")) return;
		const room = getRoomByPlayerId(socket.id);
		if (!room || room.status !== "playing") return;
		// Match by game ID prefix — supports hyphenated IDs like 'fake-artist', 'gartic-phone'
		// Event format: '<gameId>:<action>' e.g. 'fake-artist:setWord', 'gartic-phone:submitText'
		// Also handle shorthand prefixes: 'fake:*' -> 'fake-artist', 'gartic:*' -> 'gartic-phone'
		const ALIASES = {
			fake: "fake-artist",
			gartic: "gartic-phone",
			music: "music-quiz",
		};
		const [rawNs] = event.split(":");
		const ns = ALIASES[rawNs] || rawNs;
		const gameModule = GAMES[ns];
		if (!gameModule) return;
		if (room.game !== ns) return;
		gameModule.handleEvent?.(io, socket, room, event, args);
	});
}

module.exports = { registerRoomHandlers, getRoom, getRoomByPlayerId };
