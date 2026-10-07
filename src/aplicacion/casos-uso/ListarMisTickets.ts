import type { Ticket } from '../../dominio/modelo/Ticket'
import type { TicketDAO } from '../../dominio/puertos'

export class ListarMisTickets {
  constructor(private readonly tickets: TicketDAO) {}

  ejecutar(usuarioId: string): Promise<Ticket[]> {
    return this.tickets.listar({ usuarioId })
  }
}
