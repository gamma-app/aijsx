import { nanoid } from 'nanoid'

export function uuidv4() {
  return nanoid()
}

export function getEnvVar(name: string, shouldThrow: boolean = true) {
  // In some JS build environments, `process` is not defined. I'm not sure
  // how to update our types to reflect that.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  let env = globalThis.process?.env ?? undefined
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (env === undefined) {
    // Webpack for Create React App requires `process.env`, but in other environments
    // process might not be defined, so we need to try/catch it.
    try {
      env = process.env
    } catch {
      // Do nothing, leave it undefined.
    }
  }

  // We actually want the nullish coalescing behavior in this case,
  // because we want to treat '' as undefined.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition
  const result = env?.[name]
  if (result === undefined && shouldThrow) {
    throw new Error(`Please specify env var '${name}'`)
  }
  return result
}
