
// Directions for neighbor checking (8 neighbors)
const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];

export const createBoard = (rows, cols) => {
    // Initialize empty board
    const board = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({
            row: r,
            col: c,
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            neighborMines: 0
        }))
    );
    return board;
};

export const placeMines = (initialBoard, mines, avoidRow, avoidCol) => {
    const rows = initialBoard.length;
    const cols = initialBoard[0].length;
    // Deep copy to avoid mutation
    const board = initialBoard.map(r => r.map(c => ({ ...c })));

    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);

        // Avoid placing mine on the specific cell (first click) and already mined cells
        // Optionally prevent mines on neighbors strictly too? Classic Minesweeper usually guarantees an opening (0), 
        // effectively 1-radius safe zone.
        // For now, let's just strictly avoid the clicked cell to prevent instant loss.
        if ((r !== avoidRow || c !== avoidCol) && !board[r][c].isMine) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }

    // Calculate neighbor counts
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!board[r][c].isMine) {
                let count = 0;
                DIRECTIONS.forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
                        count++;
                    }
                });
                board[r][c].neighborMines = count;
            }
        }
    }

    return board;
};

// Returns new board state and game status ('playing', 'won', 'lost')
export const revealCell = (board, row, col) => {
    const newBoard = board.map(r => r.map(c => ({ ...c }))); // deepish copy
    const cell = newBoard[row][col];

    if (cell.isRevealed || cell.isFlagged) return { board: newBoard, status: 'playing' };

    if (cell.isMine) {
        // Reveal all mines
        newBoard.forEach(r => r.forEach(c => {
            if (c.isMine) c.isRevealed = true;
        }));
        return { board: newBoard, status: 'lost' };
    }

    // Flood fill
    const stack = [[row, col]];
    while (stack.length > 0) {
        const [r, c] = stack.pop();
        const curr = newBoard[r][c];

        if (!curr.isRevealed && !curr.isFlagged) {
            curr.isRevealed = true;
            if (curr.neighborMines === 0) {
                DIRECTIONS.forEach(([dr, dc]) => {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < newBoard.length && nc >= 0 && nc < newBoard[0].length) {
                        if (!newBoard[nr][nc].isRevealed) {
                            stack.push([nr, nc]);
                        }
                    }
                });
            }
        }
    }

    // Check win
    const flattened = newBoard.flat();
    const allNonMinesRevealed = flattened.every(c => c.isMine || c.isRevealed);

    return {
        board: newBoard,
        status: allNonMinesRevealed ? 'won' : 'playing'
    };
};

export const toggleFlag = (board, row, col) => {
    const newBoard = board.map(r => r.map(c => ({ ...c })));
    const cell = newBoard[row][col];
    if (!cell.isRevealed) {
        cell.isFlagged = !cell.isFlagged;
    }
    return newBoard;
};

// Returns new board state and game status for chording (revealing neighbors of a numbered cell)
export const handleChording = (board, row, col) => {
    const cell = board[row][col];
    // Only chord if revealed and has mines around it
    if (!cell.isRevealed || cell.neighborMines === 0) {
        return { board, status: 'playing' };
    }

    let flagCount = 0;
    DIRECTIONS.forEach(([dr, dc]) => {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
            if (board[nr][nc].isFlagged) {
                flagCount++;
            }
        }
    });

    if (flagCount !== cell.neighborMines) {
        // Feedback: Return neighbors that are not revealed and not flagged to highlight them
        const neighborsToHighlight = [];
        DIRECTIONS.forEach(([dr, dc]) => {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
                if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) {
                    neighborsToHighlight.push(`${nr}-${nc}`);
                }
            }
        });
        return { board, status: 'playing', neighborsToHighlight };
    }

    // Flags match, reveal neighbors
    let currentBoard = board;
    let currentStatus = 'playing';

    // We need to carefully reveal distinct neighbors
    for (const [dr, dc] of DIRECTIONS) {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
            const neighbor = currentBoard[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged) {
                const result = revealCell(currentBoard, nr, nc);
                currentBoard = result.board;
                currentStatus = result.status;
                if (currentStatus === 'lost') {
                    return { board: currentBoard, status: 'lost' };
                }
            }
        }
    }

    // Final win check after all reveals
    if (currentStatus !== 'lost') {
        const flattened = currentBoard.flat();
        const allNonMinesRevealed = flattened.every(c => c.isMine || c.isRevealed);
        if (allNonMinesRevealed) currentStatus = 'won';
    }

    return { board: currentBoard, status: currentStatus };
};
