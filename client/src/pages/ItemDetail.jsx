import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

export default function ItemDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    loadItem()
  }, [id])

  useEffect(() => {
    if (item?.end_time) {
      const timer = setInterval(() => {
        const now = new Date();
        let end;

        // Handle different formats of end_time
        if (item.end_time.toDate) {
          // Firestore Timestamp object
          end = item.end_time.toDate();
        } else if (item.end_time._seconds) {
          // Serialized Firestore Timestamp
          end = new Date(item.end_time._seconds * 1000 + (item.end_time._nanoseconds || 0) / 1000000);
        } else {
          // Assume it's a date string or number
          end = new Date(item.end_time);
        }

        if (isNaN(end.getTime())) {
          setTimeLeft('Invalid end time');
          clearInterval(timer);
          return;
        }

        const diff = end - now;

        if (diff <= 0) {
          setTimeLeft('Auction ended');
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [item]);

  const loadItem = async () => {
    try {
      const res = await api.get(`/items/${id}`)
      setItem(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleBid = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      const res = await api.post(`/items/${id}/bid`, { amount: bidAmount })
      setSuccess(res.data.message)
      setItem(prev => ({ ...prev, current_bid: res.data.current_bid }))
      setBidAmount('')
    } catch (err) {
      setError(err.response?.data?.error || 'Bid failed')
    }
  }

  if (!item) return <p className="text-center mt-10">Loading...</p>

  const isLoggedIn = !!sessionStorage.getItem('token')
  const isAuctionEnded = timeLeft === 'Auction ended'

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-3xl font-bold mb-4">{item.title}</h2>
      <p className="text-gray-600 mb-4">{item.description}</p>
      <p className="text-lg mb-2">Starting Price: ₹{item.start_price}</p>
      <p className="text-xl font-semibold text-blue-600 mb-4">Current Bid: ₹{item.current_bid}</p>
      <p className="text-lg mb-4">Time Left: <span className={isAuctionEnded ? 'text-red-500' : 'text-green-500'}>{timeLeft}</span></p>

      {isLoggedIn && !isAuctionEnded && (
        <form onSubmit={handleBid} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Your Bid Amount</label>
            <input
              type="number"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={item.current_bid + 0.01}
              step="0.01"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Place Bid
          </button>
        </form>
      )}

      {!isLoggedIn && (
        <p className="text-gray-500">Please log in to place a bid.</p>
      )}

      {isAuctionEnded && (
        <p className="text-red-500 font-semibold">This auction has ended.</p>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
    </div>
  )
}
