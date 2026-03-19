import { useState } from "react";
import socket from "../../socket";

export default function FakeWordPick({ isGameMaster }) {
	const [word, setWord] = useState("");
	const [category, setCategory] = useState("");

	function submit(e) {
		e.preventDefault();
		if (!word.trim()) return;
		socket.emit("fake:setWord", {
			word: word.trim(),
			category: category.trim(),
		});
	}

	if (!isGameMaster) {
		return (
			<div className="flex-1 flex items-center justify-center animate-fade-in">
				<div className="card p-10 text-center space-y-4 max-w-sm">
					<div className="text-5xl">🎨</div>
					<h2 className="font-display font-black text-2xl text-white">
						Fake Artist
					</h2>
					<p className="text-white/40 text-sm">
						Waiting for the Game Master to pick a word…
					</p>
					<div className="flex gap-1 justify-center pt-2">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="w-2 h-2 rounded-full bg-neon-cyan/40 animate-pulse"
								style={{ animationDelay: `${i * 0.2}s` }}
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex items-center justify-center animate-fade-in">
			<form
				onSubmit={submit}
				className="card p-10 space-y-6 w-full max-w-md"
			>
				<div className="text-center space-y-1">
					<div className="text-4xl mb-3">🕵️</div>
					<h2 className="font-display font-black text-2xl text-white">
						You are the Game Master
					</h2>
					<p className="text-white/40 text-sm">
						Pick a secret word. Everyone will see it — except the
						Fake Artist.
					</p>
				</div>

				<div className="space-y-4">
					<div>
						<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
							Category (optional)
						</label>
						<input
							className="input"
							placeholder="e.g. Animals, Food, Places…"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							maxLength={40}
						/>
					</div>
					<div>
						<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
							Secret Word
						</label>
						<input
							className="input font-display font-bold text-xl text-center tracking-widest"
							placeholder="Enter a word…"
							value={word}
							onChange={(e) => setWord(e.target.value)}
							maxLength={30}
							autoFocus
						/>
					</div>
				</div>

				<button
					type="submit"
					className="btn-primary w-full py-3 text-base"
					disabled={!word.trim()}
				>
					Start Drawing
				</button>
			</form>
		</div>
	);
}
