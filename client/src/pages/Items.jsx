import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import { Link } from 'react-router-dom'

export default function Items() {
  const [items, setItems] = useState([])

  useEffect(() => {
    api.get('/items')
      .then(res => setItems(res.data))
      .catch(err => console.error(err))
  }, [])

  return (
    <div className="max-w-3xl mx-auto mt-20 pt-4">
      <h2 className="text-3xl font-bold mb-4 text-center">Available Items</h2>
      {items.length === 0 && <p className="text-gray-500 text-center">No items available yet.</p>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => (
          <li key={item._id} className="border rounded-lg p-4 bg-white shadow hover:shadow-md transition">
            <Link to={`/items/${item._id}`} className="text-lg font-semibold text-blue-600 hover:underline">
              {item.title}
            </Link>
            <p className="text-gray-600 mt-2">Starting Bid: ₹{item.start_price}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
