/**
 * Shelf — a named collection of books (e.g. "Favourites", "Sci-Fi").
 * Demonstrates OOP: encapsulation, composition with Book objects.
 */
class Shelf {
  constructor({ id = null, name, description = null, createdAt = null }) {
    if (!name?.trim()) throw new Error('Shelf name is required.');
    this.id = id;
    this.name = name.trim();
    this.description = description?.trim() || null;
    this.createdAt = createdAt || new Date().toISOString();
    this._books = []; // composed collection
  }

  get bookCount() {
    return this._books.length;
  }

  addBook(book) {
    if (this._books.find(b => b.id === book.id)) return; // no duplicates
    this._books.push(book);
  }

  getBooks() {
    return [...this._books];
  }

  toRecord() {
    return {
      name: this.name,
      description: this.description,
      created_at: this.createdAt,
    };
  }

  static fromRow(row) {
    return new Shelf({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
    });
  }
}

module.exports = Shelf;