import { useEffect, useState } from "react";
import { useRoom } from "../context/RoomContext";
import PlayerList from "../components/PlayerList";
import socket from "../socket";

const GAMES = [
	{
		id: "skribbl",
		name: "Skribbl",
		icon: "🎨",
		desc: "One player draws, everyone else guesses",
		minPlayers: 2,
	},
	{
		id: "codenames",
		name: "Codenames",
		icon: "🕵️",
		desc: "Two teams, one spymaster each, find your words",
		minPlayers: 4,
	},
	{
		id: "fake-artist",
		name: "Fake Artist",
		icon: "🎭",
		desc: "Everyone draws together — one player doesn't know what",
		minPlayers: 3,
	},
	{
		id: "music-quiz",
		name: "Music Quiz",
		icon: "🎵",
		desc: "Everyone picks a song — others guess the title & artist",
		minPlayers: 2,
	},
	{
		id: "gartic-phone",
		name: "Gartic Phone",
		icon: "📞",
		desc: "Draw, describe, draw — watch the chain mutate",
		minPlayers: 3,
	},
];

function SkribblConfig({ config, onChange }) {
	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
					Rounds
				</label>
				<input
					type="number"
					min={1}
					max={10}
					className="input"
					value={config.rounds}
					onChange={(e) =>
						onChange({ ...config, rounds: e.target.value })
					}
				/>
			</div>
			<div>
				<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
					Draw Time (s)
				</label>
				<input
					type="number"
					min={20}
					max={180}
					step={10}
					className="input"
					value={config.drawTime}
					onChange={(e) =>
						onChange({ ...config, drawTime: e.target.value })
					}
				/>
			</div>
		</div>
	);
}

function FakeArtistConfig({ config, onChange }) {
	return (
		<div>
			<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
				Stroke Time (s)
			</label>
			<input
				type="number"
				min={10}
				max={120}
				step={5}
				className="input"
				value={config.strokeTime || 30}
				onChange={(e) =>
					onChange({ ...config, strokeTime: e.target.value })
				}
			/>
		</div>
	);
}

function GarticConfig({ config, onChange }) {
	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
					Draw Time (s)
				</label>
				<input
					type="number"
					min={20}
					max={300}
					step={10}
					className="input"
					value={config.drawTime || 90}
					onChange={(e) =>
						onChange({ ...config, drawTime: e.target.value })
					}
				/>
			</div>
			<div>
				<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
					Write Time (s)
				</label>
				<input
					type="number"
					min={10}
					max={180}
					step={10}
					className="input"
					value={config.writeTime || 60}
					onChange={(e) =>
						onChange({ ...config, writeTime: e.target.value })
					}
				/>
			</div>
		</div>
	);
}

export default function LobbyPage() {
	const { room, me, startGame, leaveRoom } = useRoom();
	const [selectedGame, setSelectedGame] = useState(
		room?.selectedGame || "skribbl",
	);
	const [config, setConfig] = useState({ rounds: 3, drawTime: 80 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [copied, setCopied] = useState(false);

	const isHost = room?.hostId === me?.id;
	const game = GAMES.find((g) => g.id === selectedGame);
	const canStart = room?.players.length >= (game?.minPlayers || 2);

	// Non-host: listen for host's game selection changes
	useEffect(() => {
		socket.on("lobby:gameSelected", ({ game }) => {
			setSelectedGame(game);
		});
		return () => socket.off("lobby:gameSelected");
	}, []);

	function handleSelectGame(id) {
		setSelectedGame(id);
		if (isHost) {
			socket.emit("lobby:selectGame", { game: id });
		}
	}

	async function handleStart() {
		setLoading(true);
		setError("");
		try {
			await startGame(selectedGame, config);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}

	function copyCode() {
		navigator.clipboard.writeText(room.code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="flex-1 flex flex-col items-center justify-start px-4 py-10 animate-fade-in">
			<div className="w-full max-w-3xl space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<p className="text-neon-green/50 text-xs uppercase tracking-widest mb-1">
							Room Code
						</p>
						<button
							onClick={copyCode}
							className="font-display font-black text-5xl tracking-[0.25em] transition-all hover:scale-105"
							style={{
								color: "#00ff88",
								textShadow:
									"0 0 12px #00ff88, 0 0 30px rgba(0,255,136,0.4)",
							}}
						>
							{room.code}
							<span
								className="ml-3 text-sm font-body font-normal tracking-normal"
								style={{
									color: "rgba(255,255,255,0.25)",
									textShadow: "none",
								}}
							>
								{copied ? "✓ copied" : "click to copy"}
							</span>
						</button>
					</div>
					<button className="btn-ghost text-sm" onClick={leaveRoom}>
						Leave
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Players */}
					<div className="card p-6 space-y-4">
						<h2 className="font-display font-bold text-white text-lg">
							Players
							<span className="ml-2 text-white/30 font-body font-normal text-sm">
								{room.players.length}
							</span>
						</h2>
						<PlayerList
							players={room.players}
							hostId={room.hostId}
							meId={me?.id}
						/>
						{!isHost && (
							<p className="text-white/30 text-sm text-center pt-2">
								Waiting for host to start the game…
							</p>
						)}
					</div>

					{/* Game select + config (host only) */}
					{isHost && (
						<div className="card p-6 space-y-5">
							<h2 className="font-display font-bold text-white text-lg">
								Choose Game
							</h2>

							<div className="space-y-2">
								{GAMES.map((g) => (
									<button
										key={g.id}
										onClick={() => handleSelectGame(g.id)}
										className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
											selectedGame === g.id
												? "border-neon-green/60 bg-neon-green/5"
												: "border-bg-border bg-bg-elevated hover:border-neon-green/20"
										}`}
										style={
											selectedGame === g.id
												? {
														boxShadow:
															"0 0 20px rgba(0,255,136,0.12), inset 0 0 20px rgba(0,255,136,0.04)",
													}
												: {}
										}
									>
										<div className="flex items-center gap-3">
											<span className="text-2xl">
												{g.icon}
											</span>
											<div>
												<p className="font-display font-bold text-white text-sm">
													{g.name}
												</p>
												<p className="text-white/40 text-xs mt-0.5">
													{g.desc}
												</p>
											</div>
										</div>
									</button>
								))}
							</div>

							{/* Config panel */}
							{selectedGame === "skribbl" && (
								<div className="pt-1">
									<p className="text-xs text-white/40 uppercase tracking-widest mb-3">
										Settings
									</p>
									<SkribblConfig
										config={config}
										onChange={setConfig}
									/>
								</div>
							)}
							{selectedGame === "fake-artist" && (
								<div className="pt-1">
									<p className="text-xs text-white/40 uppercase tracking-widest mb-3">
										Settings
									</p>
									<FakeArtistConfig
										config={config}
										onChange={setConfig}
									/>
								</div>
							)}
							{selectedGame === "gartic-phone" && (
								<div className="pt-1">
									<p className="text-xs text-white/40 uppercase tracking-widest mb-3">
										Settings
									</p>
									<GarticConfig
										config={config}
										onChange={setConfig}
									/>
								</div>
							)}

							{error && (
								<p className="text-neon-pink text-sm">
									{error}
								</p>
							)}

							{!canStart && (
								<p className="text-white/30 text-sm text-center">
									Need at least {game.minPlayers} players to
									start
								</p>
							)}

							<button
								className="btn-primary w-full text-base py-3 mt-2 font-display font-black tracking-widest uppercase"
								onClick={handleStart}
								disabled={!canStart || loading}
							>
								{loading ? "Starting…" : `▶ Start ${game.name}`}
							</button>
						</div>
					)}

					{/* Non-host game preview — updates when host changes selection */}
					{!isHost && (
						<div className="card p-6 flex flex-col items-center justify-center text-center gap-4">
							<div className="text-5xl">{game?.icon}</div>
							<div>
								<p className="font-display font-bold text-white text-xl">
									{game?.name}
								</p>
								<p className="text-white/40 text-sm mt-1">
									{game?.desc}
								</p>
							</div>
							<p className="text-white/20 text-xs">
								Host is selecting the game
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
