# HelpDesk UAM

Sistema de gestión de tickets de soporte interno de la Universidad Autónoma de
Manizales. Node.js + TypeScript estricto, Express, Prisma y PostgreSQL.

> **Qué problema resuelve** — hoy el soporte se opera sobre un buzón de correo
> compartido y una hoja de cálculo: no se sabe cuántas solicitudes hay abiertas,
> quién responde por cada una, ni cuáles están a punto de incumplir su SLA. El
> producto convierte el escalamiento en una regla del sistema y no en un acto de
> memoria de una persona. Ver `docs/vision-helpdesk-uam.md`.

Estado actual: **autenticación y registro de usuarios** (F19, F20). Sobre esa
base entran después tickets, catálogo de SLA y escalamiento automático.

---

## Arrancar

```bash
npm install          # instala y genera el cliente de Prisma
cp .env.example .env
npm run db:up        # PostgreSQL en localhost:5888 (Docker)
npm run db:migrate   # aplica las migraciones
npm run dev          # http://localhost:3001/api
```

Documentación interactiva de la API: **http://localhost:3001/api/docs**
(el contrato en crudo está en `/api/openapi.json`).

## API

Todo cuelga del prefijo `/api`.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/salud` | Verificación de vida, sin tocar la base de datos |
| `GET` | `/api/docs` | Swagger UI con la explicación de cada endpoint |
| `POST` | `/api/auth/registro` | `{ nombre, correo, clave, rol? }` → 201 con el usuario creado |
| `POST` | `/api/auth/login` | `{ correo, clave }` → `{ token, usuario }` |
| `GET` | `/api/auth/perfil` | Usuario de la sesión; requiere `Authorization: Bearer <token>` |

Roles: `SOLICITANTE` (por defecto), `AGENTE`, `COORDINADOR`, `ADMINISTRADOR`.
El token es un JWT HS256 con vigencia de 8 horas.

---

## Estructura y por qué es así

```
src/
├── dominio/              El negocio. No importa nada de afuera.
│   ├── modelo/           Usuario · UsuarioDTO · Rol · Ticket
│   └── puertos/          UsuarioDAO · ServicioClaves · ServicioTokens
│
├── aplicacion/
│   └── casos-uso/        RegistrarUsuario · IniciarSesion
│
├── infraestructura/      Todo lo que se puede cambiar sin cambiar el negocio.
│   ├── persistencia/     UsuarioDAOPrisma · cliente de Prisma
│   ├── seguridad/        ClavesBcrypt · TokensJwt
│   └── http/             servidor.ts · openapi.ts · rutas/
│
└── main.ts               Raíz de composición: el único archivo con `new` de concreciones.

tests/
├── unidad/               Dominio y casos de uso, sin base de datos ni red
└── dobles/               Repositorio en memoria · hash falso
```

### La regla que lo sostiene

Una sola flecha, siempre hacia adentro:

```
infraestructura ──▶ aplicacion ──▶ dominio
                                     ▲
      (implementa los puertos que el dominio declara)
```

`dominio/` declara **qué necesita** en forma de interfaces (`puertos/`), con el
vocabulario del negocio: `guardar`, `porCorreo`, `cifrar`, `emitir`. Nunca
`ejecutarSql` ni `bcryptHash`. `infraestructura/` provee **cómo** se hace, y
`main.ts` es el único lugar donde las dos mitades se encuentran.

Esto no es decoración: es la restricción **R04** de la entrega del corte 2, y se
verifica sin confiar en la disciplina de nadie:

```bash
npm run arquitectura   # falla si el dominio o la aplicación importan infraestructura
```

### Por qué esta estructura y no otra

Se evaluaron cuatro alternativas (`docs/estructura-carpetas-node.md`):

| | Plana | Por capa técnica (MVC) | **Hexagonal** | Por módulo |
|---|---|---|---|---|
| ¿Protege el dominio? | No | No | **Sí, verificable** | Sí |
| Pruebas sin BD ni red | No | Difícil | **Sí** | Sí |
| Cumple R04 | No | No | **Sí** | Sí |
| Costo de entrada | Nulo | Bajo | Medio | Alto |

La plana no tiene fronteras: en cuanto `usuarios.ts` importa `db.ts`, el
proyecto queda casado con el motor. La de capas técnicas (`controllers/`,
`services/`, `models/`) es familiar, pero **no impide** que `models/` importe
`repositories/`: la inversión de dependencias queda como buena intención. La
por módulo es el paso siguiente, y hoy sobra: cuesta cuatro copias de la misma
estructura para un equipo de dos personas.

La hexagonal se eligió porque el producto **es** sus reglas de negocio —el
cálculo de vencimiento de SLA y la política de escalamiento—, y esas reglas
tienen que poder probarse en milisegundos y sobrevivir a un cambio de motor de
base de datos o de proveedor de correo.

### Qué compra en la práctica

- **Pruebas rápidas.** `npm test` corre los casos de uso contra un repositorio en memoria y un hash falso: sin Docker, sin red, en milisegundos. La suite del dominio no espera a PostgreSQL.
- **Cambiar de tecnología sin tocar el negocio.** Sustituir Prisma por otro ORM, o bcrypt/JWT por el directorio LDAP institucional que exige R01, es escribir un adaptador nuevo en `infraestructura/` y cambiar una línea de `main.ts`. `dominio/` y `aplicacion/` no se enteran.
- **Un lugar obvio para cada cosa.** Una regla de negocio va a `dominio/`; una decisión de orquestación, a `aplicacion/casos-uso/`; un detalle de HTTP, SQL o correo, a `infraestructura/`. Cuando entren los patrones del corte 3 (Strategy para la política de asignación, Adapter para LDAP y SMTP, State para el ciclo de vida del ticket) ya hay dónde ponerlos.

### Nomenclatura: cuándo `DTO`, cuándo `DAO` y cuándo nada

El sufijo dice **qué clase de cosa es** la interfaz, para no tener que abrirla:

| Sufijo | Significa | Ejemplos |
|---|---|---|
| `...DTO` | *Data Transfer Object*: una estructura de datos que **cruza una frontera** (HTTP ⇄ aplicación). Solo campos, sin comportamiento. | `UsuarioDTO`, `RegistroDTO`, `LoginDTO`, `SesionDTO`, `CredencialDTO` |
| `...DAO` | *Data Access Object*: el contrato de **acceso a datos**. Declara `guardar`, `porCorreo`, `porId`; nunca `ejecutarSql`. | `UsuarioDAO` (puerto) · `UsuarioDAOPrisma`, `UsuarioDAOEnMemoria` (implementaciones) |
| *sin sufijo* | **Entidades del dominio** y **puertos de comportamiento**, que no son ni datos en tránsito ni persistencia. | `Usuario`, `Ticket`, `Rol` · `ServicioClaves`, `ServicioTokens` |

La distinción que más se usa a diario es la primera pareja: `Usuario` **tiene**
`claveHash`; `UsuarioDTO` **no**. Por eso todo lo que sale por HTTP pasa por
`aUsuarioDTO()`: es imposible filtrar el hash por descuido, porque el tipo de
la respuesta no tiene ese campo. Los nombres de los esquemas en Swagger son los
mismos (`UsuarioDTO`, `SesionDTO`, `ErrorDTO`), así que lo que se lee en
`/api/docs` se busca por el mismo nombre en el código.

Una entidad **no** lleva sufijo a propósito: `Usuario` es el concepto del
negocio, no un formato de transporte ni una fila de tabla. Ponerle `DTO` diría
algo falso sobre él. `Ticket` recibirá su `TicketDTO` cuando exista la ruta HTTP
que lo exponga, no antes.

### Convenciones

- **Nombres en el idioma del negocio.** `EscalarVencidos`, no `TicketProcessor`.
- **Un archivo, un concepto exportado.** Barrel files (`index.ts` que reexporta) solo en `dominio/puertos/`; en el resto crean ciclos.
- **`tests/` espeja `src/`.** Encontrar la prueba de un archivo no debería requerir buscarla.
- **Nada de `utils/` ni `helpers/`.** Si algo no tiene dónde ir, es que le falta un nombre.
- **Validación en la frontera.** Lo que entra por HTTP es `unknown` hasta que se prueba lo contrario; el dominio recibe datos ya validados.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga en caliente |
| `npm test` | Pruebas unitarias |
| `npm run cov` | Pruebas con cobertura |
| `npm run build` / `npm start` | Compilar a `dist/` y ejecutar |
| `npm run db:up` / `db:down` | Levantar y bajar PostgreSQL |
| `npm run db:migrate` | Crear y aplicar migraciones |
| `npm run db:studio` | Explorador visual de los datos |
| `npm run arquitectura` | Verificar que el dominio no importa infraestructura |

## Configuración

`.env` (a partir de `.env.example`, no se versiona):

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. Por defecto apunta al contenedor en el puerto 5888. |
| `JWT_SECRET` | Clave de firma de los tokens. **Cambiar en producción.** |
| `PORT` | Puerto del servidor HTTP (3001 por defecto). |
