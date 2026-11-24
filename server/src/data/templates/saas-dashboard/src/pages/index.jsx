import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900">Home</h1>
      <p className="text-gray-500">Welcome to your dashboard</p>
    </div>
  )
}

function About() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900">About</h1>
      <p className="text-gray-500">About this template</p>
    </div>
  )
}

function Contact() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-900">Contact</h1>
      <p className="text-gray-500">Get in touch</p>
    </div>
  )
}

export default function Pages() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  )
}
