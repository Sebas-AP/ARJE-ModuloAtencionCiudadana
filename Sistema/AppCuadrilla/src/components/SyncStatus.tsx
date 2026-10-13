import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface SyncStatusProps {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  requiresAuthentication: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  isOnline, pendingCount, failedCount, requiresAuthentication, isSyncing, isLoading, error, onRetry,
}) => {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.status} accessibilityLiveRegion="polite">
        {isLoading ? 'Consultando sincronización…' : `${isOnline ? 'En línea' : 'Sin conexión'} · ${pendingCount} pendiente(s)`}
      </Text>
      {failedCount > 0 && <Text style={styles.warning}>{failedCount} operación(es) rechazada(s). Revisa el reporte; no se reenvían automáticamente.</Text>}
      {error && <Text style={styles.warning}>{error}</Text>}
      {requiresAuthentication && <Text style={styles.warning}>Sesión vencida. Tus operaciones siguen guardadas.</Text>}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: isSyncing || isLoading }}
        disabled={isSyncing || isLoading}
        style={styles.button}
        onPress={requiresAuthentication ? () => router.push('/(auth)/login') : onRetry}
      >
        <Text style={styles.buttonText}>{requiresAuthentication ? 'Iniciar sesión' : isSyncing ? 'Sincronizando…' : 'Reintentar sincronización'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12, gap: 6, backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderColor: '#BFDBFE' },
  status: { fontSize: 13, fontWeight: '700', color: '#19244E' },
  warning: { fontSize: 12, color: '#9A3412' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  buttonText: { color: '#253C96', fontSize: 13, fontWeight: '600' },
});
