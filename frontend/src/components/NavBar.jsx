// frontend/src/components/NavBar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Shield, LayoutDashboard, Image, History, LogOut, 
  LogIn, UserPlus, Film 
} from "lucide-react";  // ✅ Film icon added

const Navbar = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="w-full px-6 py-4">
        <div className="flex justify-between items-center w-full">

          {/* Logo */}
          <div className="flex items-center gap-4">
            <a href="http://localhost:8000" className="flex items-center gap-1 text-sm font-medium text-white hover:text-emerald-100 transition-colors bg-white/10 px-3 py-1.5 rounded-md border border-white/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Eco Sense AI
            </a>
            <Link to="/" className="flex items-center gap-2 text-white transition">
              <Shield className="w-6 h-6" />
              <span className="text-2xl font-bold">GeoGuardian</span>
            </Link>
          </div>

          {/* Menu */}
          <div className="flex items-center gap-2">
            {token ? (
              <>
                <Link to="/dashboard" className="flex gap-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>

                <Link to="/geoguardian" className="flex gap-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg">
                  <Shield className="w-5 h-5" />
                  <span>GeoGuardian</span>
                </Link>

                <Link to="/compare" className="flex gap-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg">
                  <Image className="w-5 h-5" />
                  <span>Compare</span>
                </Link>

                {/* ✅ New TimeLapse Link */}
                <Link to="/timelapse" className="flex gap-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg">
                  <Film className="w-5 h-5" />
                  <span>Timelapse</span>
                </Link>

                <Link to="/monitoring" className="flex gap-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg">
                  <Shield className="w-5 h-5" />
                  <span>Monitoring</span>
                </Link>

                <Link to="/analysis-history" className="flex gap-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg">
                  <History className="w-5 h-5" />
                  <span>History</span>
                </Link>

                <button 
                  onClick={handleLogout}
                  className="flex gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex gap-2 text-white hover:bg-white/20 px-4 py-2 rounded-lg">
                  <LogIn className="w-5 h-5" />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="flex gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
