import { useEffect, useRef, useState } from "react";
import socket from "../../socket";
import { useRoom } from "../../context/RoomContext";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function useDebounce(value, delay) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(t);
	}, [value, delay]);
	return debounced;
}

export default function MusicPicking({ state, me, room, isHost }) {
	const { returnToLobby } = useRoom();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const [searching, setSearching] = useState(false);
	const [preview, setPreview] = useState(null); // track being previewed
	const audioRef = useRef(null);
	const debouncedQuery = useDebounce(query, 400);

	const myPick = state.picks?.[me?.id];
	const allPicked = room?.players.every((p) =>
		state.pickedPlayerIds?.includes(p.id),
	);
	const pickedCount = state.pickedPlayerIds?.length || 0;

	useEffect(() => {
		if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
			setResults([]);
			return;
		}
		setSearching(true);
		fetch(
			`${SERVER_URL}/api/itunes?term=${encodeURIComponent(debouncedQuery)}&limit=6`,
		)
			.then((r) => r.json())
			.then((d) => {
				setResults(d.results || []);
				setSearching(false);
			})
			.catch(() => setSearching(false));
	}, [debouncedQuery]);

	function playPreview(track) {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.src = "";
		}
		if (preview?.trackId === track.trackId) {
			setPreview(null);
			return;
		}
		setPreview(track);
		const audio = new Audio(track.previewUrl);
		audio.volume = 0.5;
		audio.play();
		audioRef.current = audio;
		// Auto-stop after 5s
		setTimeout(() => {
			audio.pause();
		}, 5000);
	}

	function pickSong(track) {
		if (audioRef.current) audioRef.current.pause();
		socket.emit("music:pickSong", {
			trackId: track.trackId,
			trackName: track.trackName,
			artistName: track.artistName,
			artworkUrl: track.artworkUrl,
			previewUrl: track.previewUrl,
		});
		setQuery("");
		setResults([]);
		setPreview(null);
	}

	function unpick() {
		socket.emit("music:unpickSong");
	}

	function startGame() {
		socket.emit("music:startGame");
	}

	return (
		<div className="flex-1 flex flex-col items-center justify-start px-4 py-10 overflow-y-auto animate-fade-in">
			<div className="w-full max-w-2xl space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-display font-black text-3xl text-white">
							🎵 Music Quiz
						</h2>
						<p className="text-white/40 text-sm mt-1">
							Pick your song — everyone will try to guess it
						</p>
					</div>
					{isHost && (
						<button
							className="btn-ghost text-sm"
							onClick={returnToLobby}
						>
							← Lobby
						</button>
					)}
				</div>

				{/* Player pick status */}
				<div className="card p-4 space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-xs text-white/40 uppercase tracking-widest">
							Songs picked
						</p>
						<span
							className={`font-display font-bold text-sm ${allPicked ? "text-neon-green" : "text-white/40"}`}
						>
							{pickedCount} / {room?.players.length}
						</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{room?.players.map((p) => {
							const picked = state.pickedPlayerIds?.includes(
								p.id,
							);
							return (
								<div
									key={p.id}
									className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border
                  ${picked ? "border-neon-green/40 bg-neon-green/10 text-neon-green" : "border-bg-border text-white/40"}`}
								>
									<div
										className={`w-1.5 h-1.5 rounded-full ${picked ? "bg-neon-green" : "bg-white/20"}`}
									/>
									{p.name}
									{p.id === me?.id && (
										<span className="text-white/30 text-xs">
											(you)
										</span>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* My current pick */}
				{myPick && (
					<div className="card p-4 border border-neon-green/20 bg-neon-green/5">
						<div className="flex items-center gap-4">
							{myPick.artworkUrl && (
								<img
									src={myPick.artworkUrl}
									alt="album art"
									className="w-16 h-16 rounded-lg object-cover"
								/>
							)}
							<div className="flex-1 min-w-0">
								<p className="text-xs text-neon-green uppercase tracking-widest mb-1">
									Your pick ✓
								</p>
								<p className="font-display font-bold text-white truncate">
									{myPick.trackName}
								</p>
								<p className="text-white/50 text-sm truncate">
									{myPick.artistName}
								</p>
							</div>
							<button
								onClick={unpick}
								className="btn-ghost text-xs px-3 py-2 shrink-0"
							>
								Change
							</button>
						</div>
					</div>
				)}

				{/* Search */}
				{!myPick && (
					<div className="space-y-3">
						<div className="relative">
							<input
								className="input pr-10"
								placeholder="Search for a song or artist…"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								autoFocus
							/>
							{searching && (
								<div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
							)}
						</div>

						{results.length > 0 && (
							<div className="card divide-y divide-bg-border overflow-hidden">
								{results.map((track) => (
									<div
										key={track.trackId}
										className="flex items-center gap-3 p-3 hover:bg-bg-elevated transition-colors"
									>
										{track.artworkUrl && (
											<img
												src={track.artworkUrl}
												alt=""
												className="w-12 h-12 rounded-lg object-cover shrink-0"
											/>
										)}
										<div className="flex-1 min-w-0">
											<p className="font-display font-bold text-white text-sm truncate">
												{track.trackName}
											</p>
											<p className="text-white/40 text-xs truncate">
												{track.artistName} ·{" "}
												{track.collectionName}
											</p>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<button
												onClick={() =>
													playPreview(track)
												}
												className={`btn-ghost text-xs px-3 py-1.5 ${preview?.trackId === track.trackId ? "text-neon-cyan" : ""}`}
											>
												{preview?.trackId ===
												track.trackId
													? "⏹"
													: "▶"}
											</button>
											<button
												onClick={() => pickSong(track)}
												className="btn-primary text-xs px-3 py-1.5"
											>
												Pick
											</button>
										</div>
									</div>
								))}
							</div>
						)}

						{query.length > 1 &&
							!searching &&
							results.length === 0 && (
								<p className="text-white/20 text-sm text-center py-4">
									No results found
								</p>
							)}
					</div>
				)}

				{/* Host start button */}
				{isHost && (
					<div className="pt-2">
						{allPicked ? (
							<button
								className="btn-primary w-full py-4 text-base"
								onClick={startGame}
							>
								Start Game →
							</button>
						) : (
							<div className="text-center space-y-2">
								<p className="text-white/30 text-sm">
									Waiting for all players to pick a song…
								</p>
								{pickedCount >= 2 && (
									<button
										className="btn-secondary text-sm px-6"
										onClick={startGame}
									>
										Start with {pickedCount} songs
									</button>
								)}
							</div>
						)}
					</div>
				)}

				{!isHost && !myPick && (
					<p className="text-white/20 text-xs text-center">
						Host will start once everyone has picked
					</p>
				)}
				{!isHost && myPick && !allPicked && (
					<p className="text-white/20 text-xs text-center">
						Waiting for others to pick…
					</p>
				)}
			</div>
		</div>
	);
}
