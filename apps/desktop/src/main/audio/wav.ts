export const WAV_SAMPLE_RATE = 16_000
export const WAV_CHANNELS = 1
export const WAV_BITS_PER_SAMPLE = 16

const SILENCE_THRESHOLD = 400
const SPEECH_PADDING_SAMPLES = Math.floor(WAV_SAMPLE_RATE * 0.2)
const NORMALIZED_PEAK = 28_000
const MAX_GAIN = 8

/**
 * Removes leading/trailing silence and lifts quiet speech before Whisper sees
 * it. Input and output are always PCM16LE; a silent recording is preserved so
 * the inference layer, not this adapter, decides how to report it.
 */
export function preparePcmForWhisper(pcm: Buffer): Buffer {
  let start = 0
  let end = pcm.length / 2 - 1

  while (start <= end && Math.abs(pcm.readInt16LE(start * 2)) < SILENCE_THRESHOLD) {
    start += 1
  }
  while (end > start && Math.abs(pcm.readInt16LE(end * 2)) < SILENCE_THRESHOLD) {
    end -= 1
  }
  if (start >= end) return pcm

  start = Math.max(0, start - SPEECH_PADDING_SAMPLES)
  end = Math.min(pcm.length / 2 - 1, end + SPEECH_PADDING_SAMPLES)
  const sampleCount = end - start + 1
  let peak = 1
  for (let index = start; index <= end; index += 1) {
    peak = Math.max(peak, Math.abs(pcm.readInt16LE(index * 2)))
  }
  if (peak >= NORMALIZED_PEAK) return pcm.subarray(start * 2, (end + 1) * 2)

  const gain = Math.min(NORMALIZED_PEAK / peak, MAX_GAIN)
  const normalized = Buffer.alloc(sampleCount * 2)
  for (let index = 0; index < sampleCount; index += 1) {
    const amplified = Math.round(pcm.readInt16LE((start + index) * 2) * gain)
    normalized.writeInt16LE(Math.max(-32_768, Math.min(32_767, amplified)), index * 2)
  }
  return normalized
}

export function encodeWavPcm16le(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44)
  const byteRate = (WAV_SAMPLE_RATE * WAV_CHANNELS * WAV_BITS_PER_SAMPLE) / 8
  const blockAlign = (WAV_CHANNELS * WAV_BITS_PER_SAMPLE) / 8
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(WAV_CHANNELS, 22)
  header.writeUInt32LE(WAV_SAMPLE_RATE, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(WAV_BITS_PER_SAMPLE, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

export function isWavPcm16leMono16k(file: Buffer): boolean {
  if (file.length < 44) return false
  return (
    file.subarray(0, 4).toString("ascii") === "RIFF" &&
    file.subarray(8, 12).toString("ascii") === "WAVE" &&
    file.readUInt16LE(20) === 1 &&
    file.readUInt16LE(22) === WAV_CHANNELS &&
    file.readUInt32LE(24) === WAV_SAMPLE_RATE &&
    file.readUInt16LE(34) === WAV_BITS_PER_SAMPLE
  )
}
