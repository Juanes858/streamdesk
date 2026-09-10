import { Router } from 'express'
import { ActualizarUsuario } from '../../../aplicacion/casos-uso/ActualizarUsuario'
import { EliminarUsuario } from '../../../aplicacion/casos-uso/EliminarUsuario'
import { ListarUsuarios } from '../../../aplicacion/casos-uso/ListarUsuarios'
import { ObtenerUsuario, UsuarioNoEncontrado } from '../../../aplicacion/casos-uso/ObtenerUsuario'
import { CorreoYaRegistrado } from '../../../aplicacion/casos-uso/RegistrarUsuario'
import { esRol } from '../../../dominio/modelo/Usuario'
import type { ServicioClaves, UsuarioDAO } from '../../../dominio/puertos'
import { exigirSesion } from './autenticacion'

export interface DependenciasUsuarios {
  usuarios: UsuarioDAO
  claves: ServicioClaves
  tokens: import('../../../dominio/puertos').ServicioTokens
}

function idValido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0
}

function validarCambios(cuerpo: unknown): Record<string, unknown> | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  const cambios: Record<string, unknown> = {}
  if (datos['nombre'] !== undefined) {
    if (typeof datos['nombre'] !== 'string' || datos['nombre'].trim().length < 2) return 'nombre inválido'
    cambios['nombre'] = datos['nombre']
  }
  if (datos['correo'] !== undefined) {
    if (typeof datos['correo'] !== 'string' || !/^\S+@\S+\.\S+$/.test(datos['correo'])) return 'correo inválido'
    cambios['correo'] = datos['correo']
  }
  if (datos['clave'] !== undefined) {
    if (typeof datos['clave'] !== 'string' || datos['clave'].length < 8) return 'clave requerida (mínimo 8 caracteres)'
    cambios['clave'] = datos['clave']
  }
  if (datos['rol'] !== undefined) {
    if (!esRol(datos['rol'])) return 'rol inválido'
    cambios['rol'] = datos['rol']
  }
  if (datos['activo'] !== undefined) {
    if (typeof datos['activo'] !== 'boolean') return 'activo debe ser booleano'
    cambios['activo'] = datos['activo']
  }
  return cambios
}

export function rutasUsuarios(deps: DependenciasUsuarios): Router {
  const rutas = Router()
  const sesion = exigirSesion(deps.tokens)

  rutas.get('/', sesion, async (_req, res, next) => {
    try {
      res.json(await new ListarUsuarios(deps.usuarios).ejecutar())
    } catch (error) {
      next(error)
    }
  })

  rutas.get('/:id', sesion, async (req, res, next) => {
    try {
      if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
      res.json(await new ObtenerUsuario(deps.usuarios).ejecutar(req.params['id']))
    } catch (error) {
      if (error instanceof UsuarioNoEncontrado) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  rutas.patch('/:id', sesion, async (req, res, next) => {
    try {
      if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
      const cambios = validarCambios(req.body)
      if (typeof cambios === 'string' || Object.keys(cambios).length === 0) {
        return void res.status(400).json({ error: typeof cambios === 'string' ? cambios : 'debe enviar cambios' })
      }
      const usuario = await new ActualizarUsuario(deps.usuarios, deps.claves).ejecutar(req.params['id'], cambios)
      res.json({ id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, activo: usuario.activo })
    } catch (error) {
      if (error instanceof UsuarioNoEncontrado) return void res.status(404).json({ error: error.message })
      if (error instanceof CorreoYaRegistrado) return void res.status(409).json({ error: error.message })
      next(error)
    }
  })

  rutas.delete('/:id', sesion, async (req, res, next) => {
    try {
      if (!idValido(req.params['id'])) return void res.status(400).json({ error: 'id requerido' })
      await new EliminarUsuario(deps.usuarios).ejecutar(req.params['id'])
      res.status(204).send()
    } catch (error) {
      if (error instanceof UsuarioNoEncontrado) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  return rutas
}