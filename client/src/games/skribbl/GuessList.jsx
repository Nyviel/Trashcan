import { useEffect, useRef, useState } from "react";
import socket from "../../socket";

function formatTime(ts) {
	if (!ts) return "";
	const d = new Date(ts);
	return d.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

export default function GuessList({
	messages,
	phase,
	isDrawer,
	guessedCorrect,
	drawer,
}) {
	const [input, setInput] = useState("");
	const bottomRef = useRef(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Clear input when a new turn starts (phase goes back to choosing)
	useEffect(() => {
		if (phase === "choosing") setInput("");
	}, [phase]);

	function submit(e) {
		e.preventDefault();
		if (!input.trim()) return;
		socket.emit("skribbl:guess", { text: input.trim() });
		setInput("");
	}

	const activeDrawing = phase === "drawing";
	const canGuess = !isDrawer && activeDrawing && !guessedCorrect;

	function renderFooter() {
		if (isDrawer && activeDrawing) {
			return (
				<div className="text-center text-neon-cyan/60 text-xs py-3 font-display tracking-wide">
					✏️ You are drawing — no guessing!
				</div>
			);
		}
		if (!activeDrawing) {
			return (
				<div className="text-center text-white/20 text-xs py-3">
					{phase === "reveal"
						? "Next turn starting…"
						: "Waiting for round to start…"}
				</div>
			);
		}
		if (guessedCorrect) {
			return (
				<div className="space-y-2">
					<div className="text-center text-neon-green text-sm font-display font-bold py-1">
						✓ You guessed it!
					</div>
					<p className="text-center text-white/30 text-xs">
						Waiting for others…
					</p>
				</div>
			);
		}
		// Normal guessing state
		return (
			<div className="flex gap-2">
				<input
					className="input flex-1 py-2 text-sm"
					placeholder="Type your guess…"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					autoComplete="off"
					autoFocus
				/>
				<button type="submit" className="btn-primary px-3 py-2 text-sm">
					↑
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="px-4 py-3 border-b border-bg-border">
				<p className="text-xs text-white/30 uppercase tracking-widest">
					Chat / Guesses
				</p>
			</div>

			<div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
				{messages.length === 0 && (
					<p className="text-white/20 text-xs text-center pt-4">
						No messages yet…
					</p>
				)}
				{messages.map((m, i) => (
					<div
						key={i}
						className={`text-sm rounded-lg px-3 py-2 ${
							m.correct
								? "bg-neon-green/10 border border-neon-green/20"
								: "bg-bg-elevated"
						}`}
					>
						<div className="flex items-center justify-between gap-1 mb-0.5">
							<span
								className={`font-display font-semibold text-xs ${m.correct ? "text-neon-green" : "text-white/40"}`}
							>
								{m.playerName}
							</span>
							{m.timestamp && (
								<span className="text-white/20 text-[10px] tabular-nums shrink-0">
									{formatTime(m.timestamp)}
								</span>
							)}
						</div>
						<span
							className={
								m.correct ? "text-neon-green" : "text-white/80"
							}
						>
							{m.correct ? "🎉 Guessed correctly!" : m.text}
						</span>
					</div>
				))}
				<div ref={bottomRef} />
			</div>

			<form onSubmit={submit} className="p-3 border-t border-bg-border">
				{renderFooter()}
			</form>
		</div>
	);
}
