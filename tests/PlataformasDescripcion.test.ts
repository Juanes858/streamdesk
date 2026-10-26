import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'
import type { Plataforma, PlataformaNueva } from '../src/dominio/modelo/Plataforma'
import type { PlataformaDAO, ServicioTokens } from '../src/dominio/puertos'
import { rutasPlataformas } from '../src/infraestructura/http/rutas/plataformas'

class PlataformaDAOEnMemoria implements PlataformaDAO {
  private readonly plataformas: Plataforma[] = []

  async guardar(plataforma: PlataformaNueva): Promise<Plataforma> {
    const nueva = { ...plataforma, descripcion: plataforma.descripcion ?? null, id: `plataforma-${this.plataformas.length + 1}` }
    this.plataformas.push(nueva)
    return nueva
  }

  async porId(id: string): Promise<Plataforma | null> {
    return this.plataformas.find((plataforma) => plataforma.id === id) ?? null
  }

  async porNombre(nombre: string): Promise<Plataforma | null> {
    return this.plataformas.find((plataforma) => plataforma.nombre === nombre) ?? null
  }

  async listarTodas(): Promise<Plataforma[]> {
    return [...this.plataformas]
  }

  async actualizar(id: string, cambios: Partial<Omit<Plataforma, 'id'>>): Promise<Plataforma> {
    const indice = this.plataformas.findIndex((plataforma) => plataforma.id === id)
    if (indice < 0) throw new Error('Plataforma no encontrada')
    this.plataformas[indice] = { ...this.plataformas[indice]!, ...cambios }
    return this.plataformas[indice]!
  }

  async eliminar(id: string): Promise<void> {
    const indice = this.plataformas.findIndex((plataforma) => plataforma.id === id)
    if (indice >= 0) this.plataformas.splice(indice, 1)
  }
}

describe('descripción opcional de plataformas por HTTP', () => {
  let cerrarServidor: (() => Promise<void>) | undefined

  afterEach(async () => cerrarServidor?.())

  it('permite crear sin descripción, listar y actualizarla o limpiarla', async () => {
    const plataformas = new PlataformaDAOEnMemoria()
    const tokens: ServicioTokens = {
      emitir: () => 'token',
      verificar: () => ({ id: 'admin', rol: 'ADMINISTRADOR' }),
    }
    const app = express()
    app.use(express.json())
    app.use('/plataformas', rutasPlataformas({ plataformas, tokens }))

    const server = app.listen(0)
    cerrarServidor = () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No se pudo iniciar el servidor de prueba')
    const baseUrl = `http://127.0.0.1:${address.port}/plataformas`

    const creada = await fetch(baseUrl, {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'NETFLIX' }),
    })
    expect(creada.status).toBe(201)
    expect(await creada.json()).toMatchObject({ nombre: 'NETFLIX', descripcion: null })

    const lista = await fetch(baseUrl, { headers: { authorization: 'Bearer token' } })
    expect(await lista.json()).toMatchObject([{ nombre: 'NETFLIX', descripcion: null }])

    const actualizada = await fetch(`${baseUrl}/plataforma-1`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ descripcion: 'Servicio de series y películas' }),
    })
    expect(await actualizada.json()).toMatchObject({ descripcion: 'Servicio de series y películas' })

    const limpiada = await fetch(`${baseUrl}/plataforma-1`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ descripcion: null }),
    })
    expect(await limpiada.json()).toMatchObject({ descripcion: null })

    const invalida = await fetch(baseUrl, {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: 'DISNEY+', descripcion: 123 }),
    })
    expect(invalida.status).toBe(400)
    expect(await invalida.json()).toEqual({ error: 'descripcion debe ser texto' })
  })
})
