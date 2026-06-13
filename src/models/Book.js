/**
 * Book — represents a single book in the library.
 * Demonstrates OOP: encapsulation, validation, and a static factory method.
 */
class Book {
  static STATUSES = ['want-to-read', 'reading', 'read'];

  constructor({ id = null, title, author, genre = null, year = null, status = 'want-to-read', createdAt = null }) {
    if (!title?.trim()) throw new Error('Book title is required.');
    if (!author?.trim()) throw new Error('Book author is required.');
    if (!Book.STATUSES.includes(status)) throw new Error(`Status must be one of: ${Book.STATUSES.join(', ')}`);

    this.id = id;
    this.title = title.trim();
    this.author = author.trim();
    this.genre = genre?.trim() || null;
    this.year = year ? Number(year) : null;
    this.status = status;
    this.createdAt = createdAt || new Date().toISOString();
  }

  /** Update reading status */
  updateStatus(newStatus) {
    if (!Book.STATUSES.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    this.status = newStatus;
    return this;
  }

  /** Plain object for DB insertion */
  toRecord() {
    return {
      title: this.title,
      author: this.author,
      genre: this.genre,
      year: this.year,
      status: this.status,
      created_at: this.createdAt,
    };
  }

  /** Hydrate a Book from a raw DB row */
  static fromRow(row) {
    return new Book({
      id: row.id,
      title: row.title,
      author: row.author,
      genre: row.genre,
      year: row.year,
      status: row.status,
      createdAt: row.created_at,
    });
  }
}

module.exports = Book;