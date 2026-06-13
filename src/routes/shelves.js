const express = require('express');
const router = express.Router();
const Shelf = require('../models/Shelf');

module.exports = (db) => {
  // GET /api/shelves
  router.get('/', (req, res) => {
    res.json(db.getAllShelves());
  });

  // POST /api/shelves
  router.post('/', (req, res) => {
    try {
      const shelf = new Shelf(req.body);
      db.addShelf(shelf);
      res.status(201).json(shelf);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/shelves/:id/books
  router.get('/:id/books', (req, res) => {
    const shelf = db.getShelfById(Number(req.params.id));
    if (!shelf) return res.status(404).json({ error: 'Shelf not found.' });
    res.json(db.getBooksOnShelf(shelf.id));
  });

  // POST /api/shelves/:id/books  { bookId }
  router.post('/:id/books', (req, res) => {
    try {
      const shelfId = Number(req.params.id);
      const bookId  = Number(req.body.bookId);
      if (!db.getShelfById(shelfId)) return res.status(404).json({ error: 'Shelf not found.' });
      if (!db.getBookById(bookId))   return res.status(404).json({ error: 'Book not found.' });
      db.addBookToShelf(shelfId, bookId);
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/shelves/:id
  router.delete('/:id', (req, res) => {
    const deleted = db.deleteShelf(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Shelf not found.' });
    res.json({ success: true });
  });

  // DELETE /api/shelves/:id/books/:bookId
  router.delete('/:id/books/:bookId', (req, res) => {
    const removed = db.removeBookFromShelf(Number(req.params.id), Number(req.params.bookId));
    if (!removed) return res.status(404).json({ error: 'Item not found on shelf.' });
    res.json({ success: true });
  });

  return router;
};