/**
 * DeploymentAdapter — isolated execution of built project artifacts.
 *
 * Serves a deployed snapshot from a sandbox directory outside the main
 * Express process. Each deployment gets its own directory under the
 * deployments temp root. The adapter only serves static files from the
 * built output directory — no arbitrary code execution inside Express.
 *
 * Security:
 *   - Build output lives in a temp sandbox directory
 *   - Build process has a hard timeout and resource limits
 *   - Only static files from the deployment directory are served
 *   - Deployed apps never execute inside the main Express process
 */

import { execFileSync } from 'child_process'
import { mkdtemp, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { prisma } from '../../lib/prisma.js'
import { projectFileRepository } from '../../repositories/projectFile.repository.js'
import { config } from '../../config/index.js'

// Default limits (can be overridden via env)
const DEFAULT_BUILD_TIMEOUT_MS = 60000   // 1 minute for npm install + build
const DEFAULT_MAX_FILES = 2000
const DEFAULT_MAX_TOTAL_SIZE_MB = 50

export class DeploymentAdapter {
  constructor() {
    this.buildTimeoutMs =
      parseInt(process.env.DEPLOY_BUILD_TIMEOUT_MS, 10) || DEFAULT_BUILD_TIMEOUT_MS
    this.maxFiles =
      parseInt(process.env.DEPLOY_MAX_FILES, 10) || DEFAULT_MAX_FILES
    this.maxTotalSizeMb =
      parseInt(process.env.DEPLOY_MAX_TOTAL_SIZE_MB, 10) || DEFAULT_MAX_TOTAL_SIZE_MB
    this.deployRoot = process.env.DEPLOY_ROOT || tmpdir()
  }

  /**
   * Build a snapshot from project files in an isolated sandbox directory.
   * Returns the build output directory path on success.
   *
   * @param {string} projectId
   * @param {Array<{path: string, content: string}>} files
   * @returns {Promise<{success: boolean, buildDir?: string, error?: string, errors?: Array}>}
   */
  async buildSnapshot(projectId, files) {
    // Validate file count and total size before writing
    if (files.length > this.maxFiles) {
      return {
        success: false,
        error: `Too many files: ${files.length} (max ${this.maxFiles})`,
        errors: [{ type: 'too_many_files', count: files.length, max: this.maxFiles }],
      }
    }

    let totalSize = 0
    for (const f of files) {
      totalSize += Buffer.byteLength(f.content || '', 'utf8')
    }
    const totalSizeMb = totalSize / (1024 * 1024)
    if (totalSizeMb > this.maxTotalSizeMb) {
      return {
        success: false,
        error: `Total size too large: ${totalSizeMb.toFixed(2)}MB (max ${this.maxTotalSizeMb}MB)`,
        errors: [{ type: 'total_size_too_large', sizeMb: totalSizeMb, maxMb: this.maxTotalSizeMb }],
      }
    }

    const buildDir = mkdtemp(join(this.deployRoot, 'webcraft-deploy-'))
    try {
      // Write all project files into the sandbox
      for (const f of files) {
        const filePath = join(buildDir, f.path)
        const dir = join(filePath, '..')
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        writeFileSync(filePath, f.content)
      }

      // Run npm install
      let installOutput = ''
      try {
        const result = execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
          cwd: buildDir,
          timeout: this.buildTimeoutMs,
          stdio: 'pipe',
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        })
        installOutput = result.stdout || ''
      } catch (installErr) {
        const stderr = installErr.stderr ? installErr.stderr.toString() : ''
        const stdout = installErr.stdout ? installErr.stdout.toString() : ''
        return {
          success: false,
          error: 'npm install failed',
          errors: [{ type: 'npm_install_failed', message: stderr || stdout || installErr.message }],
        }
      }

      // Check for a build script
      const pkgPath = join(buildDir, 'package.json')
      if (!existsSync(pkgPath)) {
        return {
          success: true,
          buildDir,
          message: 'No package.json; serving source directory',
        }
      }

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      const hasBuildScript = pkg.scripts && pkg.scripts.build

      if (!hasBuildScript) {
        // No build script — serve the source directory as-is
        return {
          success: true,
          buildDir,
          message: 'No build script; serving source directory',
        }
      }

      // Run npm run build
      try {
        execFileSync('npm', ['run', 'build'], {
          cwd: buildDir,
          timeout: this.buildTimeoutMs,
          stdio: 'pipe',
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        })
      } catch (buildErr) {
        const stderr = buildErr.stderr ? buildErr.stderr.toString() : ''
        const stdout = buildErr.stdout ? buildErr.stdout.toString() : ''
        return {
          success: false,
          error: 'Build failed',
          errors: [{ type: 'build_failed', message: stderr || stdout || buildErr.message, stderr, stdout }],
        }
      }

      // Determine the build output directory
      const outDir = this.findBuildOutputDir(buildDir, pkg)
      return {
        success: true,
        buildDir: outDir || buildDir,
        message: 'Build succeeded',
      }
    } catch (err) {
      rmSync(buildDir, { recursive: true, force: true })
      return {
        success: false,
        error: err.message || 'Build failed',
        errors: [{ type: 'build_error', message: err.message }],
      }
    }
  }

  /**
   * Find the build output directory by checking common Vite/CRA output dirs.
   * @private
   */
  findBuildOutputDir(buildDir, pkg) {
    const candidates = ['dist', 'build', 'out', 'public']
    for (const cand of candidates) {
      const fullPath = join(buildDir, cand)
      if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
        if (existsSync(join(fullPath, 'index.html'))) {
          return fullPath
        }
      }
    }
    if (pkg.build && pkg.build.outDir) {
      const fullPath = join(buildDir, pkg.build.outDir)
      if (existsSync(fullPath)) return fullPath
    }
    return null
  }

  /**
   * Clean up a deployment build directory.
   * @param {string} buildDir
   */
  cleanup(buildDir) {
    try {
      if (buildDir && existsSync(buildDir)) {
        rmSync(buildDir, { recursive: true, force: true })
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

export const deploymentAdapter = new DeploymentAdapter()
export default DeploymentAdapter
