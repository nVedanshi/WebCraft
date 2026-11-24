/**
 * Template catalog — canonical template definitions served by the backend.
 * Frontends must not hardcode these; they fetch from the API so links,
 * categories and stacks stay consistent.
 */
export const templates = [
  {
    id: 'saas-dashboard',
    name: 'SaaS Dashboard',
    description: 'Analytics dashboard with charts, tables and a responsive layout.',
    category: 'Dashboard',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL' },
    features: ['Auth-ready layout', 'Charts', 'Data tables', 'Responsive nav'],
    prompt:
      'Build a SaaS analytics dashboard with a sidebar, KPI cards, a line chart, and a sortable data table.',
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Product catalog, cart and checkout flow.',
    category: 'Commerce',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL' },
    features: ['Product grid', 'Cart state', 'Checkout form', 'Order summary'],
    prompt:
      'Build an e-commerce storefront with a product grid, product detail page, cart, and checkout summary.',
  },
  {
    id: 'landing-page',
    name: 'Marketing Landing Page',
    description: 'Hero, features, pricing and FAQ for a product launch.',
    category: 'Marketing',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'none' },
    features: ['Hero section', 'Feature grid', 'Pricing tiers', 'FAQ'],
    prompt:
      'Build a modern marketing landing page with a hero, feature grid, pricing section and FAQ.',
  },
  {
    id: 'blog-cms',
    name: 'Blog / CMS',
    description: 'Posts list, article view and an editor.',
    category: 'Content',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL' },
    features: ['Post list', 'Article view', 'Markdown rendering', 'Editor'],
    prompt:
      'Build a blog with a list of posts, a single article view with markdown rendering, and a simple editor.',
  },
  {
    id: 'task-manager',
    name: 'Task Manager',
    description: 'Kanban board with drag-and-drop columns.',
    category: 'Productivity',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL' },
    features: ['Kanban columns', 'Task cards', 'Filters', 'Persistent state'],
    prompt:
      'Build a task manager with a Kanban board, task cards, and filtering by status.',
  },
  {
    id: 'portfolio',
    name: 'Developer Portfolio',
    description: 'Personal site with projects, about and contact.',
    category: 'Marketing',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'none' },
    features: ['Hero', 'Projects grid', 'About', 'Contact form'],
    prompt:
      'Build a developer portfolio with a hero, a projects grid, an about section and a contact form.',
  },
]

export function listTemplates({ category, search } = {}) {
  let result = templates
  if (category && category !== 'all') {
    result = result.filter((t) => t.category.toLowerCase() === String(category).toLowerCase())
  }
  if (search) {
    const q = String(search).toLowerCase()
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }
  return result
}

export function getTemplate(id) {
  return templates.find((t) => t.id === id) || null
}

export function listCategories() {
  return Array.from(new Set(templates.map((t) => t.category))).sort()
}
