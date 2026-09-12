import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { esRol } from '../../dominio/modelo/Usuario'
import type { CredencialDTO, ServicioTokens } from '../../dominio/puertos'

export class TokensJwt implements ServicioTokens {
  constructor(
    private readonly secreto: string,
    private readonly duracion: NonNullable<SignOptions['expiresIn']> = '8h',
  ) {}

  emitir({ id, rol }: CredencialDTO): string {
    // El JWT transporta identidad y rol; los datos completos se consultan en la BD.
    return jwt.sign({ rol }, this.secreto, { subject: id, expiresIn: this.duracion })
  }

  verificar(token: string): CredencialDTO | null {
    // Cualquier firma inválida, token expirado o rol desconocido se convierte en
    // null para que la capa HTTP responda 401 sin filtrar detalles internos.
    try {
      const carga = jwt.verify(token, this.secreto)
      if (typeof carga === 'string' || !carga.sub || !esRol(carga['rol'])) return null
      return { id: carga.sub, rol: carga['rol'] }
    } catch {
      return null
    }
  }
}
