import axios from 'axios'
import { toast } from 'react-toastify'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

// Auto-logout on 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear session and redirect to login
      sessionStorage.removeItem('token')
      window.location.href = '/login'
    }

    // Handle rate limiting (429) with user-friendly toast
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      const message = retryAfter
        ? `Too many requests. Please try again in ${retryAfter} seconds.`
        : 'Too many requests. Please slow down and try again later.'

      toast.error(message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    }

    // Handle account lockout (423)
    if (error.response?.status === 423) {
      toast.error('Account temporarily locked due to multiple failed attempts. Please try again later.', {
        position: "top-right",
        autoClose: 10000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    }

    // Handle server errors with generic message
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      })
    }

    return Promise.reject(error)
  }
)

// Activity tracking for auto-logout
let lastActivity = Date.now()
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// Reset activity timer on user interactions
const resetActivityTimer = () => {
  lastActivity = Date.now()
}

// Listen for user activity
window.addEventListener('mousedown', resetActivityTimer)
window.addEventListener('mousemove', resetActivityTimer)
window.addEventListener('keypress', resetActivityTimer)
window.addEventListener('scroll', resetActivityTimer)
window.addEventListener('touchstart', resetActivityTimer)

// Check for inactivity every minute
setInterval(() => {
  if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
    sessionStorage.removeItem('token')
    window.location.href = '/login'
  }
}, 60 * 1000)

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
