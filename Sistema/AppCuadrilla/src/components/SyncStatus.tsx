import React from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import type { TerminalOperationDetail } from '../services/syncRecoveryPolicy';
import { APP_THEME } from '../theme/appTheme';

interface SyncStatusProps {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  requiresAuthentication: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  error: string | null;
  terminalOperations: TerminalOperationDetail[];
  recoverableCount: number;
  onRetry: () => void;
  onDiscard: (operationId: string) => Promise<void>;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  isOnline, pendingCount, failedCount, requiresAuthentication, isSyncing, isLoading, error,
  terminalOperations, recoverableCount, onRetry, onDiscard,
}) => {
  const router = useRouter();
  const confirmDiscard = (operation: TerminalOperationDetail) => {
    Alert.alert(
      'Descartar operación rechazada',
      `${operation.description}: ${operation.error}\n\nEsta acción eliminará la operación guardada del dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => { void onDiscard(operation.id); } },
      ],
    );
  };
  return (
    <View style={styles.container}>
      <Text style={styles.status} accessibilityLiveRegion="polite">
        {isLoading ? 'Consultando sincronización…' : `${isOnline ? 'En línea' : 'Sin conexión'} · ${pendingCount} pendiente(s)`}
      </Text>
      {failedCount > 0 && <Text style={styles.warning}>{failedCount} operación(es) rechazada(s). Revisa el reporte; no se reenvían automáticamente.</Text>}
      {terminalOperations.map((operation) => (
        <View key={operation.id} style={styles.rejection}>
          <Text style={styles.rejectionTitle}>{operation.description}</Text>
          <Text style={styles.warning}>{operation.error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.discardButton}
            onPress={() => confirmDiscard(operation)}
          >
            <Text style={styles.discardButtonText}>Descartar operación</Text>
          </TouchableOpacity>
        </View>
      ))}
      {error && <Text style={styles.warning}>{error}</Text>}
      {requiresAuthentication && <Text style={styles.warning}>Sesión vencida. Tus operaciones siguen guardadas.</Text>}
      {(requiresAuthentication || recoverableCount > 0) && <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: isSyncing || isLoading }}
        disabled={isSyncing || isLoading}
        style={styles.button}
        onPress={requiresAuthentication ? () => router.push('/(auth)/login') : onRetry}
      >
        <Text style={styles.buttonText}>{requiresAuthentication ? 'Iniciar sesión' : isSyncing ? 'Sincronizando…' : `Reintentar ${recoverableCount} operación(es)`}</Text>
      </TouchableOpacity>
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10, gap: 6, backgroundColor: '#E8F1FF', borderBottomWidth: 1, borderColor: APP_THEME.colors.border },
  status: { fontSize: 13, fontWeight: '700', color: APP_THEME.colors.royal },
  warning: { fontSize: 12, color: '#9A3412' },
  rejection: { gap: 3, paddingTop: 6, borderTopWidth: 1, borderColor: '#FED7AA' },
  rejectionTitle: { fontSize: 12, fontWeight: '700', color: '#7C2D12' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  buttonText: { color: '#253C96', fontSize: 13, fontWeight: '600' },
  discardButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 },
  discardButtonText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
});
