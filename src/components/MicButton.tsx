import { useDictation } from '../lib/speech'

// A small tap-to-dictate mic. Renders nothing where speech isn't supported
// (e.g. iOS Safari — the keyboard mic covers that case).
export function MicButton({ onText, title = 'Dictate' }: { onText: (text: string) => void; title?: string }) {
  const { listening, start, stop, supported } = useDictation(onText)
  if (!supported) return null
  return (
    <button
      type="button"
      className={`mic-btn${listening ? ' on' : ''}`}
      aria-label={listening ? 'Stop dictation' : title}
      aria-pressed={listening}
      title={title}
      onClick={() => (listening ? stop() : start())}
    >
      {listening ? '🔴' : '🎙️'}
    </button>
  )
}
