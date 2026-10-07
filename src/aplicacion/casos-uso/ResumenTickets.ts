import type { TicketDAO } from '../../dominio/puertos'

export class ResumenTickets {
  constructor(private readonly tickets: TicketDAO) {}

  ejecutar(): Promise<Record<string, number>> {
    return this.tickets.obtenerResumenPorEstado()
  }
}