import { useState } from 'react';
import socket from '../../socket';
import { useRoom } from '../../context/RoomContext';

export default function CodenamesHUD({ state, me, room, myTeam, isSpymaster, isActiveTeam }) {
  const [clue, setClue] = useState('');
  const [count, setCount] = useState(2);
  const { returnToLobby } = useRoom();

  const isHost = room?.hostId === me?.id;
  const mySpymasterTurn = isSpymaster && isActiveTeam && state.phase === 'spymaster';
  const isGuessingTurn = isActiveTeam && !isSpymaster && state.phase === 'guessing';

  function submitClue(e) {
    e.preventDefault();
    if (!clue.trim()) return;
    socket.emit('codenames:giveClue', { clue: clue.trim(), count });
    setClue('');
  }

  function endTurn() {
    socket.emit('codenames:endTurn');
  }

  // Score bar
  const redLeft = 9 - (state.redRevealed || 0);
  const blueLeft = 8 - (state.blueRevealed || 0);

  return (
    <div className="bg-bg-card border-b border-bg-border px-6 py-4 space-y-3">
      {/* Team scores */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${state.currentTeam === 'red' ? 'border-team-red/60 bg-team-red/10' : 'border-bg-border'}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-team-red" />
          <span className="font-display font-bold text-team-red text-sm">Red</span>
          <span className="font-display font-black text-white text-lg ml-1">{redLeft}</span>
          <span className="text-white/30 text-xs">left</span>
        </div>

        <div className="flex-1 text-center">
          {state.phase === 'guessing' && state.clue && (
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl bg-bg-elevated border border-bg-border">
              <span className="text-white/40 text-xs uppercase tracking-widest">Clue</span>
              <span className="font-display font-black text-xl text-neon-cyan">{state.clue}</span>
              <span className="font-display font-black text-xl text-white">{state.clueCount}</span>
              {state.guessesLeft > 0 && (
                <span className="badge bg-neon-yellow/10 text-neon-yellow">
                  {state.guessesLeft} guess{state.guessesLeft !== 1 ? 'es' : ''} left
                </span>
              )}
            </div>
          )}
          {state.phase === 'spymaster' && (
            <span className="text-white/30 text-sm">
              Waiting for <span className={state.currentTeam === 'red' ? 'text-team-red' : 'text-team-blue'}>
                {state.currentTeam}
              </span> spymaster to give a clue…
            </span>
          )}
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${state.currentTeam === 'blue' ? 'border-team-blue/60 bg-team-blue/10' : 'border-bg-border'}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-team-blue" />
          <span className="font-display font-bold text-team-blue text-sm">Blue</span>
          <span className="font-display font-black text-white text-lg ml-1">{blueLeft}</span>
          <span className="text-white/30 text-xs">left</span>
        </div>

        {isHost && (
          <button className="btn-ghost text-xs px-3 py-2" onClick={returnToLobby}>
            ← Lobby
          </button>
        )}
      </div>

      {/* Spymaster clue input */}
      {mySpymasterTurn && (
        <form onSubmit={submitClue} className="flex items-center gap-3 pt-1">
          <span className="text-white/40 text-sm">Give a clue:</span>
          <input
            className="input flex-1 max-w-xs py-2"
            placeholder="One word…"
            value={clue}
            onChange={(e) => setClue(e.target.value.replace(/\s/g, ''))}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-sm">for</span>
            <select
              className="input w-16 py-2 text-center"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[1,2,3,4,5,6,7,8,9].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-white/40 text-sm">cards</span>
          </div>
          <button type="submit" className="btn-primary px-5 py-2" disabled={!clue.trim()}>
            Give Clue
          </button>
        </form>
      )}

      {/* End turn button */}
      {isGuessingTurn && (
        <div className="flex justify-center pt-1">
          <button onClick={endTurn} className="btn-secondary text-sm px-6">
            End Turn →
          </button>
        </div>
      )}
    </div>
  );
}
