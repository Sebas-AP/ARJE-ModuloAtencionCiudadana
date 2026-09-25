import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants';
import { useLocation } from '../hooks/useLocation';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { reportesService, clasificacionService } from '../services/reportes';
import { TipoProblema, TipoEvidencia } from '../types';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EvidenciaLocal {
  uri: string;
  tipo: TipoEvidencia;
}

export const CrearReporteScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const speech = useSpeechRecognition();
  const { coordinates, requestPermission, getCurrentLocation } = useLocation();
  const { addToQueue } = useOfflineQueue();

  // Paso actual (1 o 2)
  const [paso, setPaso] = useState<1 | 2>(1);

  // Datos del Paso 1
  const [numeroContrato, setNumeroContrato] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');

  // Datos del Paso 2
  const [descripcion, setDescripcion] = useState('');
  const [evidencias, setEvidencias] = useState<EvidenciaLocal[]>([]);

  // Modales
  const [modalAudioVisible, setModalAudioVisible] = useState(false);
  const [modalExitoVisible, setModalExitoVisible] = useState(false);

  // Estados de proceso
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAudioRecording, setIsAudioRecording] = useState(false);

  // Timer para grabación de audio
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Obtener ubicación al montar
  useEffect(() => {
    (async () => {
      try {
        await requestPermission();
        await getCurrentLocation();
      } catch (err) {
        console.warn('No se pudo obtener ubicación inicial', err);
      }
    })();
  }, []);

  // Manejo del temporizador de audio
  useEffect(() => {
    if (isAudioRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAudioRecording]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Acciones de Paso 1 -> Paso 2
  const handleNextStep = () => {
    setPaso(2);
  };

  // Iniciar / detener grabación en modal
  const handleToggleAudioRecording = async () => {
    if (!isAudioRecording) {
      setIsAudioRecording(true);
      setRecordingSeconds(0);
      try {
        await speech.startListening();
      } catch (e) {
        console.warn('Error al iniciar speech recognition', e);
      }
    } else {
      setIsAudioRecording(false);
      try {
        await speech.stopListening();
      } catch (e) {
        console.warn('Error al detener speech recognition', e);
      }
    }
  };

  // Confirmar audio y agregarlo a la descripción
  const handleSaveAudio = () => {
    setIsAudioRecording(false);
    if (speech.isListening) {
      speech.stopListening();
    }
    if (speech.transcript) {
      const nuevoTexto = descripcion
        ? `${descripcion} ${speech.transcript}`
        : speech.transcript;
      setDescripcion(nuevoTexto);
    }
    setModalAudioVisible(false);
  };

  // Selector de archivos / imágenes
  const handlePickAttachment = async () => {
    Alert.alert(
      'Adjuntar evidencia',
      'Selecciona el origen del archivo',
      [
        {
          text: 'Cámara',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              allowsEditing: true,
            });
            if (!res.canceled && res.assets[0]) {
              setEvidencias((prev) => [
                ...prev,
                { uri: res.assets[0].uri, tipo: TipoEvidencia.Inicial },
              ]);
            }
          },
        },
        {
          text: 'Galería de fotos',
          onPress: async () => {
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              allowsEditing: true,
            });
            if (!res.canceled && res.assets[0]) {
              setEvidencias((prev) => [
                ...prev,
                { uri: res.assets[0].uri, tipo: TipoEvidencia.Inicial },
              ]);
            }
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleRemoveEvidencia = (uri: string) => {
    setEvidencias((prev) => prev.filter((e) => e.uri !== uri));
  };

  // Enviar reporte final
  const handleSubmitReport = async () => {
    if (!descripcion.trim()) {
      Alert.alert('Descripción requerida', 'Por favor describe el incidente antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Clasificación automática mediante API (con fallback a keywords)
      let tipoFinal: TipoProblema = TipoProblema.Fuga;
      try {
        const clasif = await clasificacionService.classify(descripcion.trim());
        if (clasif?.tipoProblema) {
          tipoFinal = clasif.tipoProblema;
        }
      } catch (err) {
        console.warn('Fallback clasificación', err);
      }

      const coords = coordinates || {
        latitud: 21.8853,
        longitud: -102.2916,
      };

      const payload = {
        tipoProblema: tipoFinal,
        descripcion: descripcion.trim(),
        latitud: coords.latitud,
        longitud: coords.longitud,
        numeroContrato: numeroContrato.trim() || undefined,
        nombreCiudadano: nombre.trim() || undefined,
        telefonoCiudadano: telefono.trim() || undefined,
      };

      try {
        const reporteCreado = await reportesService.create(payload);
        // Subir evidencias si existen
        for (const ev of evidencias) {
          try {
            await reportesService.uploadEvidencia(
              reporteCreado.id,
              {
                uri: ev.uri,
                name: `evidencia_${Date.now()}.jpg`,
                type: 'image/jpeg',
              },
              ev.tipo
            );
          } catch (e) {
            console.warn('Error subiendo evidencia', e);
          }
        }
      } catch (apiError) {
        // Encolar offline
        await addToQueue(payload, evidencias);
      }

      // Mostrar modal de éxito de Figma
      setModalExitoVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error al procesar el reporte. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSuccess = () => {
    setModalExitoVisible(false);
    // Volver a Inicio o consultar
    navigation.navigate('Inicio');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.electricBlue} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.mainContainer}>
          {/* Cabecera Azul Oficial de Figma */}
          <View style={styles.headerArea}>
            {/* Botón de retroceso opcional en paso 2 */}
            {paso === 2 && (
              <TouchableOpacity
                style={styles.headerBackButton}
                onPress={() => setPaso(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.white} />
              </TouchableOpacity>
            )}

            {/* Píldora del paso */}
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Paso {paso} de 2</Text>
            </View>

            {/* Título de la cabecera */}
            <Text style={styles.headerTitle}>Nuevo reporte</Text>

            {/* Subtítulo según el paso */}
            <Text style={styles.headerSubtitle}>
              {paso === 1
                ? 'Completa los datos del reporte para continuar con el siguiente paso.'
                : 'Completa la descripción y adjunta archivos o grabaciones para que podamos revisar tu caso.'}
            </Text>
          </View>

          {/* Tarjeta / Hoja Blanca Redondeada Inferior */}
          <View style={styles.sheetContainer}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {paso === 1 ? (
                /* =================== PASO 1 DE 2 =================== */
                <View style={styles.stepContent}>
                  {/* Campo: Número de contrato */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Número de contrato</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputIconContainer}>
                        <MaterialCommunityIcons name="pound" size={20} color={COLORS.primary} />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={numeroContrato}
                        onChangeText={setNumeroContrato}
                        placeholder="ej. 123456"
                        placeholderTextColor={COLORS.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Campo: Nombre */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Nombre</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="person-outline" size={19} color={COLORS.primary} />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder="opcional"
                        placeholderTextColor={COLORS.textTertiary}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Campo: Teléfono */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Teléfono</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="call-outline" size={19} color={COLORS.primary} />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={telefono}
                        onChangeText={setTelefono}
                        placeholder="opcional"
                        placeholderTextColor={COLORS.textTertiary}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.bottomActions}>
                    {/* Botón Siguiente ➔ */}
                    <TouchableOpacity
                      style={styles.nextButton}
                      onPress={handleNextStep}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.nextButtonText}>Siguiente</Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={styles.buttonArrow} />
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>
                      Tus datos se usarán solo para este reporte.
                    </Text>
                  </View>
                </View>
              ) : (
                /* =================== PASO 2 DE 2 =================== */
                <View style={styles.stepContent}>
                  {/* Campo: Descripción */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Descripción</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                      <TextInput
                        style={styles.textAreaInput}
                        value={descripcion}
                        onChangeText={setDescripcion}
                        placeholder="Describe el incidente, el lugar y cualquier detalle relevante."
                        placeholderTextColor={COLORS.textTertiary}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>

                  {/* Sección: Adjuntos */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Adjuntos</Text>
                    <View style={styles.adjuntosRow}>
                      {/* Tarjeta Adjuntar archivo */}
                      <TouchableOpacity
                        style={styles.adjuntoCard}
                        onPress={handlePickAttachment}
                        activeOpacity={0.78}
                      >
                        <View style={styles.adjuntoCircle}>
                          <Ionicons name="attach" size={24} color={COLORS.white} />
                        </View>
                        <Text style={styles.adjuntoText}>Adjuntar archivo</Text>
                      </TouchableOpacity>

                      {/* Tarjeta Grabar audio */}
                      <TouchableOpacity
                        style={styles.adjuntoCard}
                        onPress={() => {
                          setModalAudioVisible(true);
                          setIsAudioRecording(false);
                          setRecordingSeconds(0);
                        }}
                        activeOpacity={0.78}
                      >
                        <View style={styles.adjuntoCircle}>
                          <Ionicons name="mic" size={22} color={COLORS.white} />
                        </View>
                        <Text style={styles.adjuntoText}>Grabar audio</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Previsualización de archivos adjuntos */}
                    {evidencias.length > 0 && (
                      <View style={styles.previewGrid}>
                        {evidencias.map((ev, index) => (
                          <View key={ev.uri + index} style={styles.previewItem}>
                            <Image source={{ uri: ev.uri }} style={styles.previewImage} />
                            <TouchableOpacity
                              style={styles.previewDelete}
                              onPress={() => handleRemoveEvidencia(ev.uri)}
                            >
                              <Ionicons name="close" size={14} color={COLORS.white} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Texto de aviso */}
                  <Text style={styles.noticeText}>
                    Revisaremos tu reporte y te responderemos lo antes posible.
                  </Text>

                  {/* Botón Enviar reporte */}
                  <TouchableOpacity
                    style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmitReport}
                    disabled={isSubmitting}
                    activeOpacity={0.88}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.nextButtonText}>Enviar reporte</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* ================= MODAL CREAR REPORTES 4: GRABACIÓN DE AUDIO ================= */}
        <Modal
          visible={modalAudioVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalAudioVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.audioModalCard}>
              {/* Encabezado del modal de audio */}
              <View style={styles.audioModalHeader}>
                <View style={styles.audioStatusLeft}>
                  <View style={styles.cyanDot} />
                  <Text style={styles.audioActiveText}>Grabación activa</Text>
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.redDot} />
                  <Text style={styles.liveBadgeText}>En vivo</Text>
                </View>
              </View>

              {/* Tarjeta Azul de Grabación con Botón Stop */}
              <View style={styles.recordingBox}>
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={handleToggleAudioRecording}
                  activeOpacity={0.8}
                >
                  {isAudioRecording ? (
                    <View style={styles.stopSquare} />
                  ) : (
                    <Ionicons name="mic" size={28} color={COLORS.white} />
                  )}
                </TouchableOpacity>

                <Text style={styles.recordingTitle}>
                  {isAudioRecording ? 'Grabando . . .' : 'Toca para iniciar'}
                </Text>
                <Text style={styles.recordingSubtitle}>
                  {isAudioRecording
                    ? 'Toca el botón para parar la grabación'
                    : 'Toca el micrófono para comenzar a dictar'}
                </Text>
              </View>

              {/* Fila de estatus inferior: Audio activo y temporizador */}
              <View style={styles.audioMetaRow}>
                <View style={styles.audioActiveRow}>
                  <Ionicons name="mic-outline" size={18} color={COLORS.cyan} />
                  <Text style={styles.audioActiveRowText}>Audio activo</Text>
                </View>
                <Text style={styles.timerText}>{formatTimer(recordingSeconds)}</Text>
              </View>

              {/* Transcripción en tiempo real si existe */}
              {speech.transcript ? (
                <Text style={styles.transcriptPreview} numberOfLines={2}>
                  "{speech.transcript}"
                </Text>
              ) : null}

              {/* Botón Siguiente ➔ para guardar el audio */}
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleSaveAudio}
                activeOpacity={0.88}
              >
                <Text style={styles.nextButtonText}>Siguiente</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={styles.buttonArrow} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL CREAR REPORTES 3: ÉXITO ================= */}
        <Modal
          visible={modalExitoVisible}
          transparent
          animationType="fade"
          onRequestClose={handleFinishSuccess}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModalCard}>
              {/* Gran círculo de confirmación */}
              <View style={styles.successOuterCircle}>
                <View style={styles.successInnerCircle}>
                  <Ionicons name="checkmark" size={38} color={COLORS.white} />
                </View>
              </View>

              {/* Píldora ENVIADO CON ÉXITO */}
              <View style={styles.successBadge}>
                <Text style={styles.successBadgeText}>ENVIADO CON ÉXITO</Text>
              </View>

              {/* Título de agradecimiento */}
              <Text style={styles.successTitle}>Gracias por su reporte</Text>

              {/* Mensaje */}
              <Text style={styles.successMessage}>
                En breve se asignará una cuadrilla para atender su solicitud
              </Text>

              {/* Divisor */}
              <View style={styles.successDivider} />

              {/* Botón Finalizar ➔ */}
              <TouchableOpacity
                style={styles.finishButton}
                onPress={handleFinishSuccess}
                activeOpacity={0.88}
              >
                <Text style={styles.finishButtonText}>Finalizar</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={styles.buttonArrow} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.electricBlue,
  },
  keyboardContainer: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.electricBlue,
  },
  headerArea: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    position: 'relative',
  },
  headerBackButton: {
    position: 'absolute',
    left: SPACING.lg,
    top: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  stepBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  stepContent: {
    gap: SPACING.lg,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cyan, // Borde cyan de Figma
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  inputIconContainer: {
    marginRight: SPACING.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    height: '100%',
  },
  textAreaWrapper: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  textAreaInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    width: '100%',
    height: '100%',
  },
  adjuntosRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  adjuntoCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.cyan,
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBg,
    gap: SPACING.sm,
  },
  adjuntoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjuntoText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    textAlign: 'center',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  previewItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewDelete: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.actionBlue, // #017EF3
    width: '100%',
    height: 52,
    borderRadius: 16,
    shadowColor: COLORS.actionBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  buttonArrow: {
    marginLeft: SPACING.xs,
  },
  footerNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  noticeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },

  // Modal Audio (Crear reportes 4)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  audioModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.cardBg,
    borderRadius: 28,
    padding: SPACING.lg,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  audioModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cyanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
  },
  audioActiveText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.cyanDark,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
  },
  recordingBox: {
    backgroundColor: COLORS.primary, // #015BE0
    borderRadius: 20,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  stopSquare: {
    width: 18,
    height: 18,
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  recordingTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  recordingSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
  audioMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  audioActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audioActiveRowText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.cyanDark,
    fontWeight: FONT_WEIGHTS.medium,
  },
  timerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  transcriptPreview: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: SPACING.xs,
  },

  // Modal Éxito (Crear reportes 3)
  successModalCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: COLORS.cardBg,
    borderRadius: 28,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  successOuterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  successInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    borderWidth: 1,
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanLight,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: 4,
  },
  successBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: SPACING.sm,
  },
  successDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
    marginVertical: SPACING.xs,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary, // #015BE0
    width: '100%',
    height: 50,
    borderRadius: 16,
    marginTop: 4,
  },
  finishButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});