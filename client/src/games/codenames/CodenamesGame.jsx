import { useEffect, useReducer } from "react";
import socket from "../../socket";
import { useRoom } from "../../context/RoomContext";
import CodenamesBoard from "./CodenamesBoard";
import CodenamesHUD from "./CodenamesHUD";
import TeamSetup from "./TeamSetup";

const TEAM_COLORS = {
	red: {
		text: "text-team-red",
		border: "border-team-red",
		bg: "bg-team-red",
		glow: "rgba(255,59,92,0.3)",
		badge: "bg-team-red/20 text-team-red",
	},
	blue: {
		text: "text-team-blue",
		border: "border-team-blue",
		bg: "bg-team-blue",
		glow: "rgba(59,130,246,0.3)",
		badge: "bg-team-blue/20 text-team-blue",
	},
};

function TeamSidebar({
	team,
	playerIds,
	spymasterId,
	isActive,
	cardsLeft,
	room,
	me,
	myTeam,
}) {
	const c = TEAM_COLORS[team];
	const players = (playerIds || [])
		.map((id) => room?.players.find((p) => p.id === id))
		.filter(Boolean);
	const isMyTeam = myTeam === team;

	return (
		<div
			className={`w-44 flex-shrink-0 flex flex-col border-${team === "red" ? "r" : "l"} transition-all duration-500 overflow-y-auto`}
			style={{
				background: isActive
					? `rgba(${team === "red" ? "255,59,92" : "59,130,246"},0.04)`
					: "transparent",
				borderColor: isActive
					? `rgba(${team === "red" ? "255,59,92" : "59,130,246"},0.3)`
					: "rgba(255,255,255,0.06)",
				boxShadow: isActive
					? `inset ${team === "red" ? "-" : ""}4px 0 20px rgba(${team === "red" ? "255,59,92" : "59,130,246"},0.08)`
					: undefined,
			}}
		>
			<div className="p-4 space-y-4">
				{/* Team header */}
				<div className="text-center space-y-1">
					<div
						className={`font-display font-black text-2xl ${c.text}`}
						style={{
							textShadow: isActive
								? `0 0 12px ${c.glow}`
								: undefined,
						}}
					>
						{team.toUpperCase()}
					</div>
					<div
						className={`font-display font-black text-4xl text-white`}
						style={{
							textShadow: isActive
								? `0 0 10px ${c.glow}`
								: undefined,
						}}
					>
						{cardsLeft}
					</div>
					<div className="text-white/30 text-xs uppercase tracking-widest">
						cards left
					</div>

					{isActive && (
						<div
							className={`mt-2 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-widest animate-pulse-fast ${c.badge}`}
							style={{ boxShadow: `0 0 10px ${c.glow}` }}
						>
							{isMyTeam ? "▶ Your turn" : "Active"}
						</div>
					)}
				</div>

				{/* Divider */}
				<div
					style={{
						height: 1,
						background: `linear-gradient(90deg, transparent, ${isActive ? (team === "red" ? "rgba(255,59,92,0.4)" : "rgba(59,130,246,0.4)") : "rgba(255,255,255,0.08)"}, transparent)`,
					}}
				/>

				{/* Players */}
				<div className="space-y-2">
					{players.map((p) => {
						const isMe = p.id === me?.id;
						const isSpy = p.id === spymasterId;
						return (
							<div
								key={p.id}
								className={`px-2 py-2 rounded-lg text-xs transition-all ${isMe ? `${c.badge} border border-current/30` : "text-white/60"}`}
								style={
									isMe
										? { boxShadow: `0 0 8px ${c.glow}` }
										: {}
								}
							>
								<div className="flex items-center gap-1.5">
									<div
										className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? c.bg : "bg-white/20"}`}
										style={
											isActive
												? {
														boxShadow: `0 0 4px ${c.glow}`,
													}
												: {}
										}
									/>
									<span className="font-display font-semibold truncate">
										{p.name}
										{isMe && (
											<span className="opacity-50 ml-1">
												(you)
											</span>
										)}
									</span>
								</div>
								{isSpy && (
									<div
										className={`mt-1 ml-3 text-[10px] uppercase tracking-widest opacity-70 ${c.text}`}
									>
										🕵️ Spymaster
									</div>
								)}
							</div>
						);
					})}
					{players.length === 0 && (
						<p className="text-white/20 text-xs text-center">
							No players
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

function reducer(state, action) {
	switch (action.type) {
		case "STATE":
			return { ...state, ...action.payload };
		case "CARD_REVEAL": {
			const board = [...state.board];
			board[action.payload.index] = {
				...board[action.payload.index],
				revealed: true,
				type: action.payload.type,
			};
			return { ...state, board };
		}
		case "PHASE":
			return { ...state, ...action.payload };
		case "CLUE":
			return {
				...state,
				clue: action.payload.clue,
				clueCount: action.payload.count,
				currentTeam: action.payload.team,
				phase: "guessing",
			};
		case "HIGHLIGHT":
			return {
				...state,
				highlights: {
					...state.highlights,
					[action.payload.playerId]: {
						index: action.payload.index,
						playerName: action.payload.playerName,
						team: action.payload.team,
					},
				},
			};
		default:
			return state;
	}
}

const init = {
	phase: "setup",
	board: [],
	redTeam: [],
	blueTeam: [],
	redSpymaster: null,
	blueSpymaster: null,
	currentTeam: "red",
	clue: null,
	clueCount: 0,
	guessesLeft: 0,
	redRevealed: 0,
	blueRevealed: 0,
	winner: null,
	highlights: {}, // playerId -> { index, playerName, team }
};

export default function CodenamesGame() {
	const { room, me } = useRoom();
	const [state, dispatch] = useReducer(reducer, init);

	useEffect(() => {
		socket.on("codenames:started", () => {});
		socket.on("codenames:state", (data) =>
			dispatch({ type: "STATE", payload: data }),
		);
		socket.on("codenames:cardRevealed", (data) =>
			dispatch({ type: "CARD_REVEAL", payload: data }),
		);
		socket.on("codenames:phaseChanged", (data) =>
			dispatch({ type: "PHASE", payload: data }),
		);
		socket.on("codenames:clueGiven", (data) =>
			dispatch({ type: "CLUE", payload: data }),
		);
		socket.on("codenames:highlighted", (data) =>
			dispatch({ type: "HIGHLIGHT", payload: data }),
		);

		return () => {
			[
				"codenames:started",
				"codenames:state",
				"codenames:cardRevealed",
				"codenames:phaseChanged",
				"codenames:clueGiven",
				"codenames:highlighted",
			].forEach((e) => socket.off(e));
		};
	}, []);

	const myTeam = state.redTeam.includes(me?.id)
		? "red"
		: state.blueTeam.includes(me?.id)
			? "blue"
			: null;
	const isSpymaster =
		me?.id === state.redSpymaster || me?.id === state.blueSpymaster;
	const isActiveTeam = state.currentTeam === myTeam;

	if (
		state.phase === "setup" ||
		(state.redTeam.length === 0 && state.blueTeam.length === 0)
	) {
		return <TeamSetup state={state} me={me} room={room} />;
	}

	return (
		<div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
			<CodenamesHUD
				state={state}
				me={me}
				room={room}
				myTeam={myTeam}
				isSpymaster={isSpymaster}
				isActiveTeam={isActiveTeam}
			/>
			<div className="flex-1 flex overflow-hidden">
				{/* Red team sidebar */}
				<TeamSidebar
					team="red"
					playerIds={state.redTeam}
					spymasterId={state.redSpymaster}
					isActive={
						state.currentTeam === "red" && state.phase !== "setup"
					}
					cardsLeft={9 - (state.redRevealed || 0)}
					room={room}
					me={me}
					myTeam={myTeam}
				/>

				{/* Board */}
				<div className="flex-1 flex items-start justify-center p-4 overflow-y-auto">
					<CodenamesBoard
						board={state.board}
						phase={state.phase}
						myTeam={myTeam}
						isSpymaster={isSpymaster}
						isActiveTeam={isActiveTeam}
						currentTeam={state.currentTeam}
						highlights={state.highlights}
						meId={me?.id}
					/>
				</div>

				{/* Blue team sidebar */}
				<TeamSidebar
					team="blue"
					playerIds={state.blueTeam}
					spymasterId={state.blueSpymaster}
					isActive={
						state.currentTeam === "blue" && state.phase !== "setup"
					}
					cardsLeft={8 - (state.blueRevealed || 0)}
					room={room}
					me={me}
					myTeam={myTeam}
				/>
			</div>
		</div>
	);
}
