import 'dotenv/config'
// Raíz de composición: el único archivo que puede importarlo todo y hacer `new`
// de implementaciones concretas.
import { RegistrarUsuario } from './aplicacion/casos-uso/RegistrarUsuario'
import { IniciarSesion } from './aplicacion/casos-uso/IniciarSesion'
import { prisma } from './infraestructura/persistencia/prisma'
import { UsuarioDAOPrisma } from './infraestructura/persistencia/UsuarioDAOPrisma'
import { ClavesBcrypt } from './infraestructura/seguridad/ClavesBcrypt'
import { TokensJwt } from './infraestructura/seguridad/TokensJwt'
import { crearServidor } from './infraestructura/http/servidor'

const secreto = process.env['JWT_SECRET']
if (!secreto) throw new Error('Falta JWT_SECRET (copia .env.example a .env)')

const usuarios = new UsuarioDAOPrisma(prisma)
const claves = new ClavesBcrypt()
const tokens = new TokensJwt(secreto)

const app = crearServidor({
  usuarios,
  tokens,
  registrarUsuario: new RegistrarUsuario(usuarios, claves),
  iniciarSesion: new IniciarSesion(usuarios, claves, tokens),
})

const puerto = Number(process.env['PORT'] ?? 3000)

async function main(): Promise<void> {
  // Verifica la conexión y muestra los usuarios antes de iniciar el servidor HTTP.
  const usuariosEnLaBase = await prisma.usuario.findMany()
  console.log('Usuarios en la base de datos:', usuariosEnLaBase)

  // El servidor solo se expone cuando la consulta de Prisma finalizó correctamente.
  app.listen(puerto, () => console.log(`HelpDesk UAM escuchando en http://localhost:${puerto}/api · docs en /api/docs`))
}

// Un error de conexión impide arrancar la aplicación y deja el diagnóstico en consola.
main().catch((error: unknown) => {
  console.error('No se pudo consultar la base de datos:', error)
  process.exitCode = 1
})
