import { Router } from 'express'
import type { RequestHandler } from 'express'
import { aUsuarioDTO, esRol } from '../../../dominio/modelo/Usuario'
import type { Rol } from '../../../dominio/modelo/Usuario'
import type { CredencialDTO, ServicioTokens, UsuarioDAO } from '../../../dominio/puertos'
import { CorreoYaRegistrado, RegistrarUsuario } from '../../../aplicacion/casos-uso/RegistrarUsuario'
import type { RegistroDTO } from '../../../aplicacion/casos-uso/RegistrarUsuario'
import { CredencialesInvalidas, IniciarSesion } from '../../../aplicacion/casos-uso/IniciarSesion'

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Datos de entrada del inicio de sesión. */
export interface LoginDTO {
  correo: string
  clave: string
}

/** Validación de frontera: lo que entra por HTTP es `unknown` hasta que se prueba lo contrario. */
function validarRegistro(cuerpo: unknown): RegistroDTO | string {
  const d = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof d['nombre'] !== 'string' || d['nombre'].trim().length < 2) return 'nombre requerido (mínimo 2 caracteres)'
  if (typeof d['correo'] !== 'string' || !CORREO.test(d['correo'].trim())) return 'correo inválido'
  if (typeof d['clave'] !== 'string' || d['clave'].length < 8) return 'clave requerida (mínimo 8 caracteres)'
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
  tokens: ServicioTokens
  usuarios: UsuarioDAO
}

function leerToken(authorization: string | undefined): string {
  const valor = authorization?.trim() ?? ''
  return valor.replace(/^Bearer\s+/i, '').trim()
}

/** Exige un token válido y deja la credencial en `res.locals.credencial`. */
export function exigirSesion(tokens: ServicioTokens): RequestHandler {
  return (req, res, next) => {
    const credencial = tokens.verificar(leerToken(req.headers.authorization))
    if (!credencial) return void res.status(401).json({ error: 'Sesión requerida' })
    res.locals['credencial'] = credencial
    next()
  }
}

/** Exige sesión y uno de los roles indicados. */
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

  // Crear usuarios es una operación administrativa; login y perfil son los
  // únicos puntos de autenticación disponibles para cualquier usuario.
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
    // El token solo identifica al usuario; el perfil se vuelve a leer de la
    // BD para reflejar cambios de rol o desactivación inmediatamente.
    try {
      const { id } = res.locals['credencial'] as CredencialDTO
      const usuario = await deps.usuarios.porId(id)
      if (!usuario) return void res.status(404).json({ error: 'Usuario no encontrado' })
      res.json(aUsuarioDTO(usuario))
    } catch (error) {
      next(error)
    }
  })

  return rutas
}
