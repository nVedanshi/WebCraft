import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockList = vi.fn()

vi.mock('../lib/templatesApi.js', () => ({
  templatesApi: {
    list: (...args) => mockList(...args),
    get: vi.fn(),
    use: vi.fn(),
  },
}))

import { WelcomePage } from '../pages/Welcome.jsx'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('WelcomePage', () => {
  it('renders the headline with specific copy', () => {
    mockList.mockResolvedValue({ data: { data: { templates: [] } } })
    renderWithRouter(<WelcomePage />)
    screen.getByRole('heading', { name: /type what you want. get a real website/i })
    screen.getByText(/WebCraft generates the code/)
  })

  it('renders the three-step strip', () => {
    mockList.mockResolvedValue({ data: { data: { templates: [] } } })
    renderWithRouter(<WelcomePage />)
    screen.getByRole('heading', { name: /describe your site/i })
    screen.getByRole('heading', { name: /watch it build/i })
    screen.getByRole('heading', { name: /publish your site/i })
  })

  it('renders the examples section', () => {
    mockList.mockResolvedValue({ data: { data: { templates: [] } } })
    renderWithRouter(<WelcomePage />)
    screen.getByRole('heading', { name: /real templates/i })
    screen.getByText(/developer portfolio/i)
    screen.getByText(/saas dashboard/i)
    screen.getByText(/e-commerce store/i)
  })

  it('renders footer links with TODO placeholders', () => {
    mockList.mockResolvedValue({ data: { data: { templates: [] } } })
    renderWithRouter(<WelcomePage />)
    expect(screen.getAllByText(/github/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/changelog/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/community/i).length).toBeGreaterThan(0)
  })

  it('does not render sparkle badge or gradient headline word', () => {
    mockList.mockResolvedValue({ data: { data: { templates: [] } } })
    renderWithRouter(<WelcomePage />)
    expect(screen.queryByText(/blank editor/i)).toBeNull()
    expect(screen.queryByText(/ai-powered development platform/i)).toBeNull()
  })

  it('renders the Start building link', () => {
    mockList.mockResolvedValue({ data: { data: { templates: [] } } })
    renderWithRouter(<WelcomePage />)
    screen.getByRole('link', { name: /start building/i })
  })
})
