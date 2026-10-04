import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { reportesService } from '../services/reportesService';

interface EvidenciaUploaderProps {
  idReporte: number;
  onSuccess?: () => void;
  disabled?: boolean;
}

export const EvidenciaUploader: React.FC<EvidenciaUploaderProps> = ({
  idReporte,
  onSuccess,
  disabled = false,
}) => {
  const [imagen, setImagen] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const seleccionarImagen = async () => {
    if (disabled) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar imágenes');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImagen(result.assets[0].uri);
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
      setImagen(result.assets[0].uri);
    }
  };

  const subirEvidencia = async () => {
    if (!imagen || subiendo) return;

    setSubiendo(true);
    try {
      const uriParts = imagen.split('.');
      const extension = uriParts[uriParts.length - 1];
      const fileName = `evidencia_${idReporte}_${Date.now()}.${extension}`;
      const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

      await reportesService.subirEvidenciaResolucion(idReporte, imagen, fileName, mimeType);
      
      Alert.alert('Éxito', 'Evidencia de resolución subida correctamente');
      setImagen(null);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error subiendo evidencia:', error);
      Alert.alert('Error', error.message || 'No se pudo subir la evidencia');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarImagen = () => {
    setImagen(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Evidencia de resolución</Text>
      
      {!imagen ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={tomarFoto}
            disabled={disabled || subiendo}
          >
            <Text style={styles.buttonIcon}>📷</Text>
            <Text style={styles.buttonText}>Tomar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={seleccionarImagen}
            disabled={disabled || subiendo}
          >
            <Text style={styles.buttonIcon}>🖼</Text>
            <Text style={styles.buttonText}>Galería</Text>
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
              disabled={subiendo}
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

      <Text style={styles.hint}>
        La evidencia será enviada al servidor y asociada al reporte como prueba de resolución.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  cameraButton: {
    borderColor: '#253C96',
    backgroundColor: '#EFF6FF',
  },
  galleryButton: {
    borderColor: '#0057D9',
    backgroundColor: '#EFF6FF',
  },
  buttonIcon: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#253C96',
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
});