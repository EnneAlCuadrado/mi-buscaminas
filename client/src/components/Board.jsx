import React from 'react';
import Cell from './Cell';

const Board = ({ board, highlightedCells, losingCell, onCellClick, onCellContext }) => {
    if (!board || board.length === 0) return null;

    const style = {
        gridTemplateColumns: `repeat(${board[0].length}, 30px)`,
        gridTemplateRows: `repeat(${board.length}, 30px)`,
    };

    return (
        <div className="board" style={style}>
            {board.map((row, rIndex) =>
                row.map((cell, cIndex) => {
                    const isHighlighted = highlightedCells && highlightedCells.includes(`${rIndex}-${cIndex}`);

                    let animationDelay = '0ms';
                    if (losingCell && cell.isMine && cell.isRevealed) {
                        const dist = Math.abs(rIndex - losingCell.r) + Math.abs(cIndex - losingCell.c);
                        animationDelay = `${dist * 50}ms`;
                    }

                    return (
                        <Cell
                            key={`${rIndex}-${cIndex}`}
                            data={cell}
                            isHighlighted={isHighlighted}
                            revealDelay={animationDelay}
                            onClick={() => onCellClick(rIndex, cIndex)}
                            onContextMenu={(e) => onCellContext(e, rIndex, cIndex)}
                        />
                    );
                })
            )}
        </div>
    );
};

export default Board;
