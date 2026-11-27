import { build } from 'esbuild';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Bundle the TypeScript reducer for Node without changing the app's build.
await build({ entryPoints: ['src/hooks/useCraps.ts'], outfile: 'node_modules/.game-test.mjs', bundle: true, platform: 'node', format: 'esm' });
const { initialState, reducer } = await import(pathToFileURL(`${process.cwd()}/node_modules/.game-test.mjs`));

function pointOnSix() {
  let state = initialState();
  state = reducer(state, { type: 'BET', spot: 'place-6' });
  return reducer(state, { type: 'ROLL', d1: 3, d2: 3 });
}

test('new point offers a decision only when there is a place bet on it', () => {
  const state = pointOnSix();
  assert.equal(state.point, 6);
  assert.equal(state.pointDecision, 6);
  assert.equal(reducer(initialState(), { type: 'ROLL', d1: 3, d2: 3 }).pointDecision, null);
});

test('moving and pocketing return the original stake exactly once', () => {
  const state = pointOnSix();
  const moved = reducer(state, { type: 'POINT_BET_DECISION', to: 8 });
  assert.equal(moved.bets.place[6], 0);
  assert.equal(moved.bets.place[8], 25);
  assert.equal(moved.balance, state.balance);
  const pocketed = reducer(state, { type: 'POINT_BET_DECISION', to: 'pocket' });
  assert.equal(pocketed.balance, state.balance + 25);
  assert.equal(pocketed.bets.place[6], 0);
  assert.equal(reducer(pocketed, { type: 'POINT_BET_DECISION', to: 'pocket' }).balance, pocketed.balance);
  assert.equal(reducer(state, { type: 'POINT_BET_DECISION', to: 'keep' }).bets.place[6], 25);
});

test('tournament roll mode is set on start and cannot be changed until it ends', () => {
  let state = reducer(initialState(), { type: 'START_TOURNAMENT', buyIn: 5000, startedBy: 'host', stamp: 1, mode: 'manual' });
  assert.equal(state.mode, 'manual');
  state = reducer(state, { type: 'SET_MODE', mode: 'virtual' });
  assert.equal(state.mode, 'manual');
  state = reducer(state, { type: 'END_TOURNAMENT' });
  assert.equal(reducer(state, { type: 'SET_MODE', mode: 'virtual' }).mode, 'virtual');
});

test('pass line come-out wins credit winnings to balance and leave original bet on the pass line', () => {
  let state = initialState(); // balance = 1000, chip = 25
  state = reducer(state, { type: 'BET', spot: 'pass' });
  assert.equal(state.balance, 975);
  assert.equal(state.bets.passLine, 25);

  // Come-out 7: pays $25 winnings to rack, keeps $25 on pass line
  state = reducer(state, { type: 'ROLL', d1: 4, d2: 3 });
  assert.equal(state.balance, 1000);
  assert.equal(state.bets.passLine, 25);
  assert.equal(state.pending.length, 0);
  assert.equal(state.point, null);
  assert.ok(state.toasts.some((t) => t.text.includes('+$25 to rack') && t.text.includes('$25 bet stays up')));

  // Come-out 11 right after without re-betting: pays another $25 to rack, still keeps $25 on pass line
  state = reducer(state, { type: 'ROLL', d1: 6, d2: 5 });
  assert.equal(state.balance, 1025);
  assert.equal(state.bets.passLine, 25);
  assert.equal(state.point, null);
});

test('making the point pays pass line winnings to balance, leaves original pass bet, and settles odds', () => {
  let state = initialState(); // balance = 1000, chip = 25
  state = reducer(state, { type: 'BET', spot: 'pass' }); // balance = 975, passLine = 25
  state = reducer(state, { type: 'ROLL', d1: 3, d2: 3 }); // point = 6
  assert.equal(state.point, 6);
  assert.equal(state.bets.passLine, 25);
  assert.equal(state.balance, 975);

  // Add $50 odds behind the line (two $25 chips; 6:5 pays $60)
  state = reducer(state, { type: 'BET', spot: 'odds' });
  state = reducer(state, { type: 'BET', spot: 'odds' });
  assert.equal(state.bets.passOdds, 50);
  assert.equal(state.balance, 925);

  // Toggle rakeMode before rolling to ensure rolling resets rakeMode and protects the next tap
  state = reducer(state, { type: 'TOGGLE_RAKE' });
  assert.equal(state.rakeMode, true);

  // Hit point 6: $25 pass winnings + $50 odds stake + $60 odds winnings = +$135 to balance, $25 stays on pass line
  state = reducer(state, { type: 'ROLL', d1: 4, d2: 2 });
  assert.equal(state.point, null);
  assert.equal(state.bets.passLine, 25);
  assert.equal(state.bets.passOdds, 0);
  assert.equal(state.balance, 1060);
  assert.equal(state.rakeMode, false);
  assert.ok(state.toasts.some((t) => t.text.includes('+$25 to rack') && t.text.includes('$25 bet stays up')));
});

