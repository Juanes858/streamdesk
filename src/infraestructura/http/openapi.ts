import { ROLES } from '../../dominio/modelo/Usuario'

const usuario = {
  type: 'object',
  description:
    'Usuario del sistema tal como viaja por HTTP (`UsuarioDTO`): la entidad del dominio sin el hash ' +
    'de la clave, que nunca sale del servidor.',
  properties: {
    id: { type: 'string', format: 'uuid', example: 'cd9c06cf-b57f-4e22-bc47-589a074e8c2c' },
    nombre: { type: 'string', example: 'Ana Agente' },
    correo: { type: 'string', format: 'email', example: 'ana@uam.edu.co' },
    rol: { type: 'string', enum: ROLES, example: 'AGENTE' },
    activo: { type: 'boolean', example: true },
  },
  required: ['id', 'nombre', 'correo', 'rol', 'activo'],
}

const sesion = {
  type: 'object',
  description: 'Resultado de un inicio de sesión: el token y el usuario dueño de la sesión.',
  properties: {
    token: { type: 'string', description: 'JWT para el encabezado `Authorization: Bearer <token>`.' },
    usuario: { $ref: '#/components/schemas/UsuarioDTO' },
  },
  required: ['token', 'usuario'],
}

const error = {
  type: 'object',
  properties: { error: { type: 'string', example: 'Correo o clave incorrectos' } },
  required: ['error'],
}

const respuestaError = (description: string, ejemplo: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorDTO' }, example: { error: ejemplo } } },
})

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'HelpDesk UAM · API',
    version: '1.0.0',
    description: [
      'API del sistema de gestión de tickets de soporte de la Universidad Autónoma de Manizales.',
      '',
      'Cubre por ahora la **autenticación y el registro de usuarios** (características F19 y F20 del',
      'documento de visión): quién entra al sistema y con qué rol. Las capacidades de tickets, SLA y',
      'escalamiento se agregarán sobre esta misma base.',
      '',
      '**Cómo probar desde aquí**: registra un usuario en `POST /api/auth/registro`, inicia sesión en',
      '`POST /api/auth/login`, copia el `token` de la respuesta y pégalo en el botón **Authorize** de',
      'arriba. A partir de ahí las rutas protegidas responden.',
      '',
      'Todas las rutas cuelgan del prefijo `/api`.',
    ].join('\n'),
    license: { name: 'MIT' },
  },
  servers: [{ url: '/api', description: 'Servidor actual' }],
  // Por defecto las rutas son públicas; solo las que declaran `security` exigen token.
  security: [],
  tags: [
    { name: 'Salud', description: 'Verificación de que el servicio responde.' },
    { name: 'Autenticación', description: 'Registro de usuarios, inicio de sesión y consulta del perfil propio.' },
  ],
  paths: {
    '/salud': {
      get: {
        tags: ['Salud'],
        summary: 'Verificar que el servicio está vivo',
        description:
          'Responde 200 si el proceso atiende peticiones. No consulta la base de datos: sirve para el ' +
          'monitoreo y para el healthcheck del despliegue, no para diagnosticar la persistencia.',
        responses: {
          200: {
            description: 'El servicio responde.',
            content: { 'application/json': { example: { estado: 'ok' } } },
          },
        },
      },
    },

    '/auth/registro': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar un usuario',
        description: [
          'Crea un usuario y devuelve sus datos públicos. **No inicia sesión**: para obtener un token hay',
          'que llamar después a `/auth/login`.',
          '',
          'Reglas que aplica el caso de uso `RegistrarUsuario`:',
          '',
          '- El correo se normaliza a minúsculas y se guarda sin espacios, de modo que `ANA@uam.edu.co` y',
          '  `ana@uam.edu.co` son el mismo usuario.',
          '- El correo es único; un segundo registro con el mismo correo responde 409.',
          '- La clave nunca se almacena en claro: se cifra con bcrypt antes de llegar al repositorio.',
          '- `rol` es opcional y por defecto es `SOLICITANTE`, el rol de la comunidad universitaria.',
          '',
          '> Nota de alcance: la restricción R01 del documento de visión exige que a futuro las identidades',
          '> se resuelvan contra el directorio LDAP institucional. Este registro local es la implementación',
          '> vigente mientras ese adaptador no exista.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string', minLength: 2, description: 'Nombre completo.', example: 'Ana Agente' },
                  correo: {
                    type: 'string',
                    format: 'email',
                    description: 'Correo institucional. Se normaliza a minúsculas.',
                    example: 'ana@uam.edu.co',
                  },
                  clave: { type: 'string', minLength: 8, format: 'password', example: 'clave-segura' },
                  rol: {
                    type: 'string',
                    enum: ROLES,
                    default: 'SOLICITANTE',
                    description:
                      'SOLICITANTE reporta; AGENTE atiende; COORDINADOR vigila SLA y reasigna; ADMINISTRADOR configura.',
                    example: 'AGENTE',
                  },
                },
                required: ['nombre', 'correo', 'clave'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuario creado.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UsuarioDTO' } } },
          },
          400: respuestaError(
            'Datos inválidos: nombre de menos de 2 caracteres, correo mal formado, clave de menos de 8 caracteres o rol desconocido.',
            'clave requerida (mínimo 8 caracteres)',
          ),
          409: respuestaError('Ya existe un usuario con ese correo.', 'El correo ana@uam.edu.co ya está registrado'),
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        description: [
          'Valida las credenciales y devuelve un **JWT firmado (HS256, vigencia 8 horas)** que lleva el id',
          'del usuario en `sub` y su rol en `rol`. Ese token es el que autoriza las rutas protegidas.',
          '',
          'El correo se compara en minúsculas, igual que en el registro.',
          '',
          'Los tres casos de fallo —correo inexistente, usuario inactivo y clave incorrecta— responden el',
          '**mismo 401 con el mismo mensaje**, a propósito: distinguirlos permitiría averiguar qué correos',
          'están registrados en el sistema.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  correo: { type: 'string', format: 'email', example: 'ana@uam.edu.co' },
                  clave: { type: 'string', format: 'password', example: 'clave-segura' },
                },
                required: ['correo', 'clave'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Sesión iniciada.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SesionDTO' } } },
          },
          400: respuestaError('Falta `correo` o `clave` en el cuerpo.', 'correo y clave son obligatorios'),
          401: respuestaError(
            'Credenciales inválidas o usuario inactivo.',
            'Correo o clave incorrectos',
          ),
        },
      },
    },

    '/auth/perfil': {
      get: {
        tags: ['Autenticación'],
        summary: 'Consultar el usuario de la sesión actual',
        description: [
          'Devuelve el usuario dueño del token enviado. La aplicación cliente la usa al arrancar para saber',
          'quién está en sesión y **qué rol tiene**, que es lo que decide qué se le muestra (F20).',
          '',
          'Los datos se releen de la base de datos en cada llamada, no se toman del token: si a un usuario le',
          'cambian el rol o lo desactivan, esta respuesta lo refleja sin esperar a que el token expire.',
        ].join('\n'),
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Usuario en sesión.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UsuarioDTO' } } },
          },
          401: respuestaError('Token ausente, mal formado, expirado o con firma inválida.', 'Sesión requerida'),
          404: respuestaError('El token es válido pero el usuario ya no existe.', 'Usuario no encontrado'),
        },
      },
    },
  },
  components: {
    schemas: { UsuarioDTO: usuario, SesionDTO: sesion, ErrorDTO: error },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token obtenido en `POST /api/auth/login`.',
      },
    },
  },
}
