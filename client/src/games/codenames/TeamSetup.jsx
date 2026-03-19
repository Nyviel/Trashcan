import socket from '../../socket';

export default function TeamSetup({ state, me, room }) {
  const myTeam = state.redTeam?.includes(me?.id) ? 'red' : state.blueTeam?.includes(me?.id) ? 'blue' : null;
  const isRedSpy = state.redSpymaster === me?.id;
  const isBluespy = state.blueSpymaster === me?.id;

  function joinTeam(team) {
    socket.emit('codenames:joinTeam', { team });
  }

  function claimSpymaster() {
    socket.emit('codenames:claimSpymaster');
  }

  const getName = (id) => room.players.find((p) => p.id === id)?.name || id;

  const canClaimSpymaster =
    (myTeam === 'red' && !state.redSpymaster) ||
    (myTeam === 'blue' && !state.blueSpymaster);

  const bothSpymasters = state.redSpymaster && state.blueSpymaster;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 animate-fade-in">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-3">🕵️</div>
          <h2 className="font-display font-black text-3xl text-white">Choose your team</h2>
          <p className="text-white/30 text-sm mt-1">Each team needs a spymaster</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Red team */}
          <div className={`card p-5 space-y-4 border ${myTeam === 'red' ? 'border-team-red/50' : 'border-bg-border'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-team-red text-lg">Red Team</h3>
              <span className="badge bg-team-red/10 text-team-red">{state.redTeam?.length || 0} players</span>
            </div>
            <ul className="space-y-1.5 min-h-[60px]">
              {(state.redTeam || []).map((id) => (
                <li key={id} className="text-sm text-white/70 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-team-red" />
                  {getName(id)}
                  {id === state.redSpymaster && <span className="badge bg-neon-yellow/10 text-neon-yellow text-[10px]">SPYMASTER</span>}
                  {id === me?.id && <span className="text-white/30 text-xs">(you)</span>}
                </li>
              ))}
            </ul>
            <button
              onClick={() => joinTeam('red')}
              disabled={myTeam === 'red'}
              className={`w-full btn text-sm py-2 ${myTeam === 'red' ? 'bg-team-red/20 border border-team-red/40 text-team-red' : 'btn-secondary'}`}
            >
              {myTeam === 'red' ? '✓ Joined' : 'Join Red'}
            </button>
          </div>

          {/* Blue team */}
          <div className={`card p-5 space-y-4 border ${myTeam === 'blue' ? 'border-team-blue/50' : 'border-bg-border'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-team-blue text-lg">Blue Team</h3>
              <span className="badge bg-team-blue/10 text-team-blue">{state.blueTeam?.length || 0} players</span>
            </div>
            <ul className="space-y-1.5 min-h-[60px]">
              {(state.blueTeam || []).map((id) => (
                <li key={id} className="text-sm text-white/70 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-team-blue" />
                  {getName(id)}
                  {id === state.blueSpymaster && <span className="badge bg-neon-yellow/10 text-neon-yellow text-[10px]">SPYMASTER</span>}
                  {id === me?.id && <span className="text-white/30 text-xs">(you)</span>}
                </li>
              ))}
            </ul>
            <button
              onClick={() => joinTeam('blue')}
              disabled={myTeam === 'blue'}
              className={`w-full btn text-sm py-2 ${myTeam === 'blue' ? 'bg-team-blue/20 border border-team-blue/40 text-team-blue' : 'btn-secondary'}`}
            >
              {myTeam === 'blue' ? '✓ Joined' : 'Join Blue'}
            </button>
          </div>
        </div>

        {/* Spymaster claim */}
        {myTeam && !isRedSpy && !isBluespy && (
          <div className="card p-5 text-center space-y-3">
            <p className="text-white/50 text-sm">Want to be your team's spymaster?</p>
            <p className="text-white/30 text-xs">The spymaster sees all card colors and gives one-word clues</p>
            <button
              onClick={claimSpymaster}
              disabled={!canClaimSpymaster}
              className="btn-secondary px-6"
            >
              {canClaimSpymaster ? 'Claim Spymaster Role' : 'Spymaster already claimed'}
            </button>
          </div>
        )}

        {bothSpymasters && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-green/10 border border-neon-green/20 text-neon-green text-sm font-display">
              ✓ Both spymasters ready — game starting…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
