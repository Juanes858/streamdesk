export type EstadoTicket =
  | 'NUEVO'
  | 'ASIGNADO'
  | 'EN_PROCESO'
  | 'ESPERA_INFORMACION'
  | 'RESUELTO'
  | 'CERRADO'

export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export const ESTADOS_TICKET: EstadoTicket[] = [
  'NUEVO',
  'ASIGNADO',
  'EN_PROCESO',
  'ESPERA_INFORMACION',
  'RESUELTO',
  'CERRADO',
]

export const PRIORIDADES_TICKET: Prioridad[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

export interface Ticket {
  id: string
  usuarioId: string
  asesorId: string | null
  cuentaId: string
  descripcion: string
  estado: EstadoTicket
  prioridad: Prioridad
}

export type TicketNuevo = Omit<Ticket, 'id'>

export function esEstadoTicket(valor: unknown): valor is EstadoTicket {
  return ESTADOS_TICKET.includes(valor as EstadoTicket)
}

export function esPrioridadTicket(valor: unknown): valor is Prioridad {
  return PRIORIDADES_TICKET.includes(valor as Prioridad)
}
