import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createEmptyBoard, createNewGame, resolvePlacement } from '../game/engine.js';
import { createClearParticles, MAX_CLEAR_PARTICLES } from './clearParticles.js';
import { FeedbackLayer } from './FeedbackLayer.jsx';
function crossing() {
  const game = createNewGame(42, 'cross', 0);
  game.tray[0] = {
    ...game.tray[0],
    shapeId: 0,
    colourId: 0
  };
  for (let n = 1; n < 8; n++) {
    game.board[0][n] = 0;
    game.board[n][0] = 2;
  }
  return resolvePlacement(game, {
    gameId: game.gameId,
    revision: 0,
    pieceId: game.tray[0].instanceId,
    anchorRow: 0,
    anchorColumn: 0
  });
}
describe('clear bursts remain presentation only', () => {
  it('creates one deterministic particle for each of 15 unique crossing cells, including colour zero', () => {
    const {
      game,
      result
    } = crossing();
    const particles = createClearParticles(result);
    expect(particles).toHaveLength(15);
    expect(new Set(particles.map(p => p.id)).size).toBe(15);
    expect(particles.find(p => p.id === '0:0').colour).toBe('var(--colour-0)');
    expect(createClearParticles(result)).toEqual(particles);
    expect(game.score).toBe(310);
    expect(game.board).toEqual(createEmptyBoard());
    const before = JSON.stringify(result);
    render(<StrictMode><FeedbackLayer result={result} reduced={false} /></StrictMode>);
    expect(document.querySelectorAll('.clear-particle')).toHaveLength(15);
    expect(document.querySelectorAll('.feedback strong')).toHaveLength(1);
    expect(document.querySelector('.feedback strong')).toHaveTextContent('+310');
    expect(JSON.stringify(result)).toBe(before);
  });
  it('bounds particles to 64 unique board cells even if input coordinates repeat', () => {
    const {
      result
    } = crossing();
    const cells = Array.from({
      length: 64
    }, (_, i) => [Math.floor(i / 8), i % 8]);
    expect(createClearParticles({
      ...result,
      cleared: [...cells, ...cells],
      snapshots: {
        ...result.snapshots,
        afterPlacement: createEmptyBoard().map(row => row.map(() => 0))
      }
    })).toHaveLength(MAX_CLEAR_PARTICLES);
  });
  it('reduced motion removes all particle nodes but keeps the same total and included bonus', () => {
    const {
      result
    } = crossing();
    const view = render(<FeedbackLayer result={result} reduced={false} />);
    view.rerender(<FeedbackLayer result={result} reduced />);
    expect(document.querySelector('.clear-burst')).not.toBeInTheDocument();
    expect(document.querySelector('.feedback')).toHaveTextContent('+310');
    expect(document.querySelector('.feedback')).toHaveTextContent('Includes +100 multi-line bonus');
  });
});
