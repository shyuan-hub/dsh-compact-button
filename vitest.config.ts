import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The platform Tooltip is a build-time external that is not installed
      // here; point the specifier at the local stand-in (see the stub's
      // header for why).
      '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(
        new URL('./test/stubs/dsh-client-ui-primitives.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup.ts'],
  },
})
