import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../store/settingsStore';
import { Colors } from '../constants/Colors';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    theme,
    setTheme,
    readerMode,
    setReaderMode,
    incrementVersionTap,
    resetVersionTap,
    developerMode,
  } = useSettingsStore();

  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const handleBackup = () => {
    Alert.alert(
      'Backup',
      'Funcionalidade de backup será implementada em breve',
      [{ text: 'OK' }]
    );
  };

  const handleVersionPress = () => {
    incrementVersionTap();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Tema */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aparência</Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon" size={24} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Tema Escuro</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Leitor */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Leitor Padrão</Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="book-outline" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.settingText, { color: colors.text }]}>Modo de Navegação</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  {readerMode === 'horizontal' ? 'Horizontal (paginação)' : 'Vertical (scroll)'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setReaderMode(readerMode === 'horizontal' ? 'vertical' : 'horizontal')}
            >
              <Ionicons name="swap-horizontal" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados</Text>
          
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={handleBackup}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Exportar Backup</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={handleBackup}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Importar Backup</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sobre */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre</Text>
          
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={handleVersionPress}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.settingText, { color: colors.text }]}>Versão do App</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  1.0.0
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Developer Mode Link */}
        {developerMode && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.devButton, { backgroundColor: colors.warning }]}
              onPress={() => router.push('/developer')}
            >
              <Ionicons name="code-slash" size={24} color="#000" />
              <Text style={styles.devButtonText}>Modo Desenvolvedor</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            DUDA - Leitor Offline Premium
          </Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Feito com ❤️ em português brasileiro
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
  },
});
