import type { Rol, Usuario } from '../../dominio/modelo/Usuario'
import type { ServicioClaves, UsuarioDAO } from '../../dominio/puertos'

export class CorreoYaRegistrado extends Error {
  constructor(correo: string) {
    super(`El correo ${correo} ya está registrado`)
  }
}

/** Datos de entrada del registro, ya validados en la frontera HTTP. */
export interface RegistroDTO {
  nombre: string
  correo: string
  clave: string
  rol: Rol
}

export class RegistrarUsuario {
  constructor(
    private readonly usuarios: UsuarioDAO,
    private readonly claves: ServicioClaves,
  ) {}

  async ejecutar(datos: RegistroDTO): Promise<Usuario> {
    // La aplicación normaliza el correo y cifra la clave antes de cruzar al DAO.
    // Así ningún adaptador de persistencia recibe una contraseña en texto plano.
    const correo = datos.correo.trim().toLowerCase()
    if (await this.usuarios.porCorreo(correo)) throw new CorreoYaRegistrado(correo)

    return this.usuarios.guardar({
      nombre: datos.nombre.trim(),
      correo,
      claveHash: await this.claves.cifrar(datos.clave),
      rol: datos.rol,
      activo: true,
    })
  }
}
