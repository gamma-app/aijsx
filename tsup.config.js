import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/jsx-runtime.ts', 'src/jsx-dev-runtime.ts'],
  external: [
    'js-tiktoken',
    'nanoid',
    'openai',
    '@anthropic-ai/sdk',
    '@anthropic-ai/tokenizer',
  ],
  format: ['cjs', 'esm'],
  clean: true,
  dts: true,
})
