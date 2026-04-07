const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            plan TEXT,
            join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            message TEXT,
            contact_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// API Routes
app.post('/api/join', (req, res) => {
    const { name, email, phone, plan } = req.body;
    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Name, email, and phone are required.' });
    }
    
    // Simple email regex
    if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }
    
    const stmt = db.prepare('INSERT INTO members (name, email, phone, plan) VALUES (?, ?, ?, ?)');
    stmt.run([name, email, phone, plan || 'Gold Plan'], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Email already registered.' });
            }
            return res.status(500).json({ error: 'Database error.' });
        }
        res.status(201).json({ message: 'Successfully joined!', id: this.lastID });
    });
    stmt.finalize();
});

app.post('/api/contact', (req, res) => {
    const { name, phone, message } = req.body;
    if (!name || !phone) {
         return res.status(400).json({ error: 'Name and phone are required.' });
    }
    
    const stmt = db.prepare('INSERT INTO contacts (name, phone, message) VALUES (?, ?, ?)');
    stmt.run([name, phone, message], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error.' });
        }
        res.status(201).json({ message: 'We will contact you shortly!', id: this.lastID });
    });
    stmt.finalize();
});

app.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM members', [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ membersCount: row.count + 500 }); // baseline 500
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
