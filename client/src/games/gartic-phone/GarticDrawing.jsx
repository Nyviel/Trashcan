import { useRef } from "react";
import socket from "../../socket";
import DrawingCanvas from "../../components/DrawingCanvas";

export default function GarticDrawing({
	prompt,
	step,
	totalSteps,
	timeLeft,
	submitted,
	progressSubmitted,
	progressTotal,
	me,
	room,
}) {
	const canvasRef = useRef(null);

	function handleSubmit() {
		if (submitted) return;
		// Capture canvas as dataURL and submit
		const canvas = document.querySelector("canvas");
		const dataUrl = canvas ? canvas.toDataURL("image/jpeg", 0.6) : null;
		socket.emit("gartic:submitDrawing", { dataUrl });
	}

	return (
		<div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
			{/* Top bar */}
			<div className="flex items-center justify-between px-6 py-3 border-b border-bg-border bg-bg-card">
				<div className="flex items-center gap-4">
					<span className="text-white/40 text-sm font-display">
						Step{" "}
						<span className="text-white font-bold">{step + 1}</span>
						<span className="text-white/30"> / {totalSteps}</span>
					</span>
					<div
						className={`font-display font-black text-2xl tabular-nums ${timeLeft <= 10 ? "text-neon-pink animate-pulse-fast" : "text-neon-cyan"}`}
					>
						{timeLeft}s
					</div>
				</div>

				{/* Phrase to draw */}
				<div className="text-center">
					{prompt?.type === "text" && (
						<div>
							<p className="text-white/30 text-xs uppercase tracking-widest mb-0.5">
								Draw this
							</p>
							<p className="font-display font-black text-2xl text-neon-cyan">
								{prompt.content}
							</p>
						</div>
					)}
				</div>

				<div className="flex items-center gap-3">
					<p className="text-white/30 text-sm tabular-nums">
						{progressSubmitted} / {progressTotal} done
					</p>
					{!submitted && (
						<button
							className="btn-primary px-5 py-2 text-sm"
							onClick={handleSubmit}
						>
							Submit →
						</button>
					)}
					{submitted && (
						<span className="text-neon-green font-display font-bold text-sm">
							✓ Submitted
						</span>
					)}
				</div>
			</div>

			{/* Progress bar */}
			<div className="w-full bg-bg-elevated h-1">
				<div
					className="bg-neon-cyan h-1 transition-all duration-300"
					style={{
						width: `${progressTotal ? (progressSubmitted / progressTotal) * 100 : 0}%`,
					}}
				/>
			</div>

			{/* Canvas */}
			<div className="flex-1 flex items-center justify-center bg-bg-base p-4">
				{submitted ? (
					<div className="card p-10 text-center space-y-3">
						<p className="text-neon-green font-display font-bold text-xl">
							✓ Drawing submitted!
						</p>
						<p className="text-white/30 text-sm">
							Waiting for others to finish…
						</p>
					</div>
				) : (
					<DrawingCanvas
						canDraw={true}
						phase="drawing"
						drawEvent="gartic:draw"
						clearEvent="gartic:canvasClear"
					/>
				)}
			</div>
		</div>
	);
}
