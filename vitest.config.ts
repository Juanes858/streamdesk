import { defineConfig } from 'vitest/config'

// Sin esto vitest también recoge las pruebas ya compiladas en dist/.
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
})
