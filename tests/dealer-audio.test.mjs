import { build } from 'esbuild';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

await build({ entryPoints: ['src/game/audio.ts'], outfile: 'node_modules/.audio-test.mjs', bundle: true, platform: 'node', format: 'esm' });
const { chooseDealerVoice, callDice, setAudioMuted } = await import(pathToFileURL(`${process.cwd()}/node_modules/.audio-test.mjs`));

test('prefers a known female English voice and falls back to English', () => {
  const voices = [{ name: 'Thomas', lang: 'fr-FR' }, { name: 'English', lang: 'en-US' }, { name: 'Samantha', lang: 'en-US' }];
  assert.equal(chooseDealerVoice(voices).name, 'Samantha');
  assert.equal(chooseDealerVoice(voices.slice(0, 2)).name, 'English');
  assert.equal(chooseDealerVoice(voices.slice(0, 1)), undefined);
});

test('calls both dice and their sum and mutes speech', () => {
  const calls = [];
  let cancelled = 0;
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.window = { speechSynthesis: { getVoices: () => [{ name: 'Samantha', lang: 'en-US' }], cancel: () => cancelled++, speak: (call) => calls.push(call) } };
  setAudioMuted(false);
  callDice(3, 4);
  assert.equal(calls[0].text, '3 and 4, 7.');
  assert.equal(calls[0].voice.name, 'Samantha');
  setAudioMuted(true);
  callDice(1, 1);
  assert.equal(calls.length, 1);
  assert.equal(cancelled, 2);
  delete globalThis.window;
  delete globalThis.SpeechSynthesisUtterance;
});
