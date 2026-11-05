import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.js'

// vite.config.js is a function (it checks the mode for phone testing), so call it first, then add the test settings
export default defineConfig((env) =>
  mergeConfig(
    viteConfig(env),
    defineConfig({
      test: {
        environment: 'jsdom',
        root: fileURLToPath(new URL('./', import.meta.url)),
      },
    }),
  ),
)
