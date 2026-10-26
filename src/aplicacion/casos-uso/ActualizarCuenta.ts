import type { Cuenta } from '../../dominio/modelo/Cuenta'
import type { CambiosCuenta, CuentaDAO, ServicioClaves, PlataformaDAO } from '../../dominio/puertos'
import { PlataformaCuentaNoExiste } from './RegistrarCuenta'
import { excedeDuracionMaxima } from '../../dominio/modelo/Cuenta'

export class FechasCuentaInvalidas extends Error { }
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
    private readonly plataformas: PlataformaDAO,
  ) { }

  async ejecutar(id: string, datos: ActualizacionCuentaDTO): Promise<Cuenta> {
    const actual = await this.cuentas.porId(id)
    if (!actual) throw new CuentaNoEncontrada(id)
    if (datos.fechaInicio !== undefined || datos.fechaFin !== undefined) {
      const inicio = datos.fechaInicio ?? actual.fechaInicio
      const fin = datos.fechaFin ?? actual.fechaFin
      if (fin <= inicio) throw new FechasCuentaInvalidas('fechaFin inválida')
      if (excedeDuracionMaxima(inicio, fin)) {
        throw new FechasCuentaInvalidas('la cuenta no puede durar más de 2 años')
      }
    }
    const cambios: CambiosCuenta = {
      ...(datos.plataformaId !== undefined && { plataformaId: datos.plataformaId.trim() }),
      ...(datos.correo !== undefined && { correo: datos.correo.trim().toLowerCase() }),
      ...(datos.clave !== undefined && { claveHash: await this.claves.cifrar(datos.clave) }),
      ...(datos.fechaInicio !== undefined && { fechaInicio: datos.fechaInicio }),
      ...(datos.fechaFin !== undefined && { fechaFin: datos.fechaFin }),
      ...(datos.estado !== undefined && { estado: datos.estado }),
    }
    if (datos.plataformaId !== undefined && !(await this.plataformas.porId(datos.plataformaId))) {
      throw new PlataformaCuentaNoExiste(datos.plataformaId)
    }
    return this.cuentas.actualizar(id, cambios)
  }
}