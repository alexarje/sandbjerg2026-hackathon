import Papa from 'papaparse';

export function parseTime(value) {
  const parts = value.split(':').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error(`Invalid time: ${value}`);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function parsePeaks(csv) {
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error(parsed.errors[0].message);
  const participants = parsed.meta.fields.slice(1);
  const peaks = [];
  let duration = 0;
  for (const row of parsed.data) {
    const time = parseTime(row.index);
    duration = Math.max(duration, time);
    participants.forEach((participant, index) => {
      if (row[participant] === '') return;
      const height = Number(row[participant]);
      if (Number.isFinite(height)) peaks.push({ time, participant: index, height });
    });
  }
  return { participants, peaks, duration };
}

export function parseEvents(csv) {
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error(parsed.errors[0].message);
  return parsed.data.map(row => ({ time: Number(row.TIME), label: row.LABEL.trim() }));
}