// Enhanced Sidebar.jsx with improved UX and animations
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  TrendingDown,
  Settings,
  LogOut,
  Calendar,
  Menu,
  Receipt,
  TrendingUp,
  Briefcase,
  User,
  BarChart3,
  ChevronLeft,
} from "lucide-react";

const Sidebar = ({ userSession, setUserSession }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-close sidebar when clicking on mobile or resizing to smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isExpanded) {
        setIsExpanded(false);
      }
    };

    const handleClickOutside = (event) => {
      if (window.innerWidth < 768 && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, page: "/dashboard" },
    { name: "Income", icon: TrendingUp, page: "/income" },
    { name: "Expenditure", icon: TrendingDown, page: "/expenditure" },
    { name: "Profit & Loss", icon: BarChart3, page: "/profitloss" },
    { name: "Projects", icon: Briefcase, page: "/projects" },
    { name: "Smart Borrow", icon: Wallet, page: "/smart-borrow" },
    { name: "Monthly Bills", icon: Calendar, page: "/monthly-bills" },
    { name: "Investment", icon: TrendingUp, page: "/investment" },
    { name: "Tax Center", icon: Receipt, page: "/tax" },
    { name: "Settings", icon: Settings, page: "/settings" },
  ];

  const clearSessionData = () => {
    [
      "token",
      "tenantId",
      "userData",
      "userSession",
      "sessionToken",
      "userId",
      "redirectAfterLogin",
      "authToken",
      "currentUser",
      "appState",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    clearSessionData();
    if (typeof setUserSession === "function") setUserSession(null);
    navigate("/", { replace: true });
    setTimeout(() => window.location.reload(), 100);
  };

  const userName = userSession?.user?.name || userSession?.user?.email || "User";
  const userEmail = userSession?.user?.email || "";

  const isActivePage = (page) =>
    page === "/dashboard" ? location.pathname === page : location.pathname.startsWith(page);

  // Touch handlers for mobile drag gesture
  const handleTouchStart = (e) => {
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const touchX = e.touches[0].clientX;
    // If dragging from left edge, open sidebar
    if (touchX < 20 && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <>
      {/* DRAG-TO-OPEN AREA FOR MOBILE */}
      <div 
        className="fixed top-0 left-0 w-4 h-full z-30 md:hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* OVERLAY FOR MOBILE */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FLOATING MENU BUTTON */}
      {!isExpanded && (
        <div className="fixed top-1/2 -translate-y-1/2 left-4 z-50">
          <button
            onClick={() => setIsExpanded(true)}
            onTouchStart={(e) => e.stopPropagation()}
            className="group w-14 h-14 backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 border border-purple-300/40 shadow-2xl text-white flex items-center justify-center rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-purple-500/30"
            style={{
              boxShadow:
                "0 0 25px rgba(168,85,247,0.5), 0 0 45px rgba(192,132,252,0.45), inset 0 0 20px rgba(168,85,247,0.3)",
            }}
          >
            {/* ANIMATED GLOW EFFECT */}
            <span className="absolute inset-0 bg-gradient-to-br from-indigo-300/30 to-purple-400/20 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></span>
            <span className="absolute -inset-3 bg-gradient-to-br from-white/40 to-transparent opacity-30 group-hover:opacity-50 rounded-3xl blur-xl transition-opacity duration-300"></span>
            <span className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            
            {/* MENU ICON WITH ANIMATION */}
            <Menu size={26} className="relative z-10 drop-shadow-[0_2px_4px_rgba(255,255,255,0.6)] transition-transform duration-300 group-hover:scale-110" />
            
            {/* PULSING DOT INDICATOR */}
            <span className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          </button>
        </div>
      )}

      {/* MAIN SIDEBAR */}
      <div 
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[#0d0b37] to-[#1a1a4b] text-white shadow-2xl flex flex-col transition-all duration-300 z-50 custom-scrollbar ${
          isExpanded ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "260px" }}
        onMouseLeave={() => window.innerWidth >= 768 && setIsExpanded(false)}
      >
        {/* Header with improved styling */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700/60 bg-gradient-to-r from-purple-900/20 to-transparent">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              FINOVO APP
            </h1>
            <p className="text-sm text-gray-300 truncate mt-1">{userName}</p>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 rounded-xl hover:bg-gray-700/50 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Navigation with enhanced animations */}
        <nav className="flex-1 mt-6 space-y-1 px-3 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.page}
              onClick={() => window.innerWidth < 768 && setIsExpanded(false)}
              className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                isActivePage(item.page)
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg border-l-4 border-white text-white transform scale-[1.02]"
                  : "hover:bg-gray-700/50 text-gray-300 hover:text-white hover:translate-x-1"
              }`}
            >
              <item.icon 
                size={22} 
                className={`transition-transform duration-200 ${
                  isActivePage(item.page) ? "scale-110" : "group-hover:scale-110"
                }`} 
              />
              <span className="font-medium">{item.name}</span>
              
              {/* Active indicator dot */}
              {isActivePage(item.page) && (
                <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Info Section */}
        {userSession && (
          <div className="px-4 py-3 border-t border-gray-700/60 bg-gradient-to-t from-gray-800/30 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{userName}</div>
                <div className="text-xs text-gray-400 truncate">{userEmail}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-400 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Online • Premium</span>
            </div>
          </div>
        )}

        {/* Logout Button with enhanced styling */}
        <div className="p-4 border-t border-gray-700/60">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`group flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 ${
              isLoggingOut 
                ? "bg-gray-600/50 cursor-not-allowed" 
                : "hover:bg-gradient-to-r from-red-600/90 to-red-700/90 hover:shadow-lg active:scale-95"
            }`}
          >
            <div className="relative">
              <LogOut size={20} className="text-red-400 group-hover:text-white transition-colors duration-200" />
              {isLoggingOut && (
                <div className="absolute inset-0 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <span className="font-medium">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;