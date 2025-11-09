import React, { useState } from 'react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState('')
  const navigate = useNavigate()

  // Password strength validation
  const validatePasswordStrength = (password) => {
    if (password.length < 8) return { score: 0, label: 'Too short', color: 'text-red-500' }
    if (password.length < 12) return { score: 1, label: 'Weak', color: 'text-orange-500' }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { score: 2, label: 'Fair', color: 'text-yellow-500' }
    }
    return { score: 3, label: 'Strong', color: 'text-green-500' }
  }

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    const strength = validatePasswordStrength(newPassword)
    setPasswordStrength(strength)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match!', {
        position: "top-right",
        autoClose: 3000,
      })
      return
    }

    if (passwordStrength.score < 2) {
      toast.error('Please choose a stronger password!', {
        position: "top-right",
        autoClose: 3000,
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await api.post('/auth/signup', { name, email, password })
      sessionStorage.setItem('token', res.data.token)
      toast.success('Account created successfully!', {
        position: "top-right",
        autoClose: 2000,
      })
      navigate('/')
    } catch (err) {
      // Error handling is now done in axios interceptor with toasts
      console.error('Signup error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 fade-in">
      <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold gradient-text mb-2">Create Account</h2>
          <p className="text-gray-600">Join SecureBidz today</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className="w-full"
              placeholder="Create a strong password"
              required
              disabled={isLoading}
            />
            {password && (
              <p className={`text-sm mt-1 font-medium ${passwordStrength.color}`}>
                🔐 Password strength: {passwordStrength.label}
              </p>
            )}
          </div>
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full"
              placeholder="Confirm your password"
              required
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
          >
            {isLoading ? '🔄 Creating Account...' : '🚀 Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}
