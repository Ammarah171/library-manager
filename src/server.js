const express = require('express');
const path = require('path');
const LibraryDB = require('./db/LibraryDB');

const app = express();
const db = new LibraryDB();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/books', require('./routes/books')(db));
app.use('/api/shelves', require('./routes/shelves')(db));

// Fallback → SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize DB then start server
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Library Manager running at http://localhost:${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGINT', () => { db.close(); process.exit(0); });