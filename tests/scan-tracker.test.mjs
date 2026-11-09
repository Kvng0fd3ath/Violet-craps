import { build } from 'esbuild';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
await build({ entryPoints: ['src/camera/scanTracker.ts'], outfile: 'node_modules/.tracker-test.mjs', bundle: true, platform: 'node', format: 'esm' });
const { ScanTracker } = await import(pathToFileURL(`${process.cwd()}/node_modules/.tracker-test.mjs`));
const frame = (value) => ({ width: 40, height: 40, data: new Uint8ClampedArray(40 * 40 * 4).fill(value) });

test('waits for movement and three stable readings; does not repeat a stationary roll', () => {
  const tracker = new ScanTracker(), a = frame(0), b = frame(255), read = () => [3, 4];
  for (let i = 0; i < 5; i++) assert.equal(tracker.next(a, read), null);
  assert.equal(tracker.next(b, read), null);
  assert.equal(tracker.next(b, read), null);
  assert.equal(tracker.next(b, read), null);
  assert.deepEqual(tracker.next(b, read), [3, 4]);
  for (let i = 0; i < 5; i++) assert.equal(tracker.next(b, read), null);
  assert.equal(tracker.next(a, read), null);
  tracker.next(a, read); tracker.next(a, read);
  assert.deepEqual(tracker.next(a, read), [3, 4]);
});

test('an uncertain or changed reading must stabilize again', () => {
  const tracker = new ScanTracker(), a = frame(0), b = frame(255);
  tracker.next(a, () => null); tracker.next(b, () => null);
  tracker.next(b, () => [1, 2]);
  tracker.next(b, () => null);
  assert.equal(tracker.next(b, () => [1, 2]), null);
  assert.equal(tracker.next(b, () => [1, 2]), null);
  assert.deepEqual(tracker.next(b, () => [1, 2]), [1, 2]);
});
