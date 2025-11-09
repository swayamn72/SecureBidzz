import React, { useState } from 'react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

export default function CreateItem() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [startPrice, setStartPrice] = useState('')
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setIsLoading(true)
        try {
            await api.post('/items', { title, description, start_price: startPrice })
            navigate('/items')
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create item')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 fade-in">
            <div className="glass rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold gradient-text mb-2">Create New Item</h2>
                    <p className="text-gray-600">List your item for bidding</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block font-semibold mb-2 text-gray-700">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full"
                            placeholder="Enter item title"
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-gray-700">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full resize-none"
                            rows="4"
                            placeholder="Describe your item in detail"
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-2 text-gray-700">Starting Price (₹)</label>
                        <input
                            type="number"
                            value={startPrice}
                            onChange={e => setStartPrice(e.target.value)}
                            className="w-full"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                    >
                        {isLoading ? 'Creating...' : '🚀 Create Item'}
                    </button>
                </form>
                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm text-center">{error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
