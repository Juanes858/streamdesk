export class Cuenta {
  constructor(
    public readonly id: string,
    public readonly usuarioId: string,
    public readonly plataformaId: string,
    public readonly correo: string,
    public readonly claveHash: string,
    public readonly fechaInicio: Date,
    public readonly fechaFin: Date,
    public readonly estado: 'ACTIVA' | 'REPORTADA' | 'VENCIDA'
  ) {}

  puedeSerAsignada(): boolean {
    return this.estado === 'ACTIVA';
  }
}