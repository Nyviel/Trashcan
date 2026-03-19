import { useRoom } from '../context/RoomContext';

export default function EndScreen() {
  const { room, me, returnToLobby } = useRoom();
  const isHost = room?.hostId === me?.id;

  const sorted = [...(room?.players || [])].sort((a, b) => b.score - a.score);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="font-display font-black text-4xl text-white">
            Game Over
          </h1>
          <p className="text-white/40 mt-2 text-sm">Final Scores</p>
        </div>

        <div className="card p-6 space-y-3">
          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl
                ${i === 0 ? 'bg-neon-yellow/10 border border-neon-yellow/20' : 'bg-bg-elevated'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-7">{medals[i] || `${i + 1}.`}</span>
                <span className={`font-body text-sm ${player.id === me?.id ? 'text-neon-cyan' : 'text-white'}`}>
                  {player.name}
                  {player.id === me?.id && <span className="text-white/30 ml-1">(you)</span>}
                </span>
              </div>
              <span className={`font-display font-bold text-lg ${i === 0 ? 'text-neon-yellow' : 'text-white/70'}`}>
                {player.score}
              </span>
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="btn-primary w-full py-3 text-base" onClick={returnToLobby}>
            Back to Lobby
          </button>
        ) : (
          <p className="text-white/30 text-sm text-center">
            Waiting for host to return to lobby…
          </p>
        )}
      </div>
    </div>
  );
}
