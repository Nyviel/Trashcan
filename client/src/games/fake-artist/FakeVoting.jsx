import { useState } from "react";
import socket from "../../socket";

export default function FakeVoting({ state, me, room, isGameMaster }) {
	const [vote, setVote] = useState(null);
	const [guess, setGuess] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const isFake = state.isFake;
	const voteResult = state.voteResult;
	const canVote = !isGameMaster && !isFake;

	function submitVote() {
		if (!vote || submitted) return;
		socket.emit("fake:vote", { suspectId: vote });
		setSubmitted(true);
	}

	function submitGuess(e) {
		e.preventDefault();
		if (!guess.trim()) return;
		socket.emit("fake:guessWord", { word: guess.trim() });
	}

	if (state.phase === "fakeGuess") {
		return (
			<div className="flex-1 flex items-center justify-center px-4 animate-fade-in">
				<div className="card p-10 max-w-md w-full space-y-6 text-center">
					<div className="text-5xl">🎭</div>
					<div>
						<h2 className="font-display font-black text-2xl text-white">
							Caught!
						</h2>
						<p className="text-white/40 mt-2 text-sm">
							{isFake
								? "You were caught — guess the secret word correctly to still win!"
								: "The Fake Artist was caught! They're guessing the word…"}
						</p>
					</div>
					{isFake ? (
						<form onSubmit={submitGuess} className="space-y-4">
							<input
								className="input text-center font-display font-bold text-xl tracking-widest"
								placeholder="What was the word?"
								value={guess}
								onChange={(e) => setGuess(e.target.value)}
								autoFocus
							/>
							<button
								type="submit"
								className="btn-primary w-full py-3"
								disabled={!guess.trim()}
							>
								Submit Guess
							</button>
						</form>
					) : (
						<div className="flex gap-1 justify-center pt-2">
							{[0, 1, 2].map((i) => (
								<div
									key={i}
									className="w-2 h-2 rounded-full bg-neon-pink/60 animate-pulse"
									style={{ animationDelay: `${i * 0.2}s` }}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	if (voteResult) {
		const caughtName = room.players.find(
			(p) => p.id === voteResult.caughtId,
		)?.name;
		const fakeName = room.players.find(
			(p) => p.id === voteResult.fakeId,
		)?.name;
		return (
			<div className="flex-1 flex items-center justify-center px-4 animate-fade-in">
				<div className="card p-10 max-w-md w-full space-y-5 text-center">
					<div className="text-5xl">
						{voteResult.caught ? "🎯" : "😈"}
					</div>
					<h2 className="font-display font-black text-2xl text-white">
						{voteResult.caught
							? `${caughtName} was caught!`
							: "The fake escaped!"}
					</h2>
					<p className="text-white/40 text-sm">
						The Fake Artist was{" "}
						<span className="text-neon-pink font-bold">
							{fakeName}
						</span>
					</p>
					<p className="text-white/20 text-xs">
						{voteResult.caught
							? "Fake Artist gets one last chance to guess the word…"
							: "Fake Artist wins!"}
					</p>
				</div>
			</div>
		);
	}

	const suspects = state.drawers || [];
	const totalVoters =
		state.totalVoters ||
		suspects.filter((p) => p.id !== state.fakeId).length;

	return (
		<div className="flex-1 flex items-center justify-center px-4 animate-fade-in">
			<div className="card p-10 max-w-lg w-full space-y-6">
				<div className="text-center space-y-1">
					<div className="text-4xl mb-2">🗳️</div>
					<h2 className="font-display font-black text-2xl text-white">
						Who is the Fake Artist?
					</h2>
					<p className="text-white/40 text-sm">
						{state.votedCount || 0} / {totalVoters} votes cast
					</p>
					{!canVote && (
						<p className="text-white/20 text-xs">
							{isGameMaster
								? "Game Master observes"
								: isFake
									? "You can't vote — you're the Fake!"
									: ""}
						</p>
					)}
				</div>

				<div className="w-full bg-bg-elevated rounded-full h-1.5">
					<div
						className="bg-neon-cyan h-1.5 rounded-full transition-all duration-500"
						style={{
							width: `${totalVoters ? ((state.votedCount || 0) / totalVoters) * 100 : 0}%`,
						}}
					/>
				</div>

				{submitted || !canVote ? (
					<div className="text-center py-4 space-y-2">
						<p className="text-neon-cyan font-display font-bold">
							{isGameMaster
								? "Watching the votes…"
								: isFake
									? "😬 Hope they don't pick you…"
									: "✓ Vote submitted!"}
						</p>
						<p className="text-white/30 text-xs">
							Waiting for everyone to vote…
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{suspects.map((p) => {
							const isMe = p.id === me?.id;
							return (
								<button
									key={p.id}
									onClick={() => !isMe && setVote(p.id)}
									disabled={isMe}
									className={`w-full text-left px-4 py-3 rounded-xl border transition-all
                    ${vote === p.id ? "border-neon-pink/60 bg-neon-pink/10 text-neon-pink" : "border-bg-border bg-bg-elevated text-white hover:border-white/20"}
                    ${isMe ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
								>
									<span className="font-display font-bold">
										{p.name}
									</span>
									{isMe && (
										<span className="text-white/30 text-xs ml-2">
											(you)
										</span>
									)}
								</button>
							);
						})}
						<button
							className="btn-primary w-full py-3 mt-2"
							onClick={submitVote}
							disabled={!vote}
						>
							Cast Vote
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
