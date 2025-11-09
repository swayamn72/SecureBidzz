import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 slide-up">
      <div className="glass rounded-2xl p-12 max-w-4xl mx-auto shadow-2xl">
        <h1 className="text-6xl font-bold gradient-text mb-6 animate-pulse">
          Welcome to SecureBidz
        </h1>
        <p className="text-xl text-gray-700 mb-8 leading-relaxed">
          Experience the future of secure online bidding. Our platform combines cutting-edge security
          with an intuitive interface to provide you with a safe and exciting bidding experience.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/items"
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-lg"
          >
            🛍️ Explore Items
          </Link>
          <Link
            to="/signup"
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-lg"
          >
            🚀 Get Started
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-lg bg-white bg-opacity-50 backdrop-blur-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Secure Bidding</h3>
            <p className="text-gray-600">Advanced security measures protect your transactions</p>
          </div>
          <div className="p-6 rounded-lg bg-white bg-opacity-50 backdrop-blur-sm">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Real-time Updates</h3>
            <p className="text-gray-600">Stay updated with live bidding notifications</p>
          </div>
          <div className="p-6 rounded-lg bg-white bg-opacity-50 backdrop-blur-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Easy to Use</h3>
            <p className="text-gray-600">Intuitive interface designed for all users</p>
          </div>
        </div>
      </div>
    </div>
  )
}
