import { aUsuarioDTO } from '../../dominio/modelo/Usuario'
import type { UsuarioDTO } from '../../dominio/modelo/Usuario'
import type { ServicioClaves, ServicioTokens, UsuarioDAO } from '../../dominio/puertos'

export class CredencialesInvalidas extends Error {
  constructor() {
    super('Correo o clave incorrectos')
  }
}

/** Resultado de un inicio de sesión: el token y quién es su dueño. */
export interface SesionDTO {
  token: string
  usuario: UsuarioDTO
}

export class IniciarSesion {
  constructor(
    private readonly usuarios: UsuarioDAO,
    private readonly claves: ServicioClaves,
    private readonly tokens: ServicioTokens,
  ) {}

  async ejecutar(correo: string, clave: string): Promise<SesionDTO> {
    const usuario = await this.usuarios.porCorreo(correo.trim().toLowerCase())
    // Un solo error para «no existe», «inactivo» y «clave mala»: no se filtra qué correos existen.
    if (!usuario || !usuario.activo) throw new CredencialesInvalidas()
    if (!(await this.claves.coincide(clave, usuario.claveHash))) throw new CredencialesInvalidas()

    return {
      token: this.tokens.emitir({ id: usuario.id, rol: usuario.rol }),
      usuario: aUsuarioDTO(usuario),
    }
  }
}
