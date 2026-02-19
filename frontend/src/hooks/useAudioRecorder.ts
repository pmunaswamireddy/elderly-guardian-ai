import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderProps {
    onSilence?: () => void;
    silenceThreshold?: number; // Volume threshold (0-255)
    silenceDuration?: number; // Time in ms to wait before triggering onSilence
}

export const useAudioRecorder = ({
    onSilence,
    silenceThreshold = 20,
    silenceDuration = 1500
}: UseAudioRecorderProps = {}) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const silenceTimerRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);
    const soundCountRef = useRef<number>(0); // Track sustained sound

    const startRecording = useCallback(async () => {
        console.log('[AudioRecorder] Starting recording...');
        try {
            console.log('[AudioRecorder] Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[AudioRecorder] Microphone access granted!');

            // Audio Context for VAD
            const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;
            console.log('[AudioRecorder] Audio context created');

            // Media Recorder
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    console.log(`[AudioRecorder] Chunk received: ${event.data.size} bytes, total chunks: ${chunksRef.current.length}`);
                }
            };

            mediaRecorder.start(200);
            setIsRecording(true);
            console.log('[AudioRecorder] Recording started!');

            // VAD Logic
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            let logCounter = 0;

            const checkVolume = () => {
                analyser.getByteFrequencyData(dataArray);
                const volume = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;

                // Log volume every 30 frames (~0.5 sec)
                logCounter++;
                if (logCounter % 30 === 0) {
                    console.log(`[AudioRecorder] Volume: ${volume.toFixed(1)}, Threshold: ${silenceThreshold}`);
                }

                if (volume < silenceThreshold) {
                    soundCountRef.current = 0; // Reset sound counter during silence
                    if (!silenceTimerRef.current) {
                        console.log(`[AudioRecorder] Silence detected, starting ${silenceDuration}ms timer...`);
                        silenceTimerRef.current = setTimeout(() => {
                            console.log('[AudioRecorder] Silence timer fired! Calling onSilence...');
                            if (onSilence) onSilence();
                        }, silenceDuration);
                    }
                } else {
                    // Only clear timer if we have SUSTAINED sound (2+ consecutive checks)
                    soundCountRef.current++;
                    if (silenceTimerRef.current && soundCountRef.current >= 2) {
                        console.log(`[AudioRecorder] Sustained sound (${soundCountRef.current}), clearing timer`);
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                }

                animationFrameRef.current = requestAnimationFrame(checkVolume);
            };

            checkVolume();

        } catch (error) {
            console.error("[AudioRecorder] Error accessing microphone:", error);
        }
    }, [onSilence, silenceThreshold, silenceDuration]);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    // Cleanup
                    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    if (audioContextRef.current) audioContextRef.current.close();

                    // Stop tracks
                    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

                    setIsRecording(false);
                    resolve(blob);
                };
                mediaRecorderRef.current.stop();
            } else {
                resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
            }
        });
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording
    };
};
