// Puertos: lo que el dominio necesita del exterior, en su propio vocabulario.
//
// - `...DAO`  → acceso a datos: quien sepa guardar y recuperar entidades.
// - `...DTO`  → estructura de datos que cruza una frontera.
// - Sin sufijo → contratos de comportamiento, que no son ni datos ni persistencia.

import type { Cuenta, CuentaNueva, EstadoCuenta } from '../modelo/Cuenta'
import type { EstadoTicket, Prioridad, Ticket, TicketNuevo } from '../modelo/Ticket'
import type { CambiosUsuario, Rol, Usuario, UsuarioNuevo } from '../modelo/Usuario'

export interface UsuarioDAO {
  // Estos contratos permiten probar los casos de uso sin Express, Prisma o BD.
  guardar(usuario: UsuarioNuevo): Promise<Usuario>
  porCorreo(correo: string): Promise<Usuario | null>
  porId(id: string): Promise<Usuario | null>
  listarTodos(): Promise<Usuario[]>
  actualizar(id: string, cambios: CambiosUsuario): Promise<Usuario>
  eliminar(id: string): Promise<void>
}

export interface ServicioClaves {
  cifrar(clave: string): Promise<string>
  coincide(clave: string, hash: string): Promise<boolean>
}

/** Contenido útil del token: viaja entre el cliente y el servidor en cada petición. */
export interface CredencialDTO {
  id: string
  rol: Rol
}

export interface ServicioTokens {
  emitir(credencial: CredencialDTO): string
  verificar(token: string): CredencialDTO | null
}

export interface CuentaDAO {
  // La aplicación depende de este contrato, no de CuentaDAOPrisma.
  guardar(cuenta: CuentaNueva): Promise<Cuenta>
  porId(id: string): Promise<Cuenta | null>
  porUsuario(usuarioId: string): Promise<Cuenta[]>
  actualizar(id: string, cambios: CambiosCuenta): Promise<Cuenta>
  eliminar(id: string): Promise<void>
}

export type CambiosCuenta = Partial<{
  usuarioId: string
  plataformaId: string
  correo: string
  claveHash: string
  fechaInicio: Date
  fechaFin: Date
  estado: EstadoCuenta
}>

export interface TicketDAO {
  // El DAO encapsula persistencia; los filtros expresan reglas del negocio.
  guardar(ticket: TicketNuevo): Promise<Ticket>
  porId(id: string): Promise<Ticket | null>
  listar(filtros?: { usuarioId?: string; asesorId?: string; cuentaId?: string; estado?: EstadoTicket }): Promise<Ticket[]>
  actualizar(id: string, cambios: Partial<Omit<Ticket, 'id'>>): Promise<Ticket>
  eliminar(id: string): Promise<void>
}

export type CambiosTicket = Partial<{
  usuarioId: string
  asesorId: string | null
  cuentaId: string
  descripcion: string
  estado: EstadoTicket
  prioridad: Prioridad
}>
