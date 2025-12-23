import React, { useEffect, useRef, useState } from 'react';

const SoundManager = ({ gameStatus, timerActive }) => {
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
            // If we are in Idle state (not playing a game), try to fade in
            if (bgAudioRef.current && bgAudioRef.current.paused) {
                fadeIn(bgAudioRef.current);
            }
        };

        const cleanupListeners = () => {
            window.removeEventListener('click', tryToPlayMusic);
            window.removeEventListener('keydown', tryToPlayMusic);
            window.removeEventListener('mousemove', tryToPlayMusic);
            if (fadeInterval.current) clearInterval(fadeInterval.current);
        };

        window.addEventListener('click', tryToPlayMusic);
        window.addEventListener('keydown', tryToPlayMusic);
        window.addEventListener('mousemove', tryToPlayMusic);

        // Immediate attempt
        tryToPlayMusic();

        return cleanupListeners;
    }, []);

    // 2. State-Based Control (The "Business Logic")
    useEffect(() => {
        if (!bgAudioRef.current) return;

        if (gameStatus === 'playing' && !timerActive) {
            // IDLE / MENU: Fade In Music
            fadeIn(bgAudioRef.current);
        }
        else if (gameStatus === 'playing' && timerActive) {
            // ACTIVE GAME: Fade Out Music
            fadeOut(bgAudioRef.current);
        }
        else if (gameStatus === 'won') {
            // WON: Immediate Stop (Fade looks weird here, or maybe fast fade? Defaulting to fast stop)
            // User requested Fade In on returning to menu, but for Winning usually we want silence for the SFX

            // Allow fade out if music was playing
            if (!bgAudioRef.current.paused) {
                // Just use fadeOut to be smooth, or stop immediately?
                // Logic says: "Once the volume reaches 0... pause".
                // Let's use fadeOut for consistency, OR stop immediately if interference with Win sound is a concern.
                // Given the instructions: "First... volume down... then pause". 
                // This implies fadeOut is desired even on game over?
                // Actually instruction says: "If the player loses... fade-out must be cancelled immediately and start fade-in".
                // It doesn't explicitly say "Fade out on win". 
                // But generally win sound needs space. I'll stop bg music immediately on win/loss to let SFX shine.

                // However, Requerimiento says "Fade Out... When the game begins".
                // It doesn't explicitly mention fade out on Game Over, but context implies smoothing transitions.
                // Let's stop quickly for Win/Loss to prioritize SFX.
                if (fadeInterval.current) clearInterval(fadeInterval.current);
                bgAudioRef.current.pause();
                bgAudioRef.current.currentTime = 0;
            }

            if (winAudioRef.current) {
                winAudioRef.current.currentTime = 0;
                winAudioRef.current.play().catch(() => { });
            }
        }
        else if (gameStatus === 'lost') {
            // LOST: Immediate Stop Music, Play SFX
            if (fadeInterval.current) clearInterval(fadeInterval.current);
            bgAudioRef.current.pause();
            bgAudioRef.current.currentTime = 0;

            if (loseAudioRef.current) {
                loseAudioRef.current.currentTime = 0;
                loseAudioRef.current.play().catch(() => { });
            }
        }
    }, [gameStatus, timerActive]);

    return (
        <div style={{ display: 'none' }}>
            <audio ref={bgAudioRef} src="/sounds/lofi_bg.mp3" loop />
            <audio ref={winAudioRef} src="/sounds/win.wav" />
            <audio ref={loseAudioRef} src="/sounds/lose.wav" />
        </div>
    );
};

export default SoundManager;
