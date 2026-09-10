export class Cuenta {
  constructor(
    public readonly id: string,
    public readonly clienteId: string,
    public readonly plataforma: string, // ej: "Netflix", "Disney+"
    public readonly correoAcceso: string,
    public readonly estado: 'ACTIVA' | 'DISPONIBLE' | 'REPORTADA' | 'VENCIDA', // agg estados o organizar, activa, disponible, reportada, vencida
    public readonly fechaCreacion: Date
  ) {}

  puedeSerAsignada(): boolean {
    return this.estado === 'DISPONIBLE';
  }
}