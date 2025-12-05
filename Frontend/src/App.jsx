// App.jsx — FULL FIXED (complete)
// This file restores the original app behaviour while fixing the infinite session-validation loop
// and providing performance and stability improvements.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";

// Core components
import AuthPage from "./pages/AuthPage.jsx";
import Sidebar from "./Sidebar.jsx";
import "./App.css";

// Import all components directly for faster loading (kept as you requested)
import Dashboard from "./pages/Dashboard.jsx";
import Expenditure from "./pages/Expenditure.jsx";
import Settings from "./pages/Settings.jsx";
import Income from "./pages/Incomepage.jsx";
import MonthPage from "./pages/MonthPage.jsx";
import SmartBorrowForm from "./pages/SmartBorrowForm.jsx";
import TaxPage from "./pages/TaxPage.jsx";
import Investment from "./pages/Investment.jsx";
import ProfitLossPage from "./pages/ProfitLossPage.jsx";
import ProjectModule from "./pages/ProjectModule.jsx";
import GoogleLoginButton from "./pages/GoogleLoginButton.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";

// Performance Optimizations and constants
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_REFRESH_INTERVAL = 60 * 1000; // 1 minute

// ----------------- Enhanced Loader Components -----------------
const EnhancedLoader = ({
  message = "Loading...",
  progress = null,
  size = "medium",
  subMessage = "Please wait while we load your content",
}) => {
  const sizes = {
    small: "h-8 w-8",
    medium: "h-16 w-16",
    large: "h-24 w-24",
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 p-4">
      <div className="relative">
        <div
          className={`animate-spin rounded-full border-t-4 border-b-4 border-indigo-600 ${sizes[size]}`}
        ></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="animate-ping h-2 w-2 bg-indigo-500 rounded-full"></div>
        </div>
      </div>
      <div className="text-center max-w-md">
        <p className="text-gray-700 font-medium text-lg mb-1">{message}</p>
        <p className="text-gray-500 text-sm">{subMessage}</p>
        {progress !== null && (
          <div className="w-48 bg-gray-200 rounded-full h-2 mt-4 mx-auto overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

const RouteLoader = ({ routeName }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    let interval = setInterval(() => {
      setProgress((p) => Math.min(p + (p < 50 ? 20 : p < 80 ? 10 : 5), 90));
    }, 300);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const displayName = routeName ? routeName.charAt(0).toUpperCase() + routeName.slice(1) : "Page";

  return (
    <EnhancedLoader message={`Loading ${displayName}...`} progress={progress} subMessage="This should only take a moment" />
  );
};

// ----------------- Error Boundary -----------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("🔴 Error Boundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, errorInfo: null, retryCount: s.retryCount + 1 }));
  };

  handleReload = () => window.location.reload();
  handleGoHome = () => (window.location.href = "/");
  handleGoBack = () => window.history.back();

  render() {
    if (this.state.hasError) {
      const MAX_RETRY_ATTEMPTS = 3;
      const isMaxRetries = this.state.retryCount >= MAX_RETRY_ATTEMPTS;
      const errorMessage = this.state.error?.toString() || "Unknown error occurred";

      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-200 transform hover:scale-[1.02] transition-transform duration-200">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚨</span>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-3">
              {isMaxRetries ? "Maximum Retries Reached" : "Oops! Something Went Wrong"}
            </h1>
            <p className="text-gray-600 mb-3">
              {isMaxRetries
                ? "We've tried multiple times but couldn't recover from this error."
                : "We encountered an unexpected error while loading this page."}
            </p>

            <details className="text-left bg-gray-50 p-3 rounded-lg mb-4 cursor-pointer">
              <summary className="font-medium text-gray-700 hover:text-gray-900">Technical Details</summary>
              <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap overflow-auto max-h-32">{errorMessage}</pre>
            </details>

            <div className="flex flex-col gap-3 mt-6">
              {!isMaxRetries && (
                <button onClick={this.handleRetry} className="px-6 py-3 bg-indigo-600 text-white rounded-lg">
                  🔄 Try Again ({MAX_RETRY_ATTEMPTS - this.state.retryCount} attempts left)
                </button>
              )}
              <button onClick={this.handleGoBack} className="px-6 py-3 bg-gray-500 text-white rounded-lg">← Go Back</button>
              <button onClick={this.handleReload} className="px-6 py-3 bg-blue-600 text-white rounded-lg">🔄 Reload Page</button>
              <button onClick={this.handleGoHome} className="px-6 py-3 bg-green-600 text-white rounded-lg">🏠 Go to Home</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ----------------- Session Manager -----------------
const sessionManager = {
  SESSION_KEYS: [
    "userSession",
    "sessionToken",
    "userId",
    "tenantId",
    "redirectAfterLogin",
    "sessionExpiry",
    "recentPages",
  ],

  saveSession: (session) => {
    try {
      const sessionWithTimestamp = {
        ...session,
        lastSaved: Date.now(),
        expiresAt: Date.now() + SESSION_TIMEOUT,
        version: "2.0",
      };

      // Normalize tenantId and token for backwards compatibility
      const resolvedTenantId = sessionWithTimestamp?.user?.id || sessionWithTimestamp?.tenantId || null;
      const resolvedToken = sessionWithTimestamp?.token || sessionWithTimestamp?.sessionToken || null;

      localStorage.setItem("userSession", JSON.stringify(sessionWithTimestamp));
      if (resolvedToken) localStorage.setItem("token", resolvedToken);
      if (resolvedToken) localStorage.setItem("sessionToken", resolvedToken);
      if (sessionWithTimestamp.user?.id) localStorage.setItem("userId", sessionWithTimestamp.user.id);
      if (resolvedTenantId) localStorage.setItem("tenantId", resolvedTenantId);

      console.log("✅ User session saved to localStorage");
      return true;
    } catch (error) {
      console.error("❌ Failed to save session:", error);
      return false;
    }
  },

  getSession: () => {
    try {
      const saved = localStorage.getItem("userSession");
      if (!saved) return null;
      const session = JSON.parse(saved);
      if (!session.token || !session.user?.id) {
        sessionManager.clearSession();
        return null;
      }
      if (session.expiresAt && Date.now() > session.expiresAt) {
        sessionManager.clearSession();
        return null;
      }
      return session;
    } catch (error) {
      console.error("❌ Failed to get session:", error);
      sessionManager.clearSession();
      return null;
    }
  },

  clearSession: () => {
    try {
      sessionManager.SESSION_KEYS.forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      console.log("✅ User session cleared from storage");
      return true;
    } catch (err) {
      console.error("❌ Failed to clear session:", err);
      return false;
    }
  },

  isValidSession: () => {
    const s = sessionManager.getSession();
    return !!(s && s.token && s.user && s.user.id && s.user.email && (!s.expiresAt || Date.now() < s.expiresAt));
  },

  trackPageVisit: (path, name) => {
    try {
      const recent = JSON.parse(localStorage.getItem("recentPages") || "[]");
      const newVisit = { path, name, timestamp: Date.now() };
      const filtered = recent.filter((r) => r.path !== path);
      const updated = [newVisit, ...filtered].slice(0, 10);
      localStorage.setItem("recentPages", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to track page visit:", e);
    }
  },
};

// ----------------- Session Persistence Hook -----------------
const useSessionPersistence = () => {
  const [userSession, setUserSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log("🔄 Initializing session...");
        if (sessionManager.isValidSession()) {
          const saved = sessionManager.getSession();
          if (mounted) setUserSession(saved);
          console.log("✅ User session restored from localStorage");
        } else {
          console.warn("❌ No valid session found in localStorage");
          sessionManager.clearSession();
        }
      } catch (err) {
        console.error("❌ Failed to initialize session:", err);
        sessionManager.clearSession();
      } finally {
        if (mounted) {
          setLoading(false);
          console.log("✅ Session initialization complete");
        }
      }
    };

    initialize();

    const refreshInterval = setInterval(() => {
      if (sessionManager.isValidSession() && mounted) {
        const updated = sessionManager.getSession();
        setUserSession((prev) => {
          // Only update state if content actually changed to prevent re-renders
          if (JSON.stringify(prev) !== JSON.stringify(updated)) {
            return updated;
          }
          return prev;
        });
      }
    }, SESSION_REFRESH_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  const setSession = useCallback((session) => {
    if (session === null) {
      console.log("🚪 Clearing user session");
      sessionManager.clearSession();
      setUserSession(null);
    } else {
      console.log("💾 Saving user session");
      sessionManager.saveSession(session);
      setUserSession(session);
    }
  }, []);

  const clearSession = useCallback(() => {
    console.log("🚪 Clearing user session via clearSession");
    sessionManager.clearSession();
    setUserSession(null);
  }, []);

  return { userSession, setUserSession: setSession, clearSession, loadingSession: loading };
};

// ----------------- Sidebar Context -----------------
const SidebarContext = React.createContext();

const SidebarProvider = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const toggleSidebar = useCallback(() => setIsExpanded((s) => !s), []);
  const showSidebar = useCallback(() => setIsVisible(true), []);
  const hideSidebar = useCallback(() => {
    setIsVisible(false);
    setIsExpanded(false);
  }, []);

  const value = useMemo(
    () => ({ isExpanded, isVisible, toggleSidebar, showSidebar, hideSidebar, setIsExpanded, setIsVisible }),
    [isExpanded, isVisible, toggleSidebar, showSidebar, hideSidebar]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

const useSidebar = () => {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
};

// ----------------- NotFound Page -----------------
const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const suggestedRoutes = useMemo(
    () => [
      { path: "/dashboard", label: "Dashboard", icon: "📊", description: "Overview" },
      { path: "/income", label: "Income", icon: "💰", description: "Earnings" },
      { path: "/expenditure", label: "Expenditure", icon: "📈", description: "Spending" },
      { path: "/projects", label: "Projects", icon: "🚀", description: "Manage Projects" },
      { path: "/investment", label: "Investment", icon: "📊", description: "Investments" },
      { path: "/profitloss", label: "Profit & Loss", icon: "💹", description: "Financial Reports" },
      { path: "/tax", label: "Tax Center", icon: "🧾", description: "Tax Management" },
      { path: "/settings", label: "Settings", icon: "⚙️", description: "App Settings" },
    ],
    []
  );

  const recentPages = useMemo(() => {
    try {
      const recent = localStorage.getItem("recentPages");
      return recent ? JSON.parse(recent).slice(0, 4) : [];
    } catch {
      return [];
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full border border-gray-200 transform hover:scale-[1.01] transition-transform duration-300">
        <div className="w-24 h-24 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-4xl">🔍</span>
        </div>
        <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 text-lg">The page <code className="bg-gray-100 px-3 py-1 rounded-lg text-base font-mono border">{location.pathname}</code> doesn't exist or has been moved.</p>

        {recentPages.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Recently Visited</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentPages.map((route) => (
                <button key={route.path} onClick={() => navigate(route.path)} className="flex flex-col items-center p-4 bg-white rounded-xl hover:bg-indigo-50 transition-all duration-200 border border-gray-200 hover:border-indigo-300 hover:shadow-md group">
                  <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{route.icon}</span>
                  <span className="text-base font-semibold text-gray-800">{route.name || route.label}</span>
                  <span className="text-sm text-gray-500 mt-1">{route.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Suggested Pages</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedRoutes.map((route) => (
              <button key={route.path} onClick={() => navigate(route.path)} className="flex flex-col items-center p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-indigo-300 hover:shadow-lg group">
                <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{route.icon}</span>
                <span className="text-base font-semibold text-gray-800">{route.label}</span>
                <span className="text-sm text-gray-500 mt-1">{route.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate(-1)} className="px-8 py-4 bg-gray-600 text-white rounded-xl">← Go Back</button>
          <button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl">🏠 Go to Dashboard</button>
        </div>
      </div>
    </div>
  );
};

// ----------------- ProtectedRoute (FIXED) -----------------
const ProtectedRoute = ({ children, userSession, loadingSession }) => {
  const location = useLocation();
  const [validationState, setValidationState] = useState("checking");

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      if (loadingSession) return; // wait until session hook finishes

      // small delay to let potential state updates settle
      await new Promise((resolve) => setTimeout(resolve, 40));

      if (!mounted) return;

      const hasValidSession =
        userSession &&
        userSession.token &&
        userSession.user?.id &&
        (!userSession.expiresAt || Date.now() < userSession.expiresAt);

      if (!hasValidSession) {
        // store redirect (only if not auth page)
        const redirectPath = location.pathname + location.search + location.hash;
        if (redirectPath !== "/" && redirectPath !== "/auth" && redirectPath !== "/login") {
          localStorage.setItem("redirectAfterLogin", redirectPath);
        }

        setValidationState("invalid");
      } else {
        setValidationState("valid");
      }
    };

    validate();

    return () => {
      mounted = false;
    };
  }, [loadingSession]); // CRITICAL FIX: only depend on loadingSession to prevent loop

  if (loadingSession || validationState === "checking") {
    return <EnhancedLoader message="Verifying your session..." size="small" />;
  }

  if (validationState === "invalid") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ----------------- PublicRoute -----------------
const PublicRoute = ({ children, userSession, loadingSession }) => {
  const location = useLocation();

  if (loadingSession) return <EnhancedLoader message="Checking authentication..." size="small" />;

  if (userSession?.token) {
    const redirectPath = localStorage.getItem("redirectAfterLogin") || "/dashboard";
    if (localStorage.getItem("redirectAfterLogin")) localStorage.removeItem("redirectAfterLogin");
    if (location.pathname !== redirectPath) return <Navigate to={redirectPath} replace />;
  }

  return children;
};

// ----------------- MainLayout -----------------
const MainLayout = ({ userSession, setUserSession, clearSession, loadingSession }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ["/", "/auth", "/login"].includes(location.pathname);
  const { isExpanded, isVisible, showSidebar, hideSidebar } = useSidebar();

  useEffect(() => {
    if (!isAuthPage && userSession) {
      showSidebar();
    } else {
      hideSidebar();
    }
  }, [isAuthPage, userSession, showSidebar, hideSidebar]);

  useEffect(() => {
    if (userSession && !isAuthPage) {
      const routeName = location.pathname.split("/").pop() || "dashboard";
      sessionManager.trackPageVisit(location.pathname, routeName);
    }
  }, [location.pathname, userSession, isAuthPage]);

  const handleLoginSuccess = useCallback(
    (userData) => {
      setUserSession(userData);
      navigate("/dashboard");
    },
    [setUserSession, navigate]
  );

  const handleLogout = useCallback(() => {
    clearSession();
    hideSidebar();
    navigate("/login");
  }, [clearSession, hideSidebar, navigate]);

  const protectedRoutes = useMemo(
    () => [
      { path: "/dashboard", component: Dashboard, name: "Dashboard" },
      { path: "/expenditure", component: Expenditure, name: "Expenditure" },
      { path: "/income", component: Income, name: "Income" },
      { path: "/profitloss", component: ProfitLossPage, name: "Profit & Loss" },
      { path: "/projects", component: ProjectModule, name: "Projects" },
      { path: "/monthly-bills", component: MonthPage, name: "Monthly Bills" },
      { path: "/investment", component: Investment, name: "Investment" },
      { path: "/smart-borrow", component: SmartBorrowForm, name: "Smart Borrow" },
      { path: "/tax", component: TaxPage, name: "Tax Center" },
      { path: "/tax-center", component: TaxPage, name: "Tax Center" },
      { path: "/settings", component: Settings, name: "Settings" },
    ],
    []
  );

  if (loadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <EnhancedLoader message="Loading your session..." size="large" subMessage="Almost ready..." />
      </div>
    );
  }

  return (
    <div className="App flex min-h-screen bg-gray-50">
      {isVisible && userSession && (
        <Sidebar userSession={userSession} onLogout={handleLogout} currentPath={location.pathname} routes={protectedRoutes} isExpanded={isExpanded} />
      )}

      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isVisible && userSession ? (isExpanded ? "lg:ml-64" : "lg:ml-20") : "ml-0"
        }`}
      >
        <ErrorBoundary>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <PublicRoute userSession={userSession} loadingSession={loadingSession}>
                  <AuthPage onLoginSuccess={handleLoginSuccess} />
                </PublicRoute>
              }
            />

            <Route
              path="/login"
              element={
                <PublicRoute userSession={userSession} loadingSession={loadingSession}>
                  <AuthPage onLoginSuccess={handleLoginSuccess} />
                </PublicRoute>
              }
            />

            <Route
              path="/auth"
              element={
                <PublicRoute userSession={userSession} loadingSession={loadingSession}>
                  <AuthPage onLoginSuccess={handleLoginSuccess} />
                </PublicRoute>
              }
            />

            <Route
              path="/auth/callback"
              element={
                <PublicRoute userSession={userSession} loadingSession={loadingSession}>
                  <AuthCallback onLoginSuccess={handleLoginSuccess} />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            {protectedRoutes.map(({ path, component: Component, name }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute userSession={userSession} loadingSession={loadingSession}>
                    <Component userSession={userSession} onLogout={handleLogout} currentPath={location.pathname} />
                  </ProtectedRoute>
                }
              />
            ))}

            {/* Redirect root to login if not matched */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
};

// ----------------- App -----------------
const App = () => {
  const { userSession, setUserSession, clearSession, loadingSession } = useSessionPersistence();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const measure = () => {
        const nav = performance.getEntriesByType("navigation")[0];
        if (nav) console.log(`🚀 App loaded in: ${Math.round(nav.domContentLoadedEventEnd)}ms`);
      };

      if (document.readyState === "complete") measure();
      else window.addEventListener("load", measure);

      return () => window.removeEventListener("load", measure);
    }
  }, []);

  return (
    <SidebarProvider>
      <BrowserRouter>
        <MainLayout userSession={userSession} setUserSession={setUserSession} clearSession={clearSession} loadingSession={loadingSession} />
      </BrowserRouter>
    </SidebarProvider>
  );
};

export default App;
