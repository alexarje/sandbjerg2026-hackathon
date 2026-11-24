import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEvents, parsePeaks, parseTime } from './data.js';

test('parses time and sparse peak values', () => {
  assert.equal(parseTime('00:02:01.020000'), 121.02);
  const data = parsePeaks('index,A,B\n00:00:00.000000,,2.5\n00:00:00.020000,3,\n');
  assert.deepEqual(data.peaks, [
    { time: 0, participant: 1, height: 2.5 },
    { time: 0.02, participant: 0, height: 3 },
  ]);
  assert.equal(data.duration, 0.02);
});

test('loads the supplied dataset and stage events', async () => {
  const peaks = parsePeaks(await readFile('final_clapping_section/final_section_peaks.csv', 'utf8'));
  const events = parseEvents(await readFile('final_clapping_section/final_stage_events.csv', 'utf8'));
  assert.equal(peaks.participants.length, 77);
  assert.equal(peaks.peaks.length, 14690);
  assert.equal(peaks.duration, 121.02);
  assert.deepEqual(events[0], { time: 7, label: 'Stand' });
});