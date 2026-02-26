import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PdfViewerProps {
  pdfRef: any;
  source: any;
  page: number;
  horizontal: boolean;
  scale: number;
  onLoadComplete: (numberOfPages: number) => void;
  onPageChanged: (page: number, numberOfPages: number) => void;
  onError: (error: any) => void;
  colors: any;
}

// Componente apenas para mobile
if (Platform.OS === 'web') {
  // Web version - mostra mensagem
  export function PdfViewer({ colors }: { colors: any }) {
    return (
      <View style={styles.webNotice}>
        <Ionicons name="phone-portrait" size={64} color={colors.primary} />
        <Text style={[styles.webNoticeText, { color: colors.text }]}>
          Leitor de PDF disponível apenas em dispositivos móveis
        </Text>
        <Text style={[styles.webNoticeSubtext, { color: colors.textSecondary }]}>
          Use o Expo Go ou build nativo para testar
        </Text>
      </View>
    );
  }
} else {
  // Native version - usa react-native-pdf
  const Pdf = require('react-native-pdf').default;

  export function PdfViewer({
    pdfRef,
    source,
    page,
    horizontal,
    scale,
    onLoadComplete,
    onPageChanged,
    onError,
  }: PdfViewerProps) {
    return (
      <Pdf
        ref={pdfRef}
        source={source}
        page={page}
        horizontal={horizontal}
        scale={scale}
        onLoadComplete={onLoadComplete}
        onPageChanged={onPageChanged}
        onError={onError}
        style={styles.pdf}
        trustAllCerts={false}
      />
    );
  }
}

const styles = StyleSheet.create({
  pdf: {
    flex: 1,
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
});
