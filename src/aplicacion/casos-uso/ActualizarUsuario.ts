import type { Rol, Usuario } from '../../dominio/modelo/Usuario'
import type { ServicioClaves, UsuarioDAO } from '../../dominio/puertos'
import { UsuarioNoEncontrado } from './ObtenerUsuario'
import { CorreoYaRegistrado } from './RegistrarUsuario'

export class AutoDesactivacionNoPermitida extends Error {
  constructor() {
    super('Un administrador no puede desactivarse a sí mismo')
    this.name = 'AutoDesactivacionNoPermitida'
  }
}

export interface ActualizacionDTO {
  nombre?: string
  correo?: string
  clave?: string
  telefono?: string | null
  rol?: Rol
  activo?: boolean
}

export class ActualizarUsuario {
  constructor(
    private readonly usuarios: UsuarioDAO,
    private readonly claves: ServicioClaves
  ) {}

  async ejecutar(
    idTarget: string,
    datos: ActualizacionDTO,
    idEjecutor?: string,
  ): Promise<Usuario> {
    if (idEjecutor && idTarget === idEjecutor && datos.activo === false) {
      throw new AutoDesactivacionNoPermitida()
    }

    const existente = await this.usuarios.porId(idTarget)
    if (!existente) throw new UsuarioNoEncontrado(idTarget)

    const correo = datos.correo?.trim().toLowerCase()
    if (correo && correo !== existente.correo) {
      const enUso = await this.usuarios.porCorreo(correo)
      if (enUso) throw new CorreoYaRegistrado(correo)
    }

    return this.usuarios.actualizar(idTarget, {
      ...(datos.nombre !== undefined && { nombre: datos.nombre.trim() }),
      ...(correo !== undefined && { correo }),
      ...(datos.telefono !== undefined && { telefono: datos.telefono ? datos.telefono.trim() : null }),
      ...(datos.clave !== undefined && {
        claveHash: await this.claves.cifrar(datos.clave),
      }),
      ...(datos.rol !== undefined && { rol: datos.rol }),
      ...(datos.activo !== undefined && { activo: datos.activo }),
    })
  }
}