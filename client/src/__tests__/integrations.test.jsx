import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockGithubConnectProject = vi.fn()
const mockGithubDisconnectProject = vi.fn()
const mockGithubProjectInfo = vi.fn()
const mockGithubStatus = vi.fn()
const mockGithubRepos = vi.fn()
const mockGetProviders = vi.fn()
const mockGetPaymentsConfig = vi.fn()

const mockApiGet = vi.fn()

vi.mock('../lib/integrationsApi.js', () => ({
  integrationsApi: {
    getProviders: (...args) => mockGetProviders(...args),
    githubStatus: (...args) => mockGithubStatus(...args),
    githubDisconnect: vi.fn(),
    githubRepos: (...args) => mockGithubRepos(...args),
    githubBranches: vi.fn(),
    githubConnectProject: (...args) => mockGithubConnectProject(...args),
    githubDisconnectProject: (...args) => mockGithubDisconnectProject(...args),
    githubProjectInfo: (...args) => mockGithubProjectInfo(...args),
    githubCreateRepo: vi.fn(),
    githubPublish: vi.fn(),
    githubPull: vi.fn(),
    githubSync: vi.fn(),
    githubResolveConflict: vi.fn(),
    githubSyncStatus: vi.fn(),
    saveKey: vi.fn(),
    testProvider: vi.fn(),
    setDefault: vi.fn(),
    setBillingMode: vi.fn(),
    disconnectProvider: vi.fn(),
  },
}))

vi.mock('../lib/api.js', () => ({
  api: {
    get: (...args) => mockApiGet(...args),
    setToken: vi.fn(),
  },
}))

import { IntegrationsPage } from '../pages/Integrations.jsx'
import { integrationsApi } from '../lib/integrationsApi.js'

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function renderWithRouter(ui, initialEntries = ['/integrations']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>)
}

const sampleProjects = [
  { id: 'proj_1', name: 'My Project', userId: 'user_1' },
  { id: 'proj_2', name: 'Other Project', userId: 'user_1' },
]

describe('IntegrationsPage — project selection', () => {
  beforeEach(() => {
    mockGetProviders.mockResolvedValue({ data: { data: { providers: [] } } })
    mockGithubStatus.mockResolvedValue({ data: { data: { configured: true, connected: true } } })
    mockGetPaymentsConfig.mockResolvedValue({ data: { data: { configured: false } } })
    mockApiGet.mockResolvedValue({ data: { data: { projects: sampleProjects } } })
    mockGithubRepos.mockResolvedValue({ data: { data: { repos: [] } } })
  })

  it('shows a plain message and project dropdown when no project is selected', async () => {
    renderWithRouter(<IntegrationsPage />, ['/integrations'])
    await waitFor(() => {
      expect(screen.queryAllByText(/Select a WebCraft project to link to GitHub/i).length).toBeGreaterThan(0)
    })
    expect(screen.getByRole('combobox')).not.toBeNull()
  })

  it('does not render the literal project id current', async () => {
    renderWithRouter(<IntegrationsPage />, ['/integrations'])
    await waitFor(() => {
      expect(screen.queryAllByText(/Select a WebCraft project/i).length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('current')).toBeNull()
  })

  it('loads the existing link when ?projectId= is provided', async () => {
    mockGithubProjectInfo.mockResolvedValue({
      data: { data: { link: { id: 'ghp_1', projectId: 'proj_1', owner: 'user', repo: 'repo', branch: 'main' } } },
    })
    renderWithRouter(<IntegrationsPage />, ['/integrations?projectId=proj_1'])
    await waitFor(() => {
      expect(mockGithubProjectInfo).toHaveBeenCalledWith('proj_1')
    })
    expect(screen.queryByText(/Select a WebCraft project to link to GitHub/i)).toBeNull()
  })

  it('connect sends the real project id, not current', async () => {
    mockGithubConnectProject.mockResolvedValue({ data: { data: { projectId: 'proj_1' } } })
    integrationsApi.githubBranches.mockResolvedValue({ data: { data: { branches: ['main'] } } })
    mockGithubRepos.mockResolvedValue({
      data: {
        data: {
          repos: [{ id: 1, name: 'repo', fullName: 'user/repo', owner: 'user', private: false, defaultBranch: 'main', html_url: 'https://github.com/user/repo' }],
        },
      },
    })
    renderWithRouter(<IntegrationsPage />, ['/integrations?projectId=proj_1'])
    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeNull()
    })
    // Select a repo so linking is enabled
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'user/repo' } })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Link project/i }).length).toBe(1)
    })
    // Click the card's "Link project" button to open the connect dialog
    fireEvent.click(screen.getAllByRole('button', { name: /Link project/i })[0])
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Link project/i }).length).toBe(2)
    })
    // Click the dialog's confirm "Link project" button -> handleConnectProject
    fireEvent.click(screen.getAllByRole('button', { name: /Link project/i })[1])
    await waitFor(() => {
      expect(mockGithubConnectProject.mock.calls.length).toBeGreaterThan(0)
    })
    const call = mockGithubConnectProject.mock.calls[0]
    expect(call[0]).toBe('proj_1')
    expect(call[1]).toEqual(expect.objectContaining({ owner: 'user', repo: 'repo', branch: 'main' }))
  })
})

describe('IntegrationsPage — not configured (503)', () => {
  beforeEach(() => {
    mockGetProviders.mockResolvedValue({ data: { data: { providers: [] } } })
    mockGithubStatus.mockResolvedValue({ data: { data: { configured: false, connected: false } } })
    mockGetPaymentsConfig.mockResolvedValue({ data: { data: { configured: false } } })
    mockApiGet.mockResolvedValue({ data: { data: { projects: sampleProjects } } })
    mockGithubRepos.mockResolvedValue({ data: { data: { repos: [] } } })
  })

  it('shows configuration-required status when GitHub is not configured', async () => {
    renderWithRouter(<IntegrationsPage />, ['/integrations?projectId=proj_1'])
    await waitFor(() => {
      expect(screen.queryAllByText('Configuration Required').length).toBeGreaterThan(0)
    })
  })

  it('shows a clear message when connect fails with GITHUB_NOT_CONFIGURED', async () => {
    mockGithubStatus.mockResolvedValue({ data: { data: { configured: true, connected: true } } })
    integrationsApi.githubBranches.mockResolvedValue({ data: { data: { branches: ['main'] } } })
    mockGithubConnectProject.mockRejectedValue({
      response: { data: { error: { code: 'GITHUB_NOT_CONFIGURED', message: 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.' } } },
    })
    mockGithubRepos.mockResolvedValue({
      data: {
        data: {
          repos: [{ id: 1, name: 'repo', fullName: 'user/repo', owner: 'user', private: false, defaultBranch: 'main', html_url: 'https://github.com/user/repo' }],
        },
      },
    })
    renderWithRouter(<IntegrationsPage />, ['/integrations?projectId=proj_1'])
    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toBeNull()
    })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'user/repo' } })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Link project/i }).length).toBe(1)
    })
    fireEvent.click(screen.getAllByRole('button', { name: /Link project/i })[0])
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Link project/i }).length).toBe(2)
    })
    fireEvent.click(screen.getAllByRole('button', { name: /Link project/i })[1])
    await waitFor(() => {
      expect(screen.queryAllByText(/GitHub OAuth is not configured on this deployment/i).length).toBeGreaterThan(0)
    })
  })
})
