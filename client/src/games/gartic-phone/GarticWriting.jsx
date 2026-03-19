import { useEffect, useRef, useState } from "react";
import socket from "../../socket";

export default function GarticWriting({
	prompt,
	step,
	totalSteps,
	timeLeft,
	submitted,
	progressSubmitted,
	progressTotal,
}) {
	const [text, setText] = useState("");
	const inputRef = useRef(null);

	const isFirstStep = step === 0;
	const isDescribing = !isFirstStep; // every even step after 0 is describing a drawing

	useEffect(() => {
		setText("");
		inputRef.current?.focus();
	}, [step]);

	function submit(e) {
		e.preventDefault();
		if (!text.trim() || submitted) return;
		socket.emit("gartic:submitText", { text: text.trim() });
	}

	return (
		<div className="flex-1 flex flex-col items-center justify-center px-4 py-10 animate-fade-in">
			<div className="w-full max-w-lg space-y-6">
				{/* Header */}
				<div className="text-center space-y-1">
					<p className="text-white/30 text-xs uppercase tracking-widest">
						Step {step + 1} of {totalSteps}
					</p>
					<h2 className="font-display font-black text-2xl text-white">
						{isFirstStep
							? "Write a phrase"
							: "Describe this drawing"}
					</h2>
					<p className="text-white/40 text-sm">
						{isFirstStep
							? "Be creative — this will be passed around and drawn by others"
							: "What do you see? Your description will be drawn by the next player"}
					</p>
				</div>

				{/* Drawing prompt to describe */}
				{isDescribing && prompt && (
					<div
						className="card p-4 flex items-center justify-center bg-bg-base"
						style={{ minHeight: 200 }}
					>
						{prompt.type === "drawing" && prompt.content ? (
							<img
								src={prompt.content}
								alt="Drawing to describe"
								className="max-w-full max-h-64 rounded-lg object-contain"
							/>
						) : (
							<p className="text-white/20 text-sm">
								No drawing available
							</p>
						)}
					</div>
				)}

				{/* Timer */}
				<div className="flex items-center justify-between px-1">
					<div
						className={`font-display font-black text-3xl tabular-nums ${timeLeft <= 10 ? "text-neon-pink animate-pulse-fast" : "text-neon-cyan"}`}
					>
						{timeLeft}s
					</div>
					<p className="text-white/30 text-sm">
						{progressSubmitted} / {progressTotal} submitted
					</p>
				</div>

				{/* Progress bar */}
				<div className="w-full bg-bg-elevated rounded-full h-1">
					<div
						className="bg-neon-cyan h-1 rounded-full transition-all duration-300"
						style={{
							width: `${progressTotal ? (progressSubmitted / progressTotal) * 100 : 0}%`,
						}}
					/>
				</div>

				{submitted ? (
					<div className="card p-6 text-center space-y-2">
						<p className="text-neon-green font-display font-bold text-lg">
							✓ Submitted!
						</p>
						<p className="text-white/30 text-sm">
							Waiting for everyone else…
						</p>
					</div>
				) : (
					<form onSubmit={submit} className="space-y-4">
						<input
							ref={inputRef}
							className="input text-base py-4"
							placeholder={
								isFirstStep
									? "Type your phrase…"
									: "Describe what you see…"
							}
							value={text}
							onChange={(e) => setText(e.target.value)}
							maxLength={200}
							autoComplete="off"
						/>
						<button
							type="submit"
							className="btn-primary w-full py-3 text-base"
							disabled={!text.trim()}
						>
							{isFirstStep
								? "Submit phrase →"
								: "Submit description →"}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
