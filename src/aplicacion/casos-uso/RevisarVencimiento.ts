import { aCuentaDTO, type CuentaDTO } from '../../dominio/modelo/Cuenta'
import type { CuentaDAO } from '../../dominio/puertos'

export class RevisarVencimiento {
  constructor(private readonly cuentas: CuentaDAO) {}

  async ejecutar(id: string): Promise<CuentaDTO | null> {
    const cuenta = await this.cuentas.porId(id)
    if (!cuenta) return null

    const ahora = new Date()
    if (cuenta.estado === 'ACTIVA' && cuenta.fechaFin < ahora) {
      const cuentaActualizada = await this.cuentas.actualizar(cuenta.id, {
        estado: 'VENCIDA',
      })
      return aCuentaDTO(cuentaActualizada)
    }

    return aCuentaDTO(cuenta)
  }
}