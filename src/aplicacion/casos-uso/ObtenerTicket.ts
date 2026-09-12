import type { Ticket } from '../../dominio/modelo/Ticket'
import type { TicketDAO } from '../../dominio/puertos'

export class TicketNoEncontrado extends Error {
  constructor(id: string) {
    super(`No existe un ticket con id ${id}`)
  }
}

export class ObtenerTicket {
  constructor(private readonly tickets: TicketDAO) {}

  async ejecutar(id: string): Promise<Ticket> {
    const ticket = await this.tickets.porId(id)
    if (!ticket) throw new TicketNoEncontrado(id)
    return ticket
  }
}