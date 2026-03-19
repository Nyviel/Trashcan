import { useState } from "react";
import { useRoom } from "../context/RoomContext";

export default function HomePage() {
	const { createRoom, joinRoom } = useRoom();
	const [mode, setMode] = useState(null); // null | 'create' | 'join'
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	async function handleCreate(e) {
		e.preventDefault();
		if (!name.trim()) return;
		setLoading(true);
		setError("");
		try {
			await createRoom(name.trim());
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}

	async function handleJoin(e) {
		e.preventDefault();
		if (!name.trim() || !code.trim()) return;
		setLoading(true);
		setError("");
		try {
			await joinRoom(code.trim(), name.trim());
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex-1 flex flex-col items-center justify-center px-4 py-16 animate-fade-in">
			{/* Logo */}
			<div className="mb-12 text-center">
				<div className="flex items-center justify-center gap-2 mb-3">
					<span className="text-4xl">🗑️</span>
				</div>
				<h1 className="font-display font-black text-6xl tracking-tight text-white mb-2">
					TRASH<span className="text-neon-green">CAN</span>
				</h1>
				<p className="text-white/40 font-body text-sm tracking-widest uppercase">
					Much Trash. Very Can. Such Game. Wow.
				</p>
			</div>

			{/* Mode picker */}
			{!mode && (
				<div className="flex flex-col gap-4 w-full max-w-sm animate-slide-up">
					<button
						className="btn-primary text-lg py-4"
						onClick={() => setMode("create")}
					>
						Create a Room
					</button>
					<button
						className="btn-secondary text-lg py-4"
						onClick={() => setMode("join")}
					>
						Join a Room
					</button>
				</div>
			)}

			{/* Create form */}
			{mode === "create" && (
				<form
					onSubmit={handleCreate}
					className="card p-8 w-full max-w-sm space-y-4 animate-slide-up"
				>
					<h2 className="font-display font-bold text-xl text-white">
						Create Room
					</h2>
					<div>
						<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
							Your Name
						</label>
						<input
							className="input"
							placeholder="Enter your name..."
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={20}
							autoFocus
						/>
					</div>
					{error && <p className="text-neon-pink text-sm">{error}</p>}
					<div className="flex gap-3 pt-2">
						<button
							type="button"
							className="btn-ghost flex-1"
							onClick={() => {
								setMode(null);
								setError("");
							}}
						>
							Back
						</button>
						<button
							type="submit"
							className="btn-primary flex-1"
							disabled={!name.trim() || loading}
						>
							{loading ? "Creating..." : "Create"}
						</button>
					</div>
				</form>
			)}

			{/* Join form */}
			{mode === "join" && (
				<form
					onSubmit={handleJoin}
					className="card p-8 w-full max-w-sm space-y-4 animate-slide-up"
				>
					<h2 className="font-display font-bold text-xl text-white">
						Join Room
					</h2>
					<div>
						<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
							Room Code
						</label>
						<input
							className="input font-display font-bold text-xl tracking-[0.3em] uppercase text-center"
							placeholder="XXXXXX"
							value={code}
							onChange={(e) =>
								setCode(
									e.target.value.toUpperCase().slice(0, 6),
								)
							}
							maxLength={6}
							autoFocus
						/>
					</div>
					<div>
						<label className="block text-xs text-white/40 uppercase tracking-widest mb-2">
							Your Name
						</label>
						<input
							className="input"
							placeholder="Enter your name..."
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={20}
						/>
					</div>
					{error && <p className="text-neon-pink text-sm">{error}</p>}
					<div className="flex gap-3 pt-2">
						<button
							type="button"
							className="btn-ghost flex-1"
							onClick={() => {
								setMode(null);
								setError("");
							}}
						>
							Back
						</button>
						<button
							type="submit"
							className="btn-primary flex-1"
							disabled={!name.trim() || !code.trim() || loading}
						>
							{loading ? "Joining..." : "Join"}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
