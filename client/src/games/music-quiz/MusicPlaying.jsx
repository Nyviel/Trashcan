import { useEffect, useRef, useState } from "react";
import socket from "../../socket";

export default function MusicPlaying({ state, me, room, isHost, isPicker }) {
	const [titleGuess, setTitleGuess] = useState("");
	const [artistGuess, setArtistGuess] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [timeLeft, setTimeLeft] = useState(30);
	const audioRef = useRef(null);
	const timerRef = useRef(null);
	const myResult = state.myGuessResult;

	// Reset on new round
	useEffect(() => {
		setTitleGuess("");
		setArtistGuess("");
		setSubmitted(false);
	}, [state.currentIndex]);

	// Play audio and start countdown when a new round's song arrives
	useEffect(() => {
		if (!state.currentSong?.previewUrl || state.phase !== "playing") return;

		// Small delay to ensure state is settled before playing
		const startDelay = setTimeout(() => {
			const audio = new Audio(state.currentSong.previewUrl);
			audio.volume = 0.7;
			audio.play().catch(() => {});
			audioRef.current = audio;

			let t = state.previewDuration || 30;
			setTimeLeft(t);
			clearInterval(timerRef.current);
			timerRef.current = setInterval(() => {
				t--;
				setTimeLeft(t);
				if (t <= 0) clearInterval(timerRef.current);
			}, 1000);
		}, 300);

		return () => {
			clearTimeout(startDelay);
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = "";
			}
			clearInterval(timerRef.current);
		};
	}, [state.currentIndex, state.phase]);

	function submitGuess(e) {
		e.preventDefault();
		if (submitted || (!titleGuess.trim() && !artistGuess.trim())) return;
		socket.emit("music:guess", {
			title: titleGuess.trim(),
			artist: artistGuess.trim(),
		});
		setSubmitted(true);
	}

	const ownerName = room?.players.find(
		(p) => p.id === state.currentSongOwnerId,
	)?.name;
	const timerPct = (timeLeft / (state.previewDuration || 30)) * 100;

	return (
		<div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
			<div className="w-full max-w-lg space-y-6">
				{/* Song counter */}
				<div className="text-center">
					<p className="text-white/30 text-xs uppercase tracking-widest">
						Song {(state.currentIndex || 0) + 1} of{" "}
						{state.totalSongs}
					</p>
					<p className="text-white/50 text-sm mt-1">
						🎵 This song was picked by{" "}
						<span className="text-neon-cyan font-bold">
							{ownerName}
						</span>
					</p>
				</div>

				{/* Blurred album art */}
				<div className="flex justify-center">
					<div className="relative w-48 h-48 rounded-2xl overflow-hidden border border-bg-border">
						{state.currentSong?.artworkUrl ? (
							<img
								src={state.currentSong.artworkUrl}
								alt="album art"
								className={`w-full h-full object-cover transition-all duration-700 ${submitted && myResult?.titleCorrect ? "blur-0" : "blur-xl"}`}
							/>
						) : (
							<div className="w-full h-full bg-bg-elevated flex items-center justify-center text-5xl">
								🎵
							</div>
						)}
						{!submitted && (
							<div className="absolute inset-0 flex items-center justify-center">
								<span className="text-5xl">🎵</span>
							</div>
						)}
					</div>
				</div>

				{/* Timer bar */}
				<div className="space-y-1">
					<div className="flex justify-between text-xs text-white/30">
						<span>Playing…</span>
						<span
							className={`font-display font-bold tabular-nums ${timeLeft <= 5 ? "text-neon-pink animate-pulse-fast" : "text-neon-cyan"}`}
						>
							{timeLeft}s
						</span>
					</div>
					<div className="w-full bg-bg-elevated rounded-full h-1.5">
						<div
							className="h-1.5 rounded-full transition-all duration-1000 bg-neon-cyan"
							style={{ width: `${timerPct}%` }}
						/>
					</div>
				</div>

				{/* Guess progress */}
				<div className="flex items-center justify-between text-sm">
					<span className="text-white/30">
						{state.guessedCount || 0} / {state.totalGuessers || 0}{" "}
						guessed
					</span>
					<div className="flex gap-1">
						{room?.players
							.filter((p) => p.id !== state.currentSongOwnerId)
							.map((p) => (
								<div
									key={p.id}
									className={`w-2 h-2 rounded-full transition-colors ${
										state.guesses?.[p.id]?.hasGuessed
											? state.guesses[p.id].titleCorrect
												? "bg-neon-green"
												: "bg-neon-pink"
											: "bg-white/20"
									}`}
								/>
							))}
					</div>
				</div>

				{/* Picker view */}
				{isPicker && (
					<div className="card p-6 text-center space-y-2">
						<p className="text-neon-cyan font-display font-bold">
							🎤 Your song is playing!
						</p>
						<p className="text-white/40 text-sm">
							Watch who guesses correctly…
						</p>
					</div>
				)}

				{/* Guesser view */}
				{!isPicker && (
					<form onSubmit={submitGuess} className="space-y-3">
						{myResult ? (
							<div
								className={`card p-5 text-center space-y-2 ${myResult.titleCorrect ? "border-neon-green/30 bg-neon-green/5" : "border-neon-pink/30 bg-neon-pink/5"}`}
							>
								<p
									className={`font-display font-bold text-lg ${myResult.titleCorrect ? "text-neon-green" : "text-neon-pink"}`}
								>
									{myResult.titleCorrect
										? `✓ +${myResult.points} pts!`
										: "✗ Wrong title"}
								</p>
								{myResult.titleCorrect &&
									myResult.artistCorrect && (
										<p className="text-neon-green/70 text-sm">
											+200 bonus for artist!
										</p>
									)}
								<p className="text-white/30 text-xs">
									Waiting for the round to end…
								</p>
							</div>
						) : submitted ? (
							<div className="card p-5 text-center">
								<p className="text-white/40 text-sm">
									Guess submitted — waiting for result…
								</p>
							</div>
						) : (
							<>
								<div>
									<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
										Song title
									</label>
									<input
										className="input"
										placeholder="What's the title?"
										value={titleGuess}
										onChange={(e) =>
											setTitleGuess(e.target.value)
										}
										autoComplete="off"
										autoFocus
									/>
								</div>
								<div>
									<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
										Artist{" "}
										<span className="text-neon-yellow/60 normal-case tracking-normal font-normal">
											+200 bonus
										</span>
									</label>
									<input
										className="input"
										placeholder="Who's the artist? (optional)"
										value={artistGuess}
										onChange={(e) =>
											setArtistGuess(e.target.value)
										}
										autoComplete="off"
									/>
								</div>
								<button
									type="submit"
									className="btn-primary w-full py-3"
									disabled={
										!titleGuess.trim() &&
										!artistGuess.trim()
									}
								>
									Submit Guess
								</button>
							</>
						)}
					</form>
				)}
			</div>
		</div>
	);
}
