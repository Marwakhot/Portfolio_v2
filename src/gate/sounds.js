// Small synthesised UI sounds. Browsers only allow audio after a user gesture.
const SOUNDS = {
  press: { gain: 0.4, layers: [{ noise: 'bandpass', frequency: 1700, q: 1.4, attack: 0.001, decay: 0.02, peak: 0.13 }] },
  sparkle: {
    gain: 0.5,
    layers: [
      { tone: 'sine', frequency: 1760, offset: 0, attack: 0.003, decay: 0.09, peak: 0.045 },
      { tone: 'sine', frequency: 2217, offset: 0.045, attack: 0.003, decay: 0.09, peak: 0.04 },
      { tone: 'sine', frequency: 2637, offset: 0.09, attack: 0.003, decay: 0.1, peak: 0.038 },
      { tone: 'sine', frequency: 3520, offset: 0.135, attack: 0.003, decay: 0.12, peak: 0.032 },
    ],
  },
  error: {
    gain: 0.42,
    layers: [
      { noise: 'bandpass', frequency: 850, q: 1.1, attack: 0.001, decay: 0.035, peak: 0.13 },
      { tone: 'triangle', frequency: 440, offset: 0.025, attack: 0.004, decay: 0.09, peak: 0.045 },
      { tone: 'triangle', frequency: 349.23, offset: 0.1, attack: 0.004, decay: 0.14, peak: 0.04 },
    ],
  },
};

let audio = null;

function playLayer(ctx, output, layer) {
  const start = ctx.currentTime + (layer.offset ?? 0);
  const end = start + layer.attack + layer.decay;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(1e-4, start);
  envelope.gain.exponentialRampToValueAtTime(layer.peak, start + layer.attack);
  envelope.gain.exponentialRampToValueAtTime(1e-4, end);
  envelope.connect(output);

  let source;
  if (layer.tone) {
    source = ctx.createOscillator();
    source.type = layer.tone;
    source.frequency.value = layer.frequency;
    source.connect(envelope);
  } else {
    const length = Math.max(1, Math.floor((end - start + 0.05) * ctx.sampleRate));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = 2 * Math.random() - 1;
    source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = layer.noise;
    filter.frequency.value = layer.frequency;
    filter.Q.value = layer.q;
    source.connect(filter).connect(envelope);
  }
  source.start(start);
  source.stop(end + 0.05);
}

export function playSound(name) {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  audio ??= new AudioContextClass();
  const sound = SOUNDS[name];
  audio
    .resume()
    .then(() => {
      const output = audio.createGain();
      output.gain.value = sound.gain;
      output.connect(audio.destination);
      sound.layers.forEach((layer) => playLayer(audio, output, layer));
    })
    .catch(() => {});
}
