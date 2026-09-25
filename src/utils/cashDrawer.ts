/**
 * Cash Drawer Hardware Integration & Simulation Utility
 * Handles audio feedback (mechanical solenoid + bell chime)
 * and physical ESC/POS drawer kick pulse dispatch.
 */

class CashDrawerService {
  private audioCtx: AudioContext | null = null;

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  /**
   * Play realistic cash drawer mechanical click + bell ring using Web Audio API
   */
  public playDrawerSound() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // 1. Mechanical Clunk / Solenoid pulse (thud)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.13);

      // 2. High metallic chime 1 (first coin / bell chime)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.28, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.56);

      // 3. High metallic chime 2 ("Cha-Ching" bright resonance)
      const osc3 = this.audioCtx.createOscillator();
      const gain3 = this.audioCtx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(2637, now + 0.09); // E7 note
      gain3.gain.setValueAtTime(0.001, now);
      gain3.gain.setValueAtTime(0.35, now + 0.1);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc3.connect(gain3);
      gain3.connect(this.audioCtx.destination);
      osc3.start(now + 0.09);
      osc3.stop(now + 0.82);
    } catch (e) {
      console.warn('Web Audio error for cash drawer:', e);
    }
  }

  /**
   * Triggers the cash drawer opening pulse.
   * Dispatches custom event and returns confirmation info.
   */
  public triggerOpenDrawer(source = 'manual'): { success: boolean; timestamp: string; message: string } {
    this.playDrawerSound();

    // Standard ESC/POS pulse hex for hardware receipt printers with RJ11 drawer port:
    // ESC p m t1 t2 => 0x1B 0x70 0x00 0x19 0xFA
    const pulseCommandHex = '1B700019FA';

    // Dispatch custom event for connected hardware / peripheral drivers
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('pos:cash-drawer-opened', {
        detail: {
          timestamp: new Date().toISOString(),
          source,
          pulseCommandHex,
        },
      });
      window.dispatchEvent(event);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      message: 'تم إرسال إشارة فتح صندوق النقد (F9) بنجاح',
    };
  }
}

export const cashDrawer = new CashDrawerService();
