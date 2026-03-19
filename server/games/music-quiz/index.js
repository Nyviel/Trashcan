// Music Quiz
// Each player searches and picks a song via iTunes API (proxied through server).
// Host starts once all players have picked. Songs play in random order.
// After each song: reveal answer + scores. After all songs: back to pick phase.
// Host can return to main lobby from pick phase.

function init(room, config = {}) {
	return {
		phase: "picking", // picking | playing | reveal | ended
		picks: {}, // playerId -> { trackId, trackName, artistName, artworkUrl, previewUrl }
		order: [], // shuffled playerIds — song play order
		currentIndex: 0, // index into order
		guesses: {}, // playerId -> { title, artist, titleCorrect, artistCorrect, points, timestamp }
		scores: {}, // playerId -> cumulative score
		roundStartTime: null,
		previewDuration: 30, // seconds — iTunes previews are 30s
	};
}

function safeState(room, playerId) {
	const state = room.gameState;
	const currentSongOwnerId = state.order[state.currentIndex];
	const currentPick = state.picks[currentSongOwnerId];

	return {
		phase: state.phase,
		picks: Object.fromEntries(
			Object.entries(state.picks).map(([pid, pick]) => [
				pid,
				{
					picked: true,
					trackName: pick.trackName,
					artistName: pick.artistName,
				},
			]),
		),
		pickedPlayerIds: Object.keys(state.picks),
		order: state.order,
		currentIndex: state.currentIndex,
		currentSongOwnerId,
		// Only reveal song details after reveal phase or to the picker themselves
		currentSong: currentPick
			? {
					previewUrl: currentPick.previewUrl,
					artworkUrl: currentPick.artworkUrl,
					trackName:
						state.phase === "reveal" ? currentPick.trackName : null,
					artistName:
						state.phase === "reveal"
							? currentPick.artistName
							: null,
				}
			: null,
		guesses:
			state.phase === "reveal"
				? state.guesses
				: buildPublicGuesses(state.guesses),
		scores: state.scores,
		roundStartTime: state.roundStartTime,
		previewDuration: state.previewDuration,
		totalSongs: state.order.length,
	};
}

function buildPublicGuesses(guesses) {
	// During playing phase only show who has guessed, not what they guessed
	const pub = {};
	Object.entries(guesses).forEach(([pid, g]) => {
		pub[pid] = { hasGuessed: true, titleCorrect: g.titleCorrect };
	});
	return pub;
}

function broadcastState(io, room) {
	room.players.forEach((p) => {
		io.to(p.id).emit("music:state", safeState(room, p.id));
	});
}

function fuzzyMatch(guess, target) {
	const norm = (s) =>
		s
			.toLowerCase()
			.replace(/[^a-z0-9 ]/g, "")
			.replace(/\s+/g, " ")
			.trim();
	const g = norm(guess);
	const t = norm(target);
	return g === t || t.includes(g) || g.includes(t);
}

function startRound(io, room) {
	const state = room.gameState;
	if (state.currentIndex >= state.order.length) {
		state.phase = "picking";
		state.picks = {};
		state.order = [];
		state.currentIndex = 0;
		state.guesses = {};
		broadcastState(io, room);
		io.to(room.code).emit("music:allSongsPlayed");
		return;
	}

	state.phase = "playing";
	state.guesses = {};
	state.roundStartTime = Date.now();

	const currentSongOwnerId = state.order[state.currentIndex];

	// Broadcast full state first so clients have currentSong before roundStarted fires
	broadcastState(io, room);

	io.to(room.code).emit("music:roundStarted", {
		currentIndex: state.currentIndex,
		totalSongs: state.order.length,
		currentSongOwnerId,
		currentSongOwnerName: room.players.find(
			(p) => p.id === currentSongOwnerId,
		)?.name,
	});

	state.roundTimer = setTimeout(
		() => {
			if (state.phase === "playing") endRound(io, room);
		},
		(state.previewDuration + 2) * 1000,
	);
}

function endRound(io, room) {
	const state = room.gameState;
	clearTimeout(state.roundTimer);
	state.phase = "reveal";

	const currentSongOwnerId = state.order[state.currentIndex];
	const currentPick = state.picks[currentSongOwnerId];

	// Award picker bonus: +100 per correct guesser
	const correctGuessers = Object.values(state.guesses).filter(
		(g) => g.titleCorrect,
	).length;
	if (correctGuessers > 0) {
		state.scores[currentSongOwnerId] =
			(state.scores[currentSongOwnerId] || 0) + correctGuessers * 100;
	}

	broadcastState(io, room);
	io.to(room.code).emit("music:roundEnded", {
		trackName: currentPick?.trackName,
		artistName: currentPick?.artistName,
		artworkUrl: currentPick?.artworkUrl,
		guesses: state.guesses,
		scores: state.scores,
	});
}

function start(io, socket, room) {
	const state = room.gameState;
	state.order = Object.keys(state.picks).sort(() => Math.random() - 0.5);
	state.currentIndex = 0;
	state.scores = {};
	room.players.forEach((p) => {
		state.scores[p.id] = 0;
	});
	// Don't call the module start() from here — startRound handles everything
	setTimeout(() => startRound(io, room), 1500);
}

function handleEvent(io, socket, room, event, args) {
	const state = room.gameState;
	const [data] = args;

	switch (event) {
		case "music:pickSong": {
			if (state.phase !== "picking") return;
			const { trackId, trackName, artistName, artworkUrl, previewUrl } =
				data;
			if (!previewUrl) return;
			state.picks[socket.id] = {
				trackId,
				trackName,
				artistName,
				artworkUrl,
				previewUrl,
			};
			broadcastState(io, room);
			io.to(room.code).emit("music:playerPicked", {
				playerId: socket.id,
				playerName: room.players.find((p) => p.id === socket.id)?.name,
			});
			break;
		}

		case "music:unpickSong": {
			if (state.phase !== "picking") return;
			delete state.picks[socket.id];
			broadcastState(io, room);
			break;
		}

		case "music:startGame": {
			if (socket.id !== room.hostId) return;
			if (state.phase !== "picking") return;
			const pickedCount = Object.keys(state.picks).length;
			if (pickedCount < 2) return;
			start(io, socket, room);
			break;
		}

		case "music:nextRound": {
			if (socket.id !== room.hostId) return;
			if (state.phase !== "reveal") return;
			state.currentIndex++;
			startRound(io, room);
			break;
		}

		case "music:guess": {
			if (state.phase !== "playing") return;
			const currentSongOwnerId = state.order[state.currentIndex];
			if (socket.id === currentSongOwnerId) return; // picker can't guess
			if (state.guesses[socket.id]) return; // already guessed

			const currentPick = state.picks[currentSongOwnerId];
			const titleGuess = (data?.title || "").trim();
			const artistGuess = (data?.artist || "").trim();

			const titleCorrect =
				titleGuess.length > 0 &&
				fuzzyMatch(titleGuess, currentPick.trackName);
			const artistCorrect =
				artistGuess.length > 0 &&
				fuzzyMatch(artistGuess, currentPick.artistName);

			// Time-based points: 500 at 0s, 100 at 30s
			const elapsed = (Date.now() - state.roundStartTime) / 1000;
			const titlePoints = titleCorrect
				? Math.max(
						100,
						Math.round(
							500 - (elapsed / state.previewDuration) * 400,
						),
					)
				: 0;
			const artistPoints = artistCorrect ? 200 : 0;
			const totalPoints = titlePoints + artistPoints;

			state.guesses[socket.id] = {
				titleGuess,
				artistGuess,
				titleCorrect,
				artistCorrect,
				points: totalPoints,
				timestamp: Date.now(),
			};

			if (totalPoints > 0) {
				state.scores[socket.id] =
					(state.scores[socket.id] || 0) + totalPoints;
			}

			// Notify just this player of their result
			io.to(socket.id).emit("music:guessResult", {
				titleCorrect,
				artistCorrect,
				points: totalPoints,
			});

			// Broadcast updated guess count to room
			const nonPickerCount = room.players.filter(
				(p) => p.id !== currentSongOwnerId,
			).length;
			const guessedCount = Object.keys(state.guesses).length;
			io.to(room.code).emit("music:guessUpdate", {
				guessedCount,
				totalGuessers: nonPickerCount,
				scores: state.scores,
			});

			// End round early if everyone has guessed
			if (guessedCount >= nonPickerCount) {
				clearTimeout(state.roundTimer);
				setTimeout(() => endRound(io, room), 1000);
			}
			break;
		}

		case "music:returnToLobby": {
			if (socket.id !== room.hostId) return;
			// Full return to main game lobby — handled by rooms.js returnToLobby
			break;
		}
	}
}

function getClientState(room, playerId) {
	return safeState(room, playerId);
}

module.exports = { init, start, handleEvent, getClientState };
