// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/useSpeech.js
// purpose:    - the microphone in search: speak a place, and the words appear in the search box
//             - uses the browser's built-in Web Speech API (SpeechRecognition). No account or key.
//               Chrome / Edge / Safari support it; Firefox doesn't (then `supported` is false and the mic
//               button is hidden). Needs https or localhost, like location
//             - the browser turns speech into text (Chrome sends the audio to Google, Safari to Apple).
//               MemoryGo never records or stores it
//             - 'en-SG' (Singapore English) copes better with local names like "Toa Payoh"
// usage:      const speech = useSpeech((text, isFinal) => { query.value = text })
//             speech.start() / speech.stop(); speech.listening, speech.error, speech.supported
// ----------------------------------------------------------------------------------------------------------

import { ref, onUnmounted } from 'vue'

export function useSpeech(onText, { lang = 'en-SG' } = {}) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const supported = Boolean(Recognition) && window.isSecureContext

    const listening = ref(false)
    const error = ref('')
    let recognition = null

    function start() {
        if (!supported || listening.value) return
        error.value = ''

        recognition = new Recognition()
        recognition.lang = lang
        recognition.interimResults = true        // show words while they're still speaking
        recognition.continuous = false           // stop by itself after one phrase
        recognition.maxAlternatives = 1

        recognition.onresult = (event) => {
            const results = [...event.results]
            const text = results.map((r) => r[0].transcript).join('').trim()
            onText(text, results[results.length - 1].isFinal)
        }

        recognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                error.value = 'The microphone is blocked. Allow it in your browser, or type instead.'
            } else if (event.error === 'no-speech') {
                error.value = 'Didn’t catch that. Tap the mic and try again.'
            } else if (event.error !== 'aborted') {
                error.value = 'Couldn’t hear you. Try again, or type instead.'
            }
        }

        recognition.onend = () => { listening.value = false }

        listening.value = true
        recognition.start()
    }

    function stop() {
        recognition?.stop()
    }

    onUnmounted(() => recognition?.abort())

    return { supported, listening, error, start, stop }
}
