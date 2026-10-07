import { aPlataformaDTO, type PlataformaDTO } from '../../dominio/modelo/Plataforma'
import type { PlataformaDAO } from '../../dominio/puertos'

export class ListarPlataformas {
  constructor(private readonly plataformas: PlataformaDAO) {}

  async ejecutar(): Promise<PlataformaDTO[]> {
    const todas = await this.plataformas.listarTodas()
    return todas.map(aPlataformaDTO)
  }
}