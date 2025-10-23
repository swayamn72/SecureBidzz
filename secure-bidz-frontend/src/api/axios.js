import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, 
})

api.interceptors.request.use((config) => {
  const accessToken = sessionStorage.getItem('accessToken')
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

export default api
