import { ROLES } from '../../dominio/modelo/Usuario'
import { ESTADOS_TICKET, PRIORIDADES_TICKET } from '../../dominio/modelo/Ticket'

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

const plataforma = {
  type: 'object',
  description: 'Catálogo de plataformas de streaming sobre las que se registran Cuentas (Netflix, Disney+, HBO Max...).',
  properties: {
    id: { type: 'string', format: 'uuid' },
    nombre: { type: 'string', example: 'NETFLIX' },
    activa: { type: 'boolean', example: true },
  },
  required: ['id', 'nombre', 'activa'],
}

const cuenta = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    usuarioId: { type: 'string', format: 'uuid' },
    plataformaId: { type: 'string', format: 'uuid', description: 'Id de una Plataforma existente (ver GET /plataformas).' },
    correo: { type: 'string', format: 'email', example: 'cliente@correo.com' },
    fechaInicio: { type: 'string', format: 'date-time' },
    fechaFin: { type: 'string', format: 'date-time' },
    estado: { type: 'string', enum: ['ACTIVA', 'REPORTADA', 'VENCIDA'], example: 'ACTIVA' },
  },
  required: ['id', 'usuarioId', 'plataformaId', 'correo', 'fechaInicio', 'fechaFin', 'estado'],
}

const ticket = {
  type: 'object',
  description: 'El texto se recibe como `titulo` al crear o actualizar; el recurso conserva el campo `descripcion`.',
  properties: {
    id: { type: 'string', format: 'uuid' },
    descripcion: { type: 'string', maxLength: 1000, example: 'La contraseña dejó de funcionar.' },
    estado: { type: 'string', enum: ESTADOS_TICKET },
    prioridad: { type: 'string', enum: PRIORIDADES_TICKET },
    usuarioId: { type: 'string', format: 'uuid' },
    asesorId: { type: 'string', format: 'uuid', nullable: true },
    cuentaId: { type: 'string', format: 'uuid' },
  },
  required: ['id', 'usuarioId', 'asesorId', 'cuentaId', 'descripcion', 'estado', 'prioridad'],
}

const respuestaError = (description: string, ejemplo: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorDTO' }, example: { error: ejemplo } } },
})

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Streamdesk · API',
    version: '1.0.0',
    description: [
      'API del sistema de gestión de tickets de soporte de la Universidad Autónoma de Manizales.',
      '',
      'Cubre autenticación, usuarios, cuentas de plataformas y el ciclo de vida básico de tickets.',
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
    { name: 'Plataformas', description: 'Catálogo de plataformas de streaming sobre las que se registran Cuentas.' },
    { name: 'Cuentas', description: 'Cuentas de plataformas asociadas a un usuario.' },
    { name: 'Tickets', description: 'Registro y seguimiento de solicitudes de soporte.' },
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
        security: [{ bearerAuth: [] }],
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

    '/auth/clave': {
      patch: {
        tags: ['Autenticación'],
        summary: 'Cambiar propia clave',
        description: 'Permite a un usuario autenticado cambiar su contraseña enviando la clave actual y la nueva.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  claveActual: { type: 'string', format: 'password', example: 'Admin12345!' },
                  nuevaClave: { type: 'string', format: 'password', minLength: 8, example: 'NuevaClave123!' },
                },
                required: ['claveActual', 'nuevaClave'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Clave actualizada correctamente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { mensaje: { type: 'string', example: 'Clave actualizada correctamente' } },
                },
              },
            },
          },
          400: respuestaError('Clave actual incorrecta o nueva clave inválida.', 'La clave actual es incorrecta'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
        },
      },
    },
    
    '/usuarios': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar usuarios',
        security: [{ bearerAuth: [] }],
        description: 'Solo un usuario con rol ADMINISTRADOR puede listar usuarios.',
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

    '/plataformas': {
  post: {
    tags: ['Plataformas'],
    summary: 'Registrar una plataforma',
    description: 'Solo un administrador puede registrar una plataforma. El nombre se normaliza a mayúsculas y es único.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/RegistrarPlataformaDTO' }, example: { nombre: 'NETFLIX' } } },
    },
    responses: {
      201: { description: 'Plataforma creada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlataformaDTO' } } } },
      400: respuestaError('Datos inválidos.', 'nombre requerido'),
      401: respuestaError('Sesión requerida.', 'Sesión requerida'),
      403: respuestaError('Se requiere rol ADMINISTRADOR.', 'Permisos insuficientes'),
      409: respuestaError('Ya existe una plataforma con ese nombre.', 'Ya existe una plataforma con nombre NETFLIX'),
    },
  },
  get: {
    tags: ['Plataformas'],
    summary: 'Listar plataformas',
    description: 'Cualquier sesión puede consultar el catálogo; lo necesita para registrar una Cuenta.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Catálogo de plataformas.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PlataformaDTO' } } } } },
      401: respuestaError('Sesión requerida.', 'Sesión requerida'),
    },
  },
},

'/plataformas/{id}': {
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
  get: {
    tags: ['Plataformas'],
    summary: 'Obtener plataforma por id',
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Plataforma encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlataformaDTO' } } } },
      401: respuestaError('Sesión requerida.', 'Sesión requerida'),
      404: respuestaError('Plataforma no encontrada.', 'No existe una plataforma con id ...'),
    },
  },
  patch: {
    tags: ['Plataformas'],
    summary: 'Actualizar una plataforma',
    description: 'Solo un administrador puede actualizar una plataforma.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ActualizarPlataformaDTO' } } },
    },
    responses: {
      200: { description: 'Plataforma actualizada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlataformaDTO' } } } },
      400: respuestaError('Cambios inválidos.', 'debe enviar cambios'),
      401: respuestaError('Sesión requerida.', 'Sesión requerida'),
      403: respuestaError('Se requiere rol ADMINISTRADOR.', 'Permisos insuficientes'),
      404: respuestaError('Plataforma no encontrada.', 'No existe una plataforma con id ...'),
      409: respuestaError('Ya existe una plataforma con ese nombre.', 'Ya existe una plataforma con nombre NETFLIX'),
    },
  },
  delete: {
    tags: ['Plataformas'],
    summary: 'Eliminar una plataforma',
    description: 'Solo un administrador puede eliminarla. Falla si existen Cuentas que la referencian.',
    security: [{ bearerAuth: [] }],
    responses: {
      204: { description: 'Plataforma eliminada.' },
      401: respuestaError('Sesión requerida.', 'Sesión requerida'),
      403: respuestaError('Se requiere rol ADMINISTRADOR.', 'Permisos insuficientes'),
      404: respuestaError('Plataforma no encontrada.', 'No existe una plataforma con id ...'),
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
              example: { usuarioId: 'cd9c06cf-b57f-4e22-bc47-589a074e8c2c', plataformaId: 'NETFLIX', correo: 'cliente@correo.com', clave: 'clave-segura', fechaInicio: '2026-09-12T00:00:00.000Z', fechaFin: '2027-09-12T00:00:00.000Z' },
            },
          },
        },
        responses: {
          201: { description: 'Cuenta creada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/CuentaDTO' } } } },
          400: respuestaError('Datos inválidos.', 'clave requerida (mínimo 8 caracteres)'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('El cliente no existe.', 'El cliente ... no existe'),
        },
      },
      get: {
        tags: ['Cuentas'],
        summary: 'Listar cuentas de un cliente',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'usuarioId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Opcional para ADMINISTRADOR; los demás usuarios consultan su propia cuenta.' }],
        responses: {
          200: { description: 'Cuentas del cliente.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CuentaDTO' } } } } },
          400: respuestaError('Falta usuarioId.', 'usuarioId requerido'),
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
      patch: {
        tags: ['Cuentas'],
        summary: 'Actualizar una cuenta de plataforma',
        description: 'Solo un administrador puede actualizar una cuenta.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ActualizarCuentaDTO' } } },
        },
        responses: {
          200: { description: 'Cuenta actualizada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/CuentaDTO' } } } },
          400: respuestaError('Cambios inválidos.', 'debe enviar cambios'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          403: respuestaError('Se requiere rol ADMINISTRADOR.', 'Permisos insuficientes'),
          404: respuestaError('Cuenta no encontrada.', 'No existe la cuenta ...'),
        },
      },
      delete: {
        tags: ['Cuentas'],
        summary: 'Eliminar una cuenta de plataforma',
        description: 'Solo un administrador puede eliminar una cuenta.',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Cuenta eliminada.' },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          403: respuestaError('Se requiere rol ADMINISTRADOR.', 'Permisos insuficientes'),
          404: respuestaError('Cuenta no encontrada.', 'No existe la cuenta ...'),
        },
      },
    },

    '/tickets': {
      post: {
        tags: ['Tickets'],
        summary: 'Crear un ticket',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CrearTicketDTO' },
              example: {
                titulo: 'No puedo acceder a mi cuenta',
                usuarioId: 'cd9c06cf-b57f-4e22-bc47-589a074e8c2c',
                cuentaId: '51f6b3c2-6547-4ae1-9965-203644410b84',
                prioridad: 'MEDIA',
              },
            },
          },
        },
        responses: {
          201: { description: 'Ticket creado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketDTO' } } } },
          400: respuestaError('Datos inválidos, título fuera del rango de 5 a 100 caracteres o descripción superior a 1000 caracteres.', 'La descripción del ticket no puede superar los 1000 caracteres'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('El usuario, asesor o cuenta no existe.', 'No existe la cuenta ...'),
        },
      },
      get: {
        tags: ['Tickets'],
        summary: 'Listar tickets',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'usuarioId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'asesorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'cuentaId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ESTADOS_TICKET } },
          { name: 'q', in: 'query', description: 'Busca tickets por texto en el título, sin distinguir mayúsculas y minúsculas.', schema: { type: 'string' } },
          { name: 'orden', in: 'query', required: false, description: 'Ordena por fecha de creación.', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: { description: 'Tickets encontrados.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TicketDTO' } } } } },
          400: respuestaError('Filtro de estado inválido.', 'estado inválido'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
        },
      },
    },

    '/tickets/resumen': {
      get: {
        tags: ['Tickets'],
        summary: 'Obtener resumen de tickets por estado',
        description: 'Solo un administrador puede consultar el conteo de tickets agrupados por estado.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cantidad de tickets por estado.',
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: { type: 'integer' } },
                example: { NUEVO: 4, EN_PROCESO: 2, CERRADO: 1 },
              },
            },
          },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          403: respuestaError('Se requiere rol ADMINISTRADOR.', 'Permisos insuficientes'),
        },
      },
    },

    '/tickets/mios': {
      get: {
        tags: ['Tickets'],
        summary: 'Listar mis tickets',
        description: 'Devuelve únicamente los tickets pertenecientes al usuario identificado por el token.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Tickets del usuario autenticado.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TicketDTO' } } } } },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
        },
      },
    },

    '/tickets/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: {
        tags: ['Tickets'],
        summary: 'Obtener ticket por id',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Ticket encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketDTO' } } } },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('Ticket no encontrado.', 'No existe un ticket con id ...'),
        },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Actualizar ticket',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ActualizarTicketDTO' },
              example: { titulo: 'No puedo acceder a mi cuenta' },
            },
          },
        },
        responses: {
          200: { description: 'Ticket actualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketDTO' } } } },
          400: respuestaError('Cambios inválidos, título fuera del rango de 5 a 100 caracteres o descripción superior a 1000 caracteres.', 'La descripción del ticket no puede superar los 1000 caracteres'),
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('Ticket, asesor o cuenta no encontrado.', 'No existe la cuenta ...'),
        },
      },
      delete: {
        tags: ['Tickets'],
        summary: 'Eliminar ticket',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'Ticket eliminado.' },
          401: respuestaError('Sesión requerida.', 'Sesión requerida'),
          404: respuestaError('Ticket no encontrado.', 'No existe un ticket con id ...'),
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
      PlataformaDTO: plataforma,
      TicketDTO: ticket,
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
          usuarioId: { type: 'string', format: 'uuid' },
          plataformaId: { type: 'string', format: 'uuid', description: 'Id de una Plataforma existente.' },
          correo: { type: 'string', format: 'email' },
          clave: { type: 'string', format: 'password', minLength: 8 },
          fechaInicio: { type: 'string', format: 'date-time' },
          fechaFin: { type: 'string', format: 'date-time' },
        },
        required: ['usuarioId', 'plataformaId', 'correo', 'clave', 'fechaInicio', 'fechaFin'],
      },
      ActualizarCuentaDTO: {
        type: 'object',
        properties: {
          plataformaId: { type: 'string', format: 'uuid', description: 'Id de una Plataforma existente.' },
          correo: { type: 'string', format: 'email' },
          clave: { type: 'string', format: 'password', minLength: 8 },
          fechaInicio: { type: 'string', format: 'date-time' },
          fechaFin: { type: 'string', format: 'date-time' },
          estado: { type: 'string', enum: ['ACTIVA', 'REPORTADA', 'VENCIDA'] },
        },
      },

      RegistrarPlataformaDTO: {
  type: 'object',
  properties: {
    nombre: { type: 'string', minLength: 1, example: 'NETFLIX' },
    activa: { type: 'boolean', default: true },
  },
  required: ['nombre'],
},
ActualizarPlataformaDTO: {
  type: 'object',
  properties: {
    nombre: { type: 'string', minLength: 1 },
    activa: { type: 'boolean' },
  },
},
      CrearTicketDTO: {
        type: 'object',
        properties: {
          titulo: { type: 'string', minLength: 5, maxLength: 100, example: 'No puedo acceder a mi cuenta' },
          descripcion: { type: 'string', minLength: 5, maxLength: 1000, description: 'Alias compatible para el título del ticket.' },
          usuarioId: { type: 'string', format: 'uuid' },
          asesorId: { type: 'string', format: 'uuid', nullable: true },
          cuentaId: { type: 'string', format: 'uuid' },
          prioridad: { type: 'string', enum: PRIORIDADES_TICKET, default: 'MEDIA' },
        },
        required: ['usuarioId', 'cuentaId'],
        anyOf: [{ required: ['titulo'] }, { required: ['descripcion'] }],
      },
      ActualizarTicketDTO: {
        type: 'object',
        properties: {
          titulo: { type: 'string', minLength: 5, maxLength: 100, example: 'No puedo acceder a mi cuenta' },
          descripcion: { type: 'string', minLength: 1, maxLength: 1000 },
          estado: { type: 'string', enum: ESTADOS_TICKET },
          prioridad: { type: 'string', enum: PRIORIDADES_TICKET },
          asesorId: { type: 'string', format: 'uuid', nullable: true },
          cuentaId: { type: 'string', format: 'uuid' },
        },
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
