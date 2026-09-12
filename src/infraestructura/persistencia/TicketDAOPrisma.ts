import type { PrismaClient, Prisma, Ticket as FilaTicket, $Enums } from './generado/index'
import type { EstadoTicket, Prioridad, Ticket, TicketNuevo } from '../../dominio/modelo/Ticket'
import type { CambiosTicket, TicketDAO } from '../../dominio/puertos'

const aDominio = (fila: FilaTicket): Ticket => ({
  id: fila.id,
  usuarioId: fila.usuarioId,
  asesorId: fila.asesorId,
  cuentaId: fila.cuentaId,
  descripcion: fila.descripcion,
  estado: fila.estado as EstadoTicket,
  prioridad: fila.prioridad as Prioridad,
})

export class TicketDAOPrisma implements TicketDAO {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(ticket: TicketNuevo): Promise<Ticket> {
    return aDominio(await this.prisma.ticket.create({
      data: {
        ...ticket,
        estado: ticket.estado as $Enums.EstadoTicket,
        prioridad: ticket.prioridad as $Enums.Prioridad,
      },
    }))
  }

  async porId(id: string): Promise<Ticket | null> {
    const fila = await this.prisma.ticket.findUnique({ where: { id } })
    return fila && aDominio(fila)
  }

  async listar(filtros: { usuarioId?: string; asesorId?: string; cuentaId?: string; estado?: EstadoTicket } = {}): Promise<Ticket[]> {
    const filas = await this.prisma.ticket.findMany({
      where: {
        ...(filtros.usuarioId !== undefined && { usuarioId: filtros.usuarioId }),
        ...(filtros.asesorId !== undefined && { asesorId: filtros.asesorId }),
        ...(filtros.cuentaId !== undefined && { cuentaId: filtros.cuentaId }),
        ...(filtros.estado !== undefined && { estado: filtros.estado as $Enums.EstadoTicket }),
      },
    })
    return filas.map(aDominio)
  }

  async actualizar(id: string, cambios: CambiosTicket): Promise<Ticket> {
    return aDominio(await this.prisma.ticket.update({
      where: { id },
      data: {
        ...cambios,
        ...(cambios.estado !== undefined && { estado: cambios.estado as $Enums.EstadoTicket }),
        ...(cambios.prioridad !== undefined && { prioridad: cambios.prioridad as $Enums.Prioridad }),
      } as Prisma.TicketUpdateInput,
    }))
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.ticket.delete({ where: { id } })
  }
}