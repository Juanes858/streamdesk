import type { ServicioClaves, UsuarioDAO } from '../../dominio/puertos'

export class ClaveActualIncorrecta extends Error {
  constructor() {
    super('La clave actual es incorrecta')
  }
}

export class UsuarioNoEncontrado extends Error {
  constructor() {
    super('Usuario no encontrado')
  }
}

export interface CambiarClaveDTO {
  usuarioId: string
  claveActual: string
  nuevaClave: string
}

export class CambiarClave {
  constructor(
    private readonly usuarios: UsuarioDAO,
    private readonly claves: ServicioClaves
  ) {}

  async ejecutar(datos: CambiarClaveDTO): Promise<void> {
    const usuario = await this.usuarios.porId(datos.usuarioId)
    if (!usuario) {
      throw new UsuarioNoEncontrado()
    }

    const coincide = await this.claves.coincide(datos.claveActual, usuario.claveHash)
    if (!coincide) {
      throw new ClaveActualIncorrecta()
    }

    const nuevaClaveHash = await this.claves.cifrar(datos.nuevaClave)
    await this.usuarios.actualizar(usuario.id, { claveHash: nuevaClaveHash })
  }
}