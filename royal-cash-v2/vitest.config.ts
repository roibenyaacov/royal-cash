import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // Not just `lib/**`: a test written anywhere else used to be
    // collected by nothing and pass by never running.
    include: ['{lib,app,components,hooks}/**/*.test.{ts,tsx}'],
  },
})
