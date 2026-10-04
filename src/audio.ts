import {
  Compressor,
  Limiter,
  PolySynth,
  Reverb,
  Synth,
  Volume,
  start,
} from "tone";

const CHORDS = [
  ["C3", "G3", "D4", "E4"],
  ["D3", "A3", "E4", "G4"],
  ["E3", "A3", "D4", "G4"],
  ["G2", "D3", "A3", "E4"],
  ["A2", "E3", "G3", "C4"],
] as const;

const PENTATONIC_SCALE = [
  "C5",
  "D5",
  "E5",
  "G5",
  "A5",
  "C6",
  "D6",
  "E6",
  "G6",
  "A6",
] as const;

const RELEASE_TAIL_MILLISECONDS = 8_000;
const SYNTH_DISPOSAL_DELAY_MILLISECONDS = 5_000;

// Every circle owns its instruments while sharing one bounded effects chain.
const limiter = new Limiter(-2).toDestination();
const masterVolume = new Volume(-5).connect(limiter);
const compressor = new Compressor({
  threshold: -24,
  ratio: 3,
  attack: 0.04,
  release: 0.4,
  knee: 12,
}).connect(masterVolume);
const atmosphere = new Reverb({ decay: 7, preDelay: 0.08, wet: 0.6 }).connect(
  compressor,
);

type VoiceOptions = Readonly<{
  x: number;
  y: number;
  hue: number;
  viewportWidth: number;
  viewportHeight: number;
}>;

function selectChord({ hue, y, viewportHeight }: VoiceOptions): string[] {
  const chordIndex = Math.floor((hue / 360) * CHORDS.length);
  const octaveShift = y < viewportHeight / 3 ? 1 : 0;

  return CHORDS[chordIndex].map((note) =>
    octaveShift
      ? note.replace(/\d$/, (octave) => String(Number(octave) + 1))
      : note,
  );
}

function selectMelodyNote({
  x,
  y,
  viewportWidth,
  viewportHeight,
}: VoiceOptions): (typeof PENTATONIC_SCALE)[number] {
  const scaleDegree = Math.min(4, Math.floor((x / viewportWidth) * 5));
  const octaveOffset = y < viewportHeight / 2 ? 5 : 0;

  return PENTATONIC_SCALE[scaleDegree + octaveOffset];
}

export class Voice {
  private readonly chord: readonly string[];
  private readonly melodyNote: (typeof PENTATONIC_SCALE)[number];
  private readonly velocity: number;
  private readonly output: Volume;
  private readonly synth: PolySynth<Synth>;
  private readonly chime: Synth;
  private lastRadius = -Infinity;
  private lastVoiceCount = 1;

  constructor(options: VoiceOptions) {
    this.chord = selectChord(options);
    this.melodyNote = selectMelodyNote(options);
    this.velocity = 0.25 + (options.x / options.viewportWidth) * 0.2;
    this.output = new Volume(-13).connect(atmosphere);

    this.synth = new PolySynth(Synth, {
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.35,
        decay: 0.8,
        sustain: 0.42,
        release: 4.5,
      },
      volume: -8,
    }).connect(this.output);

    this.chime = new Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.09, decay: 0.5, sustain: 0, release: 1.4 },
      volume: -6,
    }).connect(this.output);
  }

  start(): void {
    this.synth.triggerAttack([...this.chord], "+0.06", this.velocity);
    this.chime.triggerAttackRelease(this.melodyNote, 0.3, "+0.1", 0.5);
  }

  rebalance(voiceCount: number, radius: number, maximumRadius: number): void {
    const voiceCountChanged = voiceCount !== this.lastVoiceCount;
    if (radius - this.lastRadius < 16 && !voiceCountChanged) return;

    const growth = Math.min(radius / maximumRadius, 1);
    const voiceCompensation = 10 * Math.log10(Math.max(1, voiceCount));
    const sizeGain =
      growth <= 0.65 ? (growth / 0.65) * 2 : 2 - ((growth - 0.65) / 0.35) * 8;
    const rampTime = voiceCountChanged
      ? voiceCount > this.lastVoiceCount
        ? 0.05
        : 1.5
      : 0.18;

    this.output.volume.rampTo(-13 + sizeGain - voiceCompensation, rampTime);
    this.lastRadius = radius;
    this.lastVoiceCount = voiceCount;
  }

  release(onTailEnded: () => void): void {
    this.synth.triggerRelease([...this.chord]);

    window.setTimeout(() => {
      this.synth.dispose();
      this.chime.dispose();
      this.output.dispose();
    }, SYNTH_DISPOSAL_DELAY_MILLISECONDS);

    window.setTimeout(onTailEnded, RELEASE_TAIL_MILLISECONDS);
  }
}

export async function unlockAudio(): Promise<void> {
  await start();
}
