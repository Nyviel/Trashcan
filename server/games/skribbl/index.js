const WORDS = require("./words");

function pickWords(count) {
	const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

function init(room, config = {}) {
	const totalRounds = Math.min(Math.max(parseInt(config.rounds) || 3, 1), 10);
	const drawTime = Math.min(
		Math.max(parseInt(config.drawTime) || 80, 20),
		180,
	);

	return {
		totalRounds,
		drawTime,
		currentRound: 0,
		currentDrawerIndex: 0,
		currentWord: null,
		wordChoices: [],
		phase: "waiting", // waiting | choosing | drawing | reveal
		guessedPlayers: [],
		scores: {},
		drawTimer: null,
		chooseTimer: null,
	};
}

function getDrawer(room) {
	return room.players[
		room.gameState.currentDrawerIndex % room.players.length
	];
}

function startWordChoose(io, room) {
	const state = room.gameState;
	state.phase = "choosing";
	state.wordChoices = pickWords(3);
	state.guessedPlayers = [];

	const drawer = getDrawer(room);

	// Send word choices only to drawer
	io.to(drawer.id).emit("skribbl:wordChoices", { words: state.wordChoices });

	// Tell everyone else we're choosing
	io.to(room.code).emit("skribbl:phaseChanged", {
		phase: "choosing",
		drawer: drawer.name,
		drawerId: drawer.id,
		currentRound: state.currentRound,
		totalRounds: state.totalRounds,
	});

	// Auto-pick if drawer doesn't choose in time
	state.chooseTimer = setTimeout(() => {
		if (state.phase === "choosing") {
			selectWord(io, room, state.wordChoices[0]);
		}
	}, 15000);
}

function selectWord(io, room, word) {
	const state = room.gameState;
	clearTimeout(state.chooseTimer);
	state.currentWord = word;
	state.phase = "drawing";

	const drawer = getDrawer(room);
	const hint = word.replace(/[a-zA-Z]/g, "_");

	// Drawer gets the real word
	io.to(drawer.id).emit("skribbl:wordSelected", { word, hint });

	// Everyone else gets blanks
	room.players.forEach((p) => {
		if (p.id !== drawer.id) {
			io.to(p.id).emit("skribbl:wordSelected", { word: null, hint });
		}
	});

	io.to(room.code).emit("skribbl:phaseChanged", {
		phase: "drawing",
		drawer: drawer.name,
		drawerId: drawer.id,
		hint,
		timeLeft: state.drawTime,
		currentRound: state.currentRound,
		totalRounds: state.totalRounds,
	});

	// Draw timer
	state.drawTimer = setTimeout(() => {
		if (state.phase === "drawing") endTurn(io, room);
	}, state.drawTime * 1000);
}

function endTurn(io, room) {
	const state = room.gameState;
	clearTimeout(state.drawTimer);
	clearTimeout(state.chooseTimer);
	state.phase = "reveal";

	io.to(room.code).emit("skribbl:turnEnded", {
		word: state.currentWord,
		scores: buildScoreMap(room),
		currentRound: state.currentRound,
		totalRounds: state.totalRounds,
	});

	setTimeout(() => advanceTurn(io, room), 4000);
}

function advanceTurn(io, room) {
	const state = room.gameState;
	state.currentDrawerIndex++;

	const completedFullRound =
		state.currentDrawerIndex % room.players.length === 0;
	if (completedFullRound) state.currentRound++;

	if (state.currentRound >= state.totalRounds) {
		endGame(io, room);
	} else {
		startWordChoose(io, room);
	}
}

function endGame(io, room) {
	const state = room.gameState;
	state.phase = "ended";
	clearTimeout(state.drawTimer);
	clearTimeout(state.chooseTimer);
	room.status = "ended";

	io.to(room.code).emit("game:ended", {
		game: "skribbl",
		scores: buildScoreMap(room),
		players: room.players,
	});
}

function buildScoreMap(room) {
	const map = {};
	room.players.forEach((p) => (map[p.id] = p.score));
	return map;
}

function start(io, socket, room) {
	io.to(room.code).emit("skribbl:gameStarted", {
		totalRounds: room.gameState.totalRounds,
		drawTime: room.gameState.drawTime,
		players: room.players,
	});
	setTimeout(() => startWordChoose(io, room), 2000);
}

function handleEvent(io, socket, room, event, args) {
	const state = room.gameState;
	const [data, cb] = args;

	switch (event) {
		case "skribbl:wordChosen": {
			if (socket.id !== getDrawer(room).id) return;
			if (state.phase !== "choosing") return;
			const chosen = state.wordChoices.find((w) => w === data?.word);
			if (chosen) selectWord(io, room, chosen);
			break;
		}

		case "skribbl:draw": {
			if (socket.id !== getDrawer(room).id) return;
			if (state.phase !== "drawing") return;
			// Relay stroke to everyone else
			socket.to(room.code).emit("skribbl:draw", data);
			break;
		}

		case "skribbl:canvasClear": {
			if (socket.id !== getDrawer(room).id) return;
			socket.to(room.code).emit("skribbl:canvasClear");
			break;
		}

		case "skribbl:guess": {
			if (state.phase !== "drawing") return;
			const drawer = getDrawer(room);
			if (socket.id === drawer.id) return;
			if (state.guessedPlayers.includes(socket.id)) return;

			const guess = (data?.text || "").trim().toLowerCase();
			const correct = guess === state.currentWord.toLowerCase();

			io.to(room.code).emit("skribbl:chatMessage", {
				playerId: socket.id,
				playerName: room.players.find((p) => p.id === socket.id)?.name,
				text: correct ? "✓ guessed it!" : data?.text,
				correct,
			});

			if (correct) {
				state.guessedPlayers.push(socket.id);
				// Score: faster = more points (max 500, min 100)
				const elapsed =
					state.drawTime - (state.drawTimer._idleTimeout / 1000 || 0);
				const points = Math.max(
					100,
					Math.round(500 - (elapsed / state.drawTime) * 400),
				);
				const player = room.players.find((p) => p.id === socket.id);
				if (player) player.score += points;
				// Drawer also gets points per correct guesser
				const drawerPlayer = room.players.find(
					(p) => p.id === drawer.id,
				);
				if (drawerPlayer) drawerPlayer.score += 50;

				io.to(socket.id).emit("skribbl:correctGuess", { points });
				io.to(room.code).emit("skribbl:scoreUpdate", {
					scores: buildScoreMap(room),
				});

				// End turn if everyone guessed
				const nonDrawers = room.players.filter(
					(p) => p.id !== drawer.id,
				);
				if (state.guessedPlayers.length >= nonDrawers.length) {
					endTurn(io, room);
				}
			}
			break;
		}
	}
}

function getClientState(room, playerId) {
	const state = room.gameState;
	const drawer = getDrawer(room);
	return {
		phase: state.phase,
		drawer: drawer.name,
		drawerId: drawer.id,
		hint: state.currentWord
			? playerId === drawer.id
				? state.currentWord
				: state.currentWord.replace(/[a-zA-Z]/g, "_")
			: null,
		scores: buildScoreMap(room),
		totalRounds: state.totalRounds,
		currentRound: state.currentRound,
	};
}

module.exports = { init, start, handleEvent, getClientState };
