export type JourneySound =
  | "select"
  | "step"
  | "interact"
  | "open"
  | "battle"
  | "strike"
  | "guard"
  | "victory"
  | "capture";

let context: AudioContext | undefined;
let enabled = false;

const patterns: Readonly<
  Record<JourneySound, readonly [frequency: number, duration: number][]>
> = {
  select: [
    [440, 0.07],
    [660, 0.09],
  ],
  step: [
    [120, 0.025],
    [95, 0.025],
  ],
  interact: [
    [520, 0.05],
    [620, 0.06],
  ],
  open: [
    [330, 0.05],
    [440, 0.05],
    [550, 0.08],
  ],
  battle: [
    [220, 0.08],
    [220, 0.08],
    [440, 0.14],
  ],
  strike: [
    [180, 0.04],
    [110, 0.1],
  ],
  guard: [
    [280, 0.06],
    [240, 0.1],
  ],
  victory: [
    [392, 0.08],
    [523, 0.08],
    [659, 0.14],
  ],
  capture: [
    [330, 0.08],
    [494, 0.08],
    [659, 0.08],
    [784, 0.18],
  ],
};

function audioContext(): AudioContext {
  context ??= new AudioContext();
  return context;
}

export async function toggleSound(): Promise<boolean> {
  enabled = !enabled;
  if (enabled) await audioContext().resume();
  return enabled;
}

export function soundEnabled(): boolean {
  return enabled;
}

export function playSound(sound: JourneySound): void {
  if (!enabled) return;
  const audio = audioContext();
  let cursor = audio.currentTime;
  for (const [frequency, duration] of patterns[sound]) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, cursor);
    gain.gain.setValueAtTime(0.045, cursor);
    gain.gain.exponentialRampToValueAtTime(0.001, cursor + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + duration);
    cursor += duration + 0.025;
  }
}
