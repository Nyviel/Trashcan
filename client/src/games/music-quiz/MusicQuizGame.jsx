import { useEffect, useReducer } from "react";
import socket from "../../socket";
import { useRoom } from "../../context/RoomContext";
import MusicPicking from "./MusicPicking";
import MusicPlaying from "./MusicPlaying";
import MusicReveal from "./MusicReveal";

function reducer(state, action) {
	switch (action.type) {
		case "STATE":
			return { ...state, ...action.payload };
		case "GUESS_RESULT":
			return { ...state, myGuessResult: action.payload };
		case "GUESS_UPDATE":
			return {
				...state,
				guessedCount: action.payload.guessedCount,
				totalGuessers: action.payload.totalGuessers,
				scores: action.payload.scores,
			};
		case "ROUND_ENDED":
			return { ...state, phase: "reveal", roundEndData: action.payload };
		case "ROUND_STARTED":
			return {
				...state,
				myGuessResult: null,
				roundEndData: null,
				...action.payload,
			};
		default:
			return state;
	}
}

const initState = {
	phase: "picking",
	picks: {},
	pickedPlayerIds: [],
	order: [],
	currentIndex: 0,
	currentSongOwnerId: null,
	currentSongOwnerName: null,
	currentSong: null,
	guesses: {},
	guessedCount: 0,
	totalGuessers: 0,
	scores: {},
	totalSongs: 0,
	myGuessResult: null,
	roundEndData: null,
};

export default function MusicQuizGame() {
	const { room, me } = useRoom();
	const [state, dispatch] = useReducer(reducer, initState);

	useEffect(() => {
		socket.on("music:state", (d) =>
			dispatch({ type: "STATE", payload: d }),
		);
		socket.on("music:roundStarted", (d) =>
			dispatch({ type: "ROUND_STARTED", payload: d }),
		);
		socket.on("music:guessResult", (d) =>
			dispatch({ type: "GUESS_RESULT", payload: d }),
		);
		socket.on("music:guessUpdate", (d) =>
			dispatch({ type: "GUESS_UPDATE", payload: d }),
		);
		socket.on("music:roundEnded", (d) =>
			dispatch({ type: "ROUND_ENDED", payload: d }),
		);
		socket.on("music:playerPicked", () => {});

		return () => {
			[
				"music:state",
				"music:roundStarted",
				"music:guessResult",
				"music:guessUpdate",
				"music:roundEnded",
				"music:playerPicked",
			].forEach((e) => socket.off(e));
		};
	}, []);

	const isHost = room?.hostId === me?.id;
	const isPicker = state.currentSongOwnerId === me?.id;

	if (state.phase === "picking") {
		return (
			<MusicPicking state={state} me={me} room={room} isHost={isHost} />
		);
	}

	if (state.phase === "reveal") {
		return (
			<MusicReveal
				state={state}
				roundEndData={state.roundEndData}
				me={me}
				room={room}
				isHost={isHost}
			/>
		);
	}

	return (
		<MusicPlaying
			state={state}
			me={me}
			room={room}
			isHost={isHost}
			isPicker={isPicker}
		/>
	);
}
