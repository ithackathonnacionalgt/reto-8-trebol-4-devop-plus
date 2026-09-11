/**
 * Servicio de Narrador de Voz en Español (Web Speech API)
 * Diseñado especialmente para accesibilidad: personas que no saben leer
 * pero sí comprenden y hablan el idioma español.
 */

export interface NarratorState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
  rate: number;
  pitch: number;
  selectedVoiceName: string | null;
  autoSpeakOnSelect: boolean;
  clickToSpeakMode: boolean;
}

type StateListener = (state: NarratorState) => void;

class VoiceNarratorService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private spanishVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private listeners: Set<StateListener> = new Set();

  private state: NarratorState = {
    isPlaying: false,
    isPaused: false,
    currentText: '',
    rate: 0.9, // Velocidad pausada para máxima claridad gramatical
    pitch: 1.0,
    selectedVoiceName: null,
    autoSpeakOnSelect: false,
    clickToSpeakMode: false,
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadSavedPreferences();
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private loadSavedPreferences(): void {
    try {
      const savedRate = localStorage.getItem('todomigob_tts_rate');
      if (savedRate) this.state.rate = parseFloat(savedRate);

      const savedAuto = localStorage.getItem('todomigob_tts_autoselect');
      if (savedAuto) this.state.autoSpeakOnSelect = savedAuto === 'true';

      const savedClick = localStorage.getItem('todomigob_tts_clickmode');
      if (savedClick) this.state.clickToSpeakMode = savedClick === 'true';

      const savedVoice = localStorage.getItem('todomigob_tts_voice');
      if (savedVoice) this.state.selectedVoiceName = savedVoice;
    } catch (e) {
      // localStorage no disponible o bloqueado
    }
  }

  public initVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];

    const allVoices = this.synth.getVoices();
    // Filtrar voces en español (es, es-GT, es-419, es-MX, es-ES, etc.)
    this.spanishVoices = allVoices.filter((v) =>
      v.lang.toLowerCase().startsWith('es') ||
      v.name.toLowerCase().includes('spanish') ||
      v.name.toLowerCase().includes('español')
    );

    // Si no hay voces en español estrictas, fallback a todas
    const voicesPool = this.spanishVoices.length > 0 ? this.spanishVoices : allVoices;

    // Seleccionar la voz elegida previamente o la mejor por defecto
    if (this.state.selectedVoiceName) {
      this.selectedVoice = voicesPool.find((v) => v.name === this.state.selectedVoiceName) || null;
    }

    if (!this.selectedVoice && voicesPool.length > 0) {
      // Prioridad 1: es-GT (Guatemala)
      // Prioridad 2: es-419 (Latinoamérica)
      // Prioridad 3: es-MX o voces naturales / Google / Microsoft
      this.selectedVoice =
        voicesPool.find((v) => v.lang.toLowerCase().includes('es-gt')) ||
        voicesPool.find((v) => v.lang.toLowerCase().includes('es-419')) ||
        voicesPool.find((v) => v.lang.toLowerCase().includes('es-mx')) ||
        voicesPool.find((v) => v.name.toLowerCase().includes('natural')) ||
        voicesPool.find((v) => v.name.toLowerCase().includes('google') && v.lang.startsWith('es')) ||
        voicesPool[0];

      if (this.selectedVoice) {
        this.state.selectedVoiceName = this.selectedVoice.name;
      }
    }

    this.notifyState();
    return this.spanishVoices;
  }

  public getSpanishVoices(): SpeechSynthesisVoice[] {
    if (this.spanishVoices.length === 0) {
      this.initVoices();
    }
    return this.spanishVoices;
  }

  public getState(): NarratorState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyState(): void {
    const current = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error en listener de narrador:', err);
      }
    });
  }

  /**
   * Limpia y acondiciona el texto para una entonación natural y gramaticalmente correcta.
   */
  public cleanTextForSpeech(rawText: string): string {
    if (!rawText) return '';
    return rawText
      .replace(/https?:\/\/[^\s]+/g, 'enlace web')
      .replace(/#([\wáéíóúÁÉÍÓÚñÑ]+)/g, 'etiqueta $1')
      .replace(/[•·—–_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Reproduce el texto en voz alta
   */
  public speak(
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (e: any) => void;
    }
  ): void {
    if (!this.synth) {
      console.warn('SpeechSynthesis no está soportado en este navegador.');
      return;
    }

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return;

    // Detener cualquier narración en curso antes de empezar la nueva
    this.stop();

    const utterance = new SpeechSynthesisUtterance(clean);
    this.currentUtterance = utterance;

    // Configurar voz en español
    if (!this.selectedVoice) {
      this.initVoices();
    }
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.lang = this.selectedVoice?.lang || 'es-GT';

    // Velocidad y entonación pausada para entender gramática
    utterance.rate = this.state.rate;
    utterance.pitch = this.state.pitch;

    utterance.onstart = () => {
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.state.currentText = clean;
      this.notifyState();
      options?.onStart?.();
    };

    utterance.onend = () => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.currentUtterance = null;
      this.notifyState();
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.currentUtterance = null;
      this.notifyState();
      options?.onError?.(e);
    };

    utterance.onpause = () => {
      this.state.isPaused = true;
      this.state.isPlaying = false;
      this.notifyState();
    };

    utterance.onresume = () => {
      this.state.isPaused = false;
      this.state.isPlaying = true;
      this.notifyState();
    };

    // En algunos navegadores es necesario cancelar antes de reproducir para evitar bloqueos
    this.synth.cancel();
    this.synth.speak(utterance);
  }

  public pause(): void {
    if (this.synth && this.state.isPlaying) {
      this.synth.pause();
      this.state.isPaused = true;
      this.state.isPlaying = false;
      this.notifyState();
    }
  }

  public resume(): void {
    if (this.synth && this.state.isPaused) {
      this.synth.resume();
      this.state.isPaused = false;
      this.state.isPlaying = true;
      this.notifyState();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.currentUtterance = null;
    this.notifyState();
  }

  public setRate(rate: number): void {
    this.state.rate = Math.max(0.5, Math.min(2.0, rate));
    try {
      localStorage.setItem('todomigob_tts_rate', String(this.state.rate));
    } catch (e) {}
    this.notifyState();
  }

  public setVoice(voiceName: string): void {
    const found = this.spanishVoices.find((v) => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
      this.state.selectedVoiceName = found.name;
      try {
        localStorage.setItem('todomigob_tts_voice', found.name);
      } catch (e) {}
      this.notifyState();
    }
  }

  public setAutoSpeakOnSelect(enable: boolean): void {
    this.state.autoSpeakOnSelect = enable;
    try {
      localStorage.setItem('todomigob_tts_autoselect', String(enable));
    } catch (e) {}
    this.notifyState();
  }

  public setClickToSpeakMode(enable: boolean): void {
    this.state.clickToSpeakMode = enable;
    try {
      localStorage.setItem('todomigob_tts_clickmode', String(enable));
    } catch (e) {}
    this.notifyState();
  }

  public toggleClickToSpeakMode(): boolean {
    const next = !this.state.clickToSpeakMode;
    this.setClickToSpeakMode(next);
    return next;
  }
}

// Singleton global
export const narrator = new VoiceNarratorService();

if (typeof window !== 'undefined') {
  (window as any).__voiceNarrator = narrator;
}
