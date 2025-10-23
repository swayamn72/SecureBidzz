import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

export default function ItemDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)

  useEffect(() => {
    api.get(`/items/${id}`)
      .then(res => setItem(res.data))
      .catch(err => console.error(err))
  }, [id])

  if (!item) return <p>Loading...</p>

  return (
    <div>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <p>Start price: ₹{item.start_price}</p>
      {/* Place bid UI will be added later */}
    </div>
  )
}
