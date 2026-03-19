import { useState } from "react";
import socket from "../../socket";

const TYPE_STYLES = {
	red: {
		bg: "bg-team-red/80",
		border: "border-team-red",
		text: "text-white",
		glow: "rgba(255,59,92,0.5)",
	},
	blue: {
		bg: "bg-team-blue/80",
		border: "border-team-blue",
		text: "text-white",
		glow: "rgba(59,130,246,0.5)",
	},
	neutral: {
		bg: "bg-bg-elevated",
		border: "border-bg-border",
		text: "text-white/50",
		glow: null,
	},
	assassin: {
		bg: "bg-black",
		border: "border-neon-pink",
		text: "text-neon-pink",
		glow: "rgba(255,45,120,0.5)",
	},
};

const TYPE_STYLES_SPY = {
	red: {
		bg: "bg-team-red/15",
		border: "border-team-red/50",
		text: "text-team-red",
		glow: "rgba(255,59,92,0.2)",
	},
	blue: {
		bg: "bg-team-blue/15",
		border: "border-team-blue/50",
		text: "text-team-blue",
		glow: "rgba(59,130,246,0.2)",
	},
	neutral: {
		bg: "bg-bg-elevated",
		border: "border-bg-border/40",
		text: "text-white/25",
		glow: null,
	},
	assassin: {
		bg: "bg-neon-pink/10",
		border: "border-neon-pink/50",
		text: "text-neon-pink",
		glow: "rgba(255,45,120,0.2)",
	},
};

export default function CodenamesBoard({
	board,
	phase,
	myTeam,
	isSpymaster,
	isActiveTeam,
	currentTeam,
	highlights,
	meId,
}) {
	const [selected, setSelected] = useState(null);

	const canInteract = isActiveTeam && !isSpymaster && phase === "guessing";

	function handleTileClick(index) {
		if (!canInteract) return;
		if (board[index]?.revealed) return;
		if (selected === index) {
			setSelected(null);
			socket.emit("codenames:highlight", { index: null });
		} else {
			setSelected(index);
			socket.emit("codenames:highlight", { index });
		}
	}

	function handleConfirm(e, index) {
		e.stopPropagation();
		socket.emit("codenames:guess", { index });
		setSelected(null);
		socket.emit("codenames:highlight", { index: null });
	}

	function handleDeselect() {
		if (selected !== null) {
			setSelected(null);
			socket.emit("codenames:highlight", { index: null });
		}
	}

	// index -> [{playerName, team}] (excluding self)
	const highlightMap = {};
	Object.entries(highlights || {}).forEach(([pid, h]) => {
		if (h.index === null || h.index === undefined) return;
		if (pid === meId) return;
		if (!highlightMap[h.index]) highlightMap[h.index] = [];
		highlightMap[h.index].push(h);
	});

	if (!board.length) return null;

	return (
		<div className="w-full max-w-3xl" onClick={handleDeselect}>
			<div className="grid grid-cols-5 gap-2.5">
				{board.map((card, i) => {
					const isSelected = selected === i;
					const teamHighlights = highlightMap[i] || [];
					const hasTeammateHighlight = teamHighlights.length > 0;

					let styles;
					let glowColor = null;

					if (card.revealed && card.type) {
						styles = TYPE_STYLES[card.type];
						glowColor = styles.glow;
					} else if (!card.revealed && isSpymaster && card.type) {
						styles = TYPE_STYLES_SPY[card.type];
						glowColor = styles.glow;
					} else {
						styles = null;
					}

					const baseCls = styles
						? `${styles.bg} ${styles.border} ${styles.text}`
						: "bg-bg-elevated border-bg-border text-white";

					return (
						<div
							key={i}
							onClick={(e) => {
								e.stopPropagation();
								handleTileClick(i);
							}}
							className={`
                relative aspect-[4/3] rounded-xl border-2 font-display font-bold text-sm
                uppercase tracking-wide transition-all duration-150 select-none
                ${baseCls}
                ${card.revealed ? "opacity-55" : ""}
                ${canInteract && !card.revealed ? "cursor-pointer hover:brightness-110" : "cursor-default"}
                ${isSelected ? "scale-105 ring-2 ring-neon-green ring-offset-1 ring-offset-bg-base" : ""}
                ${hasTeammateHighlight && !isSelected ? "ring-1 ring-white/25" : ""}
              `}
							style={{
								boxShadow: isSelected
									? "0 0 20px rgba(0,255,136,0.4), 0 0 40px rgba(0,255,136,0.15)"
									: glowColor && card.revealed
										? `0 0 10px ${glowColor}`
										: undefined,
							}}
						>
							<span className="absolute inset-0 flex items-center justify-center px-2 text-center leading-tight">
								{card.word}
							</span>

							{card.revealed && card.type === "assassin" && (
								<span className="absolute top-1 right-1 text-xs">
									💀
								</span>
							)}

							{/* Teammate highlight dots */}
							{hasTeammateHighlight && !card.revealed && (
								<div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
									{teamHighlights
										.slice(0, 3)
										.map((h, idx) => (
											<div
												key={idx}
												className={`w-1.5 h-1.5 rounded-full ${h.team === "red" ? "bg-team-red" : "bg-team-blue"}`}
												style={{
													boxShadow: `0 0 4px ${h.team === "red" ? "rgba(255,59,92,0.8)" : "rgba(59,130,246,0.8)"}`,
												}}
											/>
										))}
								</div>
							)}

							{/* Confirm overlay */}
							{isSelected && (
								<button
									onClick={(e) => handleConfirm(e, i)}
									className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-neon-green/20 hover:bg-neon-green/30 transition-all"
								>
									<span
										className="bg-neon-green text-bg-base font-display font-black text-xs px-3 py-1.5 rounded-lg uppercase tracking-widest"
										style={{
											boxShadow:
												"0 0 12px rgba(0,255,136,0.6)",
										}}
									>
										✓ Confirm
									</span>
								</button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
