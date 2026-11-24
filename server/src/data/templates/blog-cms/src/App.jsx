import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { Edit, Mail, Trash2, Search, LayoutList, BookOpen, Tag } from 'lucide-react'

const posts = [
  { id: '1', title: 'Getting Started with React', slug: 'getting-started-with-react', excerpt: 'A beginner-friendly guide to building modern UIs with React.', content: '# Getting Started with React\n\nReact is a popular JavaScript library for building user interfaces. In this guide, we cover the fundamentals...', category: 'Tutorial', date: '2024-01-15', published: true },
  { id: '2', title: 'Tailwind CSS Best Practices', slug: 'tailwind-css-best-practices', excerpt: 'Write maintainable utility-first CSS with these proven patterns.', content: '# Tailwind CSS Best Practices\n\nTailwind CSS has changed how we write styles. Here are the patterns that work...', category: 'CSS', date: '2024-01-10', published: true },
  { id: '3', title: 'Deploying to Production', slug: 'deploying-to-production', excerpt: 'Zero-downtime deployment strategies for your web application.', content: '# Deploying to Production\n\nDeploying code to production can be stressful. Here are strategies to make it smooth...', category: 'DevOps', date: '2024-01-05', published: true },
]

export default function App() {
  const [draft, setDraft] = React.useState({ title: '', content: '', category: '' })
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
              <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">B</div>
              <span>Write</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
              <Link to="/" className="hover:text-indigo-600">Home</Link>
              <Link to="/write" className="hover:text-indigo-600">Write</Link>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:slug" element={<Post />} />
            <Route path="/write" element={<Editor onSave={() => {}} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function Home() {
  const [search, setSearch] = React.useState('')
  const filtered = posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) && p.published)
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Write</h1>
          <p className="text-gray-600">Publish your thoughts to the world.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search posts..." className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        {filtered.map(p => (
          <article key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="h-48 bg-gray-100 relative">
              <span className="absolute top-4 left-4 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium text-indigo-600">{p.category}</span>
            </div>
            <div className="p-6">
              <span className="text-xs text-gray-500">{p.date}</span>
              <Link to={`/post/${p.slug}`} className="block mt-2 text-xl font-bold text-gray-900 hover:text-indigo-600 group-hover:text-indigo-600">{p.title}</Link>
              <p className="mt-3 text-gray-600 leading-relaxed line-clamp-3">{p.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Post() {
  const { slug } = useParams()
  const post = posts.find(p => p.slug === slug)
  if (!post) return <div className="p-10 text-center">Post not found</post>
  return (
    <article className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900"><ArrowRight className="w-4 h-4 mr-2" /> Back to home</Link>
        <span className="text-xs font-medium text-indigo-600">{post.category}</span>
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-6">{post.title}</h1>
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 border-b pb-4">
        <span>{post.date}</span>
        <span className="mx-1">·</span>
        <span>5 min read</span>
      </div>
      <div className="prose prose-lg text-gray-700 leading-relaxed">{post.content.replace(/^# (.*$)/m, '<h1>$1</h1>')}</div>
      <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-8">
        <button className="flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700"><Edit className="w-4 h-4" /> Edit post</button>
        <button className="text-red-500 font-medium hover:text-red-700"><Trash2 className="w-4 h-4" /> Delete</button>
      </div>
    </article>
  )
}

function Editor({ onSave }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">New post</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Publish</button>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none">
            <option>Tutorial</option>
            <option>CSS</option>
            <option>DevOps</option>
            <option>Design</option>
          </select>
        </div>
        <div className="h-96 border border-gray-300 rounded-lg p-4 font-mono text-sm text-gray-600 bg-gray-50"># Write your content here...</div>
      </div>
    </div>
  )
}
