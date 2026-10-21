import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator, Platform, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { reportesService } from '../services/reportesService';
import { getOperationFeedback, operationFeedbackMessages } from '../services/fieldUiPolicy';
import type { SyncResult } from '../services/syncService';
import { fitArtboard } from '../theme/figmaArtboard';
import { storeImageHybrid, getImageHybrid, deleteImageHybrid } from '../services/webImageStorage';

interface EvidenciaUploaderProps {
  idReporte: number;
  onSuccess?: (result: SyncResult) => void;
  disabled?: boolean;
}

export const EvidenciaUploader: React.FC<EvidenciaUploaderProps> = ({
  idReporte,
  onSuccess,
  disabled = false,
}) => {
  const [imagen, setImagen] = useState<string | null>(null);
  const [imagenId, setImagenId] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [showAudioNotice, setShowAudioNotice] = useState(false);
  const { width, height } = useWindowDimensions();
  const modalScale = fitArtboard(width, height);

  // Load persisted image on mount
  useEffect(() => {
    if (imagenId) {
      getImageHybrid(imagenId).then(uri => {
        if (uri) setImagen(uri);
      });
    }
  }, [imagenId]);

  const seleccionarImagen = async () => {
    if (disabled) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar imágenes');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const id = `evidencia_${idReporte}_${Date.now()}`;
      const durableUri = await storeImageHybrid(uri, id);
      setImagen(durableUri);
      setImagenId(id);
    }
  };

  const tomarFoto = async () => {
    if (disabled) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const id = `evidencia_${idReporte}_${Date.now()}`;
      const durableUri = await storeImageHybrid(uri, id);
      setImagen(durableUri);
      setImagenId(id);
    }
  };

  const subirEvidencia = async () => {
    if (!imagen || subiendo || disabled || !imagenId) return;

    setSubiendo(true);
    try {
      const uriParts = imagen.split('.');
      const extension = uriParts[uriParts.length - 1];
      const fileName = `evidencia_${idReporte}_${Date.now()}.${extension}`;
      const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

      const result = await reportesService.subirEvidenciaResolucion(idReporte, imagen, fileName, mimeType);
      
      Alert.alert('Evidencia', operationFeedbackMessages[getOperationFeedback(result)]);
      // Clean up local storage after successful upload
      await deleteImageHybrid(imagenId);
      setImagen(null);
      setImagenId(null);
      onSuccess?.(result);
    } catch (error: unknown) {
      console.error('Error subiendo evidencia:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo guardar la evidencia');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarImagen = () => {
    if (imagenId) {
      deleteImageHybrid(imagenId);
    }
    setImagen(null);
    setImagenId(null);
  };

  const agregarEvidencia = () => {
    if (Platform.OS === 'web') {
      void seleccionarImagen();
      return;
    }
    Alert.alert('Agregar evidencia', 'Elige cómo agregar la foto del reporte.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tomar foto', onPress: () => { void tomarFoto(); } },
      { text: 'Galería', onPress: () => { void seleccionarImagen(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      {!imagen ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.actionButton} onPress={() => setShowAudioNotice(true)} disabled={disabled || subiendo}>
            <View style={styles.actionIcon}><Ionicons name="mic-outline" size={20} color="#FFF" /></View><Text style={styles.buttonText}>Grabar audio</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.actionButton} onPress={agregarEvidencia} disabled={disabled || subiendo}>
            <View style={styles.actionIcon}><Ionicons name="camera-outline" size={24} color="#FFF" /></View><Text style={styles.buttonText}>Agregar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imagen }} style={styles.previewImage} />
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.deleteButton} onPress={eliminarImagen} disabled={subiendo}>
              <Text style={styles.deleteText}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadButton, subiendo && styles.uploadButtonLoading]}
              onPress={subirEvidencia}
              disabled={disabled || subiendo}
            >
              {subiendo ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.uploadText}>Subiendo...</Text>
                </>
              ) : (
                <Text style={styles.uploadText}>Subir evidencia</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {imagen ? <Text style={styles.hint}>La evidencia se guardará en el dispositivo y se enviará al servidor cuando se pueda sincronizar.</Text> : null}
      <Modal visible={showAudioNotice} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowAudioNotice(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.audioCard, { transform: [{ scale: modalScale }] }]} accessibilityViewIsModal>
            <View style={styles.audioHeader}>
              <View style={styles.audioHeaderTitle}><View style={styles.audioDot} /><Text style={styles.audioTitle}>Audio no disponible</Text></View>
              <View style={styles.audioUnavailable}><View style={styles.audioUnavailableDot} /><Text style={styles.audioUnavailableText}>No disponible</Text></View>
            </View>
            <LinearGradient colors={['#2200FF', '#0184FF']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.audioHero}>
              <View style={styles.audioIconCircle}><Ionicons name="mic-off-outline" size={28} color="#FFF" /></View>
              <View style={styles.audioHeroCopy}><Text style={styles.audioHeroTitle}>No hay grabación</Text><Text style={styles.audioHeroText}>Esta versión aún no puede capturar ni adjuntar audio al reporte.</Text></View>
            </LinearGradient>
            <View style={styles.audioFooter}><View style={styles.audioFooterLeft}><Ionicons name="mic-off-outline" size={24} color="#00D4EB" /><Text style={styles.audioFooterText}>Audio inactivo</Text></View><Text style={styles.audioDuration}>—</Text></View>
            <TouchableOpacity accessibilityRole="button" style={styles.audioClose} onPress={() => setShowAudioNotice(false)}><Text style={styles.audioCloseText}>Entendido</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 353 },
  buttonRow: {
    flexDirection: 'row',
    gap: 57,
  },
  actionButton: {
    width: 148,
    height: 54,
    padding: 0,
    paddingLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#0184FF',
    backgroundColor: '#F8FBFF',
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#0184FF', alignItems: 'center', justifyContent: 'center' },
  buttonText: {
    fontFamily: 'InriaSans_700Bold',
    fontSize: 14,
    color: '#015FEB',
  },
  previewContainer: {
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F36B2E',
  },
  uploadButtonLoading: {
    backgroundColor: '#EA580C',
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 11,
    color: '#9A3412',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  audioCard: { width: 332, height: 467, padding: 24, borderWidth: 1, borderColor: '#E7F3FF', borderRadius: 28, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 12, justifyContent: 'space-between' },
  audioHeader: { width: 284, height: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  audioHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00D4EB' },
  audioTitle: { color: '#015FEB', fontFamily: 'InriaSans_700Bold', fontSize: 13 },
  audioUnavailable: { height: 26, borderRadius: 999, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9' },
  audioUnavailableDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94A3B8' },
  audioUnavailableText: { color: '#64748B', fontFamily: 'InriaSans_700Bold', fontSize: 10 },
  audioHero: { width: 284, height: 229, borderRadius: 24, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  audioIconCircle: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  audioHeroCopy: { width: 236, alignItems: 'center', gap: 6 },
  audioHeroTitle: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 22, lineHeight: 29, textAlign: 'center' },
  audioHeroText: { color: 'rgba(255,255,255,0.8)', fontFamily: 'InriaSans_400Regular', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  audioFooter: { width: 284, height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  audioFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioFooterText: { color: '#015FEB', fontFamily: 'InriaSans_700Bold', fontSize: 13 },
  audioDuration: { color: '#7A8699', fontFamily: 'InriaSans_400Regular', fontSize: 13 },
  audioClose: { width: 272, height: 58, alignSelf: 'center', borderRadius: 24, backgroundColor: '#0184FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0184FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  audioCloseText: { color: '#FFF', fontFamily: 'InriaSans_700Bold', fontSize: 18, lineHeight: 22 },
});
