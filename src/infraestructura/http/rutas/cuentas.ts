import { Router } from 'express'
import { aCuentaDTO } from '../../../dominio/modelo/Cuenta'
import { ActualizarCuenta, CuentaNoEncontrada } from '../../../aplicacion/casos-uso/ActualizarCuenta'
import { EliminarCuenta } from '../../../aplicacion/casos-uso/EliminarCuenta'
import { RegistrarCuenta, UsuarioCuentaNoExiste } from '../../../aplicacion/casos-uso/RegistrarCuenta'
import type { CuentaDAO, ServicioClaves, ServicioTokens, UsuarioDAO } from '../../../dominio/puertos'
import { exigirRoles, exigirSesion } from './autenticacion'

export interface DependenciasCuentas {
  cuentas: CuentaDAO
  usuarios: UsuarioDAO
  claves: ServicioClaves
  tokens: ServicioTokens
}

function validarRegistro(cuerpo: unknown): { usuarioId: string; plataformaId: string; correo: string; clave: string; fechaInicio: Date; fechaFin: Date } | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof datos['usuarioId'] !== 'string' || !datos['usuarioId'].trim()) return 'usuarioId requerido'
  if (typeof datos['plataformaId'] !== 'string' || !datos['plataformaId'].trim()) return 'plataformaId requerida'
  if (typeof datos['correo'] !== 'string' || !/^\S+@\S+\.\S+$/.test(datos['correo'])) return 'correo inválido'
  if (typeof datos['clave'] !== 'string' || datos['clave'].length < 8) return 'clave requerida (mínimo 8 caracteres)'
  const fechaInicio = new Date(typeof datos['fechaInicio'] === 'string' ? datos['fechaInicio'] : '')
  const fechaFin = new Date(typeof datos['fechaFin'] === 'string' ? datos['fechaFin'] : '')
  if (Number.isNaN(fechaInicio.getTime())) return 'fechaInicio inválida'
  if (Number.isNaN(fechaFin.getTime()) || fechaFin <= fechaInicio) return 'fechaFin inválida'
  return { usuarioId: datos['usuarioId'], plataformaId: datos['plataformaId'], correo: datos['correo'], clave: datos['clave'], fechaInicio, fechaFin }
}

function validarCambios(cuerpo: unknown): Parameters<ActualizarCuenta['ejecutar']>[1] | string {
  const datos = (cuerpo ?? {}) as Record<string, unknown>
  const cambios: Parameters<ActualizarCuenta['ejecutar']>[1] = {}
  if (datos['plataformaId'] !== undefined) {
    if (typeof datos['plataformaId'] !== 'string' || !datos['plataformaId'].trim()) return 'plataformaId inválida'
    cambios.plataformaId = datos['plataformaId']
  }
  if (datos['correo'] !== undefined) {
    if (typeof datos['correo'] !== 'string' || !/^\S+@\S+\.\S+$/.test(datos['correo'])) return 'correo inválido'
    cambios.correo = datos['correo']
  }
  if (datos['clave'] !== undefined) {
    if (typeof datos['clave'] !== 'string' || datos['clave'].length < 8) return 'clave requerida (mínimo 8 caracteres)'
    cambios.clave = datos['clave']
  }
  if (datos['estado'] !== undefined) {
    if (datos['estado'] !== 'ACTIVA' && datos['estado'] !== 'REPORTADA' && datos['estado'] !== 'VENCIDA') return 'estado inválido'
    cambios.estado = datos['estado']
  }
  for (const campo of ['fechaInicio', 'fechaFin'] as const) {
    if (datos[campo] !== undefined) {
      const fecha = new Date(typeof datos[campo] === 'string' ? datos[campo] : '')
      if (Number.isNaN(fecha.getTime())) return `${campo} inválida`
      cambios[campo] = fecha
    }
  }
  if (cambios.fechaInicio && cambios.fechaFin && cambios.fechaFin <= cambios.fechaInicio) return 'fechaFin inválida'
  return cambios
}

export function rutasCuentas(deps: DependenciasCuentas): Router {
  const rutas = Router()
  // Leer cuentas depende de la identidad del token; escribirlas depende del rol.
  const sesion = exigirSesion(deps.tokens)
  const administrador = exigirRoles(deps.tokens, 'ADMINISTRADOR')

  rutas.post('/', administrador, async (req, res, next) => {
    try {
      const datos = validarRegistro(req.body)
      if (typeof datos === 'string') return void res.status(400).json({ error: datos })
      const cuenta = await new RegistrarCuenta(deps.cuentas, deps.usuarios, deps.claves).ejecutar(datos)
      res.status(201).json(aCuentaDTO(cuenta))
    } catch (error) {
      if (error instanceof UsuarioCuentaNoExiste) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  rutas.get('/', sesion, async (req, res, next) => {
    try {
      const credencial = res.locals['credencial'] as { id: string; rol: string }
      const usuarioId = credencial.rol === 'ADMINISTRADOR'
        ? typeof req.query['usuarioId'] === 'string' ? req.query['usuarioId'] : undefined
        : credencial.id
      if (!usuarioId) return void res.status(400).json({ error: 'usuarioId requerido' })
      res.json((await deps.cuentas.porUsuario(usuarioId)).map(aCuentaDTO))
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
      const credencial = res.locals['credencial'] as { id: string; rol: string }
      if (credencial.rol !== 'ADMINISTRADOR' && cuenta.usuarioId !== credencial.id) {
        return void res.status(403).json({ error: 'No puede consultar esta cuenta' })
      }
      res.json(aCuentaDTO(cuenta))
    } catch (error) {
      next(error)
    }
  })

  rutas.patch('/:id', administrador, async (req, res, next) => {
    const id = req.params['id']
    if (typeof id !== 'string' || !id.trim()) return void res.status(400).json({ error: 'id requerido' })
    const cambios = validarCambios(req.body)
    if (typeof cambios === 'string' || Object.keys(cambios).length === 0) {
      return void res.status(400).json({ error: typeof cambios === 'string' ? cambios : 'debe enviar cambios' })
    }
    try {
      const cuenta = await new ActualizarCuenta(deps.cuentas, deps.claves).ejecutar(id, cambios)
      res.json(aCuentaDTO(cuenta))
    } catch (error) {
      if (error instanceof CuentaNoEncontrada) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  rutas.delete('/:id', administrador, async (req, res, next) => {
    const id = req.params['id']
    if (typeof id !== 'string' || !id.trim()) return void res.status(400).json({ error: 'id requerido' })
    try {
      await new EliminarCuenta(deps.cuentas).ejecutar(id)
      res.status(204).send()
    } catch (error) {
      if (error instanceof CuentaNoEncontrada) return void res.status(404).json({ error: error.message })
      next(error)
    }
  })

  return rutas
}