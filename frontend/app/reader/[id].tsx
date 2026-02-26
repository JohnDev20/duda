import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookStore, Book } from '../../store/bookStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Colors } from '../../constants/Colors';

// PDF viewer - only import on native platforms
let Pdf: any = null;
if (Platform.OS !== 'web') {
  Pdf = require('react-native-pdf').default;
}
import {
  updateBook,
  fetchBookmarks,
  createBookmark,
  deleteBookmark,
  addReadingHistory,
  fetchReadingHistory,
  searchWord,
} from '../../utils/api';
import { Bookmark } from '../../store/bookStore';

const { width, height } = Dimensions.get('window');

export default function ReaderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookId = Array.isArray(id) ? id[0] : id;

  const { currentBook, updateBook: updateBookStore } = useBookStore();
  const { theme, readerMode, setReaderMode } = useSettingsStore();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(true);

  // Sidebar states
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'structure' | 'bookmarks' | 'history'>('structure');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);

  // Bookmark modal
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkColor, setBookmarkColor] = useState('#FF1493');
  const [bookmarkIcon, setBookmarkIcon] = useState('bookmark');

  // Dictionary modal
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [searchedWord, setSearchedWord] = useState('');
  const [wordDefinition, setWordDefinition] = useState<any>(null);
  const [loadingDefinition, setLoadingDefinition] = useState(false);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const pdfRef = useRef<any>(null);

  useEffect(() => {
    if (currentBook) {
      setCurrentPage(currentBook.current_page || 1);
      setTotalPages(currentBook.total_pages);
      loadBookmarks();
      loadReadingHistory();
    }
  }, [currentBook]);

  useEffect(() => {
    // Auto-hide bars after 3 seconds
    const timer = setTimeout(() => {
      if (showTopBar || showBottomBar) {
        setShowTopBar(false);
        setShowBottomBar(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentPage, showTopBar, showBottomBar]);

  const loadBookmarks = async () => {
    try {
      const data = await fetchBookmarks(bookId);
      setBookmarks(data);
    } catch (error) {
      console.error('Erro ao carregar bookmarks:', error);
    }
  };

  const loadReadingHistory = async () => {
    try {
      const data = await fetchReadingHistory(bookId, 10);
      setReadingHistory(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const handlePageChange = async (page: number, numberOfPages: number) => {
    setCurrentPage(page);
    setTotalPages(numberOfPages);

    // Calcular progresso
    const progress = (page / numberOfPages) * 100;

    // Atualizar no banco
    try {
      await updateBook(bookId, {
        current_page: page,
        progress,
        status: page === numberOfPages ? 'finalizado' : 'lendo',
        last_opened: new Date().toISOString(),
      });

      // Adicionar ao histórico
      await addReadingHistory(bookId, page);

      // Atualizar store local
      updateBookStore(bookId, {
        current_page: page,
        progress,
        status: page === numberOfPages ? 'finalizado' : 'lendo',
      });
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleAddBookmark = async () => {
    try {
      await createBookmark({
        book_id: bookId,
        page_number: currentPage,
        note: bookmarkNote,
        color: bookmarkColor,
        icon: bookmarkIcon,
      });

      Alert.alert('Sucesso', 'Marcador adicionado');
      setShowBookmarkModal(false);
      setBookmarkNote('');
      setBookmarkColor('#FF1493');
      setBookmarkIcon('bookmark');
      loadBookmarks();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o marcador');
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await deleteBookmark(bookmarkId);
      loadBookmarks();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o marcador');
    }
  };

  const handleSearchWord = async () => {
    if (!searchedWord.trim()) {
      Alert.alert('Atenção', 'Digite uma palavra para buscar');
      return;
    }

    try {
      setLoadingDefinition(true);
      const result = await searchWord(searchedWord.trim().toLowerCase());
      setWordDefinition(result);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar a definição');
    } finally {
      setLoadingDefinition(false);
    }
  };

  const toggleBars = () => {
    setShowTopBar(!showTopBar);
    setShowBottomBar(!showBottomBar);
  };

  const goToPage = (page: number) => {
    if (pdfRef.current) {
      pdfRef.current.setPage(page);
    }
    setShowSidebar(false);
  };

  if (!currentBook) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Livro não encontrado</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      {showTopBar && (
        <View style={[styles.topBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={1}>
            {currentBook.title}
          </Text>

          <View style={styles.topBarActions}>
            <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.iconButton}>
              <Ionicons name="list" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowBookmarkModal(true)}
              style={styles.iconButton}
            >
              <Ionicons name="bookmark" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDictionaryModal(true)}
              style={styles.iconButton}
            >
              <Ionicons name="book" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettingsModal(true)}
              style={styles.iconButton}
            >
              <Ionicons name="settings" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webNotice}>
            <Ionicons name="phone-portrait" size={64} color={colors.primary} />
            <Text style={[styles.webNoticeText, { color: colors.text }]}>
              Leitor de PDF disponível apenas em dispositivos móveis
            </Text>
            <Text style={[styles.webNoticeSubtext, { color: colors.textSecondary }]}>
              Use o Expo Go ou build nativo para testar
            </Text>
          </View>
        ) : Pdf ? (
          <TouchableOpacity
            style={styles.pdfTouchable}
            onPress={toggleBars}
            activeOpacity={1}
          >
            <Pdf
              ref={pdfRef}
              source={{ uri: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }}
              page={currentPage}
              horizontal={readerMode === 'horizontal'}
              scale={zoom}
              onLoadComplete={(numberOfPages: number) => {
                setTotalPages(numberOfPages);
                setLoading(false);
              }}
              onPageChanged={(page: number, numberOfPages: number) => handlePageChange(page, numberOfPages)}
              onError={(error: any) => {
                console.error('PDF Error:', error);
                Alert.alert('Erro', 'Não foi possível carregar o PDF');
              }}
              style={styles.pdf}
              trustAllCerts={false}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>

      {/* Bottom Bar */}
      {showBottomBar && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleZoomOut} style={styles.iconButton}>
            <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleZoomIn} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.pageIndicator, { color: colors.text }]}>
            {currentPage} / {totalPages}
          </Text>

          <TouchableOpacity
            onPress={() => setReaderMode(readerMode === 'horizontal' ? 'vertical' : 'horizontal')}
            style={styles.iconButton}
          >
            <Ionicons
              name={readerMode === 'horizontal' ? 'swap-horizontal' : 'swap-vertical'}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => useSettingsStore.getState().setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={styles.iconButton}
          >
            <Ionicons
              name={theme === 'dark' ? 'sunny' : 'moon'}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Sidebar Modal */}
      <Modal visible={showSidebar} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSidebar(false)}
        >
          <View
            style={[styles.sidebarContainer, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Sidebar Tabs */}
            <View style={styles.sidebarTabs}>
              <TouchableOpacity
                style={[
                  styles.sidebarTab,
                  sidebarTab === 'structure' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setSidebarTab('structure')}
              >
                <Text style={[styles.sidebarTabText, { color: colors.text }]}>Estrutura</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarTab,
                  sidebarTab === 'bookmarks' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setSidebarTab('bookmarks')}
              >
                <Text style={[styles.sidebarTabText, { color: colors.text }]}>Marcadores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarTab,
                  sidebarTab === 'history' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setSidebarTab('history')}
              >
                <Text style={[styles.sidebarTabText, { color: colors.text }]}>Histórico</Text>
              </TouchableOpacity>
            </View>

            {/* Sidebar Content */}
            <ScrollView style={styles.sidebarContent}>
              {sidebarTab === 'structure' && (
                <View>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <TouchableOpacity
                      key={page}
                      style={[styles.sidebarItem, { backgroundColor: page === currentPage ? colors.primary : 'transparent' }]}
                      onPress={() => goToPage(page)}
                    >
                      <Text style={[styles.sidebarItemText, { color: page === currentPage ? '#FFF' : colors.text }]}>
                        Página {page}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {sidebarTab === 'bookmarks' && (
                <View>
                  {bookmarks.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Nenhum marcador
                    </Text>
                  ) : (
                    bookmarks.map((bookmark) => (
                      <View key={bookmark._id} style={styles.bookmarkItem}>
                        <TouchableOpacity
                          style={styles.bookmarkInfo}
                          onPress={() => goToPage(bookmark.page_number)}
                        >
                          <Ionicons name={bookmark.icon as any} size={20} color={bookmark.color} />
                          <View style={styles.bookmarkTextContainer}>
                            <Text style={[styles.bookmarkPage, { color: colors.text }]}>
                              Página {bookmark.page_number}
                            </Text>
                            {bookmark.note && (
                              <Text style={[styles.bookmarkNote, { color: colors.textSecondary }]}>
                                {bookmark.note}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteBookmark(bookmark._id)}>
                          <Ionicons name="trash" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}

              {sidebarTab === 'history' && (
                <View>
                  {readingHistory.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Nenhum histórico
                    </Text>
                  ) : (
                    readingHistory.map((entry, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.sidebarItem}
                        onPress={() => goToPage(entry.page_number)}
                      >
                        <Text style={[styles.sidebarItemText, { color: colors.text }]}>
                          Página {entry.page_number}
                        </Text>
                        <Text style={[styles.historyTime, { color: colors.textSecondary }]}>
                          {new Date(entry.timestamp).toLocaleString('pt-BR')}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowSidebar(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bookmark Modal */}
      <Modal visible={showBookmarkModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Marcador</Text>

            <TextInput
              style={[styles.noteInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Nota (opcional)"
              placeholderTextColor={colors.textSecondary}
              value={bookmarkNote}
              onChangeText={setBookmarkNote}
              multiline
            />

            <View style={styles.colorContainer}>
              {['#FF1493', '#FF69B4', '#00C851', '#FFB300', '#0099CC'].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color, borderWidth: bookmarkColor === color ? 3 : 0 },
                  ]}
                  onPress={() => setBookmarkColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowBookmarkModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddBookmark}
              >
                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dictionary Modal */}
      <Modal visible={showDictionaryModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Dicionário</Text>

            <TextInput
              style={[styles.noteInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Digite uma palavra..."
              placeholderTextColor={colors.textSecondary}
              value={searchedWord}
              onChangeText={setSearchedWord}
              onSubmitEditing={handleSearchWord}
            />

            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleSearchWord}
              disabled={loadingDefinition}
            >
              {loadingDefinition ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[styles.searchButtonText, { color: '#FFF' }]}>Buscar</Text>
              )}
            </TouchableOpacity>

            {wordDefinition && (
              <View style={styles.definitionContainer}>
                <Text style={[styles.definitionWord, { color: colors.primary }]}>
                  {wordDefinition.word}
                </Text>
                <Text style={[styles.definitionText, { color: colors.text }]}>
                  {wordDefinition.definition}
                </Text>
                {wordDefinition.synonyms && wordDefinition.synonyms.length > 0 && (
                  <>
                    <Text style={[styles.synonymsTitle, { color: colors.textSecondary }]}>
                      Sinônimos:
                    </Text>
                    <Text style={[styles.synonymsText, { color: colors.text }]}>
                      {wordDefinition.synonyms.join(', ')}
                    </Text>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => {
                setShowDictionaryModal(false);
                setSearchedWord('');
                setWordDefinition(null);
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Configurações do Leitor</Text>

            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Modo de navegação</Text>
              <View style={styles.settingOptions}>
                <TouchableOpacity
                  style={[
                    styles.settingOption,
                    {
                      backgroundColor:
                        readerMode === 'horizontal' ? colors.primary : colors.background,
                    },
                  ]}
                  onPress={() => setReaderMode('horizontal')}
                >
                  <Text
                    style={{
                      color: readerMode === 'horizontal' ? '#FFF' : colors.text,
                    }}
                  >
                    Horizontal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingOption,
                    {
                      backgroundColor:
                        readerMode === 'vertical' ? colors.primary : colors.background,
                    },
                  ]}
                  onPress={() => setReaderMode('vertical')}
                >
                  <Text
                    style={{
                      color: readerMode === 'vertical' ? '#FFF' : colors.text,
                    }}
                  >
                    Vertical
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  bookTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    padding: 8,
  },
  pdfContainer: {
    flex: 1,
  },
  pdfTouchable: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width,
    height,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  pageIndicator: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarContainer: {
    width: width * 0.8,
    height: height * 0.8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sidebarTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  sidebarTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  sidebarItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  sidebarItemText: {
    fontSize: 14,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
  },
  bookmarkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bookmarkTextContainer: {
    flex: 1,
  },
  bookmarkPage: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookmarkNote: {
    fontSize: 12,
    marginTop: 4,
  },
  historyTime: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 24,
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    width: width * 0.85,
    maxHeight: height * 0.8,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  definitionContainer: {
    marginBottom: 16,
  },
  definitionWord: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  definitionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  synonymsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  synonymsText: {
    fontSize: 14,
  },
  settingItem: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  settingOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  webNotice: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  webNoticeText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  webNoticeSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
