import { performance } from 'node:perf_hooks';
import { createNewGame, resolvePlacement, recoverJoyGame, continueJoyRound, createEmptyBoard } from '../src/game/engine.js';
import { generateJoyTray, shapeCategory, JOY_EMPTY_BOARD_MOBILITY } from '../src/game/joy.js';
import { generateTray } from '../src/game/random.js';
import { JOY_SHAPE_CATALOGUE as shapes } from '../src/game/shapes.js';
import { getLegalAnchors, simulateMove } from '../src/game/rules.js';
const seeds = [1, 42, 143, 853], moveCap = 96;
const report = { seeds, moveCap, joyEmptyMobility: JOY_EMPTY_BOARD_MOBILITY, policies: { greedy: 'Max immediate lines, then largest piece, then slot/row/column order; no lookahead.', firstLegal: 'First remaining slot with a legal move, first row-major anchor; deliberately imperfect.' }, results: {} };
for (const policy of ['greedy', 'firstLegal']) for (const mode of ['classic', 'joy']) {
  const recoveryTimes = [], recoverySizes = { small: 0, medium: 0, large: 0 };
  const runs = [], times = [], frequency = Array(shapes.length).fill(0), sizes = { small: 0, medium: 0, large: 0 };
  let trays = 0, verified = 0, noFirstMove = 0, largeTrays = 0, allSmallTrays = 0, initialLargeAvailable = 0, largeWhenAvailable = 0, immediateClear = 0, reachableClear = 0, setupPieces = 0, exhausted = 0, searchCandidates = 0, repeats = 0, pairs = 0;
  let previous;
  function observe(board, generated) {
    trays++; const pieces = generated.tray.filter(Boolean);
    const anchors = pieces.map(p => getLegalAnchors(board, shapes[p.shapeId].cells));
    if (!anchors.some(a => a.length)) noFirstMove++;
    setupPieces += anchors.filter(a => !a.length).length;
    const large = pieces.some(p => shapeCategory(shapes[p.shapeId]) === 'large');
    if (large) largeTrays++; if (pieces.every(p => shapeCategory(shapes[p.shapeId]) === 'small')) allSmallTrays++;
    const available = shapes.filter(s => shapeCategory(s) === 'large').some(s => getLegalAnchors(board, s.cells).length);
    if (available) { initialLargeAvailable++; if (large) largeWhenAvailable++; }
    if (pieces.some((p,i) => anchors[i].some(a => simulateMove(board, shapes[p.shapeId], a).lines > 0))) immediateClear++;
    if (generated.diagnostics?.reachableLines > 0) reachableClear++;
    if (generated.trayVerified) verified++;
    exhausted += generated.diagnostics?.unknownSearches ?? 0; searchCandidates += generated.diagnostics?.candidates ?? 0;
    for (const p of pieces) { frequency[p.shapeId]++; sizes[shapeCategory(shapes[p.shapeId])]++; if(previous !== undefined) { pairs++; if(previous === p.shapeId) repeats++; } previous=p.shapeId; }
  }
  for (const seed of seeds) {
    previous=undefined; const start=performance.now(); let game=createNewGame(seed,`sim-${mode}-${policy}-${seed}`,0,mode);
    times.push(performance.now()-start);
    observe(game.board,mode==='joy'?generateJoyTray(createEmptyBoard(),seed):game);
    while(game.moveCount<moveCap && game.status!=='gameOver') {
      if(game.status==='roundWon') game=continueJoyRound(game,{gameId:game.gameId,revision:game.revision,roundId:game.round.id});
      if(game.status==='recovery') { const start = performance.now(); game=recoverJoyGame(game,{gameId:game.gameId,revision:game.revision}); recoveryTimes.push(performance.now()-start); if(game) for(const piece of game.tray.filter(Boolean)) recoverySizes[shapeCategory(shapes[piece.shapeId])]++; if(!game || game.status!=='active') throw Error('Recovery failed to offer a legal next move'); }
      let best;
      for(let slot=0;slot<3;slot++) { const p=game.tray[slot];if(!p)continue; const shape=shapes[p.shapeId];
        for(const anchor of getLegalAnchors(game.board,shape.cells)) { const move=simulateMove(game.board,shape,anchor),value=policy==='greedy'?move.lines*100+shape.cells.length:0;
          if(!best || value>best.value)best={slot,anchor,value}; if(policy==='firstLegal')break;
        } if(best && policy==='firstLegal')break;
      }
      if(!best)throw Error('Active game without a legal move');
      const command={gameId:game.gameId,revision:game.revision,pieceId:game.tray[best.slot].instanceId,anchorRow:best.anchor.row,anchorColumn:best.anchor.col};
      const resolved=resolvePlacement(game,command,(rng,nextId,board)=>{const start=performance.now();const g=mode==='joy'?generateJoyTray(board,rng,nextId,game.recentShapes,game.recentCategories):generateTray(rng,nextId);times.push(performance.now()-start);observe(board,g);const{diagnostics:_diagnostics,...stable}=g;return stable;});
      game=resolved.game;
    }
    runs.push({seed,moves:game.moveCount,capped:game.moveCount===moveCap,...game.statistics});
  }
  times.sort((a,b)=>a-b); recoveryTimes.sort((a,b)=>a-b);
  report.results[`${mode}/${policy}`]={runs,trays,recoverySizeDistribution:recoverySizes,recoveryGenerationMs:{samples:recoveryTimes.length,median:recoveryTimes[Math.floor(recoveryTimes.length*.5)]??null,p95:recoveryTimes[Math.floor(recoveryTimes.length*.95)]??null,max:recoveryTimes.at(-1)??null},legalFirstMoveViolations:noFirstMove,verifiedTrayFraction:mode==='joy'?verified/trays:null,largeTrayFraction:largeTrays/trays,allSmallTrayFraction:allSmallTrays/trays,initialLargeAvailable,largeWhenInitiallyAvailableFraction:largeWhenAvailable/initialLargeAvailable,immediateClearFraction:immediateClear/trays,reachableClearFraction:mode==='joy'?reachableClear/trays:null,piecesNeedingSetup:setupPieces,searchBudgetExhaustions:exhausted,searchCandidates,adjacentRepetitionFraction:repeats/pairs,sizeDistribution:sizes,shapeFrequency:Object.fromEntries(shapes.map(s=>[s.name,frequency[s.id]])),generationMs:{samples:times.length,median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)}};
}
console.log(JSON.stringify(report,null,2));
