const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'minesweeper.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        time INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        date TEXT DEFAULT CURRENT_TIMESTAMP
    )`;

    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Records table ready.');
        }
    });
}

// Routes

// Get records by difficulty
// Example: GET /api/records?difficulty=beginner
app.get('/api/records', (req, res) => {
    const { difficulty } = req.query;
    if (!difficulty) {
        return res.status(400).json({ error: 'Difficulty query parameter is required' });
    }

    const sql = `SELECT * FROM records WHERE difficulty = ? ORDER BY time ASC LIMIT 10`;
    db.all(sql, [difficulty], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Save a new record
// Example: POST /api/records
// Body: { username: "Player1", time: 120, difficulty: "intermediate" }
app.post('/api/records', (req, res) => {
    const { username, time, difficulty } = req.body;
    
    if (!username || time === undefined || !difficulty) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `INSERT INTO records (username, time, difficulty) VALUES (?, ?, ?)`;
    const params = [username, time, difficulty];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'Record saved successfully', 
            id: this.lastID,
            username, 
            time, 
            difficulty 
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
