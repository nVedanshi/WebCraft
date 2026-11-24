import { Mail, Github, Linkedin, ArrowRight, ChevronLeft, Code2, Monitor, Smartphone, Tablet } from 'lucide-react'

const projects = [
  { id: '1', title: 'E-commerce Platform', desc: 'Full-stack online store with cart, checkout, and admin dashboard.', tech: ['React', 'Node.js', 'PostgreSQL'], image: 'https://images.unsplash.com/photo-1556742044-3c52d6e88ca6?w=600' },
  { id: '2', title: 'Analytics Dashboard', desc: 'Real-time data visualization with charts and KPI tracking.', tech: ['React', 'D3.js', 'Tailwind'], image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600' },
  { id: '3', title: 'Task Management App', desc: 'Collaborative project management with Kanban boards and team chat.', tech: ['React', 'Firebase', 'TypeScript'], image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600' },
  { id: '4', title: 'Blog Platform', desc: 'Modern publishing platform with markdown support and SEO optimization.', tech: ['Next.js', 'MDX', 'Vercel'], image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600' },
]

export default function App() {
  const [activeProject, setActiveProject] = React.useState(null)
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">JD</div>
            <span>Jane Dev</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#work" className="hover:text-indigo-600">Work</a>
            <a href="#about" className="hover:text-indigo-600">About</a>
            <a href="#contact" className="hover:text-indigo-600">Contact</a>
          </div>
          <a href="#" className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Hire me</a>
        </div>
      </nav>

      <section className="pt-24 pb-32 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider mb-4 block">Product Designer & Engineer</span>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">Building digital products that matter.</h1>
          <p className="text-xl text-gray-600 mb-10 max-w-lg mx-auto">I craft thoughtful, user-centered experiences with clean code and beautiful design.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#work" className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-lg font-medium hover:bg-indigo-700 flex items-center gap-2">
              View work <ArrowRight className="w-5 h-5" />
            </a>
            <a href="#contact" className="px-8 py-4 bg-gray-100 text-gray-900 rounded-xl text-lg font-medium hover:bg-gray-200">Get in touch</a>
          </div>
        </div>
      </section>

      <section id="work" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Selected work</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden group hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setActiveProject(p)}>
                <div className="h-48 bg-gray-100 relative overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-6">
                  <div className="flex gap-2 mb-3">
                    {p.tech.map(t => (
                      <span key={t} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{t}</span>
                    ))}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About me</h2>
              <p className="text-gray-600 leading-relaxed mb-6">I'm a product designer and engineer based in San Francisco. I love creating digital experiences that are both beautiful and functional.</p>
              <p className="text-gray-600 leading-relaxed mb-6">With 5+ years of experience, I've helped startups and established companies ship products that users love.</p>
              <div className="flex gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Web Design</div>
                <div className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Mobile Apps</div>
                <div className="flex items-center gap-2"><Code2 className="w-4 h-4" /> Frontend Dev</div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl p-8">
              <p className="text-gray-600 italic">"Great designers don't just make things look good — they make them work well."</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 px-6 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Let's work together</h2>
          <p className="text-gray-400 mb-10">Available for freelance and full-time opportunities.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:hello@example.com" className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-lg font-medium hover:bg-indigo-500 flex items-center gap-2">
              <Mail className="w-5 h-5" /> hello@example.com
            </a>
          </div>
          <div className="flex justify-center gap-6 mt-10">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
              <Tablet className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {activeProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setActiveProject(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <button onClick={() => setActiveProject(null)} className="text-gray-400 hover:text-gray-900"><ChevronLeft className="w-5 h-5" /></button>
              <h3 className="font-bold text-gray-900">{activeProject.title}</h3>
            </div>
            <div className="p-6">
              <img src={activeProject.image} alt={activeProject.title} className="w-full h-48 object-cover rounded-xl mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-2">{activeProject.title}</h4>
              <p className="text-gray-600 mb-6">{activeProject.desc}</p>
              <div className="flex gap-2 mb-6">
                {activeProject.tech.map(t => (
                  <span key={t} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
