import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center mt-16 text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to SecureBidz</h1>
      <p className="text-gray-600 mb-6">A safe and simple way to bid on amazing products.</p>
      <Link
        to="/items"
        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition shadow-lg hover:shadow-xl"
      >
        View Items
      </Link>
    </div>
  )
}
