import { useEffect, useReducer, useRef, useState } from "react";
import socket from "../../socket";
import { useRoom } from "../../context/RoomContext";
import DrawingCanvas from "../../components/DrawingCanvas";
import PlayerList from "../../components/PlayerList";
import FakeVoting from "./FakeVoting";
import FakeWordPick from "./FakeWordPick";

function reducer(state, action) {
	switch (action.type) {
		case "STATE":
			return { ...state, ...action.payload };
		case "TURN_START":
			return { ...state, ...action.payload };
		case "VOTE_UPDATE":
			return {
				...state,
				votedCount: action.payload.votedCount,
				totalVoters: action.payload.totalVoters,
			};
		case "VOTE_RESULT":
			return { ...state, voteResult: action.payload };
		case "STROKE":
			return {
				...state,
				strokes: [...(state.strokes || []), action.payload],
			};
		default:
			return state;
	}
}

const initState = {
	phase: "wordPick",
	word: null,
	category: null,
	currentDrawerId: null,
	currentDrawerName: null,
	currentRound: 0,
	totalRounds: 2,
	strokeTime: 30,
	drawers: [],
	fakeId: null,
	votes: {},
	winner: null,
	isGameMaster: false,
	isFake: false,
	strokes: [],
	votedCount: 0,
	totalVoters: 0,
	voteResult: null,
};

export default function FakeArtistGame() {
	const { room, me } = useRoom();
	const [state, dispatch] = useReducer(reducer, initState);
	const timerRef = useRef(null);
	const [timeLeft, setTimeLeft] = useState(0);

	useEffect(() => {
		socket.on("fake:gameStarted", () => {});
		socket.on("fake:state", (data) =>
			dispatch({ type: "STATE", payload: data }),
		);
		socket.on("fake:turnStart", (data) => {
			dispatch({ type: "TURN_START", payload: data });
			clearInterval(timerRef.current);
			let t = data.timeLeft;
			setTimeLeft(t);
			timerRef.current = setInterval(() => {
				t--;
				setTimeLeft(t);
				if (t <= 0) clearInterval(timerRef.current);
			}, 1000);
		});
		socket.on("fake:stroke", (data) =>
			dispatch({ type: "STROKE", payload: data }),
		);
		socket.on("fake:votingStarted", (data) =>
			dispatch({
				type: "VOTE_UPDATE",
				payload: { votedCount: 0, totalVoters: data.totalVoters },
			}),
		);
		socket.on("fake:voteUpdate", (data) =>
			dispatch({ type: "VOTE_UPDATE", payload: data }),
		);
		socket.on("fake:voteResult", (data) =>
			dispatch({ type: "VOTE_RESULT", payload: data }),
		);
		socket.on("fake:guessPrompt", () => {});

		return () => {
			clearInterval(timerRef.current);
			[
				"fake:gameStarted",
				"fake:state",
				"fake:turnStart",
				"fake:stroke",
				"fake:votingStarted",
				"fake:voteUpdate",
				"fake:voteResult",
				"fake:guessPrompt",
			].forEach((e) => socket.off(e));
		};
	}, []);

	const isMyTurn =
		state.currentDrawerId === me?.id && state.phase === "drawing";
	const isGameMaster = me?.id === room.hostId; // derive from room, not server state

	// Phase: word pick (game master only)
	if (state.phase === "wordPick") {
		return <FakeWordPick isGameMaster={isGameMaster} />;
	}

	// Phase: voting
	if (state.phase === "voting" || state.phase === "fakeGuess") {
		return (
			<FakeVoting
				state={state}
				me={me}
				room={room}
				isGameMaster={isGameMaster}
			/>
		);
	}

	return (
		<div className="flex-1 flex flex-col h-screen overflow-hidden animate-fade-in">
			{/* Top bar */}
			<div className="flex items-center justify-between px-6 py-3 border-b border-bg-border bg-bg-card">
				<div className="flex items-center gap-4">
					<span className="text-white/40 text-sm font-display">
						Round{" "}
						<span className="text-white font-bold">
							{state.currentRound + 1}
						</span>
						<span className="text-white/30">
							{" "}
							/ {state.totalRounds}
						</span>
					</span>
					{state.phase === "drawing" && (
						<div
							className={`font-display font-black text-2xl tabular-nums ${timeLeft <= 5 ? "text-neon-pink animate-pulse-fast" : "text-neon-cyan"}`}
						>
							{timeLeft}s
						</div>
					)}
				</div>

				{/* Word display */}
				<div className="text-center">
					{state.word && (
						<div>
							{state.category && (
								<p className="text-white/30 text-xs uppercase tracking-widest">
									{state.category}
								</p>
							)}
							<p
								className={`font-display font-black text-2xl tracking-widest ${state.isFake ? "text-neon-pink" : "text-neon-cyan"}`}
							>
								{state.word}
							</p>
							{state.isFake && (
								<p className="text-neon-pink/60 text-xs">
									You are the Fake Artist!
								</p>
							)}
						</div>
					)}
				</div>

				{/* Turn indicator */}
				<div className="text-right w-48">
					{state.phase === "drawing" && (
						<p
							className={`text-sm font-display font-semibold ${isMyTurn ? "text-neon-cyan" : "text-white/40"}`}
						>
							{isMyTurn
								? "✏️ Your stroke!"
								: `${state.currentDrawerName}'s turn`}
						</p>
					)}
				</div>
			</div>

			{/* Drawing banner */}
			{state.phase === "drawing" && (
				<div
					className={`text-center py-1.5 text-xs font-display font-semibold tracking-widest uppercase border-b
          ${isMyTurn ? "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20" : "bg-bg-elevated text-white/40 border-bg-border"}`}
				>
					{isMyTurn
						? "🎨 Add your one stroke now!"
						: `Watching ${state.currentDrawerName} draw…`}
				</div>
			)}

			<div className="flex-1 flex overflow-hidden">
				{/* Players */}
				<div className="w-52 border-r border-bg-border bg-bg-card p-4 overflow-y-auto">
					<p className="text-xs text-white/30 uppercase tracking-widest mb-1">
						Players
					</p>
					<p className="text-xs text-white/20 mb-3">
						Game Master:{" "}
						{room.players.find((p) => p.id === room.hostId)?.name}
					</p>
					<PlayerList
						players={state.drawers}
						hostId={room.hostId}
						meId={me?.id}
						drawerId={state.currentDrawerId}
					/>
				</div>

				{/* Canvas */}
				<div className="flex-1 relative flex items-center justify-center bg-bg-base p-4">
					<DrawingCanvas
						canDraw={isMyTurn}
						phase={state.phase}
						drawEvent="fake:draw"
						clearEvent="fake:canvasClear"
						onMouseUpCallback={() => {
							if (isMyTurn) socket.emit("fake:strokeDone");
						}}
					/>
					{/* Game master observer overlay */}
					{isGameMaster && state.phase === "drawing" && (
						<div className="absolute top-4 right-4 card px-4 py-3 text-center">
							<p className="text-white/40 text-xs uppercase tracking-widest mb-1">
								Game Master
							</p>
							<p className="text-white/60 text-sm">
								You observe — don't reveal the word!
							</p>
						</div>
					)}
				</div>

				{/* Skip button for current drawer */}
				{isMyTurn && (
					<div className="absolute bottom-8 left-1/2 -translate-x-1/2">
						<button
							className="btn-ghost text-sm border border-bg-border"
							onClick={() => socket.emit("fake:skipStroke")}
						>
							Skip my stroke
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
