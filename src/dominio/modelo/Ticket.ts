// ponytail: solo el modelo, heredado del corte anterior. Sin puerto ni casos de
// uso hasta que exista la primera historia de tickets.

export type EstadoTicket =
  | 'NUEVO'
  | 'ASIGNADO'
  | 'EN_PROCESO'
  | 'ESPERA_INFORMACION'
  | 'RESUELTO'
  | 'CERRADO'

export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export interface Ticket {
  id: string
  asunto: string
  descripcion: string
  estado: EstadoTicket
  prioridad: Prioridad
  solicitanteId: string
  agenteId: string | null
}
