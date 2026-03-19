import { useRoom } from "./context/RoomContext";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import GamePage from "./pages/GamePage";

export default function App() {
	const { room } = useRoom();

	return (
		<div className="min-h-screen flex flex-col">
			{!room && <HomePage />}
			{room && room.status === "lobby" && <LobbyPage />}
			{room && room.status === "playing" && <GamePage />}
			{room && room.status === "ended" && <GamePage />}
		</div>
	);
}
