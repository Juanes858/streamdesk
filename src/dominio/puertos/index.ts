// Puertos: lo que el dominio necesita del exterior, en su propio vocabulario.
//
// - `...DAO`  → acceso a datos: quien sepa guardar y recuperar entidades.
// - `...DTO`  → estructura de datos que cruza una frontera.
// - Sin sufijo → contratos de comportamiento, que no son ni datos ni persistencia.

import type { Cuenta, CuentaNueva } from '../modelo/Cuenta'
import type { CambiosUsuario, Rol, Usuario, UsuarioNuevo } from '../modelo/Usuario'

export interface UsuarioDAO {
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
  guardar(cuenta: CuentaNueva): Promise<Cuenta>
  porId(id: string): Promise<Cuenta | null>
  porCliente(clienteId: string): Promise<Cuenta[]>
}
