import { build } from 'esbuild';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
await build({ entryPoints: ['src/components/Dice.tsx'], outfile: 'node_modules/.dice-test.mjs', bundle: true, platform: 'node', format: 'esm', external: ['react', 'react-dom'] });
const { MiniDie } = await import(pathToFileURL(`${process.cwd()}/node_modules/.dice-test.mjs`));

test('mini dice use size-based padding and show the correct number of pips', () => {
  for (let value = 1; value <= 6; value++) {
    const html = renderToStaticMarkup(React.createElement(MiniDie, { value, size: 34 }));
    assert.match(html, /padding:3\.06px/);
    assert.equal((html.match(/class="pip pip-xl"/g) || []).length, value);
  }
});
