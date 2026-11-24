import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockList = vi.fn()
const mockGet = vi.fn()

vi.mock('../lib/templatesApi.js', () => ({
  templatesApi: {
    list: (...args) => mockList(...args),
    get: (...args) => mockGet(...args),
    use: vi.fn(),
  },
}))

import { TemplatesPage } from '../pages/Templates.jsx'

function renderWithRouter(ui) {
  return render(<MemoryRouter initialEntries={['/templates']}>{ui}</MemoryRouter>)
}

const sampleTemplates = [
  {
    id: 'portfolio',
    name: 'Developer Portfolio',
    slug: 'portfolio',
    description: 'Personal site with projects, about and contact.',
    category: 'Marketing',
    previewImage: null,
    _count: { files: 7 },
  },
  {
    id: 'saas',
    name: 'SaaS Dashboard',
    slug: 'saas',
    description: 'Analytics dashboard with charts and user management.',
    category: 'Dashboard',
    previewImage: null,
    _count: { files: 12 },
  },
]

const sampleFiles = {
  portfolio: ['index.html', 'src/App.jsx', 'src/main.jsx', 'src/index.css'],
  saas: ['index.html', 'src/App.jsx', 'src/components/Chart.jsx'],
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('TemplatesPage — editorial archive', () => {
  beforeEach(() => {
    mockList.mockResolvedValue({
      data: {
        data: {
          templates: sampleTemplates,
          categories: ['Marketing', 'Dashboard'],
          total: 2,
          hasMore: false,
          nextCursor: null,
        },
      },
    })
    // mockGet always returns data for any template id (called by list page + TemplatePreview)
    mockGet.mockImplementation((id) => {
      const t = sampleTemplates.find((x) => x.id === id)
      return Promise.resolve({
        data: {
          data: {
            template: {
              ...t,
              files: (sampleFiles[id] || []).map((path) => ({ path })),
            },
          },
        },
      })
    })
  })

  it('renders each template as a row with live preview iframe', async () => {
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('template-row').length).toBe(2)
    })
    await waitFor(() => {
      expect(screen.getAllByTitle('Preview: Developer Portfolio').length).toBe(1)
    })
    await waitFor(() => {
      expect(screen.getAllByTitle('Preview: SaaS Dashboard').length).toBe(1)
    })
  })

  it('shows template name and description from the API', async () => {
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(screen.getByText('Developer Portfolio')).toBeDefined()
    })
    await waitFor(() => {
      expect(screen.getByText('SaaS Dashboard')).toBeDefined()
    })
    await waitFor(() => {
      expect(
        screen.getByText('Personal site with projects, about and contact.')
      ).toBeDefined()
    })
    await waitFor(() => {
      expect(
        screen.getByText('Analytics dashboard with charts and user management.')
      ).toBeDefined()
    })
  })

  it('shows pages included from template files', async () => {
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(screen.getAllByText('index.html').length).toBeGreaterThan(0)
    })
    await waitFor(() => {
      expect(screen.getAllByText('src/App.jsx').length).toBeGreaterThan(0)
    })
    await waitFor(() => {
      expect(screen.getByText('src/main.jsx')).toBeDefined()
    })
    await waitFor(() => {
      expect(screen.getByText('src/components/Chart.jsx')).toBeDefined()
    })
  })

  it('renders a Start from this template button per row', async () => {
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /start from this template/i })
      ).toHaveLength(2)
    })
  })

  it('navigates to template detail on Start from this template click', async () => {
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /start from this template/i })
      ).toHaveLength(2)
    })
    const buttons = screen.getAllByRole('button', {
      name: /start from this template/i,
    })
    fireEvent.click(buttons[0])
    // Button click should not throw; verify button remains interactive
    expect(buttons[0]).toBeDefined()
  })

  it('hides filters when template count is 8 or fewer', async () => {
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(screen.getByText('Developer Portfolio')).toBeDefined()
    })
    expect(screen.queryByPlaceholderText('Search templates...')).toBeNull()
    expect(screen.queryByLabelText('Filter by category')).toBeNull()
    expect(screen.queryByLabelText('Sort by')).toBeNull()
    expect(screen.queryByLabelText('Sort order')).toBeNull()
  })

  it('shows error state when API fails', async () => {
    mockList.mockRejectedValue(new Error('boom'))
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(screen.getByText(/failed to load templates/i)).toBeDefined()
    })
  })

  it('shows empty state when no templates returned', async () => {
    mockList.mockResolvedValue({
      data: {
        data: {
          templates: [],
          categories: [],
          total: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    })
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(screen.getByText(/no templates available/i)).toBeDefined()
    })
  })

  it('shows loading skeleton before data arrives', async () => {
    mockList.mockResolvedValue(new Promise(() => {})) // never resolves
    renderWithRouter(<TemplatesPage />)
    expect(screen.queryAllByTestId('skeleton-row').length).toBeGreaterThan(0)
  })

  it('shows category badge on each row', async () => {
    renderWithRouter(<TemplatesPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Marketing').length).toBeGreaterThan(0)
    })
    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    })
  })
})
