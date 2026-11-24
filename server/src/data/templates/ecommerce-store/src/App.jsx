import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, User, Home, ArrowLeft, Menu, X, ChevronRight } from 'lucide-react'

const products = [
  { id: '1', name: 'Wireless Headphones', price: 89.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', category: 'Electronics', description: 'Noise-cancelling wireless headphones with 30hr battery life.' },
  { id: '2', name: 'Smart Watch', price: 199.99, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', category: 'Electronics', description: 'Health tracking smart watch with always-on display.' },
  { id: '3', name: 'Leather Backpack', price: 129.99, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', category: 'Fashion', description: 'Premium leather backpack for everyday use.' },
  { id: '4', name: 'Running Shoes', price: 119.99, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', category: 'Sports', description: 'Lightweight running shoes with cushioned sole.' },
  { id: '5', name: 'Coffee Maker', price: 79.99, image: 'https://images.unsplash.com/photo-1495474472287-4d71bc839f7d?w=400', category: 'Home', description: 'Programmable drip coffee maker.' },
  { id: '6', name: 'Bluetooth Speaker', price: 59.99, image: 'https://images.unsplash.com/photo-1589492950381-98726529f724?w=400', category: 'Electronics', description: 'Portable waterproof Bluetooth speaker.' },
]

export default function App() {
  const [cartCount, setCartCount] = React.useState(0)
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                <span>Store</span>
              </Link>
              <div className="flex items-center gap-4">
                <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">Shop</Link>
                <Link to="/cart" className="relative flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Cart</span>
                  {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{cartCount}</span>}
                </Link>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Sign in</button>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<ProductGrid onAddToCart={() => setCartCount(c => c + 1)} />} />
            <Route path="/product/:id" element={<ProductDetail onAddToCart={() => setCartCount(c => c + 1)} />} />
            <Route path="/cart" element={<Cart />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function ProductGrid({ onAddToCart }) {
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState('All')
  const categories = ['All', ...new Set(products.map(p => p.category))]
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (category === 'All' || p.category === category))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop</h1>
          <p className="text-gray-500">Browse our collection</p>
        </div>
        <input type="text" placeholder="Search products..." className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{cat}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(p => (
          <article key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
            <div className="h-48 bg-gray-100 relative overflow-hidden">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
              <button className="absolute top-3 right-3 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onAddToCart()}>
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </button>
            </div>
            <div className="p-4">
              <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{p.category}</span>
              <h3 className="font-semibold text-gray-900 mt-1">{p.name}</h3>
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{p.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">${p.price.toFixed(2)}</span>
                <Link to={`/product/${p.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">View details</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function ProductDetail({ onAddToCart }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = products.find(p => p.id === id)
  if (!product) return <div className="p-10 text-center">Product not found</div>
  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to shop
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-80 bg-gray-100 rounded-xl overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="space-y-6">
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{product.category}</span>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-600 leading-relaxed">{product.description}</p>
          <div className="border-t border-gray-200 pt-6">
            <span className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
          </div>
          <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2" onClick={onAddToCart}>
            <ShoppingCart className="w-5 h-5" /> Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}

function Cart() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Continue shopping</Link>
      </div>
      <div className="text-center py-20 text-gray-500">
        <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Your cart is empty</p>
      </div>
    </div>
  )
}
