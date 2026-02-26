import { create } from 'zustand';

export interface Book {
  _id: string;
  title: string;
  author: string;
  file_type: string;
  file_path: string;
  cover_base64?: string;
  total_pages: number;
  current_page: number;
  progress: number;
  status: 'novo' | 'lendo' | 'finalizado' | 'abandonado';
  language?: string;
  category?: string;
  date_added: string;
  last_opened?: string;
  file_missing: boolean;
}

export interface Bookmark {
  _id: string;
  book_id: string;
  page_number: number;
  note: string;
  color: string;
  icon: string;
  date_created: string;
}

interface BookStore {
  books: Book[];
  currentBook: Book | null;
  viewMode: 'grid' | 'list';
  sortBy: 'last_opened' | 'title' | 'author' | 'progress' | 'date_added';
  filterStatus: 'all' | 'novo' | 'lendo' | 'finalizado' | 'abandonado';
  searchQuery: string;
  
  setBooks: (books: Book[]) => void;
  setCurrentBook: (book: Book | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (sort: 'last_opened' | 'title' | 'author' | 'progress' | 'date_added') => void;
  setFilterStatus: (status: 'all' | 'novo' | 'lendo' | 'finalizado' | 'abandonado') => void;
  setSearchQuery: (query: string) => void;
  updateBook: (bookId: string, updates: Partial<Book>) => void;
}

export const useBookStore = create<BookStore>((set) => ({
  books: [],
  currentBook: null,
  viewMode: 'grid',
  sortBy: 'last_opened',
  filterStatus: 'all',
  searchQuery: '',
  
  setBooks: (books) => set({ books }),
  setCurrentBook: (book) => set({ currentBook: book }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  updateBook: (bookId, updates) => set((state) => ({
    books: state.books.map(book => 
      book._id === bookId ? { ...book, ...updates } : book
    )
  })),
}));
