import { useCallback, useRef, useState } from 'react'

// Voice-to-text via the free Web Speech API. Supported on Chrome/Edge/Android.
// NOTE: iOS Safari does NOT support SpeechRecognition — there we hide the in-app
// mic and users dictate with the keyboard's built-in mic instead.

type SR = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function ctor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as SR
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function speechSupported(): boolean {
  return !!ctor()
}

// Dictation hook: call start() to listen; the latest transcript streams to
// onResult (interim + final), and listening flips back off when it ends.
export function useDictation(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  const start = useCallback(() => {
    const C = ctor()
    if (!C) return
    const rec = new C()
    rec.lang = navigator.language || 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const t = r[0].transcript
        if (r.isFinal) finalText += t
        else interim += t
      }
      onResult((finalText + interim).trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
    }
  }, [onResult])

  const stop = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }, [])

  return { listening, start, stop, supported: speechSupported() }
}
