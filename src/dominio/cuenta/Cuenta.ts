export class Cuenta {
  constructor(
    public readonly id: string,
    public readonly clienteId: string,
    public readonly plataforma: string, // ej: "Netflix", "Disney+"
    public readonly correoAcceso: string,
    public readonly estado: 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA',
    public readonly fechaCreacion: Date
  ) {}

  puedeSerAsignada(): boolean {
    return this.estado === 'ACTIVA';
  }
}