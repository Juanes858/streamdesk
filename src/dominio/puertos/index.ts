// Puertos: lo que el dominio necesita del exterior, en su propio vocabulario.
//
// - `...DAO`  → acceso a datos: quien sepa guardar y recuperar entidades.
// - `...DTO`  → estructura de datos que cruza una frontera.
// - Sin sufijo → contratos de comportamiento, que no son ni datos ni persistencia.

import type { Cuenta, CuentaNueva, EstadoCuenta } from '../modelo/Cuenta'
import type { EstadoTicket, Prioridad, Ticket, TicketNuevo } from '../modelo/Ticket'
import type { CambiosUsuario, Rol, Usuario, UsuarioNuevo } from '../modelo/Usuario'
import type { Plataforma, PlataformaNueva } from '../modelo/Plataforma'


export interface UsuarioDAO {
  guardar(usuario: UsuarioNuevo): Promise<Usuario>
  porCorreo(correo: string): Promise<Usuario | null>
  porId(id: string): Promise<Usuario | null>
  listarTodos(rol?: Rol, q?: string): Promise<Usuario[]>
  obtenerResumenPorRol(): Promise<Record<Rol, number>>
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
  guardar(cuenta: CuentaNueva): Promise<Cuenta>
  porId(id: string): Promise<Cuenta | null>
  porUsuario(usuarioId: string): Promise<Cuenta[]>
  porVencer(fechaLimite: Date): Promise<Cuenta[]>
  porUsuario(usuarioId: string, estado?: EstadoCuenta): Promise<Cuenta[]>
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

export interface PlataformaDAO {
  // La aplicación depende de este contrato, no de PlataformaDAOPrisma.
  guardar(plataforma: PlataformaNueva): Promise<Plataforma>
  porId(id: string): Promise<Plataforma | null>
  porNombre(nombre: string): Promise<Plataforma | null>
    listarTodas(filtros?: FiltrosPlataforma): Promise<Plataforma[]>
  actualizar(id: string, cambios: CambiosPlataforma): Promise<Plataforma>
  eliminar(id: string): Promise<void>
}

export type FiltrosPlataforma = { activa?: boolean }

export type CambiosPlataforma = Partial<{
  nombre: string
  descripcion: string | null
  activa: boolean
}>

export interface TicketDAO {
  // El DAO encapsula persistencia; los filtros expresan reglas del negocio.
  guardar(ticket: TicketNuevo): Promise<Ticket>
  porId(id: string): Promise<Ticket | null>
  listar(filtros?: { usuarioId?: string; asesorId?: string; cuentaId?: string; estado?: EstadoTicket }, q?: string, orden?: 'asc' | 'desc'): Promise<Ticket[]>
  obtenerResumenPorEstado(): Promise<Record<string, number>>
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
