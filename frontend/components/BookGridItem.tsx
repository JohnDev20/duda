import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Book } from '../store/bookStore';

interface BookGridItemProps {
  book: Book;
  onPress: () => void;
  onDelete: () => void;
  colors: any;
}

export function BookGridItem({ book, onPress, onDelete, colors }: BookGridItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.coverContainer, { backgroundColor: colors.primary }]}>
        {book.cover_base64 ? (
          <Image
            source={{ uri: book.cover_base64 }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderCover}>
            <Text style={styles.placeholderTitle} numberOfLines={3}>
              {book.title}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
          {book.author}
        </Text>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBar,
              { width: `${book.progress}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>

        {/* Status Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(book.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(book.status)}</Text>
          </View>
        </View>
      </View>

      {/* Delete Button */}
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.error }]}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Ionicons name="trash" size={16} color="#FFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    novo: 'Novo',
    lendo: 'Lendo',
    finalizado: 'Finalizado',
    abandonado: 'Abandonado',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    novo: '#00C851',
    lendo: '#FFB300',
    finalizado: '#0099CC',
    abandonado: '#666666',
  };
  return colors[status] || '#666666';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoContainer: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
