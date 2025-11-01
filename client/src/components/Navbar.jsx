import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function NavBar() {
  const loggedIn = !!sessionStorage.getItem('token')
  const navigate = useNavigate()

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    navigate('/')
  }

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-white shadow">
      <Link to="/" className="text-2xl font-bold text-blue-600">SecureBidz</Link>
      <div className="space-x-4">
        <Link to="/items" className="hover:text-blue-500 font-medium">Items</Link>
        {loggedIn ? (
          <>
            <Link to="/create-item" className="hover:text-blue-500 font-medium">Create Item</Link>
            <Link to="/profile" className="hover:text-blue-500 font-medium">Profile</Link>
            <Link to="/mfa-settings" className="hover:text-blue-500 font-medium">MFA Settings</Link>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 font-medium"
            >
              Logout
            </button>
          </>
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
