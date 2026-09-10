import { Router } from 'express'
import { RegistrarCuenta, ClienteNoExiste } from '../../../aplicacion/casos-uso/RegistrarCuenta'
import type { CuentaDAO, ServicioTokens, UsuarioDAO } from '../../../dominio/puertos'
import { exigirSesion } from './autenticacion'

export interface DependenciasCuentas {
  cuentas: CuentaDAO
  usuarios: UsuarioDAO
  tokens: ServicioTokens
}

function validarRegistro(cuerpo: unknown): { clienteId: string; plataforma: string; correoAcceso: string } | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof datos['clienteId'] !== 'string' || !datos['clienteId'].trim()) return 'clienteId requerido'
  if (typeof datos['plataforma'] !== 'string' || !datos['plataforma'].trim()) return 'plataforma requerida'
  if (typeof datos['correoAcceso'] !== 'string' || !/^\S+@\S+\.\S+$/.test(datos['correoAcceso'])) return 'correoAcceso inválido'
  return { clienteId: datos['clienteId'], plataforma: datos['plataforma'], correoAcceso: datos['correoAcceso'] }
}

export function rutasCuentas(deps: DependenciasCuentas): Router {
  const rutas = Router()
  const sesion = exigirSesion(deps.tokens)

  rutas.post('/', sesion, async (req, res, next) => {
    try {
      const datos = validarRegistro(req.body)
      if (typeof datos === 'string') return void res.status(400).json({ error: datos })
      const cuenta = await new RegistrarCuenta(deps.cuentas, deps.usuarios).ejecutar(datos)
      res.status(201).json(cuenta)
    } catch (error) {
      if (error instanceof ClienteNoExiste) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  rutas.get('/', sesion, async (req, res, next) => {
    try {
      const clienteId = typeof req.query['clienteId'] === 'string' ? req.query['clienteId'] : undefined
      if (!clienteId) return void res.status(400).json({ error: 'clienteId requerido' })
      res.json(await deps.cuentas.porCliente(clienteId))
    } catch (error) {
      next(error)
    }
  })

  rutas.get('/:id', sesion, async (req, res, next) => {
    try {
      const id = req.params['id']
      if (typeof id !== 'string') return void res.status(400).json({ error: 'id requerido' })
      const cuenta = await deps.cuentas.porId(id)
      if (!cuenta) return void res.status(404).json({ error: 'Cuenta no encontrada' })
      res.json(cuenta)
    } catch (error) {
      next(error)
    }
  })

  return rutas
}