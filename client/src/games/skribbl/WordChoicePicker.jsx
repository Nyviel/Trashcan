import { useEffect, useState } from "react";
import socket from "../../socket";

const AUTO_PICK_SECONDS = 15;

export default function WordChoicePicker({ words }) {
	const [timeLeft, setTimeLeft] = useState(AUTO_PICK_SECONDS);

	useEffect(() => {
		setTimeLeft(AUTO_PICK_SECONDS);
		const interval = setInterval(() => {
			setTimeLeft((t) => {
				if (t <= 1) {
					clearInterval(interval);
					return 0;
				}
				return t - 1;
			});
		}, 1000);
		return () => clearInterval(interval);
	}, [words]); // reset if words change (new turn)

	function pick(word) {
		socket.emit("skribbl:wordChosen", { word });
	}

	return (
		<div className="absolute inset-0 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm z-10">
			<div className="card p-8 space-y-5 text-center max-w-sm w-full animate-slide-up">
				<p className="text-white/50 text-sm uppercase tracking-widest">
					Choose a word to draw
				</p>
				<div className="space-y-3">
					{words.map((w) => (
						<button
							key={w}
							onClick={() => pick(w)}
							className="w-full btn-secondary py-3 text-base font-display font-bold hover:border-neon-cyan/50 hover:text-neon-cyan transition-all"
						>
							{w}
						</button>
					))}
				</div>
				<p
					className={`text-xs tabular-nums transition-colors ${timeLeft <= 5 ? "text-neon-pink animate-pulse-fast" : "text-white/20"}`}
				>
					Auto-picks in {timeLeft}s
				</p>
			</div>
		</div>
	);
}
