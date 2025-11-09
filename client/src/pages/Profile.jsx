import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
    const [wallet, setWallet] = useState(0)
    const [inventory, setInventory] = useState([])
    const [depositAmount, setDepositAmount] = useState('')
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        loadWallet()
    }, [])

    const loadWallet = async () => {
        try {
            const res = await api.get('/wallet')
            setWallet(res.data.wallet || 0)
            setInventory(res.data.inventory || [])
        } catch (err) {
            console.error(err)
            setWallet(0)
            setInventory([])
        }
    }

    const handleDeposit = async (e) => {
        e.preventDefault()
        try {
            const res = await api.post('/wallet/deposit', { amount: depositAmount })
            setWallet(res.data.newBalance)
            setDepositAmount('')
            setSuccess('Deposit successful!')
            setError(null)
        } catch (err) {
            setError(err.response?.data?.error || 'Deposit failed')
            setSuccess(null)
        }
    }

    const handleLogout = () => {
        sessionStorage.removeItem('token')
        navigate('/')
    }

    return (
        <div className="max-w-2xl mx-auto mt-20 pt-4">
            <h2 className="text-3xl font-bold mb-6 text-center">Profile</h2>

            <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Wallet</h3>
                <p className="text-2xl font-bold text-green-600 mb-4">₹{wallet.toFixed(2)}</p>

                <form onSubmit={handleDeposit} className="space-y-4">
                    <div>
                        <label className="block font-medium mb-1">Deposit Amount</label>
                        <input
                            type="number"
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                    >
                        Deposit
                    </button>
                </form>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
            </div>

            <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Inventory</h3>
                {inventory.length === 0 ? (
                    <p className="text-gray-500">No items won yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {inventory.map((item, index) => (
                            <li key={index} className="border rounded p-3">
                                <p className="font-semibold">{item.title}</p>
                                <p className="text-gray-600">Won for: ₹{item.wonPrice}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="bg-white shadow-lg rounded-lg p-6">
                <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
                >
                    Logout
                </button>
            </div>
        </div>
    )
}
