/** Entidad del dominio. Sin sufijo: no es un dato en tránsito ni un acceso a datos. */
export interface Plataforma {
  id: string
  nombre: string
  activa: boolean
}

/** Una plataforma que todavía no existe: el DAO asigna el id al guardarla. */
export type PlataformaNueva = Omit<Plataforma, 'id'>

/**
 * A diferencia de Cuenta, Plataforma no tiene campos sensibles que ocultar,
 * así que su DTO es igual a la entidad. Se conserva el nombre por
 * consistencia con el resto del dominio: lo que cruza HTTP siempre tiene
 * sufijo DTO.
 */
export type PlataformaDTO = Plataforma

export function aPlataformaDTO(plataforma: Plataforma): PlataformaDTO {
  return plataforma
}