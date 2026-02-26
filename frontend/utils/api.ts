import axios from 'axios';
import { Book, Bookmark } from '../store/bookStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== BOOKS =====

export const fetchBooks = async (params?: {
  sort_by?: string;
  filter_status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}): Promise<Book[]> => {
  const response = await api.get('/books', { params });
  return response.data;
};

export const createBook = async (bookData: any): Promise<Book> => {
  const response = await api.post('/books', bookData);
  return response.data;
};

export const updateBook = async (bookId: string, updates: any): Promise<Book> => {
  const response = await api.put(`/books/${bookId}`, updates);
  return response.data;
};

export const deleteBook = async (bookId: string): Promise<void> => {
  await api.delete(`/books/${bookId}`);
};

// ===== BOOKMARKS =====

export const fetchBookmarks = async (bookId: string): Promise<Bookmark[]> => {
  const response = await api.get(`/bookmarks/${bookId}`);
  return response.data;
};

export const createBookmark = async (bookmarkData: any): Promise<Bookmark> => {
  const response = await api.post('/bookmarks', bookmarkData);
  return response.data;
};

export const deleteBookmark = async (bookmarkId: string): Promise<void> => {
  await api.delete(`/bookmarks/${bookmarkId}`);
};

// ===== DICTIONARY =====

export const searchWord = async (word: string): Promise<any> => {
  const response = await api.get(`/dictionary/${word}`);
  return response.data;
};

// ===== READING HISTORY =====

export const addReadingHistory = async (bookId: string, pageNumber: number): Promise<void> => {
  await api.post('/reading-history', null, {
    params: { book_id: bookId, page_number: pageNumber }
  });
};

export const fetchReadingHistory = async (bookId: string, limit: number = 10): Promise<any[]> => {
  const response = await api.get(`/reading-history/${bookId}`, {
    params: { limit }
  });
  return response.data;
};

// ===== METADATA =====

export const searchMetadata = async (title: string): Promise<any> => {
  const response = await api.get('/metadata/search', {
    params: { title }
  });
  return response.data;
};

// ===== STATS =====

export const fetchStats = async (): Promise<any> => {
  const response = await api.get('/stats');
  return response.data;
};

export default api;
