import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../store/settingsStore';
import { Colors } from '../constants/Colors';
import { fetchStats } from '../utils/api';

export default function DeveloperScreen() {
  const router = useRouter();
  const { theme } = useSettingsStore();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.warning }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Modo Desenvolvedor</Text>
        <Ionicons name="code-slash" size={24} color="#000" />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ESTATÍSTICAS</Text>
            
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total de Livros</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.book_count || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total de Marcadores</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.bookmark_count || 0}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Palavras no Dicionário</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.dictionary_count || 0}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>INFORMAÇÕES DO APP</Text>
            
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <InfoRow label="Versão do App" value={stats?.app_version || '1.0.0'} colors={colors} />
              <InfoRow label="Versão do Banco" value={stats?.database_version || '1.0'} colors={colors} />
              <InfoRow label="Caminho do Storage" value="DUDA/" colors={colors} />
              <InfoRow label="Caminho dos Logs" value="DUDA/logs/" colors={colors} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>LOGS</Text>
            
            <TouchableOpacity
              style={[styles.logButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="document-text-outline" size={24} color={colors.primary} />
              <Text style={[styles.logButtonText, { color: colors.text }]}>app_log.txt</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.logButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="download-outline" size={24} color={colors.primary} />
              <Text style={[styles.logButtonText, { color: colors.text }]}>import_log.txt</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.logButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="warning-outline" size={24} color={colors.error} />
              <Text style={[styles.logButtonText, { color: colors.text }]}>error_log.txt</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              ⚠️ Este modo é apenas para fins de diagnóstico e debug.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
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
    gap: 16,
  },
  backButton: {},
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
});
