import 'dotenv/config'
// Raíz de composición: el único archivo que puede importarlo todo y hacer `new`
// de implementaciones concretas.
import { RegistrarUsuario } from './aplicacion/casos-uso/RegistrarUsuario'
import { IniciarSesion } from './aplicacion/casos-uso/IniciarSesion'
import { prisma } from './infraestructura/persistencia/prisma'
import { UsuarioDAOPrisma } from './infraestructura/persistencia/UsuarioDAOPrisma'
import { CuentaDAOPrisma } from './infraestructura/persistencia/CuentaDAOPrisma'
import { TicketDAOPrisma } from './infraestructura/persistencia/TicketDAOPrisma'
import { ClavesBcrypt } from './infraestructura/seguridad/ClavesBcrypt'
import { TokensJwt } from './infraestructura/seguridad/TokensJwt'
import { crearServidor } from './infraestructura/http/servidor'

const secreto = process.env['JWT_SECRET']
if (!secreto) throw new Error('Falta JWT_SECRET (copia .env.example a .env)')

// Adaptadores concretos: implementan los puertos del dominio con Prisma,
// bcrypt y JWT. Solo la raíz de composición conoce estas implementaciones.
const usuarios = new UsuarioDAOPrisma(prisma)
const cuentas = new CuentaDAOPrisma(prisma)
const tickets = new TicketDAOPrisma(prisma)
const claves = new ClavesBcrypt()
const tokens = new TokensJwt(secreto)

// El servidor recibe contratos abstractos, por eso HTTP y aplicación no
// necesitan saber qué ORM o proveedor criptográfico se está utilizando.
const app = crearServidor({
  usuarios,
  cuentas,
  tickets,
  claves,
  tokens,
  registrarUsuario: new RegistrarUsuario(usuarios, claves),
  iniciarSesion: new IniciarSesion(usuarios, claves, tokens),
})

const puerto = Number(process.env['PORT'] ?? 3000)

async function asegurarAdministrador(): Promise<void> {
  // El bootstrap es idempotente: no duplica el admin y repara su rol si fue
  // desactivado accidentalmente. La clave se cifra antes de guardarla.
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

  // La consulta confirma que la conexión funciona sin imprimir hashes ni
  // información sensible en los logs.
  await prisma.usuario.count()

  // El servidor solo se expone después de confirmar la conexión con la BD.
  app.listen(puerto, () => console.log(`HelpDesk UAM escuchando en http://localhost:${puerto}/api · docs en /api/docs`))
}

// Un error de conexión impide arrancar la aplicación y deja el diagnóstico en consola.
main().catch((error: unknown) => {
  console.error('No se pudo consultar la base de datos:', error)
  process.exitCode = 1
})
