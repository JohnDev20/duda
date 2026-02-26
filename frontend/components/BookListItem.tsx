import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Book } from '../store/bookStore';

interface BookListItemProps {
  book: Book;
  onPress: () => void;
  onDelete: () => void;
  colors: any;
}

export function BookListItem({ book, onPress, onDelete, colors }: BookListItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover Thumbnail */}
      <View style={[styles.coverContainer, { backgroundColor: colors.primary }]}>
        {book.cover_base64 ? (
          <Image
            source={{ uri: book.cover_base64 }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="book" size={32} color="#FFF" />
        )}
      </View>

      {/* Book Info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
          {book.author}
        </Text>

        {/* Progress */}
        <View style={styles.progressRow}>
          <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBar,
                { width: `${book.progress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {Math.round(book.progress)}%
          </Text>
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
        <Ionicons name="trash" size={20} color="#FFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  coverContainer: {
    width: 60,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressContainer: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
