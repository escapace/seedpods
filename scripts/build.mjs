import { build } from 'esbuild'
import { execa } from 'execa'
import fse from 'fs-extra'
import { cloneDeep, merge } from 'lodash-es'
import path from 'path'
import process from 'process'
import { cwd, external, name, target } from './constants.mjs'

const tsconfig = fse.existsSync(path.join(cwd, 'tsconfig-build.json'))
  ? path.join(cwd, 'tsconfig-build.json')
  : path.join(cwd, 'tsconfig.json')

process.umask(0o022)
process.chdir(cwd)

await fse.remove(path.join(cwd, 'lib'))

await execa(
  path.join(cwd, 'node_modules', '.bin', 'tsc'),
  [
    '-p',
    path.relative(cwd, tsconfig),
    '--declaration',
    '--emitDeclarationOnly',
    '--declarationDir',
    'lib/types'
  ],
  {
    all: true,
    cwd
  }
).catch((reason) => {
  console.error(reason.all)
  process.exit(reason.exitCode)
})

const buildOptions = {
  bundle: true,
  mainFields: ['module'],
  entryPoints: ['src/index.ts'],
  external: [...external],
  format: 'esm',
  logLevel: 'info',
  target,
  outExtension: { '.js': '.mjs' },
  outdir: path.join(cwd, `lib/esm`),
  platform: 'neutral',
  treeShaking: true,
  minifySyntax: true,
  sourcemap: true,
  splitting: true,
  tsconfig
}

await build(
  merge(cloneDeep(buildOptions), {
    outdir: path.join(cwd, `lib/node`),
    banner: {
      js: 'import crypto from "crypto"'
    },
    target,
    platform: 'node'
  })
)

await build(
  merge(cloneDeep(buildOptions), {
    outdir: path.join(cwd, `lib/default`),
    target: 'esnext',
    platform: 'browser'
  })
)

await build(
  merge(cloneDeep(buildOptions), {
    outdir: path.join(cwd, `lib/cli`),
    entryPoints: ['src/cli.ts'],
    banner: {
      js: 'import crypto from "crypto"'
    },
    target,
    platform: 'node'
  })
)
