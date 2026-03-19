// Fake Artist
// Game Master (host) picks a word. Everyone is told the word except one random
// Fake Artist who sees "?". Players take 2 full rounds adding exactly 1 stroke
// each. Then everyone votes. If the Fake is caught they get one last chance to
// guess the word — correct guess means they still win.

function init(room, config = {}) {
	const strokeTime = Math.min(
		Math.max(parseInt(config.strokeTime) || 30, 10),
		120,
	);

	// Host is always Game Master — exclude from drawing order
	const drawers = room.players.filter((p) => p.id !== room.hostId);
	const fakeIndex = Math.floor(Math.random() * drawers.length);

	return {
		strokeTime,
		phase: "wordPick", // wordPick | drawing | voting | fakeGuess | ended
		word: null,
		category: null,
		drawers, // ordered list of non-host players
		fakeId: drawers[fakeIndex]?.id || null,
		currentDrawerIndex: 0,
		currentRound: 0, // 0-based, 2 rounds total
		totalRounds: 2,
		strokes: [], // full canvas history for replay
		votes: {}, // voterId -> suspectId
		winner: null, // 'real' | 'fake'
		strokeTimer: null,
	};
}

function getDrawer(state) {
	return state.drawers[state.currentDrawerIndex % state.drawers.length];
}

function buildClientState(room, playerId) {
	const state = room.gameState;
	const isHost = playerId === room.hostId;
	const isFake = playerId === state.fakeId;
	return {
		phase: state.phase,
		word:
			state.phase === "wordPick" && isHost
				? null
				: isFake
					? "?"
					: state.word,
		category: state.category,
		currentDrawerId: getDrawer(state)?.id,
		currentDrawerName: getDrawer(state)?.name,
		currentRound: state.currentRound,
		totalRounds: state.totalRounds,
		strokeTime: state.strokeTime,
		drawers: state.drawers,
		fakeId: ["voting", "fakeGuess", "ended"].includes(state.phase)
			? state.fakeId
			: null,
		votes: state.phase === "ended" ? state.votes : {},
		winner: state.winner,
		isGameMaster: isHost,
		isFake,
		strokes: state.strokes,
	};
}

function broadcastState(io, room) {
	room.players.forEach((p) => {
		io.to(p.id).emit("fake:state", buildClientState(room, p.id));
	});
}

function startDrawingPhase(io, room) {
	const state = room.gameState;
	state.phase = "drawing";
	state.currentDrawerIndex = 0;
	state.currentRound = 0;
	broadcastState(io, room);
	startStrokeTurn(io, room);
}

function startStrokeTurn(io, room) {
	const state = room.gameState;
	clearTimeout(state.strokeTimer);

	const drawer = getDrawer(state);
	io.to(room.code).emit("fake:turnStart", {
		drawerId: drawer.id,
		drawerName: drawer.name,
		timeLeft: state.strokeTime,
		round: state.currentRound,
	});

	state.strokeTimer = setTimeout(() => {
		if (state.phase === "drawing") advanceStroke(io, room);
	}, state.strokeTime * 1000);
}

function advanceStroke(io, room) {
	const state = room.gameState;
	clearTimeout(state.strokeTimer);
	state.currentDrawerIndex++;

	const completedRound =
		state.currentDrawerIndex % state.drawers.length === 0;
	if (completedRound) state.currentRound++;

	if (state.currentRound >= state.totalRounds) {
		startVoting(io, room);
	} else {
		broadcastState(io, room);
		startStrokeTurn(io, room);
	}
}

function startVoting(io, room) {
	const state = room.gameState;
	state.phase = "voting";
	state.votes = {};
	// Eligible voters: drawers who are NOT the fake artist
	const eligibleVoters = state.drawers.filter((p) => p.id !== state.fakeId);
	broadcastState(io, room);
	io.to(room.code).emit("fake:votingStarted", {
		drawers: state.drawers,
		totalVoters: eligibleVoters.length,
	});
}

function checkVotesComplete(io, room) {
	const state = room.gameState;
	// Only real players vote — not the host (Game Master) and not the fake artist
	const eligibleVoters = state.drawers.filter((p) => p.id !== state.fakeId);
	const allVoted = eligibleVoters.every((p) => state.votes[p.id]);
	if (!allVoted) return;

	// Tally votes
	const tally = {};
	Object.values(state.votes).forEach((suspectId) => {
		tally[suspectId] = (tally[suspectId] || 0) + 1;
	});
	const mostVoted = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
	const caughtId = mostVoted?.[0];
	const caught = caughtId === state.fakeId;

	io.to(room.code).emit("fake:voteResult", {
		tally,
		caughtId,
		fakeId: state.fakeId,
		caught,
	});

	if (caught) {
		// Give fake a chance to guess the word
		state.phase = "fakeGuess";
		broadcastState(io, room);
		io.to(state.fakeId).emit("fake:guessPrompt");
		// Auto-resolve after 20s if no guess
		state.strokeTimer = setTimeout(() => {
			if (state.phase === "fakeGuess")
				endGame(io, room, "real", "timeout");
		}, 20000);
	} else {
		endGame(io, room, "fake", "not_caught");
	}
}

function endGame(io, room, winner, reason) {
	const state = room.gameState;
	clearTimeout(state.strokeTimer);
	state.phase = "ended";
	state.winner = winner;
	room.status = "ended";

	// Score: winning side gets 500pts each
	room.players.forEach((p) => {
		const isFake = p.id === state.fakeId;
		const won =
			(winner === "fake" && isFake) ||
			(winner === "real" && !isFake && p.id !== room.hostId);
		if (won) p.score += 500;
	});

	broadcastState(io, room);
	io.to(room.code).emit("game:ended", {
		game: "fake-artist",
		winner,
		reason,
		fakeId: state.fakeId,
		word: state.word,
		players: room.players,
		scores: Object.fromEntries(room.players.map((p) => [p.id, p.score])),
	});
}

function start(io, socket, room) {
	broadcastState(io, room);
	io.to(room.code).emit("fake:gameStarted", {
		drawers: room.gameState.drawers,
		strokeTime: room.gameState.strokeTime,
	});
}

function handleEvent(io, socket, room, event, args) {
	const state = room.gameState;
	const [data] = args;

	switch (event) {
		case "fake:setWord": {
			if (socket.id !== room.hostId || state.phase !== "wordPick") return;
			if (!data?.word?.trim()) return;
			state.word = data.word.trim();
			state.category = data.category?.trim() || null;
			startDrawingPhase(io, room);
			break;
		}

		case "fake:draw": {
			if (state.phase !== "drawing") return;
			const drawer = getDrawer(state);
			if (socket.id !== drawer.id) return;
			// Relay each line segment to everyone else (same as skribbl)
			socket.to(room.code).emit("fake:draw", data);
			break;
		}

		case "fake:canvasClear": {
			if (state.phase !== "drawing") return;
			const drawer = getDrawer(state);
			if (socket.id !== drawer.id) return;
			socket.to(room.code).emit("fake:canvasClear");
			break;
		}

		case "fake:strokeDone": {
			// Drawer lifts mouse — their stroke is complete, advance turn
			if (state.phase !== "drawing") return;
			const drawer = getDrawer(state);
			if (socket.id !== drawer.id) return;
			advanceStroke(io, room);
			break;
		}

		case "fake:skipStroke": {
			// Drawer passes without drawing (allowed)
			if (state.phase !== "drawing") return;
			const drawer = getDrawer(state);
			if (socket.id !== drawer.id) return;
			advanceStroke(io, room);
			break;
		}

		case "fake:vote": {
			if (state.phase !== "voting") return;
			if (socket.id === room.hostId) return; // Game Master can't vote
			if (socket.id === state.fakeId) return; // Fake Artist can't vote
			if (!state.drawers.find((p) => p.id === socket.id)) return;
			state.votes[socket.id] = data.suspectId;
			const eligibleVoters = state.drawers.filter(
				(p) => p.id !== state.fakeId,
			);
			io.to(room.code).emit("fake:voteUpdate", {
				votedCount: Object.keys(state.votes).length,
				totalVoters: eligibleVoters.length,
			});
			checkVotesComplete(io, room);
			break;
		}

		case "fake:guessWord": {
			if (state.phase !== "fakeGuess") return;
			if (socket.id !== state.fakeId) return;
			const guess = (data?.word || "").trim().toLowerCase();
			const correct = guess === state.word.toLowerCase();
			clearTimeout(state.strokeTimer);
			if (correct) {
				endGame(io, room, "fake", "guessed_word");
			} else {
				endGame(io, room, "real", "wrong_guess");
			}
			break;
		}
	}
}

function getClientState(room, playerId) {
	return buildClientState(room, playerId);
}

module.exports = { init, start, handleEvent, getClientState };
