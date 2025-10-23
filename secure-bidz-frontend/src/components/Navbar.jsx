import React from 'react'
import { Link } from 'react-router-dom'

export default function NavBar() {
  const loggedIn = !!sessionStorage.getItem('accessToken')

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-white shadow">
      <Link to="/" className="text-2xl font-bold text-blue-600">SecureBidz</Link>
      <div className="space-x-4">
        <Link to="/items" className="hover:text-blue-500 font-medium">Items</Link>
        {loggedIn ? (
          <Link to="/profile" className="hover:text-blue-500 font-medium">Profile</Link>
        ) : (
          <>
            <Link to="/login" className="hover:text-blue-500 font-medium">Login</Link>
            <Link to="/signup" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Signup</Link>
          </>
        )}
      </div>
    </nav>
  )
}
