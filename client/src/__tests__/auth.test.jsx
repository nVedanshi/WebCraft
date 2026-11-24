import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../routes/Login'
import RegisterPage from '../routes/Register'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Auth pages', () => {
  it('renders the login page with sign-in button', () => {
    renderWithRouter(<LoginPage />)
    screen.getByRole('button', { name: /sign in/i })
    screen.getByLabelText(/email/i)
    screen.getByLabelText(/password/i)
  })

  it('renders the register page with create-account button', () => {
    renderWithRouter(<RegisterPage />)
    screen.getByRole('button', { name: /create account/i })
    screen.getByLabelText(/name/i)
  })
})
