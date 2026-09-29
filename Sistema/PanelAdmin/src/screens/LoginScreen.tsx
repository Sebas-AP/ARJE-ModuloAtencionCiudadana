import React, { useState } from 'react';
import { UsuarioDTO } from '../types';
import { authService } from '../services/authService';
import arjeLogoWhite from '../assets/arje-logo-white.png';
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: UsuarioDTO) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.trim() || !password.trim()) {
      setError('Por favor ingrese su usuario o correo y contraseña');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await authService.login({
        usuario: correo.trim(),
        password: password.trim(),
      });
      onLoginSuccess(res.usuario);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setCorreo('admin@arje.gob.mx');
    setPassword('admin');
    setLoading(true);
    authService
      .login({ usuario: 'admin', password: 'admin' })
      .then((res) => onLoginSuccess(res.usuario))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* LADO IZQUIERDO: Fondo Royal Blue #253C96 con el logo oficial ARJE en blanco de Figma */}
      <div
        style={{
          flex: 1.1,
          backgroundColor: '#253C96',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          overflow: 'hidden',
        }}
      >
        {/* Logo ARJE Blanco Oficial centrado fielmente a Figma Login - opcion 1 */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '520px',
          }}
        >
          <img
            src={arjeLogoWhite}
            alt="ARJE Agua Potable"
            style={{
              width: '420px',
              maxWidth: '90%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
            }}
          />
        </div>
      </div>

      {/* LADO DERECHO: Formulario Limpio de Login (Figma: INICIO DE SESIÓN, Usuario, Contraseña, Iniciar sesión) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Título en Mayúsculas Oficial de Figma */}
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#19244E',
              marginBottom: '32px',
              letterSpacing: '0.02em',
            }}
          >
            INICIO DE SESIÓN
          </h1>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                marginBottom: '20px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#DC2626',
                fontSize: '13.5px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Campo: Usuario */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#19244E',
                  marginBottom: '8px',
                }}
              >
                Usuario
              </label>
              <input
                type="text"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ingrese su usuario"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14.5px',
                  color: '#19244E',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0057D9';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              />
            </div>

            {/* Campo: Contraseña */}
            <div style={{ marginBottom: '28px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#19244E',
                  marginBottom: '8px',
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14.5px',
                  color: '#19244E',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0057D9';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
              />
            </div>

            {/* Botón: Iniciar sesión (Azul oficial de Figma #0057D9 con icono de flecha) */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 20px',
                backgroundColor: '#0057D9',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'background-color 0.15s ease',
                boxShadow: '0 2px 6px rgba(0, 87, 217, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0045B0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0057D9';
              }}
            >
              <span>{loading ? 'Accediendo...' : 'Iniciar sesión'}</span>
              <ArrowRight size={18} />
            </button>

            {/* Acceso demo rápido */}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleDemoLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0057D9',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Sparkles size={14} />
                <span>Acceder como Administrador Demo</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
