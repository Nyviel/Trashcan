import {
	createContext,
	useContext,
	useEffect,
	useReducer,
	useRef,
} from "react";
import socket from "../socket";

const RoomContext = createContext(null);

const initialState = {
	connected: false,
	room: null,
	me: null, // { id, name }
	gameState: null,
	error: null,
};

function reducer(state, action) {
	switch (action.type) {
		case "CONNECTED":
			return { ...state, connected: true };
		case "DISCONNECTED":
			return { ...state, connected: false };
		case "SET_ME":
			return { ...state, me: action.payload };
		case "SET_ROOM":
			return { ...state, room: action.payload, error: null };
		case "SET_GAME_STATE":
			return { ...state, gameState: action.payload };
		case "CLEAR_GAME":
			return { ...state, gameState: null };
		case "SET_ERROR":
			return { ...state, error: action.payload };
		case "CLEAR_ROOM":
			return { ...state, room: null, gameState: null };
		case "GAME_ENDED": {
			if (!state.room) return state;
			// Merge final scores into players and mark room as ended
			const players = action.payload.players || state.room.players;
			return {
				...state,
				room: { ...state.room, status: "ended", players },
			};
		}
		default:
			return state;
	}
}

export function RoomProvider({ children }) {
	const [state, dispatch] = useReducer(reducer, initialState);
	const stateRef = useRef(state);
	stateRef.current = state;

	useEffect(() => {
		socket.connect();

		socket.on("connect", () => {
			dispatch({ type: "CONNECTED" });
			dispatch({ type: "SET_ME", payload: { id: socket.id } });
		});

		socket.on("disconnect", () => dispatch({ type: "DISCONNECTED" }));
		socket.on("room:updated", (room) =>
			dispatch({ type: "SET_ROOM", payload: room }),
		);
		socket.on("game:returnedToLobby", () =>
			dispatch({ type: "CLEAR_GAME" }),
		);

		// Game ended — update room status so App.jsx routes to EndScreen
		socket.on("game:ended", ({ players, scores }) => {
			dispatch({ type: "GAME_ENDED", payload: { players, scores } });
		});

		return () => socket.disconnect();
	}, []);

	const actions = {
		createRoom: (name) =>
			new Promise((resolve, reject) => {
				socket.emit("room:create", { name }, (res) => {
					if (res.ok) {
						dispatch({
							type: "SET_ME",
							payload: { id: socket.id, name },
						});
						dispatch({ type: "SET_ROOM", payload: res.room });
						resolve(res.room);
					} else reject(new Error(res.error));
				});
			}),

		joinRoom: (code, name) =>
			new Promise((resolve, reject) => {
				socket.emit(
					"room:join",
					{ code: code.toUpperCase(), name },
					(res) => {
						if (res.ok) {
							dispatch({
								type: "SET_ME",
								payload: { id: socket.id, name },
							});
							dispatch({ type: "SET_ROOM", payload: res.room });
							resolve(res.room);
						} else reject(new Error(res.error));
					},
				);
			}),

		startGame: (game, config) =>
			new Promise((resolve, reject) => {
				socket.emit("game:start", { game, config }, (res) => {
					if (res?.ok) resolve();
					else reject(new Error(res?.error || "Failed to start"));
				});
			}),

		returnToLobby: () => socket.emit("game:returnToLobby"),

		leaveRoom: () => {
			dispatch({ type: "CLEAR_ROOM" });
			socket.disconnect();
			socket.connect();
		},
	};

	return (
		<RoomContext.Provider value={{ ...state, ...actions }}>
			{children}
		</RoomContext.Provider>
	);
}

export const useRoom = () => useContext(RoomContext);
