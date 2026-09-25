export type RootStackParamList = {
  Inicio: undefined;
  CrearReporte: { step?: 1 | 2 } | undefined;
  ConsultaReportes: { numeroContrato?: string } | undefined;
  ReporteDetalle: { id: number };
  // Aliases de compatibilidad
  Home?: undefined;
  MisReportes?: undefined;
};

export type RootTabParamList = {
  Inicio: undefined;
  Reportes: undefined;
  Perfil: undefined;
};