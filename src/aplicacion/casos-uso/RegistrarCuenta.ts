import type { Cuenta } from '../../dominio/modelo/Cuenta'
import type { ServicioClaves, CuentaDAO, UsuarioDAO } from '../../dominio/puertos'

export class UsuarioCuentaNoExiste extends Error {
  constructor(usuarioId: string) {
    super(`El usuario ${usuarioId} no existe`)
  }
}

/** Datos de entrada, ya validados en la frontera HTTP. */
export interface RegistroCuentaDTO {
  usuarioId: string
  plataformaId: string
  correo: string
  clave: string
  fechaInicio: Date
  fechaFin: Date
}

export class RegistrarCuenta {
  constructor(
    private readonly cuentas: CuentaDAO,
    private readonly usuarios: UsuarioDAO,
    private readonly claves: ServicioClaves,
  ) {}

  async ejecutar(datos: RegistroCuentaDTO): Promise<Cuenta> {
    // Cuenta pertenece a un Usuario; no existe una entidad Cliente separada.
    // La clave de acceso se cifra antes de guardarla y nunca sale por HTTP.
    const usuario = await this.usuarios.porId(datos.usuarioId)
    if (!usuario) throw new UsuarioCuentaNoExiste(datos.usuarioId)

    return this.cuentas.guardar({
      usuarioId: datos.usuarioId,
      plataformaId: datos.plataformaId.trim(),
      correo: datos.correo.trim().toLowerCase(),
      claveHash: await this.claves.cifrar(datos.clave),
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      estado: 'ACTIVA',
    })
  }
}