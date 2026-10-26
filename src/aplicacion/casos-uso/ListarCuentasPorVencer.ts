import { aCuentaDTO, type CuentaDTO } from '../../dominio/modelo/Cuenta'
import type { CuentaDAO } from '../../dominio/puertos'

export class ListarCuentasPorVencer {
  constructor(private readonly cuentas: CuentaDAO) {}

  async ejecutar(dias: number = 7): Promise<CuentaDTO[]> {
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + dias)

    const cuentas = await this.cuentas.porVencer(fechaLimite)
    return cuentas.map(aCuentaDTO)
  }
}