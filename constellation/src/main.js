import './style.css';
import { createIcons, icons } from 'lucide';
import { parseEvents, parsePeaks } from './data.js';

const element = id => document.getElementById(id);
const canvas = element('visualisation');
const context = canvas.getContext('2d');
const recording = element('recording');
const seek = element('seek');
const play = element('play');
const loading = element('loading');
let data;
let events;
let view = 'score';
let audioContext;
let audioBus;
let scheduledIndex = 0;
let loop = false;
let scaleHeight = 1;

function iconsRefresh() { createIcons({ icons }); }
function formatTime(seconds) {
  const whole = Math.floor(Math.max(0, seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
function lowerBound(time) {
  let low = 0;
  let high = data.peaks.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (data.peaks[middle].time < time) low = middle + 1;
    else high = middle;
  }
  return low;
}
function resetSound() {
  if (audioBus) audioBus.disconnect();
  if (audioContext) {
    audioBus = audioContext.createGain();
    audioBus.gain.value = Number(element('synth-volume').value) * 0.13;
    audioBus.connect(audioContext.destination);
  }
  if (data) scheduledIndex = lowerBound(recording.currentTime);
}
function playPeak(peak, when) {
  const notes = [0, 2, 4, 7, 9];
  const semitone = notes[peak.participant % notes.length] + 12 * (Math.floor(peak.participant / notes.length) % 3);
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const panner = audioContext.createStereoPanner();
  const strength = Math.min(1, Math.max(0.08, peak.height / scaleHeight));
  oscillator.type = 'sine';
  oscillator.frequency.value = 196 * 2 ** (semitone / 12);
  panner.pan.value = (peak.participant / Math.max(1, data.participants.length - 1)) * 1.6 - 0.8;
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(0.025 + strength * 0.075, when + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  oscillator.connect(envelope).connect(panner).connect(audioBus);
  oscillator.start(when);
  oscillator.stop(when + 0.17);
}
function schedule() {
  if (!data || recording.paused || !audioContext || audioContext.state !== 'running') return;
  const time = recording.currentTime;
  if (scheduledIndex && data.peaks[scheduledIndex - 1]?.time > time + 0.3) resetSound();
  while (scheduledIndex < data.peaks.length && data.peaks[scheduledIndex].time < time + 0.12) {
    const peak = data.peaks[scheduledIndex++];
    if (peak.time >= time - 0.04 && element('synth-enabled').checked) {
      playPeak(peak, audioContext.currentTime + Math.max(0, peak.time - time));
    }
  }
}
function resize() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * ratio);
  canvas.height = Math.round(bounds.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}
function draw() {
  if (!data) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const time = recording.currentTime;
  context.clearRect(0, 0, width, height);
  if (view === 'score') {
    const left = 20, right = width - 20, top = 38, bottom = height - 33;
    const xAt = value => left + (right - left) * value / data.duration;
    events.forEach(event => {
      context.strokeStyle = '#d9e3d8';
      context.beginPath(); context.moveTo(xAt(event.time), top); context.lineTo(xAt(event.time), bottom); context.stroke();
    });
    for (const peak of data.peaks) {
      const x = xAt(peak.time);
      const y = top + (bottom - top) * (peak.participant + 0.5) / data.participants.length;
      const strength = Math.min(1, Math.max(0.08, peak.height / scaleHeight));
      context.fillStyle = peak.time <= time ? `rgba(224, 99, 76, ${0.35 + strength * 0.65})` : `rgba(37, 112, 94, ${0.18 + strength * 0.55})`;
      context.fillRect(x, y, Math.max(1.3, strength * 2.4), Math.max(1.3, (bottom - top) / data.participants.length * 0.65));
    }
    context.strokeStyle = '#ed765d'; context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(xAt(time), top - 5); context.lineTo(xAt(time), bottom + 5); context.stroke();
  } else {
    const centreX = width / 2, centreY = height / 2, radius = Math.min(width, height) * 0.36;
    context.strokeStyle = '#d7e3d6'; context.lineWidth = 1;
    for (const fraction of [0.35, 0.68, 1]) { context.beginPath(); context.arc(centreX, centreY, radius * fraction, 0, Math.PI * 2); context.stroke(); }
    const active = new Map();
    for (let index = lowerBound(Math.max(0, time - 0.25)); index < data.peaks.length && data.peaks[index].time <= time; index++) active.set(data.peaks[index].participant, data.peaks[index]);
    for (let index = 0; index < data.participants.length; index++) {
      const angle = index * Math.PI * 2 / data.participants.length - Math.PI / 2;
      const x = centreX + Math.cos(angle) * radius, y = centreY + Math.sin(angle) * radius;
      const peak = active.get(index);
      if (peak) {
        const strength = Math.min(1, Math.max(0.1, peak.height / scaleHeight));
        context.strokeStyle = `rgba(232, 112, 88, ${0.3 + strength * 0.4})`;
        context.beginPath(); context.moveTo(centreX, centreY); context.lineTo(x, y); context.stroke();
        context.fillStyle = '#ef765e'; context.beginPath(); context.arc(x, y, 3 + strength * 5, 0, Math.PI * 2); context.fill();
      } else {
        context.fillStyle = '#8daea0'; context.beginPath(); context.arc(x, y, 2.5, 0, Math.PI * 2); context.fill();
      }
    }
    context.fillStyle = '#285a4c'; context.font = "500 24px 'Space Grotesk', sans-serif"; context.textAlign = 'center';
    context.fillText(formatTime(time), centreX, centreY + 8); context.textAlign = 'start';
  }
}
function render() {
  if (!data) return;
  const time = recording.currentTime;
  seek.value = time;
  element('clock').innerHTML = `${formatTime(time)} <span>/</span> ${formatTime(data.duration)}`;
  const active = new Set();
  for (let index = lowerBound(Math.max(0, time - 1)); index < data.peaks.length && data.peaks[index].time <= time; index++) active.add(data.peaks[index].participant);
  element('active-count').textContent = active.size;
  const current = events.filter(event => event.time <= time).at(-1);
  element('current-event').textContent = current ? current.label : 'Waiting for the performance';
  draw();
}
function setPosition(time) {
  recording.currentTime = Math.max(0, Math.min(data.duration, time));
  resetSound();
  render();
}
function syncRecordingVolume() { recording.volume = element('recording-enabled').checked ? Number(element('recording-volume').value) : 0; }
function setPlaying(isPlaying) {
  play.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  play.innerHTML = `<i data-lucide="${isPlaying ? 'pause' : 'play'}" fill="currentColor"></i>`;
  element('play-title').textContent = isPlaying ? 'Listening to the room' : 'Press play to listen';
  element('play-subtitle').textContent = isPlaying ? 'A moment in collective rhythm.' : 'The room is ready.';
  iconsRefresh();
}
play.addEventListener('click', async () => {
  if (!recording.paused) { recording.pause(); resetSound(); setPlaying(false); return; }
  try {
    audioContext ??= new AudioContext();
    await audioContext.resume();
    if (recording.currentTime >= data.duration) setPosition(0);
    resetSound();
    await recording.play();
    setPlaying(true);
  } catch (error) { loading.hidden = false; loading.classList.add('error'); loading.textContent = `Playback unavailable: ${error.message}`; }
});
element('restart').addEventListener('click', () => data && setPosition(0));
element('loop').addEventListener('click', event => { loop = !loop; event.currentTarget.setAttribute('aria-pressed', String(loop)); });
seek.addEventListener('input', () => data && setPosition(Number(seek.value)));
element('recording-enabled').addEventListener('change', syncRecordingVolume);
element('recording-volume').addEventListener('input', syncRecordingVolume);
element('synth-enabled').addEventListener('change', resetSound);
element('synth-volume').addEventListener('input', () => { if (audioBus) audioBus.gain.value = Number(element('synth-volume').value) * 0.13; });
recording.addEventListener('ended', () => { if (loop) { setPosition(0); recording.play(); } else { resetSound(); setPlaying(false); render(); } });
document.querySelectorAll('.view-button').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view;
  document.querySelectorAll('.view-button').forEach(item => { const selected = item === button; item.classList.toggle('active', selected); item.setAttribute('aria-pressed', String(selected)); });
  element('view-kicker').textContent = view === 'score' ? 'SCORE' : 'CONSTELLATION';
  element('view-title').textContent = view === 'score' ? 'A room in rhythm' : 'The room, together';
  element('canvas-label').textContent = view === 'score' ? 'PARTICIPANTS ↓' : 'PARTICIPANTS IN A CIRCLE';
  element('canvas-left').textContent = view === 'score' ? 'EACH ROW IS A PARTICIPANT' : 'EACH POINT IS A PARTICIPANT';
  element('canvas-right').textContent = view === 'score' ? 'TIME →' : 'POSITIONS ARE NOT PHYSICAL LOCATIONS';
  canvas.setAttribute('aria-label', view === 'score' ? 'Applause score showing selected clap peaks over time' : 'Participants arranged in a circle, flashing at their selected clap peaks');
  draw();
}));
canvas.addEventListener('click', event => {
  if (!data || view !== 'score') return;
  const bounds = canvas.getBoundingClientRect();
  setPosition((event.clientX - bounds.left - 20) / (bounds.width - 40) * data.duration);
});
window.addEventListener('resize', resize);
setInterval(schedule, 25);
function animate() { if (data && !recording.paused) render(); requestAnimationFrame(animate); }
requestAnimationFrame(animate);
iconsRefresh();
syncRecordingVolume();

async function loadData() {
 try {
  const responses = await Promise.all(['final_section_peaks.csv', 'final_stage_events.csv'].map(path => fetch(`${import.meta.env.BASE_URL}${path}`)));
  if (responses.some(response => !response.ok)) throw new Error('Could not load the data files.');
  const [peaksText, eventsText] = await Promise.all(responses.map(response => response.text()));
  data = parsePeaks(peaksText);
  events = parseEvents(eventsText);
  const heights = data.peaks.map(peak => peak.height).sort((first, second) => first - second);
  scaleHeight = heights[Math.floor(heights.length * 0.95)] || 1;
  seek.max = data.duration;
  element('duration-label').textContent = formatTime(data.duration);
  element('participant-count').textContent = `${data.participants.length} PARTICIPANTS`;
  element('peak-count').textContent = `${data.peaks.length.toLocaleString('en-GB')} SELECTED PEAKS`;
  element('canvas-status').textContent = `${data.participants.length} PARTICIPANTS`;
  for (const event of events) {
    const marker = document.createElement('button');
    marker.className = 'event-marker'; marker.style.left = `${event.time / data.duration * 100}%`;
    marker.title = `${formatTime(event.time)} ${event.label}`; marker.setAttribute('aria-label', marker.title);
    marker.innerHTML = '<i data-lucide="diamond" fill="currentColor"></i>';
    marker.addEventListener('click', () => setPosition(event.time));
    element('event-markers').append(marker);
  }
  iconsRefresh();
  loading.hidden = true;
  play.disabled = false;
  resize(); render();
 } catch (error) {
  loading.classList.add('error'); loading.textContent = `Could not prepare the score: ${error.message}`;
 }
}
loadData();