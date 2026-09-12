export const ESTADOS_CUENTA = ['ACTIVA', 'REPORTADA', 'VENCIDA'] as const

export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number]

/** Entidad del dominio. Sin sufijo: no es un dato en tránsito ni un acceso a datos. */
export interface Cuenta {
  id: string
  usuarioId: string
  plataformaId: string
  correo: string
  claveHash: string
  fechaInicio: Date
  fechaFin: Date
  estado: EstadoCuenta
}

/** Una cuenta que todavía no existe: el DAO asigna el id al guardarla. */
export type CuentaNueva = Omit<Cuenta, 'id'>

export type CuentaDTO = Omit<Cuenta, 'claveHash'>

export function aCuentaDTO(cuenta: Cuenta): CuentaDTO {
  const { claveHash: _claveHash, ...publica } = cuenta
  return publica
}

export function esEstadoCuenta(valor: unknown): valor is EstadoCuenta {
  return ESTADOS_CUENTA.includes(valor as EstadoCuenta)
}