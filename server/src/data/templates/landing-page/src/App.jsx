import { ArrowRight, Mail, Check, Star, Code2, Users, Shield } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="bg-white/80 backdrop-blur sticky top-0 border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold">L</div>
            <span>Launch</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600">Features</a>
            <a href="#pricing" className="hover:text-blue-600">Pricing</a>
            <a href="#faq" className="hover:text-blue-600">FAQ</a>
          </div>
          <a href="#" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Get Started</a>
        </div>
      </nav>

      <section className="pt-20 pb-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">Build your next big idea faster.</h1>
          <p className="text-xl text-gray-600 mb-10 max-w-lg mx-auto">The fastest way to launch your product. Beautiful, conversion-focused landing pages that ship in minutes, not weeks.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#" className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              Start building <ArrowRight className="w-5 h-5" />
            </a>
            <a href="#features" className="px-8 py-4 bg-gray-100 text-gray-900 rounded-xl text-lg font-medium hover:bg-gray-200 transition-colors">Learn more</a>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2"><Star className="w-4 h-4" /><span>4.9/5 rating</span></div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>10,000+ launches</span></div>
            <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>Secure hosting</span></div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to launch</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Beautiful components, fast performance, and everything else your product needs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Responsive design', desc: 'Looks great on every device, from mobile to desktop.', icon: <Code2 className="w-6 h-6 text-blue-600" /> },
              { title: 'Conversion optimized', desc: 'Proven layouts that turn visitors into customers.', icon: <Star className="w-6 h-6 text-blue-600" /> },
              { title: 'Fast performance', desc: 'Built for speed with optimized assets and code.', icon: <Shield className="w-6 h-6 text-blue-600" /> },
            ].map((f) => (
              <div key={f.title} className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-600">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: 'Starter', price: '$0', desc: 'For side projects', features: ['1 project', 'Basic templates', 'Community support'], popular: false },
              { name: 'Pro', price: '$29', desc: 'For growing businesses', features: ['Unlimited projects', 'Premium templates', 'Priority support', 'Custom domain'], popular: true },
              { name: 'Enterprise', price: '$99', desc: 'For teams at scale', features: ['Everything in Pro', 'SSO & SAML', 'Dedicated support', 'SLA guarantees'], popular: false },
            ].map((p) => (
              <div key={p.name} className={`bg-white rounded-2xl border p-8 relative ${p.popular ? 'border-blue-600 shadow-lg ring-1 ring-blue-600/10' : 'border-gray-200'}`}>
                {p.popular && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Most popular</span>}
                <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                <div className="my-4"><span className="text-3xl font-bold text-gray-900">{p.price}</span><span className="text-gray-500">/mo</span></div>
                <p className="text-gray-600 text-sm mb-6">{p.desc}</p>
                <ul className="space-y-3 text-sm text-gray-600 mb-8">{p.features.map(f => (
                  <li key={f} className="flex items-center gap-3"><Check className="w-4 h-4 text-green-600" />{f}</li>
                ))}
                </ul>
                <button className={`w-full py-3 rounded-xl font-medium transition-colors ${p.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  {p.popular ? 'Start free trial' : 'Get started'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'Can I use my own domain?', a: 'Yes, all paid plans support custom domains.' },
              { q: 'Can I export my code?', a: 'Yes, you own your code and can export it anytime.' },
              { q: 'Is there a free trial?', a: 'Yes, the Pro plan includes a 14-day free trial.' },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900">{item.q}</h3>
                <p className="text-gray-600 text-sm mt-2">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <span className="text-xl">Launch</span>
          </div>
          <p className="text-sm text-gray-500">© 2024 Launch. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
