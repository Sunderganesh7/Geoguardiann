import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, UserPlus, Shield, Globe, AlertCircle, CheckCircle } from "lucide-react";
import config from "../config";

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${config.API_URL}/api/auth/register`, formData);
      setMessage(res.data.message);

      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error registering");
    }
  };

  const isSuccess = message && !message.toLowerCase().includes("error");
  const isError = message && message.toLowerCase().includes("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 relative overflow-hidden p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Floating icons */}
      <Globe className="absolute top-10 left-20 text-emerald-300 opacity-20 w-16 h-16 animate-pulse" style={{ animationDuration: '4s' }} />
      <Shield className="absolute bottom-20 right-20 text-teal-300 opacity-20 w-12 h-12 animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }} />

      {/* Register card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              Join GeoGuardian
            </h2>
            <p className="text-slate-600 mt-2">Create your account to start monitoring</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name input */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none"
                />
              </div>
            </div>

            {/* Email input */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  placeholder="your.email@example.com"
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  name="password"
                  placeholder="Create a strong password"
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full group relative px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Account
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </form>

          {/* Message display */}
          {message && (
            <div className={`mt-5 p-4 rounded-lg flex items-center gap-3 ${
              isSuccess 
                ? 'bg-emerald-50 border border-emerald-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {isSuccess ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <p className={`text-sm font-medium ${
                isSuccess ? 'text-emerald-800' : 'text-red-800'
              }`}>
                {message}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Already have an account?{" "}
              <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                Login here
              </a>
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center mt-6 text-slate-500 text-sm">
          Start protecting our planet today
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;