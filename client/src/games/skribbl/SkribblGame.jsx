import { useEffect, useReducer, useRef, useState } from "react";
import socket from "../../socket";
import { useRoom } from "../../context/RoomContext";
import DrawingCanvas from "../../components/DrawingCanvas";
import GuessList from "./GuessList";
import PlayerList from "../../components/PlayerList";
import WordDisplay from "./WordDisplay";
import WordChoicePicker from "./WordChoicePicker";

function reducer(state, action) {
	switch (action.type) {
		case "GAME_STARTED":
			return {
				...state,
				totalRounds: action.payload.totalRounds,
				drawTime: action.payload.drawTime,
				phase: "waiting",
				currentRound: 0,
			};
		case "PHASE_CHANGED":
			return {
				...state,
				phase: action.payload.phase,
				drawer: action.payload.drawer ?? state.drawer,
				drawerId: action.payload.drawerId ?? state.drawerId,
				hint: action.payload.hint ?? state.hint,
				currentRound: action.payload.currentRound ?? state.currentRound,
				totalRounds: action.payload.totalRounds ?? state.totalRounds,
				guessedCorrect: false,
				word: action.payload.phase === "choosing" ? null : state.word,
				// DO NOT reset wordChoices here — skribbl:wordChoices arrives just after
				// phaseChanged and the two events together caused a race that wiped the list
			};
		case "WORD_SELECTED":
			return {
				...state,
				word: action.payload.word,
				hint: action.payload.hint,
				phase: "drawing",
				wordChoices: [],
			};
		case "WORD_CHOICES":
			// Only set phase to choosing if not already there (avoid re-triggering resets)
			return { ...state, wordChoices: action.payload.words };
		case "CHAT_MSG":
			return { ...state, messages: [...state.messages, action.payload] };
		case "SCORE_UPDATE":
			return { ...state, scores: action.payload.scores };
		case "TURN_ENDED":
			return {
				...state,
				phase: "reveal",
				lastWord: action.payload.word,
				scores: action.payload.scores,
				currentRound: action.payload.currentRound ?? state.currentRound,
				totalRounds: action.payload.totalRounds ?? state.totalRounds,
				guessedCorrect: false,
				wordChoices: [],
			};
		case "CORRECT":
			return { ...state, guessedCorrect: true };
		default:
			return state;
	}
}

const init = {
	phase: "waiting",
	totalRounds: 3,
	currentRound: 0,
	drawerId: null,
	drawer: null,
	hint: null,
	word: null,
	wordChoices: [],
	scores: {},
	messages: [],
	guessedCorrect: false,
	lastWord: null,
};

export default function SkribblGame() {
	const { room, me } = useRoom();
	const [state, dispatch] = useReducer(reducer, init);
	const timerRef = useRef(null);
	const [timeLeft, setTimeLeft] = useState(0);

	useEffect(() => {
		socket.on("skribbl:gameStarted", (data) =>
			dispatch({ type: "GAME_STARTED", payload: data }),
		);

		socket.on("skribbl:phaseChanged", (data) => {
			dispatch({ type: "PHASE_CHANGED", payload: data });
			clearInterval(timerRef.current);
			if (data.phase === "drawing") {
				let t = data.timeLeft || 80;
				setTimeLeft(t);
				timerRef.current = setInterval(() => {
					t--;
					setTimeLeft(t);
					if (t <= 0) clearInterval(timerRef.current);
				}, 1000);
			}
		});

		socket.on("skribbl:wordChoices", (data) =>
			dispatch({ type: "WORD_CHOICES", payload: data }),
		);
		socket.on("skribbl:wordSelected", (data) =>
			dispatch({ type: "WORD_SELECTED", payload: data }),
		);
		socket.on("skribbl:chatMessage", (data) => {
			dispatch({
				type: "CHAT_MSG",
				payload: { ...data, timestamp: Date.now() },
			});
		});
		socket.on("skribbl:scoreUpdate", (data) =>
			dispatch({ type: "SCORE_UPDATE", payload: data }),
		);
		socket.on("skribbl:turnEnded", (data) => {
			clearInterval(timerRef.current);
			dispatch({ type: "TURN_ENDED", payload: data });
		});
		socket.on("skribbl:correctGuess", () => dispatch({ type: "CORRECT" }));

		return () => {
			clearInterval(timerRef.current);
			[
				"skribbl:gameStarted",
				"skribbl:phaseChanged",
				"skribbl:wordChoices",
				"skribbl:wordSelected",
				"skribbl:chatMessage",
				"skribbl:scoreUpdate",
				"skribbl:turnEnded",
				"skribbl:correctGuess",
			].forEach((e) => socket.off(e));
		};
	}, []);

	const isDrawer = state.drawerId === me?.id;
	const canDraw = isDrawer && state.phase === "drawing";

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
							className={`font-display font-black text-2xl tabular-nums ${timeLeft <= 10 ? "text-neon-pink animate-pulse-fast" : "text-neon-cyan"}`}
						>
							{timeLeft}s
						</div>
					)}
				</div>
				<WordDisplay
					phase={state.phase}
					word={state.word}
					hint={state.hint}
					isDrawer={isDrawer}
					lastWord={state.lastWord}
					drawer={state.drawer}
				/>
				<div className="w-32" />
			</div>

			{/* Drawer banner */}
			{(state.phase === "drawing" || state.phase === "choosing") && (
				<div
					className={`text-center py-1.5 text-xs font-display font-semibold tracking-widest uppercase
          ${isDrawer ? "bg-neon-cyan/10 text-neon-cyan border-b border-neon-cyan/20" : "bg-bg-elevated text-white/40 border-b border-bg-border"}`}
				>
					{isDrawer
						? "✏️ You are drawing!"
						: `🎨 ${state.drawer} is drawing…`}
				</div>
			)}

			{/* Main area */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left: players */}
				<div className="w-52 border-r border-bg-border bg-bg-card p-4 overflow-y-auto">
					<p className="text-xs text-white/30 uppercase tracking-widest mb-3">
						Players
					</p>
					<PlayerList
						players={room.players}
						hostId={room.hostId}
						meId={me?.id}
						scores={state.scores}
						drawerId={state.drawerId}
					/>
				</div>

				{/* Center: canvas */}
				<div className="flex-1 relative flex items-center justify-center bg-bg-base p-4">
					<DrawingCanvas canDraw={canDraw} phase={state.phase} />

					{/* Word choice overlay */}
					{state.phase === "choosing" && isDrawer && (
						<WordChoicePicker words={state.wordChoices} />
					)}

					{/* Reveal overlay */}
					{state.phase === "reveal" && (
						<div className="absolute inset-0 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm">
							<div className="card p-8 text-center space-y-2 animate-slide-up">
								<p className="text-white/40 text-sm">
									The word was
								</p>
								<p className="font-display font-black text-4xl text-neon-cyan">
									{state.lastWord}
								</p>
								<p className="text-white/30 text-sm">
									Next turn starting…
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Right: chat/guesses */}
				<div className="w-64 border-l border-bg-border bg-bg-card flex flex-col">
					<GuessList
						messages={state.messages}
						phase={state.phase}
						isDrawer={isDrawer}
						guessedCorrect={state.guessedCorrect}
						drawer={state.drawer}
					/>
				</div>
			</div>
		</div>
	);
}
