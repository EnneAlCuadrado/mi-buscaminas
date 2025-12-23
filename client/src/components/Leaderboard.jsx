import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Leaderboard = ({ difficulty, refreshTrigger }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('scores')
                    .select('*')
                    .eq('difficulty', difficulty)
                    .order('time', { ascending: true })
                    .limit(10);

                if (error) throw error;
                setRecords(data);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [difficulty, refreshTrigger]);

    const getDifficultyName = (diff) => {
        if (diff === 'beginner') return 'Principiante';
        if (diff === 'intermediate') return 'Intermedio';
        if (diff === 'advanced') return 'Avanzado';
        return diff;
    };

    return (
        <div className="leaderboard">
            <h2>Top 10 - {getDifficultyName(difficulty)}</h2>
            {loading ? (
                <p>Cargando...</p>
            ) : (
                <ul className="leaderboard-list">
                    {records.length === 0 ? (
                        <li>Aún no hay récords.</li>
                    ) : (
                        records.map((record) => (
                            <li key={record.id} className="leaderboard-item">
                                <span className="name">{record.username}</span>
                                <span className="time">{record.time}s</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export default Leaderboard;
