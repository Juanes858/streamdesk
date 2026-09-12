import type { Ticket, TicketNuevo } from '../../dominio/modelo/Ticket'
import type { CuentaDAO, TicketDAO, UsuarioDAO } from '../../dominio/puertos'

export class UsuarioTicketNoExiste extends Error {
  constructor(id: string) {
    super(`No existe el usuario ${id}`)
  }
}

export class AsesorTicketInvalido extends Error {
  constructor(id: string) {
    super(`El usuario ${id} no tiene rol de asesor`)
  }
}

export class CuentaTicketNoExiste extends Error {
  constructor(id: string) {
    super(`No existe la cuenta ${id}`)
  }
}

export class CuentaTicketNoPertenece extends Error {
  constructor(id: string) {
    super(`La cuenta ${id} no pertenece al usuario del ticket`)
  }
}

export class CrearTicket {
  constructor(
    private readonly tickets: TicketDAO,
    private readonly usuarios: UsuarioDAO,
    private readonly cuentas: CuentaDAO,
  ) {}

  async ejecutar(datos: TicketNuevo): Promise<Ticket> {
    // Estas comprobaciones mantienen la integridad entre usuario, asesor y
    // cuenta antes de escribir el ticket en la base de datos.
    if (!(await this.usuarios.porId(datos.usuarioId))) {
      throw new UsuarioTicketNoExiste(datos.usuarioId)
    }
    if (datos.asesorId) {
      const asesor = await this.usuarios.porId(datos.asesorId)
      if (!asesor) throw new UsuarioTicketNoExiste(datos.asesorId)
      if (asesor.rol !== 'ASESOR' && asesor.rol !== 'ADMINISTRADOR') throw new AsesorTicketInvalido(datos.asesorId)
    }
    const cuenta = await this.cuentas.porId(datos.cuentaId)
    if (!cuenta) throw new CuentaTicketNoExiste(datos.cuentaId)
    if (cuenta.usuarioId !== datos.usuarioId) throw new CuentaTicketNoPertenece(datos.cuentaId)
    return this.tickets.guardar(datos)
  }
}