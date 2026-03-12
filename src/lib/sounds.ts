export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static engineOsc: OscillatorNode | null = null;
  private static engineGain: GainNode | null = null;
  private static isMuted: boolean = false;

  public static init(enabled: boolean) {
    this.isMuted = !enabled;
    if (!enabled) this.stopEngine();
  }

  private static getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  static playStart() {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  static startEngine() {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    if (this.engineOsc) this.stopEngine();

    this.engineOsc = ctx.createOscillator();
    this.engineGain = ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(50, ctx.currentTime); // Low rumble

    this.engineGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.engineGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 1);

    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(ctx.destination);
    this.engineOsc.start();
  }

  static updateEngine(multiplier: number) {
    if (this.isMuted || !this.engineOsc || !this.engineGain) return;
    const ctx = this.getCtx();
    
    // Pitch goes up logarithmically with multiplier (e.g. 1x -> 50Hz, 10x -> 300Hz, 100x -> 800Hz)
    const targetFreq = 50 + Math.log10(multiplier) * 400;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
    
    // Slightly increase volume as it goes higher
    const targetVol = Math.min(0.08, 0.03 + Math.log10(multiplier) * 0.03);
    this.engineGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.1);
  }

  static stopEngine() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch(e) {}
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
  }

  static playClimb(multiplier: number) {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440 + multiplier * 10, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  static playCrash() {
    this.stopEngine();
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noise = ctx.createBufferSource();
    
    // Create white noise for explosion
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 0.5);
  }

  static playWin() {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
}
