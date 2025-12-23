import React from 'react';

const DifficultySelector = ({ difficulty, setDifficulty }) => {
    const handleChange = (e) => {
        setDifficulty(e.target.value);
    };

    return (
        <div className="difficulty-selector">
            <label htmlFor="difficulty">Dificultad: </label>
            <select id="difficulty" value={difficulty} onChange={handleChange}>
                <option value="beginner">Principiante (9x9, 10 Minas)</option>
                <option value="intermediate">Intermedio (16x16, 40 Minas)</option>
                <option value="advanced">Avanzado (16x30, 99 Minas)</option>
            </select>
        </div>
    );
};

export default DifficultySelector;
