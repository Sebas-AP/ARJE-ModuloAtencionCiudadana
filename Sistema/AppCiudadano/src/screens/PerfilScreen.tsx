import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Card, CardHeader, CardContent, Button, Input, Avatar } from '../components';
import { useProfile, useNotifications, useOfflineQueue } from '../hooks';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const PerfilScreen = () => {
  const { profile, updateField, clearProfile } = useProfile();
  const { hasPermission, expoPushToken, requestPermission, registerForPushNotifications } = useNotifications();
  const { queue, isSyncing, syncQueue } = useOfflineQueue();

  const [nombre, setNombre] = useState(profile.nombreCiudadano || '');
  const [telefono, setTelefono] = useState(profile.telefonoCiudadano || '');
  const [contrato, setContrato] = useState(profile.numeroContrato || '');
  const [saving, setSaving] = useState(false);
  const [anonymo, setAnonymo] = useState(!(profile.nombreCiudadano || profile.telefonoCiudadano || profile.numeroContrato));

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateField('nombreCiudadano', nombre.trim());
      await updateField('telefonoCiudadano', telefono.trim());
      await updateField('numeroContrato', contrato.trim());
      Alert.alert('Guardado', 'Tus datos de contacto se actualizaron correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudieron guardar tus datos.');
    } finally {
      setSaving(false);
    }
  }, [nombre, telefono, contrato, updateField]);

  const handleToggleAnonymo = useCallback(async (value: boolean) => {
    setAnonymo(value);
    if (value) {
      await clearProfile();
      setNombre('');
      setTelefono('');
      setContrato('');
      Alert.alert('Modo anónimo', 'Se eliminaron tus datos de contacto. Los próximos reportes se enviarán de forma anónima.');
    }
  }, [clearProfile]);

  const handleNotifications = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      const token = await registerForPushNotifications();
      Alert.alert('Notificaciones activadas', token ? 'Recibirás avisos del estado de tus reportes.' : 'No se pudo obtener el token de notificaciones.');
    } else {
      Alert.alert('Permiso denegado', 'Las notificaciones están desactivadas.');
    }
  }, [requestPermission, registerForPushNotifications]);

  const handleSync = useCallback(async () => {
    await syncQueue();
    Alert.alert('Sincronización', queue.length > 0 ? 'Se sincronizaron los reportes pendientes.' : 'No hay reportes pendientes por sincronizar.');
  }, [syncQueue, queue.length]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar size="xl" name={profile.nombreCiudadano} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{profile.nombreCiudadano || 'Ciudadano'}</Text>
          <Text style={styles.subtitle}>
            {anonymo ? 'Modo anónimo' : (profile.telefonoCiudadano || 'Sin teléfono registrado')}
          </Text>
        </View>
      </View>

      {/* Modo anónimo */}
      <Card>
        <CardHeader
          title="Reportes anónimos"
          subtitle="Envía reportes sin compartir tus datos"
          action={
            <Switch
              value={anonymo}
              onValueChange={handleToggleAnonymo}
              trackColor={{ false: COLORS.surfaceVariant, true: COLORS.primary + '88' }}
              thumbColor={anonymo ? COLORS.primary : COLORS.textTertiary}
            />
          }
        />
        <CardContent>
          <Text style={styles.helperText}>
            {anonymo
              ? 'Actualmente tus datos de contacto no se guardan en tus reportes.'
              : 'Desliza para reportar de forma anónima.'}
          </Text>
        </CardContent>
      </Card>

      {/* Datos de contacto */}
      {!anonymo && (
        <Card>
          <CardHeader title="Datos de contacto" subtitle="Se usarán en tus reportes" />
          <CardContent style={styles.form}>
            <Input
              label="Nombre"
              value={nombre}
              onChangeText={setNombre}
              leftIcon={<MaterialCommunityIcons name="account" size={20} color={COLORS.textTertiary} />}
            />
            <Input
              label="Teléfono"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              leftIcon={<MaterialCommunityIcons name="phone" size={20} color={COLORS.textTertiary} />}
            />
            <Input
              label="Número de contrato"
              value={contrato}
              onChangeText={setContrato}
              keyboardType="numeric"
              leftIcon={<MaterialCommunityIcons name="card-account-details" size={20} color={COLORS.textTertiary} />}
            />
            <Button
              title="Guardar datos"
              onPress={handleSave}
              variant="primary"
              loading={saving}
              leftIcon={<MaterialCommunityIcons name="content-save" size={20} color={COLORS.white} />}
            />
          </CardContent>
        </Card>
      )}

      {/* Notificaciones */}
      <Card>
        <CardHeader
          title="Notificaciones"
          subtitle="Recibe avisos del estado de tus reportes"
          action={
            <View style={[styles.permissionDot, hasPermission ? styles.permissionGranted : styles.permissionDenied]} />
          }
        />
        <CardContent style={styles.form}>
          <Button
            title={hasPermission ? 'Notificaciones activadas' : 'Activar notificaciones'}
            onPress={handleNotifications}
            variant={hasPermission ? 'outline' : 'primary'}
            leftIcon={
              <MaterialCommunityIcons
                name={hasPermission ? 'bell-check' : 'bell-ring'}
                size={20}
                color={hasPermission ? COLORS.primary : COLORS.white}
              />
            }
          />
          {expoPushToken && (
            <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.tokenRow}>
              <MaterialCommunityIcons name="bell-check-outline" size={16} color={COLORS.success} />
              <Text style={styles.tokenText} numberOfLines={1}>Notificaciones activas</Text>
            </TouchableOpacity>
          )}
        </CardContent>
      </Card>

      {/* Offline */}
      <Card>
        <CardHeader
          title="Reportes pendientes"
          subtitle="Sincronización sin conexión"
          action={
            queue.length > 0 ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{queue.length}</Text>
              </View>
            ) : null
          }
        />
        <CardContent style={styles.form}>
          <Button
            title={isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            onPress={handleSync}
            variant="outline"
            loading={isSyncing}
            leftIcon={<MaterialCommunityIcons name="cloud-sync" size={20} color={COLORS.primary} />}
          />
          {queue.length > 0 && (
            <Text style={styles.helperText}>
              Hay {queue.length} reporte(s) guardados sin conexión esperando sincronizarse.
            </Text>
          )}
        </CardContent>
      </Card>

      {/* Acerca de */}
      <Card>
        <CardHeader title="Acerca de" />
        <CardContent>
          <Text style={styles.aboutText}>App Ciudadana · ARJE</Text>
          <Text style={styles.aboutSub}>Sistema de atención ciudadana para reportes de agua potable.</Text>
          <Text style={styles.versionText}>Versión 1.0.0</Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, paddingVertical: SPACING.lg },
  headerText: { flex: 1, gap: SPACING.xs },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.text },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  form: { gap: SPACING.md },
  helperText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  permissionDot: { width: 12, height: 12, borderRadius: BORDER_RADIUS.full },
  permissionGranted: { backgroundColor: COLORS.success },
  permissionDenied: { backgroundColor: COLORS.textTertiary },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tokenText: { fontSize: FONT_SIZES.sm, color: COLORS.success, flex: 1 },
  pendingBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  pendingBadgeText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.sm },
  aboutText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text },
  aboutSub: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 20 },
  versionText: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: SPACING.sm },
});