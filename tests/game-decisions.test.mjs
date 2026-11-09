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
