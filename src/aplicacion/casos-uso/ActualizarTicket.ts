import type { Ticket } from '../../dominio/modelo/Ticket'
import type { CambiosTicket, CuentaDAO, TicketDAO, UsuarioDAO } from '../../dominio/puertos'
import { TicketNoEncontrado } from './ObtenerTicket'
import { AsesorTicketInvalido, CuentaTicketNoExiste, UsuarioTicketNoExiste } from './CrearTicket'

export class ActualizarTicket {
  constructor(
    private readonly tickets: TicketDAO,
    private readonly usuarios: UsuarioDAO,
    private readonly cuentas: CuentaDAO,
  ) {}

  async ejecutar(id: string, cambios: CambiosTicket): Promise<Ticket> {
    if (!(await this.tickets.porId(id))) throw new TicketNoEncontrado(id)
    if (cambios.asesorId) {
      const asesor = await this.usuarios.porId(cambios.asesorId)
      if (!asesor) throw new UsuarioTicketNoExiste(cambios.asesorId)
      if (asesor.rol !== 'ASESOR' && asesor.rol !== 'ADMINISTRADOR') throw new AsesorTicketInvalido(cambios.asesorId)
    }
    if (cambios.cuentaId && !(await this.cuentas.porId(cambios.cuentaId))) throw new CuentaTicketNoExiste(cambios.cuentaId)
    return this.tickets.actualizar(id, cambios)
  }
}