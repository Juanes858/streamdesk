import type { CuentaDAO } from '../../dominio/puertos'
import { CuentaNoEncontrada } from './ActualizarCuenta'

export class EliminarCuenta {
  constructor(private readonly cuentas: CuentaDAO) {}

  async ejecutar(id: string): Promise<void> {
    if (!(await this.cuentas.porId(id))) throw new CuentaNoEncontrada(id)
    await this.cuentas.eliminar(id)
  }
}