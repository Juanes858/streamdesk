import { Router } from 'express'
import { ActualizarTicket } from '../../../aplicacion/casos-uso/ActualizarTicket'
import { AsesorTicketInvalido, CrearTicket, CuentaTicketNoExiste, CuentaTicketNoPertenece, UsuarioTicketNoExiste } from '../../../aplicacion/casos-uso/CrearTicket'
import { EliminarTicket } from '../../../aplicacion/casos-uso/EliminarTicket'
import { ListarTickets } from '../../../aplicacion/casos-uso/ListarTickets'
import { ObtenerTicket, TicketNoEncontrado } from '../../../aplicacion/casos-uso/ObtenerTicket'
import { ResumenTickets } from '../../../aplicacion/casos-uso/ResumenTickets'
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
  if (typeof datos['descripcion'] === 'string' && datos['descripcion'].trim().length > 1000) {
    return 'La descripción del ticket no puede superar los 1000 caracteres'
  }
  const titulo = datos['titulo'] !== undefined ? datos['titulo'] : datos['descripcion']
  if (typeof titulo !== 'string' || !titulo.trim()) return 'titulo requerido'
  const descripcion = titulo.trim()
  if (descripcion.length < 5 || (datos['titulo'] !== undefined && descripcion.length > 100)) {
    return 'El título del ticket debe tener entre 5 y 100 caracteres'
  }
  if (descripcion.length > 1000) return 'La descripción del ticket no puede superar los 1000 caracteres'
  if (!idValido(datos['usuarioId'])) return 'usuarioId requerido'
  if (!idValido(datos['cuentaId'])) return 'cuentaId requerido'
  if (datos['prioridad'] !== undefined && !esPrioridadTicket(datos['prioridad'])) return 'prioridad inválida'
  if (datos['asesorId'] !== undefined && datos['asesorId'] !== null && !idValido(datos['asesorId'])) return 'asesorId inválido'
  return {
    descripcion,
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
    const descripcion = datos['descripcion'].trim()
    if (descripcion.length > 1000) return 'La descripción del ticket no puede superar los 1000 caracteres'
    cambios.descripcion = descripcion
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
  if (datos['titulo'] !== undefined) {
    if (typeof datos['titulo'] !== 'string' || !datos['titulo'].trim()) return 'titulo inválido'
    const titulo = datos['titulo'].trim()
    if (titulo.length < 5 || titulo.length > 100) return 'El título del ticket debe tener entre 5 y 100 caracteres'
    cambios.descripcion = titulo
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
  const soloAdministrador = exigirRoles(deps.tokens, 'ADMINISTRADOR')

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
    const valorQ = req.query['q']
    const q = typeof valorQ === 'string'
      ? valorQ.trim() || undefined
      : Array.isArray(valorQ) && typeof valorQ[0] === 'string'
        ? valorQ[0].trim() || undefined
        : undefined
    const valorOrden = req.query['orden']
    let orden: 'asc' | 'desc' | undefined
    if (valorOrden !== undefined) {
      if (valorOrden !== 'asc' && valorOrden !== 'desc') {
        return void res.status(400).json({ mensaje: "El parámetro orden solo acepta los valores 'asc' o 'desc'" })
      }
      orden = valorOrden
    }
    if (typeof req.query['cuentaId'] === 'string') filtros.cuentaId = req.query['cuentaId']
    if (req.query['estado'] !== undefined) {
      if (!esEstadoTicket(req.query['estado'])) return void res.status(400).json({ error: 'estado inválido' })
      filtros.estado = req.query['estado']
    }
    try {
      res.json(await new ListarTickets(deps.tickets).ejecutar(filtros, q, orden))
    } catch (error) {
      next(error)
    }
  })

  rutas.get('/resumen', soloAdministrador, async (_req, res, next) => {
    try {
      res.json(await new ResumenTickets(deps.tickets).ejecutar())
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