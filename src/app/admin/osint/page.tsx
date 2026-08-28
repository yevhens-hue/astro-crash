"use client";

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

/**
 * TELEGRAM STORE ANALYTICS DASHBOARD
 * This is the UI where you can track competitor apps, their revenue proxies (TON), and growth (TG channels).
 */

const mockData = [
  { name: 'Jan', revenue: 4000, users: 2400 },
  { name: 'Feb', revenue: 3000, users: 1398 },
  { name: 'Mar', revenue: 2000, users: 9800 },
  { name: 'Apr', revenue: 2780, users: 3908 },
  { name: 'May', revenue: 1890, users: 4800 },
  { name: 'Jun', revenue: 2390, users: 3800 },
  { name: 'Jul', revenue: 3490, users: 4300 },
];

const mockApps = [
  { rank: 1, name: "Hamster Kombat", category: "Game", dau: "30M", revenueProxy: "$500K/day", trend: "+12%" },
  { rank: 2, name: "Notcoin", category: "Clicker", dau: "25M", revenueProxy: "$300K/day", trend: "+5%" },
  { rank: 3, name: "Catizen", category: "Game", dau: "10M", revenueProxy: "$150K/day", trend: "+20%" },
  { rank: 4, name: "Wallet", category: "Finance", dau: "15M", revenueProxy: "$100K/day", trend: "+2%" },
  { rank: 5, name: "Blum", category: "Finance", dau: "8M", revenueProxy: "$80K/day", trend: "+30%" },
];

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              TMA Analytics System 📡
            </h1>
            <p className="text-gray-400 mt-1">
              Market Intelligence for Telegram Mini Apps (OSINT)
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
              Run Tapps Scraper
            </button>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
              Update TON Metrics
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-1">Total Indexed Apps</div>
            <div className="text-3xl font-bold">1,204</div>
            <div className="text-green-400 text-sm mt-2 flex items-center">
              <span>+45 this week</span>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-1">Top Category</div>
            <div className="text-3xl font-bold text-blue-400">P2E Games</div>
            <div className="text-gray-500 text-sm mt-2 flex items-center">
              <span>54% of market share</span>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl">
            <div className="text-gray-400 text-sm mb-1">Total Market DAU</div>
            <div className="text-3xl font-bold text-amber-400">120M+</div>
            <div className="text-green-400 text-sm mt-2 flex items-center">
              <span>Growing +5% MoM</span>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <div className="text-gray-400 text-sm mb-1">Top Earner Today</div>
            <div className="text-3xl font-bold">Hamster K.</div>
            <div className="text-green-400 text-sm mt-2 flex items-center">
              <span>~$500K via Wallet</span>
            </div>
          </div>
        </div>

        {/* Charts & Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Market Trend Chart */}
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-wide">Market Organic Traffic & Revenue</h2>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Apps Leaderboard */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold tracking-wide mb-6">Top Telegram Apps 📉</h2>
            <div className="space-y-4">
              {mockApps.map((app) => (
                <div key={app.rank} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors cursor-pointer group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center font-bold text-sm text-gray-300 group-hover:text-white">
                      #{app.rank}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-100">{app.name}</div>
                      <div className="text-xs text-gray-500">{app.category} • DAU {app.dau}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-400 text-sm hidden sm:block">{app.revenueProxy}</div>
                    <div className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded mt-1">{app.trend}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 rounded-lg text-sm transition-colors">
              View Full Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
