const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const Shelf = require('../models/Shelf');

/**
 * LibraryDB — Repository pattern using sql.js.
 * All SQL lives here; models stay clean of persistence logic.
 * Note: sql.js is in-memory, so we manually persist to file.
 */
class LibraryDB {
  constructor(dbPath = path.join(__dirname, '../../library.db')) {
    this.dbPath = dbPath;
    this.db = null;
    this.SQL = null;
  }

  async init() {
    this.SQL = await initSqlJs();
    
    // Load existing database if file exists
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(fileBuffer);
    } else {
      this.db = new this.SQL.Database();
    }
    
    this.db.run('PRAGMA foreign_keys = ON');
    this._migrate();
  }

  _save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL,
        author     TEXT    NOT NULL,
        genre      TEXT,
        year       INTEGER,
        status     TEXT    NOT NULL DEFAULT 'want-to-read',
        created_at TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shelves (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL UNIQUE,
        description TEXT,
        created_at  TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shelf_items (
        shelf_id   INTEGER NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
        book_id    INTEGER NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
        added_at   TEXT    NOT NULL,
        PRIMARY KEY (shelf_id, book_id)
      );
    `);
  }

  // ─── Books ──────────────────────────────────────────────────────────────────

  addBook(book) {
    const rec = book.toRecord();
    this.db.run(
      `INSERT INTO books (title, author, genre, year, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rec.title, rec.author, rec.genre, rec.year, rec.status, rec.created_at]
    );
    book.id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this._save();
    return book;
  }

  getAllBooks({ status, genre, search } = {}) {
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (status) { 
      query += ' AND status = ?'; 
      params.push(status); 
    }
    if (genre) {  
      query += ' AND LOWER(genre) = LOWER(?)'; 
      params.push(genre); 
    }
    if (search) {
      query += ' AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ?)';
      const searchPattern = `%${search.toLowerCase()}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(query);
    stmt.bind(params);
    const result = [];
    while (stmt.step()) {
      result.push(Book.fromRow(stmt.getAsObject()));
    }
    stmt.free();
    return result;
  }

  getBookById(id) {
    const stmt = this.db.prepare('SELECT * FROM books WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return Book.fromRow(row);
    }
    stmt.free();
    return null;
  }

  updateBook(id, fields) {
    const allowed = ['title', 'author', 'genre', 'year', 'status'];
    const updates = Object.keys(fields)
      .filter(k => allowed.includes(k))
      .map(k => `${k} = ?`)
      .join(', ');

    if (!updates) throw new Error('No valid fields to update.');

    const params = [...Object.keys(fields)
      .filter(k => allowed.includes(k))
      .map(k => fields[k]), id];

    this.db.run(`UPDATE books SET ${updates} WHERE id = ?`, params);
    this._save();
    return this.getBookById(id);
  }

  deleteBook(id) {
    this.db.run('DELETE FROM books WHERE id = ?', [id]);
    this._save();
    return this.db.getRowsModified() > 0;
  }

  // ─── Shelves ────────────────────────────────────────────────────────────────

  addShelf(shelf) {
    const rec = shelf.toRecord();
    this.db.run(
      `INSERT INTO shelves (name, description, created_at)
       VALUES (?, ?, ?)`,
      [rec.name, rec.description, rec.created_at]
    );
    shelf.id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    this._save();
    return shelf;
  }

  getAllShelves() {
    const stmt = this.db.prepare('SELECT * FROM shelves ORDER BY name');
    const shelves = [];
    while (stmt.step()) {
      shelves.push(Shelf.fromRow(stmt.getAsObject()));
    }
    stmt.free();

    // Attach book counts via JOIN
    const countStmt = this.db.prepare(
      'SELECT shelf_id, COUNT(*) as count FROM shelf_items GROUP BY shelf_id'
    );
    const countMap = {};
    while (countStmt.step()) {
      const row = countStmt.getAsObject();
      countMap[row.shelf_id] = row.count;
    }
    countStmt.free();

    shelves.forEach(s => { s.bookCount_ = countMap[s.id] || 0; });
    return shelves;
  }

  getShelfById(id) {
    const stmt = this.db.prepare('SELECT * FROM shelves WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return Shelf.fromRow(row);
    }
    stmt.free();
    return null;
  }

  deleteShelf(id) {
  this.db.run('DELETE FROM shelves WHERE id = ?', [id]);
  this._save();
  return this.db.getRowsModified() > 0;
}

  // ─── Shelf ↔ Book (many-to-many) ────────────────────────────────────────────

  addBookToShelf(shelfId, bookId) {
    this.db.run(
      `INSERT OR IGNORE INTO shelf_items (shelf_id, book_id, added_at)
       VALUES (?, ?, ?)`,
      [shelfId, bookId, new Date().toISOString()]
    );
    this._save();
  }

  removeBookFromShelf(shelfId, bookId) {
    this.db.run(
      'DELETE FROM shelf_items WHERE shelf_id = ? AND book_id = ?',
      [shelfId, bookId]
    );
    this._save();
    return this.db.getRowsModified() > 0;
  }

  getBooksOnShelf(shelfId) {
    const stmt = this.db.prepare(`
      SELECT b.* FROM books b
      INNER JOIN shelf_items si ON si.book_id = b.id
      WHERE si.shelf_id = ?
      ORDER BY si.added_at DESC
    `);
    stmt.bind([shelfId]);
    const result = [];
    while (stmt.step()) {
      result.push(Book.fromRow(stmt.getAsObject()));
    }
    stmt.free();
    return result;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  getStats() {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'read'          THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN status = 'reading'       THEN 1 ELSE 0 END) as reading,
        SUM(CASE WHEN status = 'want-to-read'  THEN 1 ELSE 0 END) as want_to_read
      FROM books
    `);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  }

  close() {
    this._save();
    this.db.close();
  }
}

module.exports = LibraryDB;