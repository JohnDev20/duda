import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { FlashList } from '@shopify/flash-list';
import { useBookStore, Book } from '../store/bookStore';
import { useSettingsStore } from '../store/settingsStore';
import { Colors } from '../constants/Colors';
import { fetchBooks, createBook, updateBook, deleteBook, searchMetadata } from '../utils/api';
import { BookGridItem } from '../components/BookGridItem';
import { BookListItem } from '../components/BookListItem';

export default function LibraryScreen() {
  const router = useRouter();
  const {
    books,
    setBooks,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    setCurrentBook,
  } = useBookStore();
  
  const { theme } = useSettingsStore();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadBooks();
  }, [sortBy, filterStatus]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const params: any = { sort_by: sortBy };
      
      if (filterStatus !== 'all') {
        params.filter_status = filterStatus;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const booksData = await fetchBooks(params);
      setBooks(booksData);
    } catch (error) {
      console.error('Erro ao carregar livros:', error);
      Alert.alert('Erro', 'Não foi possível carregar os livros');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async () => {
    try {
      setImporting(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setImporting(false);
        return;
      }

      const file = result.assets[0];
      
      // Ler arquivo como base64
      const fileUri = file.uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Criar nome do arquivo
      const fileName = file.name || `livro_${Date.now()}.pdf`;
      
      // Extrair título básico do nome do arquivo
      const title = fileName.replace('.pdf', '').replace(/_/g, ' ');

      // Criar livro no banco
      const newBook = await createBook({
        title,
        author: 'Desconhecido',
        file_type: 'pdf',
        file_path: `duda://${fileName}`,
        total_pages: 0, // Será extraído depois
        language: 'pt',
      });

      Alert.alert(
        'Sucesso!',
        'Livro importado com sucesso',
        [
          {
            text: 'Buscar metadados online?',
            onPress: () => handleSearchMetadata(newBook._id, title),
          },
          {
            text: 'OK',
            onPress: () => loadBooks(),
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao importar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível importar o arquivo');
    } finally {
      setImporting(false);
    }
  };

  const handleSearchMetadata = async (bookId: string, title: string) => {
    try {
      const metadata = await searchMetadata(title);
      
      if (metadata && metadata.title) {
        await updateBook(bookId, {
          title: metadata.title,
          author: metadata.author || 'Desconhecido',
          language: metadata.language || 'pt',
        });
        
        Alert.alert('Metadados atualizados', 'Informações do livro foram atualizadas');
        loadBooks();
      } else {
        Alert.alert('Sem resultados', 'Não foram encontrados metadados para este livro');
      }
    } catch (error) {
      console.error('Erro ao buscar metadados:', error);
      Alert.alert('Erro', 'Não foi possível buscar metadados');
    }
  };

  const handleBookPress = (book: Book) => {
    setCurrentBook(book);
    router.push(`/reader/${book._id}`);
  };

  const handleDeleteBook = (bookId: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Deseja realmente excluir este livro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBook(bookId);
              loadBooks();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o livro');
            }
          },
        },
      ]
    );
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length === 0 || text.length >= 3) {
      loadBooks();
    }
  };

  const filteredBooks = books;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>DUDA</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={styles.iconButton}
          >
            <Ionicons
              name={viewMode === 'grid' ? 'list' : 'grid'}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={styles.iconButton}
          >
            <Ionicons name="filter" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
          >
            <Ionicons name="settings" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar livros..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: filterStatus === 'all' ? colors.primary : colors.background },
              ]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterText, { color: filterStatus === 'all' ? '#FFF' : colors.text }]}>
                Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: filterStatus === 'novo' ? colors.primary : colors.background },
              ]}
              onPress={() => setFilterStatus('novo')}
            >
              <Text style={[styles.filterText, { color: filterStatus === 'novo' ? '#FFF' : colors.text }]}>
                Novos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: filterStatus === 'lendo' ? colors.primary : colors.background },
              ]}
              onPress={() => setFilterStatus('lendo')}
            >
              <Text style={[styles.filterText, { color: filterStatus === 'lendo' ? '#FFF' : colors.text }]}>
                Lendo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: filterStatus === 'finalizado' ? colors.primary : colors.background },
              ]}
              onPress={() => setFilterStatus('finalizado')}
            >
              <Text style={[styles.filterText, { color: filterStatus === 'finalizado' ? '#FFF' : colors.text }]}>
                Finalizados
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Books List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="book-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum livro na biblioteca
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Toque no botão + para importar
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredBooks}
          renderItem={({ item }) =>
            viewMode === 'grid' ? (
              <BookGridItem
                book={item}
                onPress={() => handleBookPress(item)}
                onDelete={() => handleDeleteBook(item._id)}
                colors={colors}
              />
            ) : (
              <BookListItem
                book={item}
                onPress={() => handleBookPress(item)}
                onDelete={() => handleDeleteBook(item._id)}
                colors={colors}
              />
            )
          }
          estimatedItemSize={viewMode === 'grid' ? 250 : 80}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB - Import Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleImportFile}
        disabled={importing}
      >
        {importing ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Ionicons name="add" size={32} color="#FFF" />
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
