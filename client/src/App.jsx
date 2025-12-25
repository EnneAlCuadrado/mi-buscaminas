import React, { useState, useEffect, useRef } from 'react';
import { createBoard, revealCell, toggleFlag, handleChording, placeMines } from './utils/gameLogic';
import Board from './components/Board';
import Leaderboard from './components/Leaderboard';
import DifficultySelector from './components/DifficultySelector';
import SoundManager from './components/SoundManager';
import { supabase } from './supabaseClient';
import './index.css';

const DIFFICULTY_CONFIG = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  advanced: { rows: 16, cols: 30, mines: 99 }
};

function App() {
  const [difficulty, setDifficulty] = useState('beginner');
  const [board, setBoard] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing'); // playing, won, lost
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showWinModal, setShowWinModal] = useState(false);
  const [username, setUsername] = useState('');
  const [isGameReady, setIsGameReady] = useState(false); // New state for Login Screen
  const [refreshLeaderboard, setRefreshLeaderboard] = useState(0);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [losingCell, setLosingCell] = useState(null); // {r, c} for shockwave epicenter
  const [isMuted, setIsMuted] = useState(false);
  const [minesPlaced, setMinesPlaced] = useState(false);

  const timerRef = useRef(null);

  // Initialize game
  useEffect(() => {
    startNewGame();
  }, [difficulty]);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const startNewGame = React.useCallback(() => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const newBoard = createBoard(config.rows, config.cols);
    setBoard(newBoard);
    setGameStatus('playing');
    setTime(0);
    setLosingCell(null);
    setTimerActive(false);
    setShowWinModal(false);
    setMinesPlaced(false);
  }, [difficulty]);

  // Handle 'R' key for reset
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only reset if game is ready and 'r' (or 'R') is pressed
      if (isGameReady && e.key.toLowerCase() === 'r') {
        console.log("R key pressed, resetting...");
        startNewGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameReady, startNewGame]);

  // derived state for HUD
  const flaggedCount = board.flat().filter(c => c.isFlagged).length;
  const config = DIFFICULTY_CONFIG[difficulty];
  const minesLeft = config.mines - flaggedCount;

  const handleCellClick = (r, c) => {
    if (gameStatus !== 'playing') return;

    if (!timerActive) setTimerActive(true);

    const cell = board[r][c];
    let result;

    if (cell.isRevealed) {
      // Chording logic for Left Click
      result = handleChording(board, r, c);
    } else {
      // Normal reveal
      let currentBoard = board;
      if (!minesPlaced) {
        currentBoard = placeMines(board, DIFFICULTY_CONFIG[difficulty].mines, r, c);
        setMinesPlaced(true);
        // Important: update local 'board' reference so revealCell uses the mined board
        setBoard(currentBoard); // Sync state for next render, but use var for now
      }

      result = revealCell(currentBoard, r, c);
    }

    const { board: newBoard, status, neighborsToHighlight } = result;
    setBoard(newBoard);
    setGameStatus(status);

    if (neighborsToHighlight) {
      setHighlightedCells(neighborsToHighlight);
      setTimeout(() => setHighlightedCells([]), 600);
    }

    if (status !== 'playing') {
      setTimerActive(false);
      if (status === 'won') {
        setShowWinModal(true);
      } else if (status === 'lost') {
        setLosingCell({ r, c });
      }
    }
  };

  const handleCellContext = (e, r, c) => {
    e.preventDefault();
    if (gameStatus !== 'playing') return;

    const cell = board[r][c];
    if (cell.isRevealed) {
      // Chording logic: reveal neighbors if flags match
      const { board: newBoard, status, neighborsToHighlight } = handleChording(board, r, c);
      setBoard(newBoard);
      setGameStatus(status);

      if (neighborsToHighlight) {
        setHighlightedCells(neighborsToHighlight);
        setTimeout(() => setHighlightedCells([]), 600);
      }

      if (status !== 'playing') {
        setTimerActive(false);
        if (status === 'won') {
          setShowWinModal(true);
        } else if (status === 'lost') {
          // For chording, the epicenter is still where we clicked
          setLosingCell({ r, c });
        }
      }
    } else {
      // Normal flag toggle
      const newBoard = toggleFlag(board, r, c);
      setBoard(newBoard);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setIsGameReady(true);
      // The click event here will automatically be caught by SoundManager to start audio
    }
  };

  const handleWinSubmit = async () => { // No event needed, called directly
    if (!username.trim()) return;

    try {
      const { error } = await supabase
        .from('scores')
        .insert([
          { username, time, difficulty }
        ]);

      if (error) throw error;

      setShowWinModal(false);
      setRefreshLeaderboard(prev => prev + 1);
      // Don't clear username, keep it for next games
    } catch (err) {
      console.error("Error saving record:", err);
      alert("Error saving score to database!");
    }
  };

  return (
    <div className="app-container">
      {!isGameReady ? (
        <div className="modal-overlay">
          <div className="modal">
            <h1>Bienvenido al Buscaminas</h1>
            <p>Ingresa tu usuario para comenzar</p>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
              <button type="submit">Comenzar Juego</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="game-area">
            <h1>Buscaminas</h1>

            <div className="controls">
              <DifficultySelector difficulty={difficulty} setDifficulty={setDifficulty} />
              <div className="hud-stats" style={{ display: 'flex', gap: '20px', fontWeight: 'bold' }}>
                <div className="flags-counter" style={{ color: flaggedCount > config.mines ? 'red' : '#fff' }}>
                  🚩 {flaggedCount} / {config.mines}
                </div>
                <div className="timer">⏱️ {time}s</div>
              </div>
              <button onClick={startNewGame}>Reiniciar</button>
              <button onClick={() => setShowLeaderboard(!showLeaderboard)}>
                {showLeaderboard ? 'Ocultar' : 'Ver'} Récords
              </button>
              <button onClick={() => setIsMuted(!isMuted)} style={{ fontSize: '1.2rem', padding: '5px 10px' }}>
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>

            <Board
              board={board}
              highlightedCells={highlightedCells}
              losingCell={losingCell}
              onCellClick={handleCellClick}
              onCellContext={handleCellContext}
            />

            {gameStatus === 'lost' && <h2 style={{ color: 'red' }}>¡Perdiste!</h2>}
            {gameStatus === 'won' && <h2 style={{ color: 'green' }}>¡Ganaste!</h2>}

          </div>

          {showLeaderboard && (
            <div className="sidebar">
              <Leaderboard difficulty={difficulty} refreshTrigger={refreshLeaderboard} />
            </div>
          )}

          {showWinModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h2>¡Felicidades {username}!</h2>
                <p>Ganaste en {time} segundos.</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
                  <button onClick={handleWinSubmit}>Guardar Récord</button>
                  <button onClick={() => setShowWinModal(false)} style={{ backgroundColor: '#555' }}>Cerrar</button>
                </div>
              </div>
            </div>
          )}

          {/* Audio Logic Derived State */}
          {(() => {
            let audioPhase = 'music_on'; // default for menu/idle
            if (gameStatus === 'won') audioPhase = 'won';
            else if (gameStatus === 'lost') audioPhase = 'lost';
            else if (gameStatus === 'playing' && timerActive) audioPhase = 'music_off';

            return <SoundManager audioPhase={audioPhase} isMuted={isMuted} />;
          })()}
        </>
      )}
    </div>
  );
}

export default App;
