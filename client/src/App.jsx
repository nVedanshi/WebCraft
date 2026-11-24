import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PublicLayout } from './components/layout/PublicLayout.jsx'
import { AppLayout } from './components/layout/AppLayout.jsx'
import { WelcomePage } from './pages/Welcome.jsx'
import { LoginPage } from './pages/Login.jsx'
import { RegisterPage } from './pages/Register.jsx'
import { ForgotPasswordPage } from './pages/ForgotPassword.jsx'
import { ResetPasswordPage } from './pages/ResetPassword.jsx'
import { HomePage } from './pages/Home.jsx'
import { ProjectsPage } from './pages/Projects.jsx'
import { ProjectCreatePage } from './pages/ProjectCreate.jsx'
import { WorkspacePage } from './pages/Workspace.jsx'
import { BillingPage } from './pages/Billing.jsx'
import { UsagePage } from './pages/Usage.jsx'
import { TemplatesPage } from './pages/Templates.jsx'
import { IntegrationsPage } from './pages/Integrations.jsx'
import { SettingsPage } from './pages/Settings.jsx'
import { HelpPage } from './pages/Help.jsx'
import { ChangelogPage } from './pages/Changelog.jsx'
import { TemplateDetailPage } from './pages/TemplateDetail.jsx'
import { NotFoundPage } from './pages/NotFound.jsx'
import { TermsPage, PrivacyPage, SecurityPage, DocsPage } from './pages/Legal.jsx'

const router = createBrowserRouter([
  // Public routes
  {
    path: '/welcome',
    element: <PublicLayout />,
    children: [
      { index: true, element: <WelcomePage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Authenticated routes
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/new', element: <ProjectCreatePage /> },
      { path: 'projects/:projectId', element: <WorkspacePage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'usage', element: <UsagePage /> },
      { path: 'templates', element: <TemplatesPage /> },
      { path: 'templates/:templateId', element: <TemplateDetailPage /> },
      { path: 'integrations', element: <IntegrationsPage /> },
      { path: 'settings/profile', element: <SettingsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: 'changelog', element: <ChangelogPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Public legal / docs pages (linked from footers)
  { path: '/legal/terms', element: <TermsPage /> },
  { path: '/legal/privacy', element: <PrivacyPage /> },
  { path: '/legal/security', element: <SecurityPage /> },
  { path: '/docs', element: <DocsPage /> },
])

export function App() {
  return <RouterProvider router={router} />
}

export default App