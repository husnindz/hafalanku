import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAudioRms, resampleTo16kHzMono } from '../src/index.ts';

describe('asr audio utilities', () => {
  it('resamples 48kHz audio down to 16kHz mono length', () => {
    const input = new Float32Array(48000).fill(0.5);
    const out = resampleTo16kHzMono(input, 48000);
    assert.equal(out.length, 16000);
    assert.ok(Math.abs((out[0] ?? 0) - 0.5) < 0.001);
  });

  it('computes RMS of silence as 0 and constant signal accurately', () => {
    assert.equal(computeAudioRms(new Float32Array(100)), 0);
    const signal = new Float32Array(100).fill(0.25);
    assert.ok(Math.abs(computeAudioRms(signal) - 0.25) < 0.0001);
  });
});

