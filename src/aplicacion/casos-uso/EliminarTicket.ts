import type { TicketDAO } from '../../dominio/puertos'
import { TicketNoEncontrado } from './ObtenerTicket'

export class EliminarTicket {
  constructor(private readonly tickets: TicketDAO) {}

  async ejecutar(id: string): Promise<void> {
    if (!(await this.tickets.porId(id))) throw new TicketNoEncontrado(id)
    await this.tickets.eliminar(id)
  }
}