#!/usr/bin/env node
/**
 * Real syntax validation for the backend. Walks src/ and runs `node --check`
 * on every .js file. Exits non-zero on the first failure. This replaces the
 * old glob-based lint command that silently matched nothing on Windows.
 */
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, files)
    else if (entry.endsWith('.js') || entry.endsWith('.mjs')) files.push(full)
  }
  return files
}

const files = walk(join(root, 'src'))
let failures = 0
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (err) {
    failures++
    console.error(`Syntax error in ${file}`)
    console.error(err.stderr?.toString() || err.message)
  }
}

if (failures > 0) {
  console.error(`\n${failures} file(s) failed syntax checks.`)
  process.exit(1)
}
console.log(`Checked ${files.length} backend files. Syntax OK.`)
