import 'dotenv/config'
import { RegistrarUsuario } from './aplicacion/casos-uso/RegistrarUsuario'
import { IniciarSesion } from './aplicacion/casos-uso/IniciarSesion'
import { CambiarClave } from './aplicacion/casos-uso/CambiarClave'
import { prisma } from './infraestructura/persistencia/prisma'
import { UsuarioDAOPrisma } from './infraestructura/persistencia/UsuarioDAOPrisma'
import { CuentaDAOPrisma } from './infraestructura/persistencia/CuentaDAOPrisma'
import { TicketDAOPrisma } from './infraestructura/persistencia/TicketDAOPrisma'
import { ClavesBcrypt } from './infraestructura/seguridad/ClavesBcrypt'
import { TokensJwt } from './infraestructura/seguridad/TokensJwt'
import { crearServidor } from './infraestructura/http/servidor'
import { PlataformaDAOPrisma } from './infraestructura/persistencia/PlataformaDAOPrisma'

const secreto = process.env['JWT_SECRET']
if (!secreto) throw new Error('Falta JWT_SECRET (copia .env.example a .env)')

const usuarios = new UsuarioDAOPrisma(prisma)
const cuentas = new CuentaDAOPrisma(prisma)
const tickets = new TicketDAOPrisma(prisma)
const claves = new ClavesBcrypt()
const tokens = new TokensJwt(secreto)
const plataformas = new PlataformaDAOPrisma(prisma)

const app = crearServidor({
  usuarios,
  cuentas,
  tickets,
  plataformas,
  claves,
  tokens,
  registrarUsuario: new RegistrarUsuario(usuarios, claves),
  iniciarSesion: new IniciarSesion(usuarios, claves, tokens),
  cambiarClave: new CambiarClave(usuarios, claves),
})

const puerto = Number(process.env['PORT'] ?? 3000)

async function asegurarAdministrador(): Promise<void> {
  const correo = (process.env['ADMIN_CORREO'] ?? 'admin@uam.edu.co').trim().toLowerCase()
  const existente = await usuarios.porCorreo(correo)
  if (existente) {
    if (existente.rol !== 'ADMINISTRADOR' || !existente.activo) {
      await usuarios.actualizar(existente.id, { rol: 'ADMINISTRADOR', activo: true })
      console.log(`Administrador habilitado: ${correo}`)
    }
    return
  }
  const nombre = process.env['ADMIN_NOMBRE'] ?? 'Administrador del sistema'
  const clave = process.env['ADMIN_CLAVE'] ?? 'Admin12345!'
  await usuarios.guardar({
    nombre,
    correo,
    claveHash: await claves.cifrar(clave),
    rol: 'ADMINISTRADOR',
    activo: true,
  })
  console.log(`Administrador inicial creado: ${correo}`)
}

async function main(): Promise<void> {
  await asegurarAdministrador()
  await prisma.usuario.count()
  app.listen(puerto, () => {
    console.log(`Streamdesk escuchando en http://localhost:${puerto}/api`)
    console.log(`Docs en /api/docs`)
  })
}

main().catch((error: unknown) => {
  console.error('No se pudo consultar la base de datos:', error)
  process.exitCode = 1
})