import bcrypt from 'bcryptjs'
import type { ServicioClaves } from '../../dominio/puertos'

export class ClavesBcrypt implements ServicioClaves {
  constructor(private readonly rondas = 10) {}

  cifrar(clave: string): Promise<string> {
    return bcrypt.hash(clave, this.rondas)
  }

  coincide(clave: string, hash: string): Promise<boolean> {
    return bcrypt.compare(clave, hash)
  }
}
