import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let NativePdf: any = null;
if (Platform.OS !== 'web') {
  NativePdf = require('react-native-pdf').default;
}

interface PdfViewerProps {
  pdfRef?: any;
  source: any;
  page: number;
  horizontal: boolean;
  scale: number;
  onLoadComplete: (numberOfPages: number) => void;
  onPageChanged: (page: number, numberOfPages: number) => void;
  onError: (error: any) => void;
  colors: any;
}

export function PdfViewer(props: PdfViewerProps) {
  const { colors, pdfRef, source, page, horizontal, scale, onLoadComplete, onPageChanged, onError } = props;

  if (Platform.OS === 'web') {
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

  if (!NativePdf) {
    return (
      <View style={styles.webNotice}>
        <Text style={{ color: colors.text }}>PDF viewer não disponível</Text>
      </View>
    );
  }

  return (
    <NativePdf
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
