/**
 * Motor de Sonido Futurista en Tiempo Real (100% Web Audio API Sintetizado por Código)
 * Diseñado para UNIFRANZ AR Mirror Experience — Ingeniería de Sistemas e Innovación Digital
 * Incluye:
 *  - Desbloqueo automático de AudioContext en la primera interacción del usuario
 *  - GainNode maestro + DynamicsCompressorNode anti-saturación para parlantes de evento
 *  - Cooldowns inteligentes (80ms - 850ms) para 0% impacto en los 60 FPS de visión artificial
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.muted = false;
    this.unlocked = false;

    // Registro de timestamps por efecto para respetar cooldowns estrictos
    this.lastPlayed = {
      keystroke: 0,
      keyboardDeploy: 0,
      aiPulse: 0,
      cyberShield: 0,
      consoleChime: 0,
      arcadePop: 0,
      powerSurge: 0,
      quizCharge: 0,
      quizConfirm: 0,
      quizVictory: 0,
      uiClick: 0,
    };

    // Desbloqueo automático global al primer clic o toque en cualquier parte de la pantalla
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  initContext() {
    if (this.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    try {
      this.ctx = new AudioCtx();

      // Compresor dinámico maestro para evitar cualquier saturación o clipping en parlantes grandes
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(22, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  unlock() {
    if (!this.initContext()) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
  }

  setMuted(nextMuted) {
    this.muted = Boolean(nextMuted);
    this.unlock();
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, now, 0.015);
    }
    return this.muted;
  }

  isReadyToPlay(key, cooldownMs) {
    if (this.muted) return false;
    if (!this.initContext()) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const nowMs = performance.now();
    if (nowMs - (this.lastPlayed[key] || 0) < cooldownMs) {
      return false;
    }
    this.lastPlayed[key] = nowMs;
    return true;
  }

  // --------------------------------------------------------------------------
  // 1. TECLADO HOLOGRÁFICO: DESPLIEGUE (Synth Whoosh Ascendente) & TECLEO (Cyber Keystroke Click)
  // --------------------------------------------------------------------------
  playKeyboardDeploy() {
    if (!this.isReadyToPlay('keyboardDeploy', 950)) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.22);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 0.22);
    filter.Q.setValueAtTime(2.5, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCyberKeystroke() {
    // Cooldown estricto de 85ms para que el tecleo rápido suene fluido y mecánico sin saturar
    if (!this.isReadyToPlay('keystroke', 85)) return;
    const t = this.ctx.currentTime;

    // Variación sutil de tono para que cada tecla suene orgánica y real
    const baseFreq = 1150 + (Math.random() - 0.5) * 340;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(290, t + 0.038);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.042);

    // Transiente metálico agudo de 12ms (switch mecánico cyber)
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(baseFreq * 2.1, t);
    clickGain.gain.setValueAtTime(0.075, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.014);

    osc.connect(gain);
    gain.connect(this.masterGain);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.045);
    clickOsc.start(t);
    clickOsc.stop(t + 0.016);
  }

  // --------------------------------------------------------------------------
  // 2. PODER MANO IZQUIERDA ABIERTA (Inteligencia Artificial y Ciencia de Datos)
  // Zumbido armónico de red neuronal + destello agudo tipo radar de IA
  // --------------------------------------------------------------------------
  playAiNeuralPulse() {
    if (!this.isReadyToPlay('aiPulse', 680)) return;
    const t = this.ctx.currentTime;

    // Dron armónico suave
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(220, t);
    subOsc.frequency.exponentialRampToValueAtTime(330, t + 0.36);

    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.16, t + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    // Destello de radar de sinapsis IA
    const pingOsc = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    const pingNotes = [1320, 1480, 1760, 1975];
    const chosenNote = pingNotes[Math.floor(Math.random() * pingNotes.length)];

    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(chosenNote, t + 0.05);
    pingOsc.frequency.exponentialRampToValueAtTime(chosenNote * 1.25, t + 0.22);

    pingGain.gain.setValueAtTime(0.001, t + 0.05);
    pingGain.gain.linearRampToValueAtTime(0.11, t + 0.07);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    pingOsc.connect(pingGain);
    pingGain.connect(this.masterGain);

    subOsc.start(t);
    subOsc.stop(t + 0.44);
    pingOsc.start(t + 0.05);
    pingOsc.stop(t + 0.3);
  }

  // --------------------------------------------------------------------------
  // 3. PODER MANO DERECHA ABIERTA (Ciberseguridad y Blockchain)
  // Sonido metálico/energético grave y contundente de activación de escudo (Energy Shield Lock)
  // --------------------------------------------------------------------------
  playCyberShieldLock() {
    if (!this.isReadyToPlay('cyberShield', 750)) return;
    const t = this.ctx.currentTime;

    // Impacto grave de bloqueo de firewall
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(155, t);
    bassOsc.frequency.exponentialRampToValueAtTime(58, t + 0.28);

    const lowFilter = this.ctx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.setValueAtTime(680, t);
    lowFilter.frequency.exponentialRampToValueAtTime(140, t + 0.28);

    bassGain.gain.setValueAtTime(0.28, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    // Resonancia metálica hexagonal
    const metalOsc = this.ctx.createOscillator();
    const metalGain = this.ctx.createGain();
    metalOsc.type = 'square';
    metalOsc.frequency.setValueAtTime(520, t);
    metalOsc.frequency.setValueAtTime(690, t + 0.055);

    metalGain.gain.setValueAtTime(0.1, t);
    metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);

    bassOsc.connect(lowFilter);
    lowFilter.connect(bassGain);
    bassGain.connect(this.masterGain);

    metalOsc.connect(metalGain);
    metalGain.connect(this.masterGain);

    bassOsc.start(t);
    bassOsc.stop(t + 0.34);
    metalOsc.start(t);
    metalOsc.stop(t + 0.2);
  }

  // --------------------------------------------------------------------------
  // 4. MANDOS GAMING PLAYSTATION (✊✊ Ambos puños cerrados)
  // Chime cristalino de encendido de consola + Arcade/UI Pop para partículas (△ ○ ✕ □)
  // --------------------------------------------------------------------------
  playConsoleStartupChime() {
    if (!this.isReadyToPlay('consoleChime', 1200)) return;
    const t = this.ctx.currentTime;

    // Acorde cristalino estilo encendido de consola de nueva generación
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + idx * 0.045;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.44);
    });
  }

  playArcadeSymbolPop() {
    if (!this.isReadyToPlay('arcadePop', 115)) return;
    const t = this.ctx.currentTime;

    const notes = [880, 987.77, 1174.66, 1318.5];
    const startFreq = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.45, t + 0.055);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.062);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.065);
  }

  // --------------------------------------------------------------------------
  // 5. FUSIÓN / EXPLOSIÓN DE STACK TECH (Juntar manos o gesto Rock 🤘)
  // Onda expansiva / Bass Drop & Power Surge
  // --------------------------------------------------------------------------
  playTechExplosionSurge() {
    if (!this.isReadyToPlay('powerSurge', 750)) return;
    const t = this.ctx.currentTime;

    // Sub-Bass Drop
    const dropOsc = this.ctx.createOscillator();
    const dropGain = this.ctx.createGain();
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(180, t);
    dropOsc.frequency.exponentialRampToValueAtTime(42, t + 0.38);

    dropGain.gain.setValueAtTime(0.34, t);
    dropGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    // Power Surge ascendente
    const surgeOsc = this.ctx.createOscillator();
    const surgeGain = this.ctx.createGain();
    surgeOsc.type = 'sawtooth';
    surgeOsc.frequency.setValueAtTime(240, t);
    surgeOsc.frequency.exponentialRampToValueAtTime(1280, t + 0.28);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(800, t);
    bp.Q.setValueAtTime(1.8, t);

    surgeGain.gain.setValueAtTime(0.16, t);
    surgeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    dropOsc.connect(dropGain);
    dropGain.connect(this.masterGain);

    surgeOsc.connect(bp);
    bp.connect(surgeGain);
    surgeGain.connect(this.masterGain);

    dropOsc.start(t);
    dropOsc.stop(t + 0.44);
    surgeOsc.start(t);
    surgeOsc.stop(t + 0.32);
  }

  // --------------------------------------------------------------------------
  // 6. MINIJUEGO "¿QUÉ MENCIÓN DE SISTEMAS ERES?" (IA vs. Ciberseguridad)
  // Charging Beep progresivo + Beep de confirmación + Fanfarria Cyber Victory de 3 notas
  // --------------------------------------------------------------------------
  playQuizChargeTick(progressRatio = 0) {
    if (!this.isReadyToPlay('quizCharge', 110)) return;
    const t = this.ctx.currentTime;

    // El tono sube progresivamente de 420 Hz a 1120 Hz conforme se llena la barra de 1.5s
    const freq = 420 + Math.max(0, Math.min(1, progressRatio)) * 700;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  playQuizAnswerConfirm() {
    if (!this.isReadyToPlay('quizConfirm', 250)) return;
    const t = this.ctx.currentTime;

    [740, 1108.73].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + idx * 0.065;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  playQuizVictoryFanfare() {
    if (!this.isReadyToPlay('quizVictory', 1000)) return;
    const t = this.ctx.currentTime;

    // Fanfarria electrónica épica de 3 notas + acorde final (C5 -> E5 -> G5 + C6)
    const steps = [
      { freq: 523.25, delay: 0, dur: 0.16 },
      { freq: 659.25, delay: 0.14, dur: 0.16 },
      { freq: 1046.5, delay: 0.28, dur: 0.55 },
      { freq: 783.99, delay: 0.28, dur: 0.55 },
    ];

    steps.forEach((s) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + s.delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(s.freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + s.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + s.dur + 0.02);
    });
  }

  // --------------------------------------------------------------------------
  // 7. INTERFAZ Y BOTONES (Micro-clic táctil futurista de 40ms)
  // --------------------------------------------------------------------------
  playUiClick() {
    if (!this.isReadyToPlay('uiClick', 45)) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1650, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.036);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const soundEngine = new SoundEngine();
