#!/usr/bin/env python3
"""
ARJE API Testing Agent
Script para probar todos los endpoints de la API y verificar la inserción de datos en la BD.
"""

import requests
import json
import subprocess
import shutil
import sys
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class TestResult:
    endpoint: str
    method: str
    success: bool
    status_code: int
    response: Any
    error: Optional[str] = None


class ARJEApiTester:
    def __init__(self, base_url: str = "http://localhost:5170"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.results: List[TestResult] = []

    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.pop('headers', {})
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        headers.setdefault('Content-Type', 'application/json')
        return self.session.request(method, url, headers=headers, **kwargs)

    def _record(self, endpoint: str, method: str, response: requests.Response, error: str = None) -> TestResult:
        try:
            response_json = response.json() if response.content else None
        except requests.exceptions.JSONDecodeError:
            response_json = None
        result = TestResult(
            endpoint=endpoint,
            method=method,
            success=response.status_code < 400,
            status_code=response.status_code,
            response=response_json,
            error=error
        )
        self.results.append(result)
        status = "✓" if result.success else "✗"
        print(f"  {status} {method} {endpoint} -> {response.status_code}")
        if not result.success and result.response:
            print(f"    Error: {result.response}")
        return result

    def test_health(self) -> bool:
        """Verifica que la API esté corriendo"""
        try:
            resp = self._request('GET', '/api/cuadrillas')
            return resp.status_code == 200
        except Exception as e:
            print(f"API no disponible: {e}")
            return False

    def test_cuadrillas_crud(self) -> Dict[str, Any]:
        print("\n=== Testing Cuadrillas CRUD ===")
        created_ids = []

        # CREATE
        for i, data in enumerate([
            {"nombre": "Cuadrilla Test Alpha", "integrantes": "Test1, Test2", "usuarioApp": f"test_alpha_{int(time.time())}", "password": "Test123!"},
            {"nombre": "Cuadrilla Test Beta", "integrantes": "Test3, Test4", "usuarioApp": f"test_beta_{int(time.time())}", "password": "Test123!"},
        ]):
            resp = self._request('POST', '/api/cuadrillas', json=data)
            result = self._record('/api/cuadrillas', 'POST', resp)
            if result.success:
                created_ids.append(result.response['id'])

        # GET ALL
        resp = self._request('GET', '/api/cuadrillas')
        self._record('/api/cuadrillas', 'GET', resp)

        # GET DISPONIBLES
        resp = self._request('GET', '/api/cuadrillas/disponibles')
        self._record('/api/cuadrillas/disponibles', 'GET', resp)

        # GET BY ID
        if created_ids:
            resp = self._request('GET', f'/api/cuadrillas/{created_ids[0]}')
            self._record(f'/api/cuadrillas/{created_ids[0]}', 'GET', resp)

        # UPDATE DISPONIBILIDAD
        if created_ids:
            resp = self._request('PUT', f'/api/cuadrillas/{created_ids[0]}/disponibilidad', json={"estatusDisponibilidad": 2})
            self._record(f'/api/cuadrillas/{created_ids[0]}/disponibilidad', 'PUT', resp)

        return {"created_ids": created_ids}

    def test_reportes_crud(self) -> Dict[str, Any]:
        print("\n=== Testing Reportes CRUD ===")
        created_ids = []

        # CREATE
        for i, data in enumerate([
            {"tipoProblema": 1, "descripcion": "Fuga test en calle 1", "latitud": 19.4326, "longitud": -99.1332, "numeroContrato": "T001", "nombreCiudadano": "Test User 1", "telefonoCiudadano": "5550000001"},
            {"tipoProblema": 2, "descripcion": "Sin agua test colonia 2", "latitud": 19.4327, "longitud": -99.1333, "numeroContrato": "T002", "nombreCiudadano": "Test User 2", "telefonoCiudadano": "5550000002"},
            {"tipoProblema": 3, "descripcion": "Instalación rota test 3", "latitud": 19.4328, "longitud": -99.1334, "numeroContrato": "T003", "nombreCiudadano": "Test User 3", "telefonoCiudadano": "5550000003"},
        ]):
            resp = self._request('POST', '/api/reportes', json=data)
            result = self._record('/api/reportes', 'POST', resp)
            if result.success:
                created_ids.append(result.response['id'])

        # GET ALL
        resp = self._request('GET', '/api/reportes')
        self._record('/api/reportes', 'GET', resp)

        # GET WITH FILTERS
        resp = self._request('GET', '/api/reportes?estatus=1&pagina=1&registrosPorPagina=10')
        self._record('/api/reportes?estatus=1', 'GET', resp)

        # GET LANDING
        resp = self._request('GET', '/api/reportes/landing')
        self._record('/api/reportes/landing', 'GET', resp)

        # GET BY ID
        if created_ids:
            resp = self._request('GET', f'/api/reportes/{created_ids[0]}')
            self._record(f'/api/reportes/{created_ids[0]}', 'GET', resp)

        # UPDATE ESTATUS
        if created_ids:
            # First need to assign cuadrilla for status change to work properly
            # Try updating estatus to Asignado (2)
            resp = self._request('PUT', f'/api/reportes/{created_ids[0]}/estatus', json=2)
            self._record(f'/api/reportes/{created_ids[0]}/estatus', 'PUT', resp)

        return {"created_ids": created_ids}

    def test_ubicaciones(self, reporte_ids: List[int], cuadrilla_ids: List[int]):
        print("\n=== Testing Seguimientos de Ubicación ===")

        if not reporte_ids or not cuadrilla_ids:
            print("  Skipping - no reporte/cuadrilla IDs available")
            return

        # Need to assign cuadrilla to reporte first (via direct DB update for testing)
        # For now, test with a reporte that has cuadrilla assigned
        # We'll test the validation error
        resp = self._request('POST', f'/api/reportes/{reporte_ids[0]}/ubicaciones', json={
            "ubicaciones": [
                {"latitud": 19.4326, "longitud": -99.1332},
                {"latitud": 19.4327, "longitud": -99.1333}
            ]
        })
        self._record(f'/api/reportes/{reporte_ids[0]}/ubicaciones', 'POST', resp)

        # GET ubicaciones
        resp = self._request('GET', f'/api/reportes/{reporte_ids[0]}/ubicaciones')
        self._record(f'/api/reportes/{reporte_ids[0]}/ubicaciones', 'GET', resp)

        # GET ultima ubicacion
        resp = self._request('GET', f'/api/reportes/{reporte_ids[0]}/ubicaciones/ultima')
        self._record(f'/api/reportes/{reporte_ids[0]}/ubicaciones/ultima', 'GET', resp)

    def test_evidencias(self, reporte_ids: List[int]):
        print("\n=== Testing Evidencias ===")
        if not reporte_ids:
            print("  Skipping - no reporte IDs available")
            return

        # GET evidencias (empty initially)
        resp = self._request('GET', f'/api/reportes/{reporte_ids[0]}/evidencias')
        self._record(f'/api/reportes/{reporte_ids[0]}/evidencias', 'GET', resp)

        # Note: POST evidencias requires multipart/form-data with file upload
        # Skipping file upload test for simplicity

    def test_usuarios_auth(self):
        print("\n=== Testing Usuarios Auth ===")

        # LOGIN admin
        resp = self._request('POST', '/api/usuarios/login', json={"usuario": "admin", "password": "Admin123!"})
        result = self._record('/api/usuarios/login', 'POST', resp)
        if result.success and result.response:
            self.token = result.response.get('token')
            print(f"  Token obtained: {self.token[:30]}...")

        # REGISTRAR new admin
        resp = self._request('POST', '/api/usuarios/registrar', json={"usuario": f"test_admin_{int(time.time())}", "password": "Test123!"})
        self._record('/api/usuarios/registrar', 'POST', resp)

        # LOGIN with new user
        if self.token:
            # Test GET usuario
            resp = self._request('GET', '/api/usuarios/1')
            self._record('/api/usuarios/1', 'GET', resp)

    def verify_database(self):
        """Verifica los datos directamente en SQL Server"""
        print("\n=== Verificando Base de Datos SQL Server ===")
        sqlcmd = shutil.which("sqlcmd")
        if not sqlcmd:
            print("  Error: sqlcmd no encontrado en PATH")
            return

        cmd = [
            sqlcmd, "-S", "localhost,1433", "-U", "UsuBD", "-P", "root1234",
            "-C", "-d", "ARJE_AguaPotable", "-l", "5", "-t", "15",
            "-Q", "SET NOCOUNT ON; SELECT name, SCHEMA_NAME(schema_id) AS s FROM sys.tables ORDER BY name"
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            print(f"  Tablas ({proc.returncode}):")
            print(proc.stdout.strip())
            if proc.stderr.strip():
                print(f"  (stderr) {proc.stderr.strip()}")

            for table in ['Cuadrillas', 'Reportes', 'Evidencias', 'SeguimientosUbicacion', 'UsuariosSistema']:
                q = f"SELECT COUNT(*) FROM [{table}]"
                proc = subprocess.run(
                    [sqlcmd, "-S", "localhost,1433", "-U", "UsuBD", "-P", "root1234",
                     "-C", "-d", "ARJE_AguaPotable", "-l", "5", "-t", "15", "-Q",
                     f"SET NOCOUNT ON; {q}"],
                    capture_output=True, text=True, timeout=30
                )
                lines = [l.strip() for l in proc.stdout.strip().splitlines() if l.strip().isdigit()]
                count = lines[0] if lines else "?"
                print(f"  {table}: {count} registros")
        except Exception as e:
            print(f"  Error verificando BD: {e}")

    def print_summary(self):
        print("\n" + "="*60)
        print("RESUMEN DE PRUEBAS")
        print("="*60)
        total = len(self.results)
        passed = sum(1 for r in self.results if r.success)
        failed = total - passed

        print(f"Total: {total} | Exitosas: {passed} | Fallidas: {failed}")

        if failed > 0:
            print("\nPruebas fallidas:")
            for r in self.results:
                if not r.success:
                    print(f"  ✗ {r.method} {r.endpoint} -> {r.status_code}")
                    if r.response:
                        print(f"    {r.response}")

        return failed == 0


def run_tests(base_url: str = "http://localhost:5170") -> bool:
    """Ejecuta todas las pruebas y retorna True si todas pasan"""
    tester = ARJEApiTester(base_url)

    print(f"Conectando a API en {base_url}...")

    if not tester.test_health():
        print("ERROR: API no está disponible. Asegúrate de que esté corriendo con 'dotnet run'")
        return False

    print("API disponible. Iniciando pruebas...")

    # Run all tests
    cuadrillas_result = tester.test_cuadrillas_crud()
    reportes_result = tester.test_reportes_crud()
    tester.test_ubicaciones(reportes_result.get('created_ids', []), cuadrillas_result.get('created_ids', []))
    tester.test_evidencias(reportes_result.get('created_ids', []))
    tester.test_usuarios_auth()

    # Verify database
    tester.verify_database()

    # Print summary
    return tester.print_summary()


def start_api_background():
    """Inicia la API en background si no está corriendo"""
    import subprocess
    import os

    api_dir = "/home/sebastian/Proyectos/ARJE-ModuloAtencionCiudadana/Sistema/API"
    log_file = "/tmp/arje_api_test.log"

    # Check if already running
    try:
        resp = requests.get("http://localhost:5170/api/cuadrillas", timeout=2)
        if resp.status_code == 200:
            print("API ya está corriendo en localhost:5170")
            return None
    except:
        pass

    print("Iniciando API en background...")
    proc = subprocess.Popen(
        ["dotnet", "run", "--urls", "http://localhost:5170"],
        cwd=api_dir,
        stdout=open(log_file, 'w'),
        stderr=subprocess.STDOUT,
        env={**os.environ, "PATH": "/home/sebastian/.dotnet:" + os.environ.get("PATH", "")}
    )

    # Wait for API to start
    for i in range(30):
        try:
            resp = requests.get("http://localhost:5170/api/cuadrillas", timeout=1)
            if resp.status_code == 200:
                print(f"API iniciada (PID: {proc.pid})")
                return proc
        except:
            time.sleep(1)

    print("ERROR: API no inició correctamente")
    proc.terminate()
    return None


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="ARJE API Testing Agent")
    parser.add_argument("--url", default="http://localhost:5170", help="Base URL de la API")
    parser.add_argument("--start-api", action="store_true", help="Iniciar API automáticamente si no está corriendo")
    args = parser.parse_args()

    api_proc = None
    if args.start_api:
        api_proc = start_api_background()
        if not api_proc:
            sys.exit(1)

    try:
        success = run_tests(args.url)
        sys.exit(0 if success else 1)
    finally:
        if api_proc:
            api_proc.terminate()
            print("\nAPI detenida.")