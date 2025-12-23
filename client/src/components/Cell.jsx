import React from 'react';

const Cell = ({ data, isHighlighted, revealDelay, onClick, onContextMenu }) => {
    const { isRevealed, isFlagged, isMine, neighborMines } = data;

    let className = 'cell';
    if (isRevealed) {
        className += ' revealed';
        if (isMine) className += ' mine';
    }
    if (isFlagged) className += ' flagged'; // We might need css for flagged
    if (isHighlighted) {
        className += ' highlight';
    }

    const getValue = () => {
        if (isFlagged) return '🚩';
        if (!isRevealed) return '';
        if (isMine) return '💣';
        return neighborMines > 0 ? neighborMines : '';
    };

    return (
        <div
            className={className}
            data-value={neighborMines}
            style={{ animationDelay: revealDelay }}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {getValue()}
        </div>
    );
};

export default Cell;
