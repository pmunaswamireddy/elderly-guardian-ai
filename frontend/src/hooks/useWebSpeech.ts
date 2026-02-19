import { useState, useRef, useCallback } from 'react';

// Language code mapping for Web Speech API
const langCodeMap: Record<string, string> = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'te': 'te-IN',
    'ta': 'ta-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'bn': 'bn-IN',
    'gu': 'gu-IN',
    'mr': 'mr-IN',
    'pa': 'pa-IN',
    'or': 'or-IN',
    'ur': 'ur-IN'
};

interface UseWebSpeechOptions {
    language: string;
    onResult: (text: string) => void;
    onError?: (error: string) => void;
    onListeningChange?: (isListening: boolean) => void;
}

export const useWebSpeech = (options: UseWebSpeechOptions) => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const startListening = useCallback(() => {
        // Check browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const errMsg = "Web Speech API not supported. Please use Chrome or Edge.";
            setError(errMsg);
            optionsRef.current.onError?.(errMsg);
            return;
        }

        // Stop any existing recognition
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        // Configure
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Set language
        const lang = optionsRef.current.language;
        recognition.lang = langCodeMap[lang] || 'en-IN';
        console.log(`[WebSpeech] Starting with language: ${recognition.lang}`);

        recognition.onstart = () => {
            console.log('[WebSpeech] Recognition started');
            setIsListening(true);
            setError(null);
            optionsRef.current.onListeningChange?.(true);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            console.log(`[WebSpeech] Interim: "${interimTranscript}", Final: "${finalTranscript}"`);

            if (finalTranscript) {
                console.log(`[WebSpeech] Final result: "${finalTranscript}"`);
                optionsRef.current.onResult(finalTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('[WebSpeech] Error:', event.error);
            let errMsg = event.error;

            if (event.error === 'not-allowed') {
                errMsg = "Microphone access denied. Please allow microphone in browser settings.";
            } else if (event.error === 'no-speech') {
                errMsg = "No speech detected. Please try again.";
            } else if (event.error === 'network') {
                errMsg = "Network error. Please check your connection.";
            }

            setError(errMsg);
            optionsRef.current.onError?.(errMsg);
        };

        recognition.onend = () => {
            console.log('[WebSpeech] Recognition ended');
            setIsListening(false);
            optionsRef.current.onListeningChange?.(false);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('[WebSpeech] Start error:', e);
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }
        setIsListening(false);
        optionsRef.current.onListeningChange?.(false);
    }, []);

    return {
        isListening,
        error,
        startListening,
        stopListening
    };
};
