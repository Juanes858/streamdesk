import type { Cuenta } from '../../dominio/modelo/Cuenta'
import type { CuentaDAO, UsuarioDAO } from '../../dominio/puertos'

export class ClienteNoExiste extends Error {
  constructor(clienteId: string) {
    super(`El cliente ${clienteId} no existe`)
  }
}

/** Datos de entrada, ya validados en la frontera HTTP. */
export interface RegistroCuentaDTO {
  clienteId: string
  plataforma: string
  correoAcceso: string
}

export class RegistrarCuenta {
  constructor(
    private readonly cuentas: CuentaDAO,
    private readonly usuarios: UsuarioDAO,
  ) {}

  async ejecutar(datos: RegistroCuentaDTO): Promise<Cuenta> {
    // Se valida contra Usuario porque en este proyecto el "cliente"
    // es simplemente un Usuario con rol SOLICITANTE, no una entidad aparte.
    const cliente = await this.usuarios.porId(datos.clienteId)
    if (!cliente) throw new ClienteNoExiste(datos.clienteId)

    return this.cuentas.guardar({
      clienteId: datos.clienteId,
      plataforma: datos.plataforma.trim(),
      correoAcceso: datos.correoAcceso.trim().toLowerCase(),
      estado: 'ACTIVA',
    })
  }
}