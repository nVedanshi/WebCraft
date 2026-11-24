import { Link } from 'react-router-dom'
import {
  BookOpen,
  HelpCircle,
  FileText,
  Code2,
  MessageCircle,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx'

const resources = [
  {
    icon: BookOpen,
    title: 'Getting Started',
    description: 'Learn the basics of WebCraft and create your first project.',
    link: '/help/getting-started',
  },
  {
    icon: Code2,
    title: 'API Documentation',
    description: 'Integrate WebCraft with your own tools and services.',
    link: '/help/api',
  },
  {
    icon: FileText,
    title: 'Tutorials',
    description: 'Step-by-step guides for common tasks and workflows.',
    link: '/help/tutorials',
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Frequently asked questions and answers.',
    link: '/help/faq',
  },
]

const faqs = [
  {
    question: 'How do WebCraft credits work?',
    answer: 'WebCraft credits are internal billing units. Free tier users get 50 credits daily (reset at 00:00 UTC). Pro users get 200 credits per billing period. Business users pay for actual AI usage.',
  },
  {
    question: 'Can I use my own AI provider API keys?',
    answer: 'Yes, you can configure your own provider API keys in Settings → API Keys. Your keys are stored encrypted on the backend and never exposed to the frontend.',
  },
  {
    question: 'How does project generation work?',
    answer: 'Describe your application in natural language. WebCraft uses AI to generate the complete codebase including frontend, backend, and database schema. You can then inspect, edit, and preview the generated code.',
  },
  {
    question: 'Is my code private?',
    answer: 'Your projects are private by default. Only you and authorized team members can access your code. GitBranch integration is optional and requires explicit connection.',
  },
  {
    question: 'Can I export my projects?',
    answer: 'Yes, you can export your projects at any time. Use the Export button in the workspace toolbar to download your project files.',
  },
]

export function HelpPage() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Documentation</h1>
        <p className="text-secondary">Everything you need to get the most out of WebCraft</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resources.map((resource) => (
          <Link
            key={resource.title}
            to={resource.link}
            className="card card-hover p-4 flex flex-col"
          >
            <resource.icon className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-semibold text-foreground mb-1">{resource.title}</h3>
            <p className="text-sm text-secondary flex-1">{resource.description}</p>
            <span className="text-accent text-sm mt-2 flex items-center gap-1">
              Learn more
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Common questions about WebCraft</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <h4 className="font-medium text-foreground mb-2">{faq.question}</h4>
                <p className="text-sm text-secondary">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Need more help?</CardTitle>
          <CardDescription>We're here to help you succeed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <a
              href="mailto:support@webcraft.dev"
              className="btn-secondary btn-sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact support
            </a>
            <a
              href="https://GitBranch.com/webcraft"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              GitBranch
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HelpPage

