import { useRef, useCallback, useEffect } from 'react';

type SoundType = 'new_order' | 'horn' | 'success' | 'voice' | 'message';

export const useAudio = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);

    // Stops any currently playing sound or speech
    const stopFn = useCallback(() => {
        // console.log("🛑 Parando som de notificação...");
        isPlayingRef.current = false;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopFn();
    }, [stopFn]);

    const playFn = useCallback(async (type: SoundType, repeatCount = 1) => {
        stopFn(); // Ensure clean state
        isPlayingRef.current = true;

        console.log(`🔊 [useAudio] Playing: ${type}, Repeats: ${repeatCount}`);

        const playSingle = async (): Promise<void> => {
            if (!isPlayingRef.current) return;

            if (type === 'voice') {
                if ('speechSynthesis' in window) {
                    await new Promise<void>((resolve) => {
                        if (!isPlayingRef.current) { resolve(); return; }

                        const utterance = new SpeechSynthesisUtterance("Novo pedido Ifarma!");
                        utterance.lang = 'pt-BR';

                        // Try to find a good PT voice
                        const voices = window.speechSynthesis.getVoices();
                        const ptVoice = voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) ||
                            voices.find(v => v.lang.includes('pt-BR'));
                        if (ptVoice) utterance.voice = ptVoice;

                        // Safety timeout
                        const safetyTimeout = setTimeout(() => resolve(), 3500);

                        utterance.onend = () => { clearTimeout(safetyTimeout); resolve(); };
                        utterance.onerror = () => { clearTimeout(safetyTimeout); resolve(); };

                        window.speechSynthesis.speak(utterance);
                    });
                } else {
                    console.warn("TTS not supported, falling back to beep");
                    // Fallback to simple beep if TTS fails? For now just skip.
                }
            } else {
                let src = '';
                switch (type) {
                    case 'new_order':
                        // Main bell sound
                        src = 'https://assets.mixkit.co/active_storage/sfx/571/571-preview.mp3';
                        break;
                    case 'horn':
                        src = 'https://assets.mixkit.co/active_storage/sfx/1271/1271-preview.mp3';
                        break;
                    case 'message':
                        src = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
                        break;
                    case 'success':
                        src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Default pleasant ding
                        break;
                }

                if (src) {
                    await new Promise<void>((resolve) => {
                        if (!isPlayingRef.current) { resolve(); return; }

                        const audio = new Audio(src);
                        audioRef.current = audio;
                        audio.volume = 1.0;

                        // Add Vibration for mobile
                        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);

                        const safetyTimeout = setTimeout(() => resolve(), 4000);

                        audio.onended = () => { clearTimeout(safetyTimeout); resolve(); };
                        audio.onerror = (e) => {
                            console.error("Audio Load Error:", e);
                            clearTimeout(safetyTimeout);
                            resolve();
                        };

                        audio.play().catch(e => {
                            console.warn("Audio Autoplay Blocked:", e);
                            clearTimeout(safetyTimeout);
                            resolve();
                        });
                    });
                }
            }
        };

        for (let i = 0; i < repeatCount; i++) {
            if (!isPlayingRef.current) break;
            await playSingle();
            // Small delay between repeats
            if (i < repeatCount - 1 && isPlayingRef.current) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }, [stopFn]);

    return { play: playFn, stop: stopFn };
};
