import React, { useState } from 'react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [requiresMFA, setRequiresMFA] = useState(false)
  const [userId, setUserId] = useState('')
  const [mfaType, setMfaType] = useState('totp')
  const [selectedMfaType, setSelectedMfaType] = useState('totp')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await api.post('/auth/login', { email, password })

      if (res.data.requiresMFA) {
        setRequiresMFA(true)
        setUserId(res.data.userId)
        setMfaType(res.data.mfaType || res.data.availableMfaTypes?.[0] || 'totp') // Use user's configured type first, then fallback
        setSelectedMfaType(res.data.mfaType || res.data.availableMfaTypes?.[0] || 'totp') // Set initial selected type
        toast.info('MFA required. Please enter your verification code.', {
          position: "top-right",
          autoClose: 5000,
        })
      } else {
        sessionStorage.setItem('token', res.data.token)
        toast.success('Login successful!', {
          position: "top-right",
          autoClose: 2000,
        })
        navigate('/')
      }
    } catch (err) {
      // Error handling is now done in axios interceptor with toasts
      // Just clear any local error state
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMfaSubmit(e) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await api.post('/auth/verify-mfa', {
        userId,
        code: mfaCode,
        type: selectedMfaType
      })

      sessionStorage.setItem('token', res.data.token)
      toast.success('MFA verification successful!', {
        position: "top-right",
        autoClose: 2000,
      })
      navigate('/')
    } catch (err) {
      // Error handling is now done in axios interceptor with toasts
      console.error('MFA verification error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function sendEmailCode() {
    try {
      await api.post('/auth/send-login-mfa-code', {
        userId,
        type: 'email'
      })
      toast.success('MFA code sent to your email!', {
        position: "top-right",
        autoClose: 3000,
      })
    } catch (err) {
      console.error('Send email MFA error:', err)
      toast.error('Failed to send MFA code. Please try again.', {
        position: "top-right",
        autoClose: 3000,
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 fade-in">
      <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold gradient-text mb-2">
            {requiresMFA ? 'Two-Factor Authentication' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600">
            {requiresMFA ? 'Enter your verification code' : 'Sign in to your account'}
          </p>
        </div>

        {!requiresMFA ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full"
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
            >
              {isLoading ? '🔄 Logging in...' : '🚀 Login'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* MFA Type Selection */}
            <div className="text-center mb-4">
              <p className="text-gray-600 mb-2">Choose your verification method:</p>
              <div className="flex justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedMfaType('totp')}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${selectedMfaType === 'totp'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-md'
                    }`}
                >
                  📱 Authenticator App
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMfaType('email')}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${selectedMfaType === 'email'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-md'
                    }`}
                >
                  📧 Email Code
                </button>
              </div>
            </div>

            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="text-center text-gray-600 mb-4">
                <p>
                  {selectedMfaType === 'email'
                    ? 'Enter the 6-digit code sent to your email'
                    : 'Enter the 6-digit code from your authenticator app'
                  }
                </p>
              </div>
              <div>
                <label className="block font-semibold mb-2 text-center text-gray-700">Verification Code</label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center text-3xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength="6"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
              >
                {isLoading ? '🔄 Verifying...' : '✅ Verify Code'}
              </button>
              {selectedMfaType === 'email' && (
                <button
                  type="button"
                  onClick={sendEmailCode}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                  disabled={isLoading}
                >
                  📧 Send Email Code
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setRequiresMFA(false)
                  setMfaCode('')
                  setUserId('')
                  setSelectedMfaType('totp')
                }}
                className="w-full bg-gray-500 text-white py-3 rounded-xl hover:bg-gray-600 transition-all duration-300 mt-2 font-semibold shadow-lg"
              >
                🔙 Back to Login
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
