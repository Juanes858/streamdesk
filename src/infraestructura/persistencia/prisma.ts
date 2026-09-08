import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generado/client'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('Falta DATABASE_URL (copia .env.example a .env)')

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
