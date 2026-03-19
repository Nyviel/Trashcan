import { useRoom } from "../context/RoomContext";
import SkribblGame from "../games/skribbl/SkribblGame";
import CodenamesGame from "../games/codenames/CodenamesGame";
import FakeArtistGame from "../games/fake-artist/FakeArtistGame";
import GarticPhoneGame from "../games/gartic-phone/GarticPhoneGame";
import MusicQuizGame from "../games/music-quiz/MusicQuizGame";
import EndScreen from "../components/EndScreen";

export default function GamePage() {
	const { room } = useRoom();

	if (room.status === "ended") return <EndScreen />;

	if (room.game === "skribbl") return <SkribblGame />;
	if (room.game === "codenames") return <CodenamesGame />;
	if (room.game === "fake-artist") return <FakeArtistGame />;
	if (room.game === "gartic-phone") return <GarticPhoneGame />;
	if (room.game === "music-quiz") return <MusicQuizGame />;

	return (
		<div className="flex-1 flex items-center justify-center text-white/40">
			Loading game…
		</div>
	);
}
