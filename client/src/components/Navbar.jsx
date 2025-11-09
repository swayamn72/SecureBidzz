import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/react.svg';

export default function NavBar() {
  const loggedIn = !!sessionStorage.getItem('token');
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    navigate('/')
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="glass shadow-lg fixed w-full top-0 z-50 fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <img src={logo} alt="SecureBidzz" className="h-8 w-auto mr-3 transition-transform group-hover:scale-110" />
              <span className="text-xl font-bold gradient-text">SecureBidzz</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/items"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                ${isActive('/items')
                  ? 'text-blue-800 bg-blue-100'
                  : 'text-gray-800 hover:text-blue-800 hover:bg-blue-100'}`}
            >
              Items
            </Link>

            {loggedIn ? (
              <>
                <Link
                  to="/create-item"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                    ${isActive('/create-item')
                      ? 'text-blue-800 bg-blue-100'
                      : 'text-gray-800 hover:text-blue-800 hover:bg-blue-100'}`}
                >
                  Create Item
                </Link>
                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                    ${isActive('/profile')
                      ? 'text-blue-800 bg-blue-100'
                      : 'text-gray-800 hover:text-blue-800 hover:bg-blue-100'}`}
                >
                  Profile
                </Link>
                <Link
                  to="/mfa-settings"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                    ${isActive('/mfa-settings')
                      ? 'text-blue-800 bg-blue-100'
                      : 'text-gray-800 hover:text-blue-800 hover:bg-blue-100'}`}
                >
                  MFA Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Signup
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                /* Icon when menu is open */
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/items"
            className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/items') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
          >
            Items
          </Link>
          {loggedIn ? (
            <>
              <Link
                to="/create-item"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/create-item') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                Create Item
              </Link>
              <Link
                to="/profile"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/profile') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                Profile
              </Link>
              <Link
                to="/mfa-settings"
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/mfa-settings') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                MFA Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
