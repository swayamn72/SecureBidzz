import React from 'react'

export default function Footer() {
    return (
        <footer className="glass mt-16 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-2xl font-bold gradient-text mb-4">SecureBidz</h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                            Experience the future of secure online bidding. Our platform combines cutting-edge security
                            with an intuitive interface to provide you with a safe and exciting bidding experience.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-600 hover:text-blue-500 transition-colors">
                                <span className="text-2xl">📘</span>
                            </a>
                            <a href="#" className="text-gray-600 hover:text-blue-400 transition-colors">
                                <span className="text-2xl">🐦</span>
                            </a>
                            <a href="#" className="text-gray-600 hover:text-pink-500 transition-colors">
                                <span className="text-2xl">📷</span>
                            </a>
                            <a href="#" className="text-gray-600 hover:text-red-500 transition-colors">
                                <span className="text-2xl">▶️</span>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            <li><a href="/" className="text-gray-600 hover:text-blue-500 transition-colors">Home</a></li>
                            <li><a href="/items" className="text-gray-600 hover:text-blue-500 transition-colors">Browse Items</a></li>
                            <li><a href="/create-item" className="text-gray-600 hover:text-blue-500 transition-colors">Create Item</a></li>
                            <li><a href="/profile" className="text-gray-600 hover:text-blue-500 transition-colors">Profile</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Support</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-gray-600 hover:text-blue-500 transition-colors">Help Center</a></li>
                            <li><a href="#" className="text-gray-600 hover:text-blue-500 transition-colors">Contact Us</a></li>
                            <li><a href="#" className="text-gray-600 hover:text-blue-500 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="text-gray-600 hover:text-blue-500 transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-200 mt-8 pt-8 text-center">
                    <p className="text-gray-600">
                        © 2024 SecureBidz. All rights reserved. Built with ❤️ for secure bidding.
                    </p>
                </div>
            </div>
        </footer>
    )
}
