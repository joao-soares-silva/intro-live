/**
 * Web Audio API Synth & Frequency Analyser for Cyber Stream Intro
 * Generates an atmospheric cyberpunk beat and extracts real-time frequency data.
 */

export interface AudioMetrics {
  bass: number; // 0 to 1
  mid: number; // 0 to 1
  treble: number; // 0 to 1
  energy: number; // 0 to 1
  isBeatHit: boolean; // boolean spike on kick
}

class CyberAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isRunning: boolean = false;
  private isMuted: boolean = false;
  private bpm: number = 110;
  private step: number = 0;
  private timerId: number | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private lastBeatTime: number = 0;
  private beatHit: boolean = false;

  // Procedural clock for when sound is not yet initialized or muted
  private proceduralTime: number = 0;

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35; // Default comfortable volume
    this.masterGain.connect(this.ctx.destination);
    this.analyser.connect(this.masterGain);
  }

  start() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleBeat();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  private scheduleBeat() {
    const stepInterval = (60 / this.bpm / 4) * 1000; // 16th notes
    this.timerId = window.setInterval(() => {
      this.playStep();
    }, stepInterval);
  }

  private playStep() {
    if (!this.ctx || !this.analyser) return;
    const now = this.ctx.currentTime;
    const s = this.step % 16;
    this.step++;

    // 1. Kick on steps 0, 4, 8, 12 (Four-on-the-floor cyber kick)
    if (s % 4 === 0) {
      this.beatHit = true;
      this.lastBeatTime = performance.now();
      this.triggerKick(now);
    } else {
      this.beatHit = false;
    }

    // 2. Offbeat Hi-hat on steps 2, 6, 10, 14
    if (s % 4 === 2) {
      this.triggerHiHat(now);
    }

    // 3. Cyber Sub Pad / Arpeggio chord notes
    if (s % 8 === 0) {
      const frequencies = [65.41, 77.78, 87.31, 98.0]; // C2, Eb2, F2, G2
      const chordNote = frequencies[Math.floor(this.step / 16) % frequencies.length];
      this.triggerPad(now, chordNote);
    }
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.analyser) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.18);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private triggerHiHat(time: number) {
    if (!this.ctx || !this.analyser) return;
    // White noise burst for crisp hihat
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    noise.start(time);
  }

  private triggerPad(time: number, freq: number) {
    if (!this.ctx || !this.analyser) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + 1.2);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + 1.5);
  }

  // Get current metrics: works whether real audio is playing or using smooth procedural synthesis
  getMetrics(): AudioMetrics {
    this.proceduralTime += 0.016;

    if (this.analyser && this.freqData && this.isRunning && !this.isMuted) {
      this.analyser.getByteFrequencyData(this.freqData);

      // Bass bins: 0 to 4
      let bassSum = 0;
      for (let i = 0; i < 5; i++) bassSum += this.freqData[i];
      const bass = Math.min(1, (bassSum / 5 / 255) * 1.3);

      // Mid bins: 5 to 25
      let midSum = 0;
      for (let i = 5; i < 25; i++) midSum += this.freqData[i];
      const mid = Math.min(1, (midSum / 20 / 255) * 1.5);

      // Treble bins: 25 to 60
      let trebleSum = 0;
      for (let i = 25; i < 60; i++) trebleSum += this.freqData[i];
      const treble = Math.min(1, (trebleSum / 35 / 255) * 1.8);

      const energy = (bass * 0.5 + mid * 0.3 + treble * 0.2);
      const isBeatHit = (performance.now() - this.lastBeatTime) < 120;

      return { bass, mid, treble, energy, isBeatHit };
    }

    // Procedural rhythmic simulation (so canvas always moves with steady, organic cyber beat)
    const beatPhase = (this.proceduralTime * (this.bpm / 60)) % 1;
    const kickPunch = Math.max(0, 1 - beatPhase * 3.5);
    const bass = 0.2 + kickPunch * 0.7 + Math.sin(this.proceduralTime * 2) * 0.1;
    const mid = 0.25 + Math.sin(this.proceduralTime * 4.2) * 0.15;
    const treble = 0.2 + Math.cos(this.proceduralTime * 6.5) * 0.12;
    const isBeatHit = kickPunch > 0.6;

    return {
      bass: Math.max(0, Math.min(1, bass)),
      mid: Math.max(0, Math.min(1, mid)),
      treble: Math.max(0, Math.min(1, treble)),
      energy: (bass * 0.5 + mid * 0.3 + treble * 0.2),
      isBeatHit,
    };
  }
}

export const cyberAudio = new CyberAudioEngine();
