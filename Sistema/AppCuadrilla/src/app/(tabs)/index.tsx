import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';
import { reportesService } from '../../services/reportesService';
import { ReporteCard } from '../../components/ReporteCard';
import { ReporteDTO } from '../../types';

export default function ReportesScreen() {
  const router = useRouter();
  const [reportes, setReportes] = useState<ReporteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [idCuadrilla, setIdCuadrilla] = useState<number | null>(null);

  const cargarReportes = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user?.idCuadrilla) {
        Alert.alert('Error', 'No se encontró la cuadrilla asignada');
        return;
      }

      setIdCuadrilla(user.idCuadrilla);
      const data = await reportesService.getAsignados(user.idCuadrilla);
      setReportes(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarReportes();

    const interval = setInterval(cargarReportes, 30_000);
    return () => clearInterval(interval);
  }, [cargarReportes]);

  const handleRefresh = () => {
    setRefreshing(true);
    cargarReportes();
  };

  const renderItem = ({ item }: { item: ReporteDTO }) => (
    <ReporteCard
      reporte={item}
      onPress={() => router.push(`/reporte/${item.id}`)}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#253C96" />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reportes}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#253C96']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin reportes asignados</Text>
            <Text style={styles.emptyText}>
              Cuando se te asigne un reporte, aparecerá aquí automáticamente.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#19244E',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});