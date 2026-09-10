export const ESTADOS_CUENTA = ['ACTIVA', 'SUSPENDIDA', 'CANCELADA'] as const

export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number]

/** Entidad del dominio. Sin sufijo: no es un dato en tránsito ni un acceso a datos. */
export interface Cuenta {
  id: string
  clienteId: string
  plataforma: string
  correoAcceso: string
  estado: EstadoCuenta
  creadoEn: Date
  // Falta fecha de expiracion y cambiar  tipo de dato de plataforma
}

/** Una cuenta que todavía no existe: el DAO asigna el id al guardarla. */
export type CuentaNueva = Omit<Cuenta, 'id' | 'creadoEn'>

export function esEstadoCuenta(valor: unknown): valor is EstadoCuenta {
  return ESTADOS_CUENTA.includes(valor as EstadoCuenta)
}