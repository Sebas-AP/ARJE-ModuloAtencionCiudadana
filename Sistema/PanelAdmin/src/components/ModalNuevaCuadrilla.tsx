import React, { useState } from 'react';
import { X, Users, Truck, Phone, Lock, User, PlusCircle } from 'lucide-react';
import { CuadrillaCreacionDTO, EstatusCuadrilla } from '../types';

interface ModalNuevaCuadrillaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CuadrillaCreacionDTO & { telefonoContacto?: string; vehiculo?: string }) => Promise<void>;
}

export const ModalNuevaCuadrilla: React.FC<ModalNuevaCuadrillaProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [nombre, setNombre] = useState('');
  const [integrantes, setIntegrantes] = useState('');
  const [usuarioApp, setUsuarioApp] = useState('');
  const [password, setPassword] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !usuarioApp.trim() || !password.trim()) {
      setError('Nombre, usuario de app y contraseña son campos requeridos.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        nombre: nombre.trim(),
        integrantes: integrantes.trim(),
        usuarioApp: usuarioApp.trim(),
        password: password.trim(),
        estatusDisponibilidad: EstatusCuadrilla.Disponible,
        vehiculo: vehiculo.trim() || 'Camioneta Utilitaria',
        telefonoContacto: telefonoContacto.trim() || '449-000-0000',
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar cuadrilla');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#253C96',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={22} style={{ color: '#C4E7E5' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                Registrar Nueva Cuadrilla
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#E0F2FE' }}>
                Catálogo de Operadores en Campo (RF-10)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              Nombre / Identificador de la Cuadrilla *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cuadrilla Nororiente, Cuadrilla Vactor #02"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              Miembros de la cuadrilla (Líder y técnicos)
            </label>
            <input
              type="text"
              value={integrantes}
              onChange={(e) => setIntegrantes(e.target.value)}
              placeholder="Ej. Luis Herrera (Líder), David Torres, Ramiro Solís"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                <User size={14} style={{ color: '#253C96' }} /> Usuario App Móvil *
              </label>
              <input
                type="text"
                required
                value={usuarioApp}
                onChange={(e) => setUsuarioApp(e.target.value)}
                placeholder="cuadrilla.nororiente"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                <Lock size={14} style={{ color: '#253C96' }} /> Contraseña *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                <Truck size={14} style={{ color: '#253C96' }} /> Vehículo Asignado
              </label>
              <input
                type="text"
                value={vehiculo}
                onChange={(e) => setVehiculo(e.target.value)}
                placeholder="Chevrolet Silverado #09"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
                <Phone size={14} style={{ color: '#253C96' }} /> Teléfono de Contacto
              </label>
              <input
                type="text"
                value={telefonoContacto}
                onChange={(e) => setTelefonoContacto(e.target.value)}
                placeholder="449-123-4567"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#F36B2E',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <PlusCircle size={16} />
              {submitting ? 'Guardando...' : 'Registrar Cuadrilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
