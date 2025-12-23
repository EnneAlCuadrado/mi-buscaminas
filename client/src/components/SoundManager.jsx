import React, { useEffect, useRef, useState, memo } from 'react';

const SoundManager = memo(({ audioPhase }) => {
    const bgAudioRef = useRef(null);
    const winAudioRef = useRef(null);
    const loseAudioRef = useRef(null);
    const fadeInterval = useRef(null);

    // Track if we have successfully started the background music at least once
    const [hasStartedMusic, setHasStartedMusic] = useState(false);
    const MAX_VOLUME = 0.5;

    // Helper: Fade In
    const fadeIn = (audio) => {
        if (!audio) return;

        // Stop any ongoing fade-out
        if (fadeInterval.current) clearInterval(fadeInterval.current);

        // Prepare for playback
        if (audio.paused) {
            audio.volume = 0;
            const attempt = audio.play();
            if (attempt) {
                attempt
                    .then(() => setHasStartedMusic(true))
                    .catch(() => { /* Autoplay blocked */ });
            }
        }

        // Ramp volume up to MAX_VOLUME
        fadeInterval.current = setInterval(() => {
            if (audio.volume < MAX_VOLUME) {
                // Increase by 0.05 every 100ms (Total: 1s to reach 0.5)
                audio.volume = Math.min(MAX_VOLUME, audio.volume + 0.05);
            } else {
                clearInterval(fadeInterval.current);
            }
        }, 100);
    };

    // Helper: Fade Out
    const fadeOut = (audio) => {
        if (!audio) return;

        // Stop any ongoing fade-in
        if (fadeInterval.current) clearInterval(fadeInterval.current);

        // Ramp volume down to 0
        fadeInterval.current = setInterval(() => {
            if (audio.volume > 0.05) {
                audio.volume = Math.max(0, audio.volume - 0.05);
            } else {
                // Done
                audio.volume = 0;
                audio.pause();
                audio.currentTime = 0;
                clearInterval(fadeInterval.current);
            }
        }, 100);
    };

    // 1. Initial Setup & Global Interaction Listener
    useEffect(() => {
        const tryToPlayMusic = () => {
            // Only try to play if we are supposed to have music on
            // This is a safety check, but the main logic is in the other useEffect
            if (bgAudioRef.current && bgAudioRef.current.paused) {
                // We don't force fade-in here because the dependency-driven effect will handle current state
                // We just unlock the audio context if needed.
                // Actually, for simplicity, let's just let the main effect handle play triggers
                // providing the browser allows it. This listener just "wakes up" audio context if needed.
            }
        };

        // These events are just to unlock autoplay policies.
        // We won't call fadeIn directly here to avoid conflicting with audioPhase.
        // The browser simply needs *an* interaction.
        const unlockAudio = () => {
            // We can just play/pause quickly or just rely on the main effect firing 'play' 
            // inside a call stack originating from these events (if we propagated it), 
            // but since React effects run async, we rely on the fact that *some* interaction happened.
            // Chrome often remembers user interaction for the document.
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
            if (fadeInterval.current) clearInterval(fadeInterval.current);
        };
    }, []);

    // 2. State-Based Control (The "Business Logic")
    useEffect(() => {
        if (!bgAudioRef.current) return;

        console.log(`SoundManager: Processing audioPhase '${audioPhase}'`);

        if (audioPhase === 'music_on') {
            // IDLE / MENU: Fade In Music
            // Check if already playing to avoid resetting volume curve or glitching
            // Although fadeIn handles logic, we can be extra safe.
            fadeIn(bgAudioRef.current);
        }
        else if (audioPhase === 'music_off') {
            // ACTIVE GAME: Fade Out Music
            fadeOut(bgAudioRef.current);
        }
        else if (audioPhase === 'won') {
            // STOP Music immediately
            if (fadeInterval.current) clearInterval(fadeInterval.current);
            bgAudioRef.current.pause();
            bgAudioRef.current.currentTime = 0;

            if (winAudioRef.current) {
                winAudioRef.current.currentTime = 0;
                winAudioRef.current.play().catch(() => { });
            }
        }
        else if (audioPhase === 'lost') {
            // STOP Music immediately
            if (fadeInterval.current) clearInterval(fadeInterval.current);
            bgAudioRef.current.pause();
            bgAudioRef.current.currentTime = 0;

            if (loseAudioRef.current) {
                loseAudioRef.current.currentTime = 0;
                loseAudioRef.current.play().catch(() => { });
            }
        }
    }, [audioPhase]); // STRICT DEPENDENCY: Only audioPhase

    return (
        <div style={{ display: 'none' }}>
            <audio ref={bgAudioRef} src="/sounds/lofi_bg.mp3" loop />
            <audio ref={winAudioRef} src="/sounds/win.wav" />
            <audio ref={loseAudioRef} src="/sounds/lose.wav" />
        </div>
    );
});

export default SoundManager;
