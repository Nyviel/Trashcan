const WORDS = require("./words");

const CARD_TYPES = {
	RED: "red",
	BLUE: "blue",
	NEUTRAL: "neutral",
	ASSASSIN: "assassin",
};

function generateBoard() {
	const shuffled = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 25);
	const types = [
		...Array(9).fill(CARD_TYPES.RED), // Red goes first (9 cards)
		...Array(8).fill(CARD_TYPES.BLUE),
		...Array(7).fill(CARD_TYPES.NEUTRAL),
		...Array(1).fill(CARD_TYPES.ASSASSIN),
	].sort(() => Math.random() - 0.5);

	return shuffled.map((word, i) => ({
		word,
		type: types[i],
		revealed: false,
	}));
}

function init(room, config = {}) {
	const board = generateBoard();
	return {
		board,
		redTeam: [],
		blueTeam: [],
		redSpymaster: null,
		blueSpymaster: null,
		currentTeam: "red",
		phase: "setup", // setup | spymaster | guessing | ended
		clue: null,
		clueCount: 0,
		guessesLeft: 0,
		redRevealed: 0,
		blueRevealed: 0,
		winner: null,
	};
}

function getClientBoard(board, playerId, state) {
	const isSpymaster =
		playerId === state.redSpymaster || playerId === state.blueSpymaster;
	return board.map((card) => ({
		word: card.word,
		revealed: card.revealed,
		type: card.revealed || isSpymaster ? card.type : null,
	}));
}

function getClientState(room, playerId) {
	const state = room.gameState;
	return {
		phase: state.phase,
		board: getClientBoard(state.board, playerId, state),
		redTeam: state.redTeam,
		blueTeam: state.blueTeam,
		redSpymaster: state.redSpymaster,
		blueSpymaster: state.blueSpymaster,
		currentTeam: state.currentTeam,
		clue: state.clue,
		clueCount: state.clueCount,
		guessesLeft: state.guessesLeft,
		redRevealed: state.redRevealed,
		blueRevealed: state.blueRevealed,
		winner: state.winner,
	};
}

function broadcastState(io, room) {
	room.players.forEach((p) => {
		io.to(p.id).emit("codenames:state", getClientState(room, p.id));
	});
}

function start(io, socket, room) {
	// Auto-assign players to teams
	const state = room.gameState;
	room.players.forEach((p, i) => {
		if (i % 2 === 0) state.redTeam.push(p.id);
		else state.blueTeam.push(p.id);
	});

	io.to(room.code).emit("codenames:started", {
		players: room.players,
	});

	broadcastState(io, room);
}

function handleEvent(io, socket, room, event, args) {
	const state = room.gameState;
	const [data] = args;

	switch (event) {
		case "codenames:joinTeam": {
			const { team } = data;
			state.redTeam = state.redTeam.filter((id) => id !== socket.id);
			state.blueTeam = state.blueTeam.filter((id) => id !== socket.id);
			if (state.redSpymaster === socket.id) state.redSpymaster = null;
			if (state.blueSpymaster === socket.id) state.blueSpymaster = null;
			if (team === "red") state.redTeam.push(socket.id);
			else state.blueTeam.push(socket.id);
			broadcastState(io, room);
			break;
		}

		case "codenames:claimSpymaster": {
			const onRed = state.redTeam.includes(socket.id);
			const onBlue = state.blueTeam.includes(socket.id);
			if (onRed && !state.redSpymaster) {
				state.redSpymaster = socket.id;
				broadcastState(io, room);
			} else if (onBlue && !state.blueSpymaster) {
				state.blueSpymaster = socket.id;
				broadcastState(io, room);
			}

			// Both spymasters assigned → begin
			if (
				state.redSpymaster &&
				state.blueSpymaster &&
				state.phase === "setup"
			) {
				state.phase = "spymaster";
				io.to(room.code).emit("codenames:phaseChanged", {
					phase: "spymaster",
					currentTeam: state.currentTeam,
				});
				broadcastState(io, room);
			}
			break;
		}

		case "codenames:giveClue": {
			const spymasterId =
				state.currentTeam === "red"
					? state.redSpymaster
					: state.blueSpymaster;
			if (socket.id !== spymasterId) return;
			if (state.phase !== "spymaster") return;

			state.clue = data.clue?.trim();
			state.clueCount = Math.min(
				Math.max(parseInt(data.count) || 1, 1),
				9,
			);
			state.guessesLeft = state.clueCount + 1; // +1 bonus guess
			state.phase = "guessing";

			io.to(room.code).emit("codenames:clueGiven", {
				clue: state.clue,
				count: state.clueCount,
				team: state.currentTeam,
			});
			broadcastState(io, room);
			break;
		}

		case "codenames:guess": {
			const activeTeam =
				state.currentTeam === "red" ? state.redTeam : state.blueTeam;
			const spymasterId =
				state.currentTeam === "red"
					? state.redSpymaster
					: state.blueSpymaster;
			if (!activeTeam.includes(socket.id) || socket.id === spymasterId)
				return;
			if (state.phase !== "guessing") return;

			const cardIndex = data.index;
			const card = state.board[cardIndex];
			if (!card || card.revealed) return;

			card.revealed = true;

			if (card.type === CARD_TYPES.ASSASSIN) {
				const winner = state.currentTeam === "red" ? "blue" : "red";
				endGame(io, room, winner, "assassin");
				return;
			}

			if (card.type === "red") state.redRevealed++;
			if (card.type === "blue") state.blueRevealed++;

			// Check win conditions
			if (state.redRevealed >= 9) {
				endGame(io, room, "red", "found_all");
				return;
			}
			if (state.blueRevealed >= 8) {
				endGame(io, room, "blue", "found_all");
				return;
			}

			io.to(room.code).emit("codenames:cardRevealed", {
				index: cardIndex,
				type: card.type,
				word: card.word,
			});

			// Wrong team card or neutral → end turn
			if (card.type !== state.currentTeam) {
				endTurn(io, room);
				return;
			}

			state.guessesLeft--;
			if (state.guessesLeft <= 0) endTurn(io, room);
			else broadcastState(io, room);
			break;
		}

		case "codenames:highlight": {
			// Broadcast tile highlight to all teammates (purely visual, no game state change)
			const team = state.redTeam.includes(socket.id) ? "red" : "blue";
			const playerName = room.players.find(
				(p) => p.id === socket.id,
			)?.name;
			io.to(room.code).emit("codenames:highlighted", {
				index: data?.index ?? null,
				playerId: socket.id,
				playerName,
				team,
			});
			break;
		}

		case "codenames:endTurn": {
			const activeTeam =
				state.currentTeam === "red" ? state.redTeam : state.blueTeam;
			if (!activeTeam.includes(socket.id)) return;
			if (state.phase !== "guessing") return;
			endTurn(io, room);
			break;
		}
	}
}

function endTurn(io, room) {
	const state = room.gameState;
	state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
	state.phase = "spymaster";
	state.clue = null;
	state.clueCount = 0;
	state.guessesLeft = 0;

	io.to(room.code).emit("codenames:phaseChanged", {
		phase: "spymaster",
		currentTeam: state.currentTeam,
	});
	broadcastState(io, room);
}

function endGame(io, room, winner, reason) {
	const state = room.gameState;
	state.winner = winner;
	state.phase = "ended";
	room.status = "ended";

	// Reveal full board
	const fullBoard = state.board.map((c) => ({ ...c, type: c.type }));

	// Score: winning team gets 1000 pts each
	room.players.forEach((p) => {
		const onWinningTeam =
			winner === "red"
				? state.redTeam.includes(p.id)
				: state.blueTeam.includes(p.id);
		if (onWinningTeam) p.score += 1000;
	});

	io.to(room.code).emit("game:ended", {
		game: "codenames",
		winner,
		reason,
		board: fullBoard,
		scores: Object.fromEntries(room.players.map((p) => [p.id, p.score])),
		players: room.players,
	});
}

module.exports = { init, start, handleEvent, getClientState };
