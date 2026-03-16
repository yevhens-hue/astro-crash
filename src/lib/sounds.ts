// Sound settings interface
export interface SoundSettings {
  volume: number; // 0-100
  enabled: boolean;
  sounds: {
    wins: boolean;
    losses: boolean;
    chat: boolean;
    jackpot: boolean;
    engine: boolean;
    autoCashout: boolean;
  };
}

const DEFAULT_SETTINGS: SoundSettings = {
  volume: 70,
  enabled: true,
  sounds: {
    wins: true,
    losses: true,
    chat: true,
    jackpot: true,
    engine: true,
    autoCashout: true,
  },
};

const STORAGE_KEY = 'telegram_crash_sound_settings';

// Load settings from localStorage
export function loadSoundSettings(): SoundSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load sound settings:', e);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
export function saveSoundSettings(settings: SoundSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save sound settings:', e);
  }
}

// Get volume as 0-1 value
function getVolumeMultiplier(settings: SoundSettings): number {
  return (settings.volume / 100) * (settings.enabled ? 1 : 0);
}

export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static engineOsc: OscillatorNode | null = null;
  private static engineGain: GainNode | null = null;
  private static settings: SoundSettings = DEFAULT_SETTINGS;
  private static initialized: boolean = false;

  public static init() {
    if (this.initialized) return;
    this.settings = loadSoundSettings();
    this.initialized = true;
  }

  public static updateSettings(settings: SoundSettings) {
    this.settings = settings;
    saveSoundSettings(settings);
    
    // If disabled, stop engine
    if (!settings.enabled || !settings.sounds.engine) {
      this.stopEngine();
    }
  }

  public static getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public static isEnabled(): boolean {
    return this.settings.enabled;
  }

  public static toggleMute(): boolean {
    this.settings.enabled = !this.settings.enabled;
    saveSoundSettings(this.settings);
    if (!this.settings.enabled) {
      this.stopEngine();
    }
    return this.settings.enabled;
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

  // Game start sound
  static playStart() {
    if (!this.settings.enabled) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  // Engine sound for crash game
  static startEngine() {
    if (!this.settings.enabled || !this.settings.sounds.engine) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    if (this.engineOsc) this.stopEngine();

    this.engineOsc = ctx.createOscillator();
    this.engineGain = ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(50, ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.engineGain.gain.linearRampToValueAtTime(0.03 * vol, ctx.currentTime + 1);

    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(ctx.destination);
    this.engineOsc.start();
  }

  static updateEngine(multiplier: number) {
    if (!this.settings.enabled || !this.settings.sounds.engine || !this.engineOsc || !this.engineGain) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    
    const targetFreq = 50 + Math.log10(multiplier) * 400;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
    
    const targetVol = Math.min(0.08, 0.03 + Math.log10(multiplier) * 0.03) * vol;
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

  // Climbing sound during crash
  static playClimb(multiplier: number) {
    if (!this.settings.enabled) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440 + multiplier * 10, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.02 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  // Crash/explosion sound (loss)
  static playCrash() {
    this.stopEngine();
    if (!this.settings.enabled) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    // If loss sounds are disabled, skip
    if (!this.settings.sounds.losses) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noise = ctx.createBufferSource();
    
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

    gain.gain.setValueAtTime(0.3 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 0.5);
  }

  // Win sound
  static playWin(multiplier?: number) {
    if (!this.settings.enabled || !this.settings.sounds.wins) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    // More celebratory for bigger wins
    const isBigWin = multiplier && multiplier >= 3;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    
    if (isBigWin) {
      // Add extra note for big wins
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3); // C6
    }

    gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isBigWin ? 0.5 : 0.3));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isBigWin ? 0.5 : 0.3));
  }

  // NEW: Auto-cashout sound
  static playAutoCashout() {
    if (!this.settings.enabled || !this.settings.sounds.autoCashout) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone alert sound
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  // NEW: Jackpot sound (festive/celebratory)
  static playJackpot() {
    if (!this.settings.enabled || !this.settings.sounds.jackpot) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    // Major arpeggio with shimmer
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093, 2637];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
      
      const startTime = ctx.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08 * vol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // NEW: VIP level up sound
  static playVIPLevelUp() {
    if (!this.settings.enabled) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    // Ascending triumphant fanfare
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      
      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.1 * vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // NEW: Chat notification sound
  static playChatMessage() {
    if (!this.settings.enabled || !this.settings.sounds.chat) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);

    gain.gain.setValueAtTime(0.05 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  // NEW: Loss/bet failed sound (subtle)
  static playLoss() {
    if (!this.settings.enabled || !this.settings.sounds.losses) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.08 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  // NEW: Button click sound
  static playClick() {
    if (!this.settings.enabled) return;
    const ctx = this.getCtx();
    const vol = getVolumeMultiplier(this.settings);
    if (vol === 0) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);

    gain.gain.setValueAtTime(0.03 * vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }
}

// Initialize on import
if (typeof window !== 'undefined') {
  SoundManager.init();
}
