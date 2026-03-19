import socket from "../../socket";

export default function MusicReveal({ state, roundEndData, me, room, isHost }) {
	const data = roundEndData || {};
	const isLast = (state.currentIndex || 0) >= (state.totalSongs || 1) - 1;

	const sorted = [...(room?.players || [])].sort(
		(a, b) => (state.scores?.[b.id] || 0) - (state.scores?.[a.id] || 0),
	);

	return (
		<div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto animate-fade-in">
			<div className="w-full max-w-lg space-y-6">
				{/* Song reveal */}
				<div className="card p-6 flex items-center gap-5">
					{data.artworkUrl && (
						<img
							src={data.artworkUrl}
							alt="album art"
							className="w-24 h-24 rounded-xl object-cover shrink-0"
						/>
					)}
					<div className="min-w-0">
						<p className="text-white/30 text-xs uppercase tracking-widest mb-1">
							The answer was
						</p>
						<p className="font-display font-black text-2xl text-neon-cyan truncate">
							{data.trackName}
						</p>
						<p className="text-white/60 text-base truncate">
							{data.artistName}
						</p>
					</div>
				</div>

				{/* Round results */}
				<div className="card p-5 space-y-3">
					<p className="text-xs text-white/30 uppercase tracking-widest">
						Round results
					</p>
					{sorted.map((p, i) => {
						const guess = data.guesses?.[p.id];
						const isPicker = p.id === state.currentSongOwnerId;
						return (
							<div
								key={p.id}
								className="flex items-center justify-between"
							>
								<div className="flex items-center gap-2.5">
									<span className="text-white/20 text-xs w-4">
										{i + 1}
									</span>
									<span
										className={`text-sm font-body ${p.id === me?.id ? "text-neon-cyan" : "text-white"}`}
									>
										{p.name}
										{p.id === me?.id && (
											<span className="text-white/30 ml-1">
												(you)
											</span>
										)}
									</span>
									{isPicker && (
										<span className="badge bg-neon-purple/20 text-neon-purple text-[10px]">
											PICKER
										</span>
									)}
									{guess?.titleCorrect && (
										<span className="text-neon-green text-xs">
											✓ title
										</span>
									)}
									{guess?.artistCorrect && (
										<span className="text-neon-yellow text-xs">
											✓ artist
										</span>
									)}
								</div>
								<span className="font-display font-bold text-white/70 text-sm">
									{state.scores?.[p.id] || 0} pts
								</span>
							</div>
						);
					})}
				</div>

				{/* Navigation */}
				{isHost ? (
					<button
						className="btn-primary w-full py-4 text-base"
						onClick={() => socket.emit("music:nextRound")}
					>
						{isLast ? "See final scores →" : "Next song →"}
					</button>
				) : (
					<p className="text-white/20 text-sm text-center">
						Waiting for host to continue…
					</p>
				)}
			</div>
		</div>
	);
}
