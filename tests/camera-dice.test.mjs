import { build } from 'esbuild';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
await build({ entryPoints: ['src/camera/detectDice.ts'], outfile: 'node_modules/.camera-test.mjs', bundle: true, platform: 'node', format: 'esm' });
const { detectDice } = await import(pathToFileURL(`${process.cwd()}/node_modules/.camera-test.mjs`));

const faces = { 1: [[.5,.5]], 2: [[.25,.25],[.75,.75]], 3: [[.25,.25],[.5,.5],[.75,.75]], 4: [[.25,.25],[.75,.25],[.25,.75],[.75,.75]], 5: [[.25,.25],[.75,.25],[.5,.5],[.25,.75],[.75,.75]], 6: [[.25,.2],[.75,.2],[.25,.5],[.75,.5],[.25,.8],[.75,.8]] };
function image(values) {
  const width = 240, height = 120, data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data[i * 4 + 3] = 255;
  values.forEach((value, index) => {
    const left = 25 + index * 100, top = 25, size = 70;
    for (let y = top; y < top + size; y++) for (let x = left; x < left + size; x++) {
      const pip = faces[value].some(([cx, cy]) => Math.hypot(x - (left + cx * size), y - (top + cy * size)) < 5);
      const offset = (y * width + x) * 4;
      data[offset] = data[offset+1] = data[offset+2] = pip ? 20 : 235;
    }
  });
  return { width, height, data };
}

test('reads pairs of separated white dice with dark pips', () => {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) assert.deepEqual(detectDice(image([a,b])), [a,b]);
});
test('does not guess when only one die is visible or image is invalid', () => {
  assert.equal(detectDice(image([3])), null);
  assert.equal(detectDice({ width: 1, height: 1, data: new Uint8ClampedArray() }), null);
});

test('reads dark dice with light pips against a light background', () => {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    const source = image([a, b]);
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 255 - source.data[i];
      source.data[i + 1] = 255 - source.data[i + 1];
      source.data[i + 2] = 255 - source.data[i + 2];
    }
    const original = new Uint8ClampedArray(source.data);
    assert.deepEqual(detectDice(source, 'dark'), [a, b]);
    assert.deepEqual(source.data, original);
  }
  const one = image([3]);
  for (let i = 0; i < one.data.length; i += 4) for (let c = 0; c < 3; c++) one.data[i + c] = 255 - one.data[i + c];
  assert.equal(detectDice(one, 'dark'), null);
});
