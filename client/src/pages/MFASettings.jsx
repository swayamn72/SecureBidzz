import React, { useState, useEffect } from 'react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import { QRCodeSVG } from 'qrcode.react'

export default function MFASettings() {
    const [mfaEnabled, setMfaEnabled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [enabling, setEnabling] = useState(false)
    const [disabling, setDisabling] = useState(false)
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const [showQR, setShowQR] = useState(false)
    const [password, setPassword] = useState('')

    useEffect(() => {
        checkMFAStatus()
    }, [])

    const checkMFAStatus = async () => {
        try {
            // We need to add an endpoint to check MFA status, or get it from user profile
            // For now, we'll assume we can get it from a profile endpoint
            const res = await api.get('/auth/profile')
            setMfaEnabled(res.data.mfaEnabled)
        } catch (err) {
            console.error('Error checking MFA status:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleEnableMFA = async () => {
        setEnabling(true)
        try {
            const res = await api.post('/auth/enable-mfa')
            setQrCodeUrl(res.data.secret)
            setShowQR(true)
            toast.success('MFA setup initiated. Scan the QR code with your authenticator app.', {
                position: "top-right",
                autoClose: 5000,
            })
            // Note: In production, you might want to refresh the status or redirect
        } catch (err) {
            toast.error('Failed to enable MFA. Please try again.', {
                position: "top-right",
                autoClose: 3000,
            })
        } finally {
            setEnabling(false)
        }
    }

    const handleDisableMFA = async () => {
        if (!password) {
            toast.error('Please enter your password to disable MFA.', {
                position: "top-right",
                autoClose: 3000,
            })
            return
        }

        setDisabling(true)
        try {
            await api.post('/auth/disable-mfa', { password })
            setMfaEnabled(false)
            setPassword('')
            toast.success('MFA has been disabled.', {
                position: "top-right",
                autoClose: 3000,
            })
        } catch (err) {
            toast.error('Failed to disable MFA. Please check your password.', {
                position: "top-right",
                autoClose: 3000,
            })
        } finally {
            setDisabling(false)
        }
    }

    const handleQRScanned = () => {
        setShowQR(false)
        setQrCodeUrl('')
        checkMFAStatus() // Refresh status
        toast.success('MFA has been enabled successfully!', {
            position: "top-right",
            autoClose: 3000,
        })
    }

    if (loading) {
        return (
            <div className="max-w-md mx-auto mt-16 bg-white shadow-lg rounded-lg p-6">
                <div className="text-center">Loading MFA settings...</div>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto mt-16 bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-center">Two-Factor Authentication</h2>

            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <span className="text-gray-700">MFA Status:</span>
                    <span className={`font-semibold ${mfaEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {mfaEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>

            {!mfaEnabled ? (
                <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                        Enable two-factor authentication to add an extra layer of security to your account.
                        You'll need an authenticator app like Google Authenticator or Authy.
                    </p>

                    <button
                        onClick={handleEnableMFA}
                        disabled={enabling}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {enabling ? 'Setting up MFA...' : 'Enable MFA'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                        Your account is protected with two-factor authentication. To disable MFA, enter your password below.
                    </p>

                    <div>
                        <label className="block font-medium mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        onClick={handleDisableMFA}
                        disabled={disabling || !password}
                        className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {disabling ? 'Disabling MFA...' : 'Disable MFA'}
                    </button>
                </div>
            )}

            {showQR && qrCodeUrl && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Scan this QR code with your authenticator app, then click "I've scanned the code" below.
                    </p>
                    <div className="flex justify-center mb-4">
                        <QRCodeSVG value={qrCodeUrl} size={200} />
                    </div>
                    <button
                        onClick={handleQRScanned}
                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
                    >
                        I've Scanned the Code
                    </button>
                </div>
            )}
        </div>
    )
}
