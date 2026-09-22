import React from "react";
import { Link } from "react-router-dom";
import { Globe, Shield, Satellite, AlertTriangle, TrendingUp, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 pointer-events-none">
        <Globe className="absolute top-1/4 left-1/4 text-emerald-300 opacity-20 w-16 h-16 animate-pulse" style={{ animationDuration: '3s' }} />
        <Satellite className="absolute top-1/3 right-1/4 text-teal-300 opacity-20 w-12 h-12 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <MapPin className="absolute bottom-1/3 left-1/3 text-blue-300 opacity-20 w-10 h-10 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        {/* Logo and title */}
        <div className="mb-8 transform hover:scale-105 transition-transform duration-300">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4 animate-pulse">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-700 via-teal-600 to-blue-600 bg-clip-text text-transparent mb-2">
            GeoGuardian
          </h1>
          <div className="flex items-center justify-center gap-2 text-slate-600 text-lg">
            <Globe className="w-5 h-5" />
            <p>Environmental Change Detection & Alert System</p>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <Satellite className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Satellite Imagery</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Real-time Alerts</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <TrendingUp className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Change Tracking</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            to="/login" 
            className="group relative px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <span className="relative z-10">Login</span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </Link>
          <Link 
            to="/register" 
            className="group px-8 py-3 bg-white/80 backdrop-blur-sm border-2 border-emerald-600 text-emerald-700 rounded-lg font-medium shadow-md hover:shadow-lg hover:bg-emerald-50 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Register
          </Link>
        </div>

        {/* Tagline */}
        <p className="mt-8 text-slate-500 text-sm">
          Monitor environmental changes with Sentinel-2 satellite data
        </p>
      </div>
    </div>
  );
}