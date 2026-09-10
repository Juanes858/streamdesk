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
    rol: { type: 'string', enum: ROLES, example: 'CLIENTE' },
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

const cuenta = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    clienteId: { type: 'string', format: 'uuid' },
    plataforma: { type: 'string', example: 'Netflix' },
    correoAcceso: { type: 'string', format: 'email', example: 'cliente@correo.com' },
    estado: { type: 'string', enum: ['ACTIVA', 'SUSPENDIDA', 'CANCELADA'], example: 'ACTIVA' },
    creadoEn: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'clienteId', 'plataforma', 'correoAcceso', 'estado', 'creadoEn'],
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
    { name: 'Usuarios', description: 'Consulta, actualización y eliminación de usuarios.' },
    { name: 'Cuentas', description: 'Cuentas de plataformas asociadas a un usuario.' },
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
          '- `rol` es opcional y por defecto es `CLIENTE`.',
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
                    default: 'CLIENTE',
                    description:
                      'CLIENTE solicita soporte; ASESOR atiende; ADMINISTRADOR configura y administra.',
                    example: 'CLIENTE',
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

    '/usuarios': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar usuarios',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Usuarios registrados.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UsuarioDTO' } } } },
          },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
        },
      },
    },

    '/usuarios/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Usuarios'],
        summary: 'Obtener usuario por id',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Usuario encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UsuarioDTO' } } } },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('Usuario no encontrado.', 'No existe un usuario con id ...'),
        },
      },
      patch: {
        tags: ['Usuarios'],
        summary: 'Actualizar usuario',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ActualizarUsuarioDTO' },
              example: { nombre: 'Nuevo nombre', activo: true },
            },
          },
        },
        responses: {
          200: { description: 'Usuario actualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/UsuarioDTO' } } } },
          400: respuestaError('Cambios inválidos.', 'debe enviar cambios'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('Usuario no encontrado.', 'No existe un usuario con id ...'),
          409: respuestaError('El correo ya está registrado.', 'El correo ya está registrado'),
        },
      },
      delete: {
        tags: ['Usuarios'],
        summary: 'Eliminar usuario',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Usuario eliminado.' },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('Usuario no encontrado.', 'No existe un usuario con id ...'),
        },
      },
    },

    '/cuentas': {
      post: {
        tags: ['Cuentas'],
        summary: 'Registrar una cuenta de plataforma',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegistrarCuentaDTO' },
              example: { clienteId: 'cd9c06cf-b57f-4e22-bc47-589a074e8c2c', plataforma: 'Netflix', correoAcceso: 'cliente@correo.com' },
            },
          },
        },
        responses: {
          201: { description: 'Cuenta creada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/CuentaDTO' } } } },
          400: respuestaError('Datos inválidos.', 'plataforma requerida'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('El cliente no existe.', 'El cliente ... no existe'),
        },
      },
      get: {
        tags: ['Cuentas'],
        summary: 'Listar cuentas de un cliente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'clienteId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Cuentas del cliente.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CuentaDTO' } } } } },
          400: respuestaError('Falta clienteId.', 'clienteId requerido'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
        },
      },
    },

    '/cuentas/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Cuentas'],
        summary: 'Obtener cuenta por id',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cuenta encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/CuentaDTO' } } } },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('Cuenta no encontrada.', 'Cuenta no encontrada'),
        },
      },
    },
  },
  components: {
    schemas: {
      UsuarioDTO: usuario,
      SesionDTO: sesion,
      ErrorDTO: error,
      CuentaDTO: cuenta,
      ActualizarUsuarioDTO: {
        type: 'object',
        properties: {
          nombre: { type: 'string', minLength: 2 },
          correo: { type: 'string', format: 'email' },
          clave: { type: 'string', format: 'password', minLength: 8 },
          rol: { type: 'string', enum: ROLES },
          activo: { type: 'boolean' },
        },
      },
      RegistrarCuentaDTO: {
        type: 'object',
        properties: {
          clienteId: { type: 'string', format: 'uuid' },
          plataforma: { type: 'string', minLength: 1 },
          correoAcceso: { type: 'string', format: 'email' },
        },
        required: ['clienteId', 'plataforma', 'correoAcceso'],
      },
    },
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
