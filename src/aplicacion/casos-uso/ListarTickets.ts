import type { EstadoTicket, Ticket } from '../../dominio/modelo/Ticket'
import type { TicketDAO } from '../../dominio/puertos'

export class ListarTickets {
  constructor(private readonly tickets: TicketDAO) {}

  ejecutar(filtros?: { usuarioId?: string; asesorId?: string; cuentaId?: string; estado?: EstadoTicket }): Promise<Ticket[]> {
    return this.tickets.listar(filtros)
  }
}