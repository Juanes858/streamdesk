import { Router } from 'express'
import { ActualizarPlataforma } from '../../../aplicacion/casos-uso/ActualizarPlataforma'
import { EliminarPlataforma } from '../../../aplicacion/casos-uso/EliminarPlataforma'
import { ListarPlataformas } from '../../../aplicacion/casos-uso/ListarPlataformas'
import { ObtenerPlataforma, PlataformaNoEncontrada } from '../../../aplicacion/casos-uso/ObtenerPlataforma'
import { PlataformaYaRegistrada, RegistrarPlataforma } from '../../../aplicacion/casos-uso/RegistrarPlataforma'
import type { PlataformaDAO, ServicioTokens } from '../../../dominio/puertos'
import { exigirRoles, exigirSesion } from './autenticacion'

export interface DependenciasPlataformas {
  plataformas: PlataformaDAO
  tokens: ServicioTokens
}

/** Largo máximo del nombre de una plataforma (KAN-52). Se mide sobre el nombre ya sin espacios sobrantes. */
export const LARGO_MAXIMO_NOMBRE_PLATAFORMA = 50
const MENSAJE_NOMBRE_LARGO = `nombre no puede superar ${LARGO_MAXIMO_NOMBRE_PLATAFORMA} caracteres`

function idValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0
}

function validarRegistro(cuerpo: unknown): { nombre: string; activa?: boolean } | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof datos['nombre'] !== 'string' || !datos['nombre'].trim()) return 'nombre requerido'
  if (datos['nombre'].trim().length > LARGO_MAXIMO_NOMBRE_PLATAFORMA) return MENSAJE_NOMBRE_LARGO
  if (datos['activa'] !== undefined && typeof datos['activa'] !== 'boolean') return 'activa debe ser booleano'
  return { nombre: datos['nombre'], ...(datos['activa'] !== undefined && { activa: datos['activa'] as boolean }) }
}

function validarCambios(cuerpo: unknown): { nombre?: string; activa?: boolean } | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  const cambios: { nombre?: string; activa?: boolean } = {}
  if (datos['nombre'] !== undefined) {
    if (typeof datos['nombre'] !== 'string' || !datos['nombre'].trim()) return 'nombre inválido'
    if (datos['nombre'].trim().length > LARGO_MAXIMO_NOMBRE_PLATAFORMA) return MENSAJE_NOMBRE_LARGO
    cambios.nombre = datos['nombre']
  }
  if (datos['activa'] !== undefined) {
    if (typeof datos['activa'] !== 'boolean') return 'activa debe ser booleano'
    cambios.activa = datos['activa']
  }
  return cambios
}

export function rutasPlataformas(deps: DependenciasPlataformas): Router {
  const rutas = Router()
  // Consultar el catálogo solo exige sesión (lo necesita cualquier rol para
  // registrar una Cuenta); gestionarlo (crear/editar/eliminar) exige admin.
  const sesion = exigirSesion(deps.tokens)
  const administrador = exigirRoles(deps.tokens, 'ADMINISTRADOR')

  rutas.post('/', administrador, async (req, res, next) => {
    try {
      const datos = validarRegistro(req.body)
      if (typeof datos === 'string') return void res.status(400).json({ error: datos })
      const plataforma = await new RegistrarPlataforma(deps.plataformas).ejecutar(datos)
      res.status(201).json(plataforma)
    } catch (error) {
      if (error instanceof PlataformaYaRegistrada) return void res.status(409).json({ error: error.message })
      next(error)
    }
  })

  rutas.get('/', sesion, async (_req, res, next) => {
    try {
      res.json(await new ListarPlataformas(deps.plataformas).ejecutar())
    } catch (error) {
      next(error)
    }
  })

  rutas.get('/:id', sesion, async (req, res, next) => {
    try {
      if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
      res.json(await new ObtenerPlataforma(deps.plataformas).ejecutar(req.params['id']))
    } catch (error) {
      if (error instanceof PlataformaNoEncontrada) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  rutas.patch('/:id', administrador, async (req, res, next) => {
    try {
      if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
      const cambios = validarCambios(req.body)
      if (typeof cambios === 'string' || Object.keys(cambios).length === 0) {
        return void res.status(400).json({ error: typeof cambios === 'string' ? cambios : 'debe enviar cambios' })
      }
      const plataforma = await new ActualizarPlataforma(deps.plataformas).ejecutar(req.params['id'], cambios)
      res.json(plataforma)
    } catch (error) {
      if (error instanceof PlataformaNoEncontrada) return void res.status(404).json({ error: error.message })
      if (error instanceof PlataformaYaRegistrada) return void res.status(409).json({ error: error.message })
      next(error)
    }
  })

  rutas.delete('/:id', administrador, async (req, res, next) => {
    try {
      if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
      await new EliminarPlataforma(deps.plataformas).ejecutar(req.params['id'])
      res.status(204).send()
    } catch (error) {
      if (error instanceof PlataformaNoEncontrada) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  return rutas
}