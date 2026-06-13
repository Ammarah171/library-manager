/**
 * api.js — thin fetch wrapper for the Library Manager REST API.
 * Demonstrates OOP: static class used as a namespace/module.
 */
class LibraryAPI {
  static async getBooks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return LibraryAPI._fetch(`/api/books${qs ? '?' + qs : ''}`);
  }
  static async getStats()          { return LibraryAPI._fetch('/api/books/stats'); }
  static async addBook(data)        { return LibraryAPI._fetch('/api/books', 'POST', data); }
  static async updateBook(id, data) { return LibraryAPI._fetch(`/api/books/${id}`, 'PUT', data); }
  static async deleteBook(id)       { return LibraryAPI._fetch(`/api/books/${id}`, 'DELETE'); }

  static async getShelves()              { return LibraryAPI._fetch('/api/shelves'); }
  static async deleteShelf(id)           { return LibraryAPI._fetch(`/api/shelves/${id}`, 'DELETE'); }
  static async addShelf(data)            { return LibraryAPI._fetch('/api/shelves', 'POST', data); }
  static async getBooksOnShelf(id)       { return LibraryAPI._fetch(`/api/shelves/${id}/books`); }
  static async addBookToShelf(id, bookId){ return LibraryAPI._fetch(`/api/shelves/${id}/books`, 'POST', { bookId }); }
  static async removeBookFromShelf(shelfId, bookId) {
    return LibraryAPI._fetch(`/api/shelves/${shelfId}/books/${bookId}`, 'DELETE');
  }

  static async _fetch(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
}