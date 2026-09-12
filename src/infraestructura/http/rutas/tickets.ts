import { Router } from 'express'
import { ActualizarTicket } from '../../../aplicacion/casos-uso/ActualizarTicket'
import { AsesorTicketInvalido, CrearTicket, CuentaTicketNoExiste, CuentaTicketNoPertenece, UsuarioTicketNoExiste } from '../../../aplicacion/casos-uso/CrearTicket'
import { EliminarTicket } from '../../../aplicacion/casos-uso/EliminarTicket'
import { ListarTickets } from '../../../aplicacion/casos-uso/ListarTickets'
import { ObtenerTicket, TicketNoEncontrado } from '../../../aplicacion/casos-uso/ObtenerTicket'
import { esEstadoTicket, esPrioridadTicket } from '../../../dominio/modelo/Ticket'
import type { EstadoTicket, Prioridad } from '../../../dominio/modelo/Ticket'
import type { CambiosTicket, CuentaDAO, ServicioTokens, TicketDAO, UsuarioDAO } from '../../../dominio/puertos'
import { exigirRoles, exigirSesion } from './autenticacion'

export interface DependenciasTickets {
  tickets: TicketDAO
  usuarios: UsuarioDAO
  cuentas: CuentaDAO
  tokens: ServicioTokens
}

function idValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0
}

function validarCreacion(cuerpo: unknown): { descripcion: string; prioridad: Prioridad; usuarioId: string; asesorId: string | null; cuentaId: string; estado: EstadoTicket } | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof datos['descripcion'] !== 'string' || !datos['descripcion'].trim()) return 'descripcion requerida'
  if (!idValido(datos['usuarioId'])) return 'usuarioId requerido'
  if (!idValido(datos['cuentaId'])) return 'cuentaId requerido'
  if (datos['prioridad'] !== undefined && !esPrioridadTicket(datos['prioridad'])) return 'prioridad inválida'
  if (datos['asesorId'] !== undefined && datos['asesorId'] !== null && !idValido(datos['asesorId'])) return 'asesorId inválido'
  return {
    descripcion: datos['descripcion'].trim(),
    prioridad: (datos['prioridad'] ?? 'MEDIA') as Prioridad,
    usuarioId: datos['usuarioId'],
    asesorId: datos['asesorId'] === null ? null : (datos['asesorId'] as string | undefined) ?? null,
    cuentaId: datos['cuentaId'],
    estado: 'NUEVO',
  }
}

function validarCambios(cuerpo: unknown): CambiosTicket | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  const cambios: CambiosTicket = {}
  if (datos['descripcion'] !== undefined) {
    if (typeof datos['descripcion'] !== 'string' || !datos['descripcion'].trim()) return 'descripcion inválida'
    cambios.descripcion = datos['descripcion'].trim()
  }
  if (datos['estado'] !== undefined) {
    if (!esEstadoTicket(datos['estado'])) return 'estado inválido'
    cambios.estado = datos['estado']
  }
  if (datos['prioridad'] !== undefined) {
    if (!esPrioridadTicket(datos['prioridad'])) return 'prioridad inválida'
    cambios.prioridad = datos['prioridad']
  }
  if (datos['asesorId'] !== undefined) {
    if (datos['asesorId'] !== null && !idValido(datos['asesorId'])) return 'asesorId inválido'
    cambios.asesorId = datos['asesorId'] as string | null
  }
  if (datos['cuentaId'] !== undefined) {
    if (!idValido(datos['cuentaId'])) return 'cuentaId inválido'
    cambios.cuentaId = datos['cuentaId']
  }
  return cambios
}

export function rutasTickets(deps: DependenciasTickets): Router {
  const rutas = Router()
  // Clientes crean y consultan sus tickets; admin y asesores los gestionan.
  const sesion = exigirSesion(deps.tokens)
  const gestionTickets = exigirRoles(deps.tokens, 'ADMINISTRADOR', 'ASESOR')

  rutas.post('/', sesion, async (req, res, next) => {
    const datos = validarCreacion(req.body)
    if (typeof datos === 'string') return void res.status(400).json({ error: datos })
    try {
      const credencial = res.locals['credencial'] as { id: string; rol: string }
      const datosFinales = credencial.rol === 'ADMINISTRADOR' ? datos : { ...datos, usuarioId: credencial.id }
      res.status(201).json(await new CrearTicket(deps.tickets, deps.usuarios, deps.cuentas).ejecutar(datosFinales))
    } catch (error) {
      if (error instanceof UsuarioTicketNoExiste || error instanceof CuentaTicketNoExiste) return void res.status(404).json({ error: error.message })
      if (error instanceof CuentaTicketNoPertenece) return void res.status(403).json({ error: error.message })
      if (error instanceof AsesorTicketInvalido) return void res.status(400).json({ error: error.message })
      next(error)
    }
  })

  rutas.get('/', sesion, async (req, res, next) => {
    const credencial = res.locals['credencial'] as { id: string; rol: string }
    const filtros: { usuarioId?: string; asesorId?: string; cuentaId?: string; estado?: EstadoTicket } = {}
    if (credencial.rol === 'ADMINISTRADOR') {
      if (typeof req.query['usuarioId'] === 'string') filtros.usuarioId = req.query['usuarioId']
      if (typeof req.query['asesorId'] === 'string') filtros.asesorId = req.query['asesorId']
    } else if (credencial.rol === 'ASESOR') {
      filtros.asesorId = credencial.id
    } else {
      filtros.usuarioId = credencial.id
    }
    if (typeof req.query['cuentaId'] === 'string') filtros.cuentaId = req.query['cuentaId']
    if (req.query['estado'] !== undefined) {
      if (!esEstadoTicket(req.query['estado'])) return void res.status(400).json({ error: 'estado inválido' })
      filtros.estado = req.query['estado']
    }
    try {
      res.json(await new ListarTickets(deps.tickets).ejecutar(filtros))
    } catch (error) {
      next(error)
    }
  })

  rutas.get('/:id', sesion, async (req, res, next) => {
    if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
    try {
      const ticket = await new ObtenerTicket(deps.tickets).ejecutar(req.params['id'])
      const credencial = res.locals['credencial'] as { id: string; rol: string }
      if (credencial.rol !== 'ADMINISTRADOR' && ticket.usuarioId !== credencial.id && ticket.asesorId !== credencial.id) {
        return void res.status(403).json({ error: 'No puede consultar este ticket' })
      }
      res.json(ticket)
    } catch (error) {
      if (error instanceof TicketNoEncontrado) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  rutas.patch('/:id', gestionTickets, async (req, res, next) => {
    if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
    const cambios = validarCambios(req.body)
    if (typeof cambios === 'string' || Object.keys(cambios).length === 0) {
      return void res.status(400).json({ error: typeof cambios === 'string' ? cambios : 'debe enviar cambios' })
    }
    try {
      res.json(await new ActualizarTicket(deps.tickets, deps.usuarios, deps.cuentas).ejecutar(req.params['id'], cambios))
    } catch (error) {
      if (error instanceof TicketNoEncontrado || error instanceof UsuarioTicketNoExiste || error instanceof CuentaTicketNoExiste) {
        return void res.status(404).json({ error: error.message })
      }
      if (error instanceof AsesorTicketInvalido) return void res.status(400).json({ error: error.message })
      next(error)
    }
  })

  rutas.delete('/:id', gestionTickets, async (req, res, next) => {
    if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
    try {
      await new EliminarTicket(deps.tickets).ejecutar(req.params['id'])
      res.status(204).send()
    } catch (error) {
      if (error instanceof TicketNoEncontrado) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  return rutas
}