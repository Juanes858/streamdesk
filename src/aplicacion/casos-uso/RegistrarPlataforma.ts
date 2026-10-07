import type { Plataforma } from '../../dominio/modelo/Plataforma'
import type { PlataformaDAO } from '../../dominio/puertos'

export class PlataformaYaRegistrada extends Error {
  constructor(nombre: string) {
    super(`Ya existe una plataforma con nombre ${nombre}`)
  }
}

/** Datos de entrada, ya validados en la frontera HTTP. */
export interface RegistroPlataformaDTO {
  nombre: string
  activa?: boolean
}

export class RegistrarPlataforma {
  constructor(private readonly plataformas: PlataformaDAO) {}

  async ejecutar(datos: RegistroPlataformaDTO): Promise<Plataforma> {
    // El nombre es el identificador de negocio: se normaliza y se exige único,
    // igual que el correo en RegistrarUsuario.
    const nombre = datos.nombre.trim().toUpperCase()
    if (await this.plataformas.porNombre(nombre)) throw new PlataformaYaRegistrada(nombre)

    return this.plataformas.guardar({
      nombre,
      activa: datos.activa ?? true,
    })
  }
}