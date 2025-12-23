import React, { useEffect, useRef, useState, memo } from 'react';

const SoundManager = memo(({ audioPhase }) => {
    const bgAudioRef = useRef(null);
    const winAudioRef = useRef(null);
    const loseAudioRef = useRef(null);
    const fadeInterval = useRef(null);

    // Keep track of current phase for event listeners without triggering re-renders
    const audioPhaseRef = useRef(audioPhase);

    // Track if we have successfully started the background music at least once
    const [hasStartedMusic, setHasStartedMusic] = useState(false);
    const MAX_VOLUME = 0.5;

    // Update ref whenever prop changes
    useEffect(() => {
        audioPhaseRef.current = audioPhase;
    }, [audioPhase]);

    // Helper: Fade In
    const fadeIn = (audio) => {
        if (!audio) return;

        // Strict Guard: If we are NOT in music_on phase, do NOT start playing.
        // This prevents race conditions where a delayed play attempt resolves during gameplay.
        if (audioPhaseRef.current !== 'music_on') return;

        // Stop any ongoing fade-out
        if (fadeInterval.current) clearInterval(fadeInterval.current);

        // Prepare for playback
        if (audio.paused) {
            audio.volume = 0;
            const attempt = audio.play();
            if (attempt) {
                attempt
                    .then(() => {
                        setHasStartedMusic(true);
                    })
                    .catch(() => { /* Autoplay blocked */ });
            }
        }

        // Ramp volume up to MAX_VOLUME
        fadeInterval.current = setInterval(() => {
            // Re-check phase inside interval to abort if game started mid-fade
            if (audioPhaseRef.current !== 'music_on') {
                clearInterval(fadeInterval.current);
                return;
            }

            if (audio.volume < MAX_VOLUME) {
                audio.volume = Math.min(MAX_VOLUME, audio.volume + 0.05);
            } else {
                clearInterval(fadeInterval.current);
            }
        }, 100);
    };

    // Helper: Fade Out
    const fadeOut = (audio) => {
        if (!audio) return;

        if (fadeInterval.current) clearInterval(fadeInterval.current);

        fadeInterval.current = setInterval(() => {
            if (audio.volume > 0.05) {
                audio.volume = Math.max(0, audio.volume - 0.05);
            } else {
                audio.volume = 0;
                audio.pause();
                audio.currentTime = 0;
                clearInterval(fadeInterval.current);
            }
        }, 100);
    };

    // 1. Global Interaction Listener (Autoplay Unlocker)
    useEffect(() => {
        const handleInteraction = () => {
            // RULE: If game is playing (music_off), IGNORE interactions.
            if (audioPhaseRef.current === 'music_off') return;

            // If music already started, we don't need these listeners anymore.
            if (hasStartedMusic) return;

            // Try to start music if we are in the right phase
            if (audioPhaseRef.current === 'music_on' && bgAudioRef.current && bgAudioRef.current.paused) {
                fadeIn(bgAudioRef.current);
            }
        };

        // If we haven't started music yet, listen for interactions
        if (!hasStartedMusic) {
            window.addEventListener('click', handleInteraction);
            window.addEventListener('keydown', handleInteraction);
            // Including mousemove just in case, though click is usually sufficient
            window.addEventListener('mousemove', handleInteraction);
        }

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('mousemove', handleInteraction);
        };
    }, [hasStartedMusic]); // Re-bind (or unbind) when success state changes

    // 2. State-Based Control
    useEffect(() => {
        if (!bgAudioRef.current) return;

        if (audioPhase === 'music_on') {
            fadeIn(bgAudioRef.current);
        }
        else if (audioPhase === 'music_off') {
            fadeOut(bgAudioRef.current);
        }
        else if (audioPhase === 'won') {
            if (fadeInterval.current) clearInterval(fadeInterval.current);
            bgAudioRef.current.pause();
            bgAudioRef.current.currentTime = 0;
            if (winAudioRef.current) {
                winAudioRef.current.currentTime = 0;
                winAudioRef.current.play().catch(() => { });
            }
        }
        else if (audioPhase === 'lost') {
            if (fadeInterval.current) clearInterval(fadeInterval.current);
            bgAudioRef.current.pause();
            bgAudioRef.current.currentTime = 0;
            if (loseAudioRef.current) {
                loseAudioRef.current.currentTime = 0;
                loseAudioRef.current.play().catch(() => { });
            }
        }
    }, [audioPhase]);

    return (
        <div style={{ display: 'none' }}>
            <audio ref={bgAudioRef} src="/sounds/lofi_bg.mp3" loop />
            <audio ref={winAudioRef} src="/sounds/win.wav" />
            <audio ref={loseAudioRef} src="/sounds/lose.wav" />
        </div>
    );
});

export default SoundManager;
