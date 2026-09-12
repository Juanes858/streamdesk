# HelpDesk UAM

Sistema de gestión de tickets de soporte interno de la Universidad Autónoma de
Manizales. Node.js + TypeScript estricto, Express, Prisma y PostgreSQL.

> **Qué problema resuelve** — hoy el soporte se opera sobre un buzón de correo
> compartido y una hoja de cálculo: no se sabe cuántas solicitudes hay abiertas,
> quién responde por cada una, ni cuáles están a punto de incumplir su SLA. El
> producto convierte el escalamiento en una regla del sistema y no en un acto de
> memoria de una persona. Ver `docs/vision-helpdesk-uam.md`.

Estado actual: **autenticación, usuarios, cuentas de plataformas y tickets**.
El catálogo de SLA y el escalamiento automático todavía son capacidades futuras.

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

### Configurar Swagger paso a paso

Swagger ya está integrado en la capa HTTP mediante `swagger-ui-express`. La
configuración se divide en dos piezas:

1. **Definir el contrato** en `src/infraestructura/http/openapi.ts`. Allí se
   describen la información de la API, los endpoints, cuerpos de entrada,
   respuestas, esquemas y el esquema de seguridad JWT.
2. **Publicar el contrato** en `src/infraestructura/http/servidor.ts`. El
   servidor expone el JSON en `/api/openapi.json` y la interfaz interactiva en
   `/api/docs`.

Para configurar el proyecto desde cero:

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run dev
```

Después de iniciar el servidor, verifica la integración en este orden:

1. Abre `http://localhost:3001/api/openapi.json`. Debe aparecer un documento
   OpenAPI en formato JSON.
2. Abre `http://localhost:3001/api/docs`. Debe aparecer Swagger UI con las
   operaciones agrupadas por etiquetas.
3. Ejecuta `GET /salud` desde Swagger con el servidor configurado como
   `http://localhost:3001/api`.
4. Inicia sesión con el administrador inicial (`admin@uam.edu.co` /
   `Admin12345!`) o con un administrador existente.
5. Ejecuta `POST /auth/registro` para crear un usuario. Esta operación requiere
   una sesión con rol `ADMINISTRADOR`.
6. Ejecuta `POST /auth/login`, copia el campo `token` de la respuesta y pulsa
   **Authorize** en Swagger. Introduce el token sin escribir `Bearer` si la
   interfaz solicita únicamente el valor del token.
7. Ejecuta `GET /auth/perfil`. Swagger enviará el token como
   `Authorization: Bearer <token>` y la respuesta debe contener el usuario.

Al iniciar la aplicación se crea automáticamente un administrador si no existe
el correo configurado en `ADMIN_CORREO`. Por defecto es
`admin@uam.edu.co` con clave `Admin12345!`. Cambia estos valores en `.env` antes
de usar el sistema fuera del entorno local.

Para agregar un endpoint nuevo, primero implementa la ruta en
`src/infraestructura/http`, después agrega su descripción en `openapi.ts` bajo
`paths` y finalmente define los esquemas reutilizables en `components.schemas`
cuando corresponda. Mantén el prefijo `/api` en mente: OpenAPI usa rutas
relativas como `/auth/login`, pero la URL completa es `/api/auth/login`.

Si el puerto de `.env` es distinto de `3001`, reemplaza ese valor en la URL de
Swagger y en el campo `servers` de `openapi.ts` cuando la API se publique detrás
de un host o prefijo diferente.

## API

Todo cuelga del prefijo `/api`.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/salud` | Verificación de vida, sin tocar la base de datos |
| `GET` | `/api/docs` | Swagger UI con la explicación de cada endpoint |
| `POST` | `/api/auth/registro` | `{ nombre, correo, clave, rol? }` → 201; requiere sesión de administrador |
| `POST` | `/api/auth/login` | `{ correo, clave }` → `{ token, usuario }` |
| `GET` | `/api/auth/perfil` | Usuario de la sesión; requiere `Authorization: Bearer <token>` |
| `GET` | `/api/usuarios` | Lista usuarios; requiere admin |
| `GET` | `/api/usuarios/:id` | Consulta un usuario; requiere admin |
| `PATCH` | `/api/usuarios/:id` | Actualiza datos de usuario; requiere admin |
| `DELETE` | `/api/usuarios/:id` | Elimina un usuario; requiere admin |
| `POST` | `/api/cuentas` | Registra una cuenta de plataforma; requiere admin |
| `GET` | `/api/cuentas?usuarioId=:id` | Lista cuentas de un usuario; requiere token |
| `GET` | `/api/cuentas/:id` | Consulta una cuenta; requiere token |
| `PATCH` | `/api/cuentas/:id` | Actualiza una cuenta; requiere admin |
| `DELETE` | `/api/cuentas/:id` | Elimina una cuenta; requiere admin |
| `POST` | `/api/tickets` | Crea un ticket; requiere token |
| `GET` | `/api/tickets?estado=NUEVO` | Lista tickets, con filtros opcionales; requiere token |
| `GET` | `/api/tickets/:id` | Consulta un ticket; requiere token |
| `PATCH` | `/api/tickets/:id` | Actualiza asesor, cuenta, prioridad, estado o descripción; requiere admin/asesor |
| `DELETE` | `/api/tickets/:id` | Elimina un ticket; requiere admin/asesor |

Roles: `CLIENTE` (por defecto), `ASESOR`, `ADMINISTRADOR`.
El token es un JWT HS256 con vigencia de 8 horas.

Permisos actuales:

- `ADMINISTRADOR`: crea y gestiona usuarios, cuentas y tickets.
- `ASESOR`: consulta sus tickets asignados y puede actualizarlos o eliminarlos.
- `CLIENTE`: inicia sesión, consulta su perfil, sus cuentas y sus tickets, y puede crear tickets vinculados a sus propias cuentas.

---

## Estructura y por qué es así

```
src/
├── dominio/              El negocio. No importa nada de afuera.
│   ├── modelo/           Usuario · Cuenta · Ticket · DTOs y estados
│   └── puertos/          DAOs · ServicioClaves · ServicioTokens
│
├── aplicacion/
│   └── casos-uso/        Casos de usuario, cuenta y ticket
│
├── infraestructura/      Todo lo que se puede cambiar sin cambiar el negocio.
│   ├── persistencia/     DAOs Prisma · cliente de Prisma
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

### Paso a paso de una petición de Ticket

1. El cliente envía una petición a `/api/tickets` con su JWT y JSON.
2. `servidor.ts` monta `rutasTickets`; `exigirSesion` valida el token antes de ejecutar la operación.
3. `tickets.ts` valida el JSON como dato de frontera y convierte los valores a los tipos del dominio.
4. Un caso de uso (`CrearTicket`, `ListarTickets`, `ObtenerTicket`, `ActualizarTicket` o `EliminarTicket`) aplica la operación y sus reglas, sin conocer Express ni Prisma.
5. El caso de uso llama al puerto `TicketDAO`, declarado en `dominio/puertos`.
6. `TicketDAOPrisma` traduce ese puerto a consultas Prisma y convierte las filas a la entidad `Ticket`.
7. `main.ts` conecta las interfaces con implementaciones concretas. Es la raíz de composición y el único lugar que instancia Prisma, DAOs, seguridad y casos de uso.

Para cambiar una regla de negocio, empieza por `dominio/` o `aplicacion/casos-uso/`. Para cambiar PostgreSQL o Prisma, cambia `infraestructura/persistencia/`. Para cambiar el formato HTTP, cambia `infraestructura/http/rutas/` y su entrada correspondiente en `openapi.ts`.

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

- **Pruebas rápidas.** El proyecto está preparado para pruebas unitarias de casos de uso contra repositorios en memoria y hashes falsos. Actualmente no hay archivos de prueba versionados; agrega la suite antes de depender de `npm test` como puerta de calidad.
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

### Preparar un commit

Antes de crear el commit, ejecuta:

```bash
git diff --check
npm run build
npm run arquitectura
npx prisma validate
npx prisma migrate status
```

Revisa el resultado y confirma que `.env` no aparece en `git status`:

```bash
git status --short
git diff --stat
git diff
```

El archivo `.env.example` contiene valores de desarrollo para documentar la
configuración, pero `.env` debe permanecer sin versionar. Cambia `JWT_SECRET`,
`ADMIN_CLAVE` y `DATABASE_URL` antes de cualquier entorno compartido.

Después puedes crear el commit y subir la rama:

```bash
git add .
git commit -m "feat: completar API de usuarios cuentas y tickets"
git push origin feature/creacion-endpoints
```

Para integrar la rama en `main`, usa un pull request o, si el flujo del equipo
lo permite:

```bash
git checkout main
git pull origin main
git merge feature/creacion-endpoints
git push origin main
```

## Configuración

`.env` (a partir de `.env.example`, no se versiona):

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. Por defecto apunta al contenedor en el puerto 5888. |
| `JWT_SECRET` | Clave de firma de los tokens. **Cambiar en producción.** |
| `PORT` | Puerto del servidor HTTP (3001 por defecto). |
