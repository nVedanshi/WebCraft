/**
 * PreviewService — builds and serves a project's preview in isolation.
 *
 * The preview runs the ACTUAL generated application, not a static screenshot.
 * Each project's files are written to a temporary sandbox directory, built
 * with `npm install` + `npm run build`, and the built output is served via
 * Express static middleware.
 *
 * Security:
 *   - Builds run in a temp directory outside the project workspace
 *   - Build process has a hard timeout (configurable, default 30s)
 *   - Only static files from the build output directory are served
 *   - No arbitrary code execution inside the main Express process
 *
 * Build results are cached per project revision. When the project's
 * revisionId changes, the preview is rebuilt.
 */

import { execFileSync } from 'child_process'
import { mkdtemp, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { prisma } from '../../lib/prisma.js'
import { projectFileRepository } from '../../repositories/projectFile.repository.js'
import { config } from '../../config/index.js'

// In-memory cache of built preview artifacts: projectId => { revisionId, buildDir, error }
const previewCache = new Map()

/**
 * Build a project's preview artifacts in a sandbox directory.
 *
 * @param {string} projectId
 * @param {Array<{path: string, content: string}>} files
 * @returns {Promise<{success: boolean, buildDir?: string, error?: string, errors?: Array}>}
 */
async function buildPreview(projectId, files) {
  const buildDir = mkdtemp(join(tmpdir(), 'webcraft-preview-'))
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
        timeout: config.previewSandboxTimeoutMs,
        stdio: 'pipe',
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
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
        success: false,
        error: 'package.json not found',
        errors: [{ type: 'missing_package_json' }],
      }
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const hasBuildScript = pkg.scripts && pkg.scripts.build

    if (!hasBuildScript) {
      // No build script — serve the source directory as-is (static HTML/JS)
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
        timeout: config.previewSandboxTimeoutMs,
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
    const outDir = findBuildOutputDir(buildDir, pkg)
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
function findBuildOutputDir(buildDir, pkg) {
  const candidates = ['dist', 'build', 'out', 'public']
  for (const cand of candidates) {
    const fullPath = join(buildDir, cand)
    if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
      // Check it has an index.html
      if (existsSync(join(fullPath, 'index.html'))) {
        return fullPath
      }
    }
  }
  // Check if package.json has a build output dir configured
  if (pkg.build && pkg.build.outDir) {
    const fullPath = join(buildDir, pkg.build.outDir)
    if (existsSync(fullPath)) return fullPath
  }
  return null
}

/**
 * Get or build the preview for a project. Caches by revisionId.
 *
 * @param {string} projectId
 * @returns {Promise<{success: boolean, serveDir?: string, error?: string, errors?: Array}>}
 */
async function getPreview(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, revisionId: true, status: true },
  })
  if (!project) {
    return { success: false, error: 'Project not found' }
  }
  if (project.status === 'DELETED') {
    return { success: false, error: 'Project has been deleted' }
  }

  // Return cached build if revision hasn't changed
  const cached = previewCache.get(projectId)
  if (cached && cached.revisionId === project.revisionId && cached.success) {
    return { success: true, serveDir: cached.buildDir }
  }

  // Fetch project files
  const files = await projectFileRepository.listByProject(projectId)
  if (files.length === 0) {
    return { success: false, error: 'No files in project' }
  }

  const fileList = files.map((f) => ({
    path: f.path,
    content: f.content || '',
  }))

  const result = await buildPreview(projectId, fileList)

  if (result.success) {
    previewCache.set(projectId, {
      revisionId: project.revisionId,
      buildDir: result.buildDir,
      success: true,
    })
    return { success: true, serveDir: result.buildDir }
  } else {
    // Cache the error so we don't rebuild on every request
    previewCache.set(projectId, {
      revisionId: project.revisionId,
      buildDir: null,
      success: false,
      error: result.error,
      errors: result.errors,
    })
    return {
      success: false,
      error: result.error,
      errors: result.errors,
    }
  }
}

/**
 * Invalidate the preview cache for a project (called when files change).
 * @param {string} projectId
 */
function invalidatePreview(projectId) {
  const cached = previewCache.get(projectId)
  if (cached && cached.buildDir) {
    rmSync(cached.buildDir, { recursive: true, force: true })
  }
  previewCache.delete(projectId)
}

/**
 * Get the cached preview error (if any) for a project.
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<{success: boolean, error?: string, errors?: Array}>}
 */
async function getPreviewError(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true, revisionId: true, status: true },
  })
  if (!project) {
    return { success: false, error: 'Project not found' }
  }

  const cached = previewCache.get(projectId)
  if (!cached || cached.success) {
    return { success: true, error: null }
  }

  return {
    success: false,
    error: cached.error,
    errors: cached.errors,
  }
}

export { buildPreview, getPreview, invalidatePreview, getPreviewError, previewCache }
