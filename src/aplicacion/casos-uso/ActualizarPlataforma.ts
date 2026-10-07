import type { Plataforma } from '../../dominio/modelo/Plataforma'
import type { CambiosPlataforma, PlataformaDAO } from '../../dominio/puertos'
import { PlataformaNoEncontrada } from './ObtenerPlataforma'
import { PlataformaYaRegistrada } from './RegistrarPlataforma'

export interface ActualizacionPlataformaDTO {
  nombre?: string
  activa?: boolean
}

export class ActualizarPlataforma {
  constructor(private readonly plataformas: PlataformaDAO) {}

  async ejecutar(id: string, datos: ActualizacionPlataformaDTO): Promise<Plataforma> {
    if (!(await this.plataformas.porId(id))) throw new PlataformaNoEncontrada(id)

    const cambios: CambiosPlataforma = {}
    if (datos.nombre !== undefined) {
      const nombre = datos.nombre.trim().toUpperCase()
      const existente = await this.plataformas.porNombre(nombre)
      if (existente && existente.id !== id) throw new PlataformaYaRegistrada(nombre)
      cambios.nombre = nombre
    }
    if (datos.activa !== undefined) cambios.activa = datos.activa

    return this.plataformas.actualizar(id, cambios)
  }
}
