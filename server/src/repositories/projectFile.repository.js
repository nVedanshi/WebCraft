import { prisma } from '../lib/prisma.js'

/**
 * Validates and normalizes a project file path.
 *
 * Security: prevents path traversal. Rejects:
 *   - empty paths
 *   - absolute paths (starting with /)
 *   - drive letters (Windows: C:\)
 *   - null bytes
 *   - `..` segments
 *   - backslashes used as separators (normalize to forward slash)
 *
 * Returns a normalized, safe relative path like "src/components/Button.jsx".
 */
export function validateFilePath(path) {
  if (typeof path !== 'string') {
    throw new Error('File path is required')
  }
  // Reject empty or whitespace-only paths
  if (path.trim().length === 0) {
    throw new Error('File path is required')
  }
  if (path.includes('\0')) {
    throw new Error('File path contains null byte')
  }
  // Reject absolute paths
  if (path.startsWith('/') || path.startsWith('\\')) {
    throw new Error('File path must be relative, not absolute')
  }
  // Reject Windows drive letters
  if (/^[A-Za-z]:[\\/]/.test(path)) {
    throw new Error('File path must not contain a drive letter')
  }
  // Normalize backslashes to forward slashes
  let normalized = path.replace(/\\/g, '/')
  // Collapse duplicate slashes
  normalized = normalized.replace(/\/+/g, '/')
  // Remove leading ./ 
  normalized = normalized.replace(/^\.\//, '')
  // Split into segments and reject .. or . segments
  const segments = normalized.split('/')
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      throw new Error('File path must not contain directory traversal segments')
    }
    if (seg.length === 0) {
      throw new Error('File path has empty segment')
    }
  }
  return normalized
}

export class ProjectFileRepository {
  async listByProject(projectId) {
    return prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
      select: {
        id: true, projectId: true, path: true, type: true, size: true,
        mimeType: true, createdAt: true, updatedAt: true,
      },
    })
  }

  async findByProjectAndPath(projectId, path) {
    return prisma.projectFile.findUnique({
      where: { projectId_path: { projectId, path } },
    })
  }

  async findById(id) {
    return prisma.projectFile.findUnique({ where: { id } })
  }

  async create(data) {
    return prisma.projectFile.create({
      data,
      select: {
        id: true, projectId: true, path: true, type: true, size: true,
        mimeType: true, createdAt: true, updatedAt: true,
      },
    })
  }

  async update(id, data) {
    return prisma.projectFile.update({
      where: { id },
      data,
      select: {
        id: true, projectId: true, path: true, type: true, size: true,
        mimeType: true, content: true, updatedAt: true,
      },
    })
  }

  async delete(id) {
    return prisma.projectFile.delete({ where: { id } })
  }

  async deleteByProjectAndPath(projectId, path) {
    return prisma.projectFile.delete({
      where: { projectId_path: { projectId, path } },
    })
  }
}

export const projectFileRepository = new ProjectFileRepository()
export default projectFileRepository
