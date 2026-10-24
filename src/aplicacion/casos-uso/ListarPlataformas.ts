import { aPlataformaDTO, type PlataformaDTO } from '../../dominio/modelo/Plataforma'
import type { PlataformaDAO, FiltrosPlataforma } from '../../dominio/puertos'

export class ListarPlataformas {
  constructor(private readonly plataformas: PlataformaDAO) {}

    async ejecutar(filtros: FiltrosPlataforma = {}): Promise<PlataformaDTO[]> {
    const todas = await this.plataformas.listarTodas(filtros)
    return todas.map(aPlataformaDTO)
  }
}