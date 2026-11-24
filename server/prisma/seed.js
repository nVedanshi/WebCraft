import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

const TEMPLATES_DIR = join(process.cwd(), 'src', 'data', 'templates')

const templateDefinitions = [
  {
    id: 'saas-dashboard',
    name: 'SaaS Dashboard',
    slug: 'saas-dashboard',
    description: 'Analytics dashboard with charts, tables and a responsive layout.',
    category: 'dashboard',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL', router: 'React Router' },
    previewImage: null,
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    slug: 'ecommerce-store',
    description: 'Product catalog, cart and checkout flow.',
    category: 'e-commerce',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL', router: 'React Router' },
    previewImage: null,
  },
  {
    id: 'landing-page',
    name: 'Marketing Landing Page',
    slug: 'landing-page',
    description: 'Hero, features, pricing and FAQ for a product launch.',
    category: 'landing-page',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'none', router: 'React Router' },
    previewImage: null,
  },
  {
    id: 'blog-cms',
    name: 'Blog / CMS',
    slug: 'blog-cms',
    description: 'Posts list, article view and an editor.',
    category: 'blog',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL', router: 'React Router' },
    previewImage: null,
  },
  {
    id: 'task-manager',
    name: 'Task Manager',
    slug: 'task-manager',
    description: 'Kanban board with drag-and-drop columns.',
    category: 'productivity',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'PostgreSQL', router: 'React Router' },
    previewImage: null,
  },
  {
    id: 'portfolio',
    name: 'Developer Portfolio',
    slug: 'portfolio',
    description: 'Personal site with projects, about and contact.',
    category: 'portfolio',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'none', router: 'React Router' },
    previewImage: null,
  },
  {
    id: 'business-site',
    name: 'Business Website',
    slug: 'business-site',
    description: 'Professional business site with services, stats and contact.',
    category: 'business',
    stack: { framework: 'React', styling: 'Tailwind CSS', database: 'none', router: 'React Router' },
    previewImage: null,
  },
]

function collectFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath))
    } else {
      const relativePath = fullPath.replace(TEMPLATES_DIR + '/', '')
      const content = readFileSync(fullPath, 'utf8')
      const stat = statSync(fullPath)
      results.push({
        path: relativePath,
        content,
        type: 'file',
        size: Buffer.byteLength(content, 'utf8'),
      })
    }
  }
  return results
}

async function main() {
  const passwordHash = await bcrypt.hash('dev-password-123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'dev@webcraft.local' },
    update: {},
    create: {
      email: 'dev@webcraft.local',
      passwordHash,
      name: 'Dev User',
      credits: 1000,
    },
  })

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, tier: 'FREE' },
  })

  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      type: 'PURCHASE',
      amount: 1000,
      balanceAfter: 1000,
      description: 'Seed credit grant',
    },
  })

  // Seed templates from source files on disk
  for (const def of templateDefinitions) {
    const templateDir = join(TEMPLATES_DIR, def.id)
    const files = collectFiles(templateDir)

    const template = await prisma.template.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        description: def.description,
        category: def.category,
        stack: def.stack,
        isPublished: true,
      },
      create: {
        id: def.id,
        name: def.name,
        slug: def.slug,
        description: def.description,
        category: def.category,
        stack: def.stack,
        isPublished: true,
      },
    })

    // Upsert template files
    for (const file of files) {
      await prisma.templateFile.upsert({
        where: { templateId_path: { templateId: template.id, path: file.path } },
        update: {
          content: file.content,
          type: file.type,
          size: file.size,
        },
        create: {
          templateId: template.id,
          path: file.path,
          content: file.content,
          type: file.type,
          size: file.size,
        },
      })
    }

    console.log(`Seeded template "${def.name}" with ${files.length} files`)
  }

  console.log('Seed complete:', { userId: user.id, email: user.email, templates: templateDefinitions.length })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
