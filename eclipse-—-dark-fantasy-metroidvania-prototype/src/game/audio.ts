class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public playJump() {
    this.tone(180, 420, 0.11, 'triangle', 0.08);
  }

  public playDoubleJump() {
    this.tone(360, 820, 0.16, 'sine', 0.09);
    this.tone(540, 1080, 0.14, 'triangle', 0.05);
  }

  public playGunshot() {
    this.tone(240, 38, 0.24, 'sawtooth', 0.18);
    this.tone(920, 120, 0.09, 'square', 0.14);
  }

  public playDash(isAbyssal: boolean) {
    if (isAbyssal) {
      this.tone(140, 55, 0.16, 'sawtooth', 0.09);
      this.tone(420, 190, 0.1, 'triangle', 0.05);
    } else {
      this.tone(520, 980, 0.14, 'sine', 0.07);
    }
  }

  public playAttack(stage: number, isAbyssal: boolean) {
    if (isAbyssal) {
      const base = 170 + stage * 35;
      this.tone(base, 65, 0.14, 'sawtooth', 0.09);
      this.tone(720, 260, 0.08, 'square', 0.035);
    } else {
      const base = 440 + stage * 90;
      this.tone(base, base * 1.45, 0.12, 'triangle', 0.07);
    }
  }

  public playHit(heavy = false) {
    this.tone(heavy ? 110 : 160, 45, heavy ? 0.18 : 0.11, 'sawtooth', heavy ? 0.13 : 0.09);
  }

  public playParrySuccess() {
    this.tone(880, 1760, 0.22, 'triangle', 0.14);
    this.tone(1320, 660, 0.28, 'sine', 0.11);
  }

  public playParryFail() {
    this.tone(190, 110, 0.12, 'square', 0.05);
  }

  public playHurt() {
    this.tone(160, 52, 0.22, 'sawtooth', 0.12);
  }

  public playHeal() {
    this.tone(440, 880, 0.25, 'sine', 0.08);
    setTimeout(() => this.tone(660, 1320, 0.28, 'triangle', 0.07), 80);
  }

  public playBossTelegraph() {
    this.tone(130, 220, 0.25, 'sawtooth', 0.07);
  }

  public playBossImpact() {
    this.tone(95, 28, 0.35, 'sawtooth', 0.16);
  }

  public playBossPhase() {
    this.tone(140, 420, 0.55, 'sawtooth', 0.12);
    this.tone(280, 70, 0.65, 'triangle', 0.12);
  }

  public playDoor() {
    this.tone(320, 640, 0.18, 'sine', 0.07);
  }

  public playCerberusUltimate() {
    this.tone(95, 32, 0.42, 'sawtooth', 0.16);
    this.tone(180, 65, 0.3, 'square', 0.11);
    setTimeout(() => this.tone(130, 42, 0.28, 'sawtooth', 0.15), 180);
  }

  public playBibleUltimate() {
    this.tone(520, 1040, 0.28, 'sine', 0.1);
    setTimeout(() => {
      this.tone(110, 34, 0.4, 'sawtooth', 0.15);
      this.tone(660, 330, 0.35, 'triangle', 0.11);
    }, 220);
  }

  public playMageSpell(isHeal: boolean) {
    if (isHeal) {
      this.tone(380, 760, 0.28, 'sine', 0.08);
    } else {
      this.tone(240, 560, 0.25, 'triangle', 0.09);
    }
  }
}

export const soundEngine = new SoundEngine();
