export default function PlayerList({
	players,
	hostId,
	meId,
	scores,
	drawerId,
}) {
	const sorted = scores
		? [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
		: players;

	return (
		<ul className="space-y-2">
			{sorted.map((p) => (
				<li
					key={p.id}
					className={`flex items-center justify-between px-3 py-2.5 rounded-lg
            ${p.id === meId ? "bg-neon-cyan/10 border border-neon-cyan/20" : "bg-bg-elevated"}`}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div
							className={`w-2 h-2 rounded-full shrink-0 ${p.id === meId ? "bg-neon-cyan" : "bg-white/20"}`}
						/>
						<span className="font-body text-sm text-white truncate">
							{p.name}
							{p.id === meId && (
								<span className="text-white/30 ml-1">
									(you)
								</span>
							)}
						</span>
						{p.id === hostId && (
							<span className="badge bg-neon-purple/20 text-neon-purple text-[10px] shrink-0">
								HOST
							</span>
						)}
						{drawerId && p.id === drawerId && (
							<span className="badge bg-neon-cyan/10 text-neon-cyan text-[10px] shrink-0">
								✏️
							</span>
						)}
					</div>
					{scores !== undefined && (
						<span className="font-display font-bold text-sm text-neon-cyan shrink-0 ml-1">
							{scores[p.id] || 0}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}
