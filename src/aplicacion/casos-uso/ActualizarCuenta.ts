import type { Cuenta } from '../../dominio/modelo/Cuenta'
import type { CambiosCuenta, CuentaDAO, ServicioClaves } from '../../dominio/puertos'

export class CuentaNoEncontrada extends Error {
  constructor(id: string) {
    super(`No existe la cuenta ${id}`)
  }
}

export interface ActualizacionCuentaDTO {
  plataformaId?: string
  correo?: string
  clave?: string
  fechaInicio?: Date
  fechaFin?: Date
  estado?: 'ACTIVA' | 'REPORTADA' | 'VENCIDA'
}

export class ActualizarCuenta {
  constructor(
    private readonly cuentas: CuentaDAO,
    private readonly claves: ServicioClaves,
  ) {}

  async ejecutar(id: string, datos: ActualizacionCuentaDTO): Promise<Cuenta> {
    if (!(await this.cuentas.porId(id))) throw new CuentaNoEncontrada(id)
    const cambios: CambiosCuenta = {
      ...(datos.plataformaId !== undefined && { plataformaId: datos.plataformaId.trim() }),
      ...(datos.correo !== undefined && { correo: datos.correo.trim().toLowerCase() }),
      ...(datos.clave !== undefined && { claveHash: await this.claves.cifrar(datos.clave) }),
      ...(datos.fechaInicio !== undefined && { fechaInicio: datos.fechaInicio }),
      ...(datos.fechaFin !== undefined && { fechaFin: datos.fechaFin }),
      ...(datos.estado !== undefined && { estado: datos.estado }),
    }
    return this.cuentas.actualizar(id, cambios)
  }
}