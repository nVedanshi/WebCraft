import { Phone, Mail, MapPin, Clock, ArrowRight, Users, Building2, Check } from 'lucide-react'

const services = [
  { title: 'Business Consulting', desc: 'Strategic guidance to help your company grow and scale effectively.', icon: <Users className="w-6 h-6 text-indigo-600" /> },
  { title: 'Digital Transformation', desc: 'Modernize your operations with technology that drives efficiency.', icon: <Building2 className="w-6 h-6 text-indigo-600" /> },
  { title: 'Project Management', desc: 'End-to-end oversight to keep your initiatives on track and on budget.', icon: <Check className="w-6 h-6 text-indigo-600" /> },
]

const stats = [
  { value: '15+', label: 'Years experience' },
  { value: '500+', label: 'Clients served' },
  { value: '98%', label: 'Client retention' },
  { value: '50+', label: 'Team members' },
]

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">B</div>
            <span>Meridian</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#services" className="hover:text-indigo-600">Services</a>
            <a href="#about" className="hover:text-indigo-600">About</a>
            <a href="#contact" className="hover:text-indigo-600">Contact</a>
          </div>
          <a href="#contact" className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Contact us</a>
        </div>
      </nav>

      <section className="pt-20 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">Professional solutions for your business.</h1>
              <p className="text-xl text-gray-600 mb-8 max-w-lg">We help businesses transform their operations with strategic consulting, digital solutions, and expert project management.</p>
              <div className="flex gap-4">
                <a href="#contact" className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-lg font-medium hover:bg-indigo-700 flex items-center gap-2">
                  Get started <ArrowRight className="w-5 h-5" />
                </a>
                <a href="#services" className="px-8 py-4 bg-gray-100 text-gray-900 rounded-xl text-lg font-medium hover:bg-gray-200">Our services</a>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-600/20 rounded-2xl blur-3xl"></div>
                <div className="relative w-64 h-64 bg-gray-100 rounded-2xl border border-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">M</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {stats.map(s => (
              <div key={s.value} className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our services</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {services.map(s => (
              <div key={s.title} className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-6">{s.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 px-6 bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to grow your business?</h2>
          <p className="text-indigo-100 mb-10">Schedule a free consultation with our team today.</p>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-sm border border-white/20">
              <div className="flex items-start gap-4 mb-6 text-left">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-indigo-900"><Phone className="w-5 h-5" /></div>
                <div>
                  <div className="text-sm font-medium text-indigo-100">Phone</div>
                  <div className="text-white font-medium">+1 (555) 123-4567</div>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-indigo-900"><Mail className="w-5 h-5" /></div>
                <div>
                  <div className="text-sm font-medium text-indigo-100">Email</div>
                  <div className="text-white font-medium">hello@meridian.com</div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-sm border border-white/20">
              <div className="flex items-start gap-4 mb-6 text-left">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-indigo-900"><MapPin className="w-5 h-5" /></div>
                <div>
                  <div className="text-sm font-medium text-indigo-100">Address</div>
                  <div className="text-white font-medium">123 Business Ave, Suite 100</div>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-indigo-900"><Clock className="w-5 h-5" /></div>
                <div>
                  <div className="text-sm font-medium text-indigo-100">Hours</div>
                  <div className="text-white font-medium">Mon–Fri, 9AM–6PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-xl">
            <span>Meridian</span>
          </div>
          <p className="text-sm text-gray-500">© 2024 Meridian Business Solutions. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
