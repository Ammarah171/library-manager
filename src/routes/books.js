const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

module.exports = (db) => {
  // GET /api/books?status=&genre=&search=
  router.get('/', (req, res) => {
    try {
      const books = db.getAllBooks(req.query);
      res.json(books);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/books/stats
  router.get('/stats', (req, res) => {
    res.json(db.getStats());
  });

  // GET /api/books/:id
  router.get('/:id', (req, res) => {
    const book = db.getBookById(Number(req.params.id));
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    res.json(book);
  });

  // POST /api/books
  router.post('/', (req, res) => {
    try {
      const book = new Book(req.body);
      db.addBook(book);
      res.status(201).json(book);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/books/:id
  router.put('/:id', (req, res) => {
    try {
      const updated = db.updateBook(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: 'Book not found.' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/books/:id
  router.delete('/:id', (req, res) => {
    const deleted = db.deleteBook(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Book not found.' });
    res.json({ success: true });
  });

  return router;
};