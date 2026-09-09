import type { Rol, Usuario } from '../../dominio/modelo/Usuario'
import type { ServicioClaves, UsuarioDAO } from '../../dominio/puertos'
import { CorreoYaRegistrado } from './RegistrarUsuario'
import { UsuarioNoEncontrado } from './ObtenerUsuario'

/** Cambios permitidos desde la frontera HTTP; todo opcional. */
export interface ActualizacionDTO {
  nombre?: string
  correo?: string
  clave?: string
  rol?: Rol
  activo?: boolean
}

export class ActualizarUsuario {
  constructor(
    private readonly usuarios: UsuarioDAO,
    private readonly claves: ServicioClaves,
  ) {}

  async ejecutar(id: string, datos: ActualizacionDTO): Promise<Usuario> {
    const existente = await this.usuarios.porId(id)
    if (!existente) throw new UsuarioNoEncontrado(id)

    const correo = datos.correo?.trim().toLowerCase()
    if (correo && correo !== existente.correo) {
      const enUso = await this.usuarios.porCorreo(correo)
      if (enUso) throw new CorreoYaRegistrado(correo)
    }

    return this.usuarios.actualizar(id, {
      ...(datos.nombre !== undefined && { nombre: datos.nombre.trim() }),
      ...(correo !== undefined && { correo }),
      ...(datos.clave !== undefined && { claveHash: await this.claves.cifrar(datos.clave) }),
      ...(datos.rol !== undefined && { rol: datos.rol }),
      ...(datos.activo !== undefined && { activo: datos.activo }),
    })
  }
}