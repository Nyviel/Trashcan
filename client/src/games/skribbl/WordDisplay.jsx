export function WordDisplay({ phase, word, hint, isDrawer, lastWord, drawer }) {
  if (phase === 'reveal') {
    return (
      <div className="text-center">
        <p className="text-white/30 text-xs">Word was</p>
        <p className="font-display font-black text-xl text-neon-cyan">{lastWord}</p>
      </div>
    );
  }
  if (phase === 'choosing') {
    return (
      <div className="text-center">
        <p className="text-white/40 text-sm">
          {isDrawer ? 'Choose a word…' : `${drawer} is choosing…`}
        </p>
      </div>
    );
  }
  if (phase === 'drawing') {
    return (
      <div className="text-center">
        {isDrawer ? (
          <p className="font-display font-black text-2xl text-neon-cyan tracking-widest">{word}</p>
        ) : (
          <p className="font-display font-black text-2xl text-white tracking-[0.3em]">
            {hint}
          </p>
        )}
        <p className="text-white/30 text-xs mt-0.5">
          {isDrawer ? 'Draw this!' : `${hint?.replace(/_/g, '').length || 0} letters`}
        </p>
      </div>
    );
  }
  return <div />;
}

export default WordDisplay;
