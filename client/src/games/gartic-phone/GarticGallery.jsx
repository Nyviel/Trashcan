import socket from "../../socket";

export default function GarticGallery({
	chain,
	entries,
	chainIndex,
	totalChains,
	isLastEntry,
	isLastChain,
	isHost,
}) {
	function next() {
		socket.emit("gartic:galleryNext");
	}

	if (!chain || !entries?.length) return null;

	return (
		<div className="flex-1 flex flex-col items-center justify-start px-4 py-8 overflow-y-auto animate-fade-in">
			<div className="w-full max-w-2xl space-y-6">
				{/* Chain header */}
				<div className="text-center space-y-1">
					<p className="text-white/30 text-xs uppercase tracking-widest">
						Chain {chainIndex + 1} of {totalChains}
					</p>
					<h2 className="font-display font-black text-3xl text-white">
						{chain.ownerName}'s chain
					</h2>
					<p className="text-white/30 text-sm">
						Watch how it evolved step by step
					</p>
				</div>

				{/* Revealed entries so far */}
				<div className="space-y-4">
					{entries.map((entry, i) => (
						<div key={i} className="animate-slide-up">
							<div className="flex items-center gap-2 mb-2">
								<div
									className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-display font-bold
                  ${entry.type === "text" ? "bg-neon-cyan/20 text-neon-cyan" : "bg-neon-purple/20 text-neon-purple"}`}
								>
									{i + 1}
								</div>
								<span className="text-white/50 text-xs font-display font-semibold uppercase tracking-widest">
									{entry.type === "text"
										? "✍️ Written"
										: "🎨 Drawn"}{" "}
									by {entry.authorName}
								</span>
							</div>
							<div
								className={`card p-4 ${entry.type === "text" ? "bg-bg-elevated" : "bg-bg-base"}`}
							>
								{entry.type === "text" ? (
									<p className="font-display font-bold text-xl text-white text-center py-2">
										{entry.content}
									</p>
								) : entry.content ? (
									<img
										src={entry.content}
										alt={`Drawing by ${entry.authorName}`}
										className="w-full max-h-72 object-contain rounded-lg"
									/>
								) : (
									<p className="text-white/20 text-sm text-center py-4">
										No drawing submitted
									</p>
								)}
							</div>
						</div>
					))}
				</div>

				{/* Host navigation */}
				{isHost && (
					<div className="sticky bottom-0 pb-4 pt-2">
						<button
							className="btn-primary w-full py-4 text-base"
							onClick={next}
						>
							{isLastEntry && isLastChain
								? "Finish →"
								: isLastEntry
									? `Next chain (${chainIndex + 2} / ${totalChains}) →`
									: "Reveal next →"}
						</button>
					</div>
				)}

				{!isHost && (
					<p className="text-white/20 text-xs text-center pb-4">
						Waiting for host to advance…
					</p>
				)}
			</div>
		</div>
	);
}
