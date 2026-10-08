import { Router } from 'express'
import type { RequestHandler } from 'express'
import { aUsuarioDTO, esRol } from '../../../dominio/modelo/Usuario'
import type { Rol } from '../../../dominio/modelo/Usuario'
import type { CredencialDTO, ServicioTokens, UsuarioDAO } from '../../../dominio/puertos'
import { CorreoYaRegistrado, RegistrarUsuario } from '../../../aplicacion/casos-uso/RegistrarUsuario'
import type { RegistroDTO } from '../../../aplicacion/casos-uso/RegistrarUsuario'
import { CredencialesInvalidas, IniciarSesion } from '../../../aplicacion/casos-uso/IniciarSesion'
import { CambiarClave, ClaveActualIncorrecta, UsuarioNoEncontrado } from '../../../aplicacion/casos-uso/CambiarClave'

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface LoginDTO {
  correo: string
  clave: string
}

function validarRegistro(cuerpo: unknown): RegistroDTO | string {
  const d = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof d['nombre'] !== 'string' || d['nombre'].trim().length < 2)
    return 'nombre requerido (minimo 2 caracteres)'
  if (typeof d['correo'] !== 'string' || !CORREO.test(d['correo'].trim()))
    return 'correo inválido'
  if (typeof d['clave'] !== 'string' || d['clave'].length < 8)
    return 'clave requerida (minimo 8 caracteres)'
  const rol: unknown = d['rol'] ?? 'CLIENTE'
  if (!esRol(rol)) return 'rol inválido'
  return { nombre: d['nombre'], correo: d['correo'], clave: d['clave'], rol: rol satisfies Rol }
}

function validarLogin(cuerpo: unknown): LoginDTO | null {
  const d = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof d['correo'] !== 'string' || typeof d['clave'] !== 'string') return null
  return { correo: d['correo'], clave: d['clave'] }
}

export interface DependenciasAutenticacion {
  registrarUsuario: RegistrarUsuario
  iniciarSesion: IniciarSesion
  cambiarClave: CambiarClave
  tokens: ServicioTokens
  usuarios: UsuarioDAO
}

function leerToken(authorization: string | undefined): string {
  const valor = authorization?.trim() ?? ''
  return valor.replace(/^Bearer\s+/i, '').trim()
}

export function exigirSesion(tokens: ServicioTokens): RequestHandler {
  return (req, res, next) => {
    const credencial = tokens.verificar(leerToken(req.headers.authorization))
    if (!credencial) return void res.status(401).json({ error: 'Sesión requerida' })
    res.locals['credencial'] = credencial
    next()
  }
}

export function exigirRoles(tokens: ServicioTokens, ...roles: Rol[]): RequestHandler {
  const sesion = exigirSesion(tokens)
  return (req, res, next) => {
    sesion(req, res, () => {
      const credencial = res.locals['credencial'] as CredencialDTO
      if (!roles.includes(credencial.rol)) return void res.status(403).json({ error: 'Permisos insuficientes' })
      next()
    })
  }
}

export function rutasAutenticacion(deps: DependenciasAutenticacion): Router {
  const rutas = Router()

  rutas.post('/registro', exigirRoles(deps.tokens, 'ADMINISTRADOR'), async (req, res, next) => {
    const datos = validarRegistro(req.body)
    if (typeof datos === 'string') return void res.status(400).json({ error: datos })
    try {
      res.status(201).json(aUsuarioDTO(await deps.registrarUsuario.ejecutar(datos)))
    } catch (error) {
      if (error instanceof CorreoYaRegistrado) return void res.status(409).json({ error: error.message })
      next(error)
    }
  })

  rutas.post('/login', async (req, res, next) => {
    const datos = validarLogin(req.body)
    if (!datos) return void res.status(400).json({ error: 'correo y clave son obligatorios' })
    try {
      res.json(await deps.iniciarSesion.ejecutar(datos.correo, datos.clave))
    } catch (error) {
      if (error instanceof CredencialesInvalidas) return void res.status(401).json({ error: error.message })
      next(error)
    }
  })

  rutas.get('/perfil', exigirSesion(deps.tokens), async (req, res, next) => {
    try {
      const { id } = res.locals['credencial'] as CredencialDTO
      const usuario = await deps.usuarios.porId(id)
      if (!usuario) return void res.status(404).json({ error: 'Usuario no encontrado' })
      res.json(aUsuarioDTO(usuario))
    } catch (error) {
      next(error)
    }
  })

  rutas.patch('/clave', exigirSesion(deps.tokens), async (req, res, next) => {
    const d = (req.body ?? {}) as Record<string, unknown>
    const claveActual = d['claveActual']
    const nuevaClave = d['nuevaClave']

    if (typeof claveActual !== 'string' || claveActual.trim() === '') {
      return void res.status(400).json({ error: 'La clave actual es requerida' })
    }
    if (typeof nuevaClave !== 'string' || nuevaClave.length < 8) {
      return void res.status(400).json({ error: 'La nueva clave debe tener al menos 8 caracteres' })
    }

    try {
      const { id } = res.locals['credencial'] as CredencialDTO
      await deps.cambiarClave.ejecutar({
        usuarioId: id,
        claveActual,
        nuevaClave,
      })
      res.status(200).json({ mensaje: 'Clave actualizada correctamente' })
    } catch (error) {
      if (error instanceof ClaveActualIncorrecta) {
        return void res.status(400).json({ error: error.message })
      }
      if (error instanceof UsuarioNoEncontrado) {
        return void res.status(404).json({ error: error.message })
      }
      next(error)
    }
  })

  return rutas
}