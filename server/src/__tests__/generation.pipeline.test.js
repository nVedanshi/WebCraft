import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GenerationPipeline } from '../services/generation/pipeline.js'
import { providerRegistry } from '../lib/llm/registry.js'
import { prisma } from '../lib/prisma.js'

// ── Mock provider ──
class MockProvider {
  constructor(options = {}) {
    this.options = options
    this.callCount = 0
    this.lastMessages = null
    this.lastConfig = null
    this.shouldFail = options.shouldFail || false
    this.failAfter = options.failAfter || Infinity
    this.failWith = options.failWith || new Error('Provider error')
    this.delay = options.delay || 0
    this.responses = options.responses || []
    this.responseIndex = 0
  }

  getProviderName() {
    return this.options.providerName || 'mock'
  }

  isAvailable() {
    return this.options.available !== false
  }

  async complete(messages, config) {
    this.callCount++
    this.lastMessages = messages
    this.lastConfig = config

    if (this.shouldFail && this.callCount >= this.failAfter) {
      throw this.failWith
    }

    if (this.delay > 0) {
      await new Promise((r) => setTimeout(r, this.delay))
    }

    let response
    if (this.responses.length > 0) {
      response = this.responses[this.responseIndex++ % this.responses.length]
    } else {
      response = this.options.response || { content: '{}', inputTokens: 10, outputTokens: 10 }
    }

    return {
      content: response.content,
      inputTokens: response.inputTokens ?? 10,
      outputTokens: response.outputTokens ?? 10,
      model: response.model ?? 'mock-model',
      provider: this.getProviderName(),
      finishReason: 'stop',
    }
  }

  async streamComplete() {
    throw new Error('streamComplete not implemented in mock')
  }
}

function registerMockProvider(name, provider) {
  providerRegistry.register(name, provider)
  providerRegistry.setDefaultForTask('analysis', name)
  providerRegistry.setDefaultForTask('planning', name)
  providerRegistry.setDefaultForTask('code', name)
  providerRegistry.setDefaultForTask('repair', name)
  providerRegistry.setDefaultForTask('chat', name)
  providerRegistry.setDefaultForTask('default', name)
}

// ── Mock prisma at the data layer ──
vi.mock('../lib/prisma.js', () => {
  const mProject = {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const mProjectFile = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const mProjectVersion = {
    create: vi.fn(),
  }
  return {
    prisma: {
      project: mProject,
      projectFile: mProjectFile,
      projectVersion: mProjectVersion,
      $transaction: vi.fn(async (fn) => fn({
        project: mProject,
        projectFile: mProjectFile,
        projectVersion: mProjectVersion,
      })),
    },
  }
})

describe('GenerationPipeline', () => {
  let pipeline

  beforeEach(() => {
    pipeline = new GenerationPipeline()
    vi.clearAllMocks()
    providerRegistry.setDefaultForTask('analysis', 'openai')
    providerRegistry.setDefaultForTask('planning', 'openai')
    providerRegistry.setDefaultForTask('code', 'openai')
    providerRegistry.setDefaultForTask('repair', 'openai')
    providerRegistry.setDefaultForTask('chat', 'openai')
    providerRegistry.setDefaultForTask('default', 'openai')
  })

  afterEach(() => {
    pipeline.cancel()
  })

  describe('generate() - successful generation', () => {
    it('completes all stages and returns a valid result', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        responses: [
          {
            content: JSON.stringify({
              appType: 'web-app',
              description: 'A todo app',
              features: ['add task', 'list tasks'],
              pages: ['Home', 'TodoList'],
              constraints: [],
              techStack: { frontend: 'React', backend: 'Node.js', database: 'SQLite' },
              estimatedComplexity: 'low',
            }),
            inputTokens: 100,
            outputTokens: 200,
          },
          {
            content: JSON.stringify({
              appType: 'web-app',
              name: 'Todo App',
              description: 'A todo application',
              pages: [
                { name: 'Home', path: '/', description: 'Home page', components: ['Navbar'] },
                { name: 'TodoList', path: '/todos', description: 'Todo list', components: ['TodoForm', 'TodoItem'] },
              ],
              backendRoutes: [
                { path: '/api/todos', method: 'GET', description: 'List todos' },
                { path: '/api/todos', method: 'POST', description: 'Create todo' },
              ],
              databaseTables: [{ name: 'todos', columns: [{ name: 'id', type: 'uuid', nullable: false }] }],
              dependencies: { frontend: ['react'], backend: ['express'] },
              setupInstructions: 'npm install && npm run dev',
            }),
            inputTokens: 150,
            outputTokens: 300,
          },
          {
            content: JSON.stringify({
              projectName: 'Todo App',
              files: [
                {
                  path: 'package.json',
                  content: JSON.stringify({ name: 'todo-app', dependencies: { react: '^18.0.0' } }),
                  type: 'file',
                  operation: 'create',
                },
                {
                  path: 'src/App.jsx',
                  content: 'export default function App() { return null }',
                  type: 'file',
                  operation: 'create',
                },
              ],
              totalFiles: 2,
              instructions: 'Run npm install',
            }),
            inputTokens: 200,
            outputTokens: 400,
          },
        ],
      })
      registerMockProvider('mock', mockProvider)

      // Mock prisma project.create
      prisma.project.create.mockResolvedValue({
        id: 'c1234567890abcdefghijklmno',
        userId: 'user_123',
        name: 'Todo App',
        description: 'A todo application',
        revisionId: 'rev_1',
        files: [],
      })

      // Mock project.findUnique (for version creation)
      prisma.project.findUnique.mockResolvedValue({
        id: 'c1234567890abcdefghijklmno',
        files: [],
        revisionId: 'rev_1',
      })

      prisma.projectVersion.create.mockResolvedValue({
        id: 'ver_1',
        projectid: 'c123',
        label: 'v1234567890',
      })

      // Mock projectFile.create
      prisma.projectFile.create.mockResolvedValue({ id: 'file_1' })

      const result = await pipeline.generate({
        userId: 'user_123',
        prompt: 'Build a todo app with add and list functionality',
        projectName: 'Todo App',
      })

      expect(result.success).toBe(true)
      expect(result.projectId).toBe('c1234567890abcdefghijklmno')
      expect(result.filesCreated).toBe(2)
      expect(result.tokenUsage.inputTokens).toBe(450) // 100+150+200
      expect(result.tokenUsage.outputTokens).toBe(900) // 200+300+400
      expect(result.providerInfo.provider).toBe('mock')
      expect(result.providerInfo.model).toBe('mock-model')
      expect(result.stages.some((s) => s.name === 'analysis' && s.status === 'completed')).toBe(true)
      expect(result.stages.some((s) => s.name === 'planning' && s.status === 'completed')).toBe(true)
      expect(result.stages.some((s) => s.name === 'manifest' && s.status === 'completed')).toBe(true)
      expect(mockProvider.callCount).toBe(3)
    })

    it('tracks token usage separately from WebCraft credits', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        responses: [
          {
            content: JSON.stringify({
              appType: 'landing-page',
              description: 'A landing page',
              features: ['hero section'],
              pages: ['Home'],
              constraints: [],
              techStack: { frontend: 'React', backend: 'none', database: 'none' },
              estimatedComplexity: 'low',
            }),
            inputTokens: 50,
            outputTokens: 100,
          },
          {
            content: JSON.stringify({
              appType: 'landing-page',
              name: 'Landing Page',
              description: 'A simple landing page',
              pages: [{ name: 'Home', path: '/', description: 'Home', components: ['Hero'] }],
              backendRoutes: [],
              databaseTables: [],
              dependencies: { frontend: ['react'], backend: [] },
              setupInstructions: 'npm install',
            }),
            inputTokens: 80,
            outputTokens: 160,
          },
          {
            content: JSON.stringify({
              projectName: 'Landing Page',
              files: [
                {
                  path: 'package.json',
                  content: '{}',
                  type: 'file',
                  operation: 'create',
                },
                {
                  path: 'src/App.jsx',
                  content: 'export default App',
                  type: 'file',
                  operation: 'create',
                },
              ],
              totalFiles: 2,
            }),
            inputTokens: 120,
            outputTokens: 240,
          },
        ],
      })
      registerMockProvider('mock', mockProvider)

      prisma.project.create.mockResolvedValue({
        id: 'c4567890abcdefghijklmno',
        userId: 'user_456',
        name: 'Landing Page',
        description: 'A simple landing page',
        revisionId: 'rev_2',
        files: [],
      })

      prisma.project.findUnique.mockResolvedValue({
        id: 'c4567890abcdefghijklmno',
        files: [],
        revisionId: 'rev_2',
      })
      prisma.projectVersion.create.mockResolvedValue({ id: 'ver_2' })
      prisma.projectFile.create.mockResolvedValue({ id: 'file_2' })

      const result = await pipeline.generate({
        userId: 'user_456',
        prompt: 'Build a landing page with a hero section',
        projectName: 'Landing Page',
      })

      expect(result.tokenUsage.inputTokens).toBe(250) // 50+80+120
      expect(result.tokenUsage.outputTokens).toBe(500) // 100+160+240
      expect(result.tokenUsage.totalTokens).toBe(750)
    })
  })

  describe('generate() - provider failure', () => {
    it('throws when provider fails during analysis', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        shouldFail: true,
        failAfter: 1,
        failWith: new Error('API rate limit exceeded'),
      })
      registerMockProvider('mock', mockProvider)

      prisma.project.create.mockResolvedValue({ id: 'c1111111111abcdefghijklmno' })

      await expect(
        pipeline.generate({
          userId: 'user_1',
          prompt: 'Build an app',
          projectName: 'Test',
        })
      ).rejects.toThrow('API rate limit exceeded')
    })

    it('throws when provider fails during manifest generation', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        responses: [
          { content: JSON.stringify({ appType: 'web-app', description: 'x', features: ['f'], pages: ['p'], constraints: [], techStack: { frontend: 'r', backend: 'n', database: 's' }, estimatedComplexity: 'low' }), inputTokens: 10, outputTokens: 10 },
          { content: JSON.stringify({ appType: 'web-app', name: 'x', description: 'x', pages: [{ name: 'p', path: '/', description: 'x', components: [] }], backendRoutes: [], databaseTables: [], dependencies: { f: [], b: [] }, setupInstructions: 'x' }), inputTokens: 10, outputTokens: 10 },
        ],
        shouldFail: true,
        failAfter: 3,
        failWith: new Error('Provider unavailable'),
      })
      registerMockProvider('mock', mockProvider)

      prisma.project.create.mockResolvedValue({ id: 'c2222222222abcdefghijklmno' })

      await expect(
        pipeline.generate({
          userId: 'user_2',
          prompt: 'Build an app',
          projectName: 'Test',
        })
      ).rejects.toThrow('Provider unavailable')
    })
  })

  describe('generate() - invalid LLM output', () => {
    it('throws when analysis returns malformed JSON', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        responses: [
          { content: 'not valid json at all', inputTokens: 10, outputTokens: 10 },
        ],
      })
      registerMockProvider('mock', mockProvider)

      prisma.project.create.mockResolvedValue({ id: 'c3333333333abcdefghijklmno' })

      await expect(
        pipeline.generate({
          userId: 'user_3',
          prompt: 'Build an app',
          projectName: 'Test',
        })
      ).rejects.toThrow('Malformed LLM response')
    })

    it('throws when plan fails Zod validation', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        responses: [
          { content: JSON.stringify({ appType: 'web-app', description: 'x', features: ['f'], pages: ['p'], constraints: [], techStack: { f: 'r', b: 'n', d: 's' }, estimatedComplexity: 'low' }), inputTokens: 10, outputTokens: 10 },
          { content: JSON.stringify({ invalid: 'plan' }), inputTokens: 10, outputTokens: 10 },
        ],
      })
      registerMockProvider('mock', mockProvider)

      prisma.project.create.mockResolvedValue({ id: 'c4444444444abcdefghijklmno' })

      await expect(
        pipeline.generate({
          userId: 'user_4',
          prompt: 'Build an app',
          projectName: 'Test',
        })
      ).rejects.toThrow()
    })
  })

  describe('modify() - incremental edits', () => {
    it('applies create and modify operations without touching unrelated files', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        responses: [
          {
            content: JSON.stringify({
              operations: [
                { operation: 'create', path: 'src/NewPage.jsx', content: 'export default NewPage' },
                { operation: 'modify', path: 'src/App.jsx', content: 'export default App' },
              ],
            }),
            inputTokens: 50,
            outputTokens: 100,
          },
        ],
      })
      registerMockProvider('mock', mockProvider)

      // Mock project.findUnique (for getProject)
      prisma.project.findUnique.mockResolvedValue({
        id: 'cmodmodmodmodmodmodmodmo',
        userId: 'user_mod',
        name: 'Existing App',
        description: 'An existing app',
        revisionId: 'rev_mod',
        files: [],
      })

      // Mock projectFile.findUnique (for getFile in updateFile) - check path
      prisma.projectFile.findUnique.mockImplementation(({ where }) => {
        if (where.projectId_path?.path === 'src/App.jsx') {
          return Promise.resolve({
            id: 'file_app',
            projectid: 'cmodmodmodmodmodmodmodmo',
            path: 'src/App.jsx',
            content: 'export default App',
            size: 20,
            revisionId: 'rev_mod',
          })
        }
        return Promise.resolve(null)
      })

      // Mock projectFile.findMany (for listFiles)
      prisma.projectFile.findMany.mockResolvedValue([
        { path: 'src/App.jsx', content: 'export default App', size: 20 },
        { path: 'package.json', content: '{}', size: 2 },
      ])

      // Mock projectFile.create and update
      prisma.projectFile.create.mockResolvedValue({ id: 'file_new' })
      prisma.projectFile.update.mockResolvedValue({ id: 'file_upd' })

      // Mock project.findUnique again for version creation
      prisma.projectVersion.create.mockResolvedValue({ id: 'ver_mod' })

      const result = await pipeline.modify({
        projectid: 'cmod',
        userId: 'user_mod',
        instruction: 'Add a new page and update the app component',
      })

      expect(result.success).toBe(true)
      expect(result.filesCreated).toBe(1)
      expect(result.filesModified).toBe(1)
      expect(result.filesDeleted).toBe(0)

      // Verify projectFile.create was called for the new file
      expect(prisma.projectFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            path: 'src/NewPage.jsx',
            content: 'export default NewPage',
          }),
        })
      )

      // Verify projectFile.update was called for the modified file
      expect(prisma.projectFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'export default App',
          }),
        })
      )
    })

    it('handles revision conflict', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'cconflictconflictconflictco',
        userId: 'user_conflict',
        name: 'App',
        description: 'App',
        revisionId: 'old_rev',
        files: [],
      })

      await expect(
        pipeline.modify({
          projectid: 'cconflictconflictconflictco',
          userId: 'user_conflict',
          instruction: 'Update something',
          expectedRevisionId: 'different_rev',
        })
      ).rejects.toThrow('Project has been modified by another client')
    })

    it('preserves unrelated files during modification', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        responses: [
          {
            content: JSON.stringify({
              operations: [
                { operation: 'modify', path: 'src/App.jsx', content: 'export default App v2' },
              ],
            }),
            inputTokens: 30,
            outputTokens: 60,
          },
        ],
      })
      registerMockProvider('mock', mockProvider)

      prisma.project.findUnique.mockResolvedValue({
        id: 'cpreservepreservepreservepr',
        userId: 'user_preserve',
        name: 'App',
        description: 'App',
        revisionId: 'rev_preserve',
        files: [],
      })

      // Mock projectFile.findUnique (for getFile in updateFile)
      prisma.projectFile.findUnique.mockImplementation(({ where }) => {
        if (where.projectId_path?.path === 'src/App.jsx') {
          return Promise.resolve({
            id: 'file_app',
            projectid: 'cpreservepreservepreservepr',
            path: 'src/App.jsx',
            content: 'export default App',
            size: 20,
            revisionId: 'rev_preserve',
          })
        }
        return Promise.resolve(null)
      })

      // Existing files include unrelated ones
      prisma.projectFile.findMany.mockResolvedValue([
        { path: 'src/App.jsx', content: 'export default App', size: 20 },
        { path: 'src/Untouched.jsx', content: 'export default Untouched', size: 20 },
        { path: 'package.json', content: '{}', size: 2 },
      ])

      prisma.projectFile.update.mockResolvedValue({ id: 'file_upd' })
      prisma.projectVersion.create.mockResolvedValue({ id: 'ver_preserve' })

      const result = await pipeline.modify({
        projectid: 'cpreserve',
        userId: 'user_preserve',
        instruction: 'Update App.jsx only',
      })

      // Only one file should be modified - Untouched.jsx should NOT appear in any operation
      const updateCalls = prisma.projectFile.update.mock.calls
      // updateFile uses where: { id: file.id }, not projectId_path
      const updatedIds = updateCalls.map((c) => c[0]?.where?.id).filter(Boolean)
      expect(updatedIds).toHaveLength(1)
      expect(updatedIds).toContain('file_app')
    })
  })

  describe('cancel()', () => {
    it('cancels an in-progress generation', async () => {
      const mockProvider = new MockProvider({
        providerName: 'mock',
        delay: 50,
        responses: [
          { content: JSON.stringify({ appType: 'web-app', description: 'x', features: ['f'], pages: ['p'], constraints: [], techStack: { frontend: 'r', backend: 'n', database: 's' }, estimatedComplexity: 'low' }), inputTokens: 10, outputTokens: 10 },
          { content: JSON.stringify({ appType: 'web-app', name: 'x', description: 'x', pages: [{ name: 'p', path: '/', description: 'x', components: [] }], backendRoutes: [], databaseTables: [], dependencies: { f: [], b: [] }, setupInstructions: 'x' }), inputTokens: 10, outputTokens: 10 },
          { content: JSON.stringify({ projectName: 'x', files: [{ path: 'package.json', content: '{}', type: 'file', operation: 'create' }], totalFiles: 1 }), inputTokens: 10, outputTokens: 10 },
        ],
      })
      registerMockProvider('mock', mockProvider)

      prisma.project.create.mockResolvedValue({ id: 'ccancelcancelcancelcanc' })

      const genPromise = pipeline.generate({
        userId: 'user_cancel',
        prompt: 'Build an app',
        projectName: 'Test',
      })

      await new Promise((r) => setTimeout(r, 30))
      pipeline.cancel()

      await expect(genPromise).rejects.toThrow('Generation cancelled')
    })

    it('exposes _checkCancelled for testing', () => {
      pipeline.cancel()
      expect(() => pipeline._checkCancelled()).toThrow('Generation cancelled')
    })
  })
})
