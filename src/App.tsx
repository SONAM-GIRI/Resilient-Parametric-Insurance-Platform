import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate } from "react-router-dom";
import { 
  Shield, 
  LayoutDashboard, 
  FileText, 
  Activity, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  LogOut,
  Play,
  User,
  TrendingUp,
  Award,
  ShieldAlert,
  Map as MapIcon,
  Navigation,
  Wifi,
  Cpu,
  ChevronRight,
  ChevronLeft,
  Bell,
  Search,
  Settings,
  Info
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// --- COMPONENTS ---

const LoginPage = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [email, setEmail] = useState("admin@insurance.com");
  const [password, setPassword] = useState("password");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        onLogin(payload);
        navigate(['admin', 'analyst', 'viewer'].includes(payload.role) ? "/admin" : "/claim");
      } else {
        alert(data.error || "Login failed. Please check your credentials.");
      }
    } else {
      const text = await res.text();
      console.error("Login fetch returned non-JSON:", text.substring(0, 100));
      alert("Server error: Received invalid response format.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resilient Insurance</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link to="/forgot-password" title="Forgot Password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Forgot Password?</Link>
            </div>
          </div>
          <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            Sign In
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Test Credentials (pass: password)</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'Admin', email: 'admin@insurance.com' },
              { role: 'Analyst', email: 'analyst@insurance.com' },
              { role: 'Viewer', email: 'viewer@insurance.com' },
              { role: 'Worker', email: 'worker@insurance.com' }
            ].map(cred => (
              <button 
                key={cred.email}
                onClick={() => setEmail(cred.email)}
                className="text-[10px] text-left p-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <span className="font-bold text-slate-600 block">{cred.role}</span>
                <span className="text-slate-400">{cred.email}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
        </div>
        
        {message ? (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl mb-6 text-sm">
            {message}
            <div className="mt-4">
              <Link to="/login" className="text-emerald-800 font-bold hover:underline">Return to Login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-slate-500">Enter your email address and we'll send you a link to reset your password.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input 
                type="email" 
                required
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="name@company.com"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
            <button 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Back to Login</Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = (useNavigate as any).name === 'useNavigate' ? [new URLSearchParams(window.location.search)] : [new URLSearchParams(window.location.search)]; // Hack for search params if not using useSearchParams hook directly
  // Actually, let's just use useLocation or window.location
  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Reset Link</h2>
          <p className="text-slate-500 mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" title="Request a new reset link" className="text-indigo-600 font-bold hover:underline">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h1>
        </div>
        
        {message ? (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl mb-6 text-sm">
            {message}. Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
              <input 
                type="password" 
                required
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
              <input 
                type="password" 
                required
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
            <button 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const AdminDashboard = ({ user }: { user: any }) => {
  const [stats, setStats] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [riskThresholds, setRiskThresholds] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found in localStorage");
        return;
      }

      const headers = { 
        "Authorization": `Bearer ${token}`
      };
      
      const [statsRes, clustersRes, thresholdsRes] = await Promise.all([
        fetch("/api/admin/dashboard", { headers }),
        fetch("/api/admin/clusters", { headers }),
        fetch("/api/admin/risk-thresholds", { headers })
      ]);
      
      if (statsRes.ok) {
        const contentType = statsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setStats(await statsRes.json());
        } else {
          const text = await statsRes.text();
          console.error("Dashboard stats fetch returned non-JSON:", text.substring(0, 100));
        }
      } else {
        console.error("Dashboard stats fetch failed:", statsRes.status, statsRes.statusText);
      }

      if (clustersRes.ok) {
        const contentType = clustersRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setClusters(await clustersRes.json());
        } else {
          const text = await clustersRes.text();
          console.error("Dashboard clusters fetch returned non-JSON:", text.substring(0, 100));
        }
      } else {
        console.error("Dashboard clusters fetch failed:", clustersRes.status, clustersRes.statusText);
      }

      if (thresholdsRes.ok) {
        const contentType = thresholdsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          setRiskThresholds(await thresholdsRes.json());
        } else {
          const text = await thresholdsRes.text();
          console.error("Dashboard thresholds fetch returned non-JSON:", text.substring(0, 100));
        }
      } else {
        console.error("Dashboard thresholds fetch failed:", thresholdsRes.status, thresholdsRes.statusText);
        setError(`Failed to fetch dashboard data: ${thresholdsRes.status} ${thresholdsRes.statusText}`);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
      setError("An unexpected error occurred while fetching dashboard data.");
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Polling as backup

    // WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_CLAIM' || data.type === 'STATUS_UPDATE' || data.type === 'THRESHOLD_UPDATE' || data.type === 'THRESHOLDS_UPDATED') {
          fetchDashboard();
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [fetchDashboard]);

  if (error) return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="font-bold">Dashboard Error</h2>
        </div>
        <p className="text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );

  if (!stats) return <div className="p-8 text-slate-500 font-medium">Loading metrics...</div>;

  const riskData = stats.riskDistribution.map((r: any, i: number) => ({
    id: i,
    score: r.risk_score
  }));

  const isViewer = user?.role === 'viewer';
  const isAdmin = user?.role === 'admin';

  const updateThreshold = async (val: number) => {
    try {
      const res = await fetch("/api/admin/liquidity/threshold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ threshold: val })
      });
      if (res.ok) {
        fetchDashboard();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update threshold");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating threshold");
    }
  };

  const updateRiskThresholds = async (newThresholds: any) => {
    try {
      const res = await fetch("/api/admin/risk-thresholds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(newThresholds)
      });
      if (res.ok) {
        const data = await res.json();
        setRiskThresholds(data);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update risk thresholds");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating risk thresholds");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/claims/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">Security Command Center</h1>
            {isViewer && (
              <span className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border border-slate-200">
                Read Only
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">Real-time fraud detection and liquidity monitoring</p>
        </div>
        <div className="flex gap-4">
          {isAdmin && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Payout Threshold</p>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={stats.liquidity.payoutThreshold} 
                  onChange={(e) => updateThreshold(parseFloat(e.target.value))}
                  className="w-24 accent-indigo-600"
                />
                <span className="text-sm font-mono font-bold text-slate-700">{(stats.liquidity.payoutThreshold * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Liquidity Pool</p>
              <p className="text-xl font-mono font-bold text-emerald-600">${stats.liquidity.balance.toLocaleString()}</p>
            </div>
            <div className="w-24 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.liquidity.history}>
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Claims", value: stats.totalClaims.count, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Avg Risk Score", value: (stats.fraudRate.avg || 0).toFixed(2), icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Avg Trust Score", value: (stats.avgTrustScore.avg || 0).toFixed(2), icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "System Health", value: "99.9%", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className={`p-3 ${item.bg} rounded-xl w-fit mb-4`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{item.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fraud Clusters Section */}
        <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Detected Fraud Clusters</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{clusters.length} Clusters Found</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No suspicious clusters detected in the last 24 hours.
              </div>
            ) : (
              clusters.map((cluster) => (
                <Link 
                  key={cluster.id} 
                  to={`/admin/clusters/${cluster.id}`}
                  className="p-6 bg-slate-50 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Users className="w-4 h-4 text-slate-600 group-hover:text-red-600" />
                    </div>
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full uppercase tracking-widest">High Risk</span>
                  </div>
                  <h3 className="font-bold text-slate-900">Cluster #{cluster.id}</h3>
                  <p className="text-sm text-slate-500 mt-1">{cluster.userCount} Connected Users</p>
                  {!isViewer ? (
                    <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                      View Details <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Details Restricted
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Risk Configuration Section */}
        {isAdmin && riskThresholds && (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Settings className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Fraud Detection Configuration</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last Updated: {new Date(riskThresholds.updated_at).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Min Network Reputation</label>
                  <span className="text-xs font-mono font-bold text-indigo-600">{(riskThresholds.min_network_reputation * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 leading-tight">Minimum acceptable score for IP/Device reputation before flagging.</p>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={riskThresholds.min_network_reputation} 
                  onChange={(e) => updateRiskThresholds({ ...riskThresholds, min_network_reputation: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Max Sensor Variance</label>
                  <span className="text-xs font-mono font-bold text-indigo-600">{(riskThresholds.max_sensor_variance * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 leading-tight">Maximum allowed variance between GPS and motion sensors.</p>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={riskThresholds.max_sensor_variance} 
                  onChange={(e) => updateRiskThresholds({ ...riskThresholds, max_sensor_variance: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Max Behavioral Risk</label>
                  <span className="text-xs font-mono font-bold text-indigo-600">{(riskThresholds.max_behavioral_risk * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 leading-tight">Threshold for suspicious submission patterns and timing.</p>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={riskThresholds.max_behavioral_risk} 
                  onChange={(e) => updateRiskThresholds({ ...riskThresholds, max_behavioral_risk: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Max Graph Risk</label>
                  <span className="text-xs font-mono font-bold text-indigo-600">{(riskThresholds.max_graph_risk * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 leading-tight">Threshold for connection to known fraud clusters.</p>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={riskThresholds.max_graph_risk} 
                  onChange={(e) => updateRiskThresholds({ ...riskThresholds, max_graph_risk: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Overall Flag Threshold</label>
                  <span className="text-xs font-mono font-bold text-red-600">{(riskThresholds.overall_flag_threshold * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 leading-tight">Final Risk Score (FRS) that triggers an immediate security flag.</p>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={riskThresholds.overall_flag_threshold} 
                  onChange={(e) => updateRiskThresholds({ ...riskThresholds, overall_flag_threshold: parseFloat(e.target.value) })}
                  className="w-full accent-red-600"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Risk Score Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="id" hide />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="score">
                  {riskData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.score > 0.7 ? '#ef4444' : entry.score > 0.3 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {searchResults ? `Search Results (${searchResults.length})` : "Recent Activity"}
            </h3>
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                placeholder="Search email or ID..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults(null);
                }}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-64"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </form>
          </div>
          
          <div className="space-y-4">
            {(searchResults || stats.recentClaims).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">
                No claims found.
              </div>
            ) : (searchResults || stats.recentClaims).map((claim: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => navigate(`/claims/${claim.id}`)}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    claim.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                    claim.status === 'flagged' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {claim.status === 'approved' ? <CheckCircle className="w-5 h-5" /> :
                     claim.status === 'flagged' ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{claim.email}</p>
                    <p className="text-xs text-slate-500">Risk: {(claim.risk_score * 100).toFixed(1)}% • ${claim.amount}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-slate-400">{new Date(claim.created_at).toLocaleTimeString()}</p>
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full ${
                    claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    claim.status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {claim.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClaimSubmission = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [amount, setAmount] = useState(150);
  const [weather, setWeather] = useState("Heavy Rain");

  useEffect(() => {
    if (!result || !result.claimId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'STATUS_UPDATE' && String(data.claimId) === String(result.claimId)) {
          setResult((prev: any) => ({ ...prev, status: data.status }));
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    return () => ws.close();
  }, [result]);

  const submitClaim = async (isSpoofed = false) => {
    if (amount <= 0) {
      alert("Please enter a valid claim amount greater than zero.");
      return;
    }

    if (!weather) {
      alert("Please select a weather condition.");
      return;
    }

    setLoading(true);
    setResult(null);
    
    // Simulate sensor data
    const gps = isSpoofed ? [
      { lat: 40.7128, lng: -74.0060 },
      { lat: 41.8781, lng: -87.6298 } // Teleport jump!
    ] : [
      { lat: 40.7128, lng: -74.0060 },
      { lat: 40.7129, lng: -74.0061 }
    ];

    const sensors = {
      accelerometer: isSpoofed ? [0.01, 0.02, 0.01] : [1.2, 2.5, 0.8],
      gyroscope: isSpoofed ? [0.001] : [0.1, 0.5, 0.2]
    };

    const network = {
      ip: isSpoofed ? "192.168.1.100" : `192.168.1.${Math.floor(Math.random() * 255)}`,
      deviceId: isSpoofed ? "SPOOF_DEVICE_001" : `DEVICE_${Math.random().toString(36).substr(2, 9)}`
    };

    try {
      const res = await fetch("/api/claims/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ amount, weather, gps, sensors, network })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setResult(data);
      } else {
        const text = await res.text();
        console.error("Claim submission returned non-JSON:", text.substring(0, 100));
        alert("Server error: Received invalid response format. Please try again later.");
      }
    } catch (e) {
      console.error("Claim submission error:", e);
      alert("An unexpected error occurred while submitting your claim.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Submit Parametric Claim</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Claim Amount ($)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Weather Condition</label>
            <select 
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option>Heavy Rain</option>
              <option>Snow Storm</option>
              <option>Extreme Heat</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={() => submitClaim(false)}
              disabled={loading}
              className="bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Processing..." : <><CheckCircle className="w-5 h-5" /> Normal Claim</>}
            </button>
            <button 
              onClick={() => submitClaim(true)}
              disabled={loading}
              className="bg-red-50 text-red-600 border border-red-100 py-4 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Analyzing..." : <><AlertTriangle className="w-5 h-5" /> Spoofed Claim</>}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-8 rounded-2xl border ${
              result.status === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
              result.status === 'flagged' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-amber-50 border-amber-100 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              {result.status === 'approved' ? <CheckCircle className="w-8 h-8 text-emerald-600" /> :
               result.status === 'flagged' ? <AlertTriangle className="w-8 h-8 text-red-600" /> : <Clock className="w-8 h-8 text-amber-600" />}
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight">Claim {result.status}</h3>
                <p className="text-sm opacity-80">Fraud Risk Score: {(result.frs * 100).toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              {result.status === 'approved' ? "Our parametric engine verified the weather and sensor data. Payout initiated." :
               result.status === 'flagged' ? "Critical anomalies detected in GPS and sensor fusion data. Claim sent to manual review." :
               "Minor inconsistencies detected. Payout pending secondary verification."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap,
  useMapsLibrary
} from "@vis.gl/react-google-maps";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const TrajectoryPolyline = ({ path }: { path: google.maps.LatLngLiteral[] }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !path || path.length < 2) return;
    
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#4f46e5',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
};

const ClaimDetails = ({ user }: { user: any }) => {
  const { id } = useParams();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchClaim = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${id}`, {
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch claim: ${res.status} ${res.statusText}`);
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setClaim(data);
      } else {
        const text = await res.text();
        console.error("Claim details fetch returned non-JSON:", text.substring(0, 100));
        throw new Error("Received invalid response format from server.");
      }
    } catch (e: any) {
      console.error(e);
      setClaim(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClaim();

    // WebSocket for real-time status updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'STATUS_UPDATE' && String(data.claimId) === String(id)) {
          // Update local state if it's the current claim
          setClaim((prev: any) => prev ? { ...prev, status: data.status } : null);
          // Also refresh full data to be sure
          fetchClaim();
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    return () => ws.close();
  }, [fetchClaim, id]);

  if (loading) return <div className="p-8 text-slate-500 font-medium">Loading claim details...</div>;
  if (!claim) return <div className="p-8 text-red-500 font-medium">Claim not found</div>;

  const gps = JSON.parse(claim.gps_data || "[]");
  const sensors = JSON.parse(claim.sensor_data || "{}");
  const network = JSON.parse(claim.network_info || "{}");

  const mapCenter = gps.length > 0 ? gps[0] : { lat: 40.7128, lng: -74.0060 };

  if (!hasValidKey) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Claim #{claim.id}</h1>
            <p className="text-slate-500 mt-1">Detailed forensic analysis of parametric event</p>
          </div>
        </div>
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-xl text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Google Maps API Key Required</h2>
            <p className="text-slate-600 mb-8">To visualize the GPS trajectory on a map, you need to add your Google Maps Platform API key.</p>
            <div className="text-left space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
              <p className="text-sm font-bold text-slate-900">Step 1: Get an API Key</p>
              <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-sm text-indigo-600 hover:underline">Get an API Key from Google Cloud Console</a>
              <p className="text-sm font-bold text-slate-900">Step 2: Add your key as a secret</p>
              <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right)</li>
                <li>Select <strong>Secrets</strong></li>
                <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name</li>
                <li>Paste your API key as the value and press <strong>Enter</strong></li>
              </ul>
            </div>
            <p className="text-xs text-slate-400">The app will rebuild automatically after you add the secret.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Claim #{claim.id}</h1>
            <p className="text-slate-500 mt-1">Detailed forensic analysis of parametric event</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Overview */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status & Risk</h3>
              <div className="flex items-center justify-between">
                <span className={`text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full ${
                  claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  claim.status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {claim.status}
                </span>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{(claim.risk_score * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Risk Score</p>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    claim.risk_score > 0.7 ? 'bg-red-500' : 
                    claim.risk_score > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${claim.risk_score * 100}%` }}
                />
              </div>

              {/* Risk Breakdown */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Breakdown</h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Sensor Score */}
                  <div className="group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        Sensor <Info className="w-2.5 h-2.5 cursor-help" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-700">
                        {claim.sensor_score !== null ? `${(claim.sensor_score * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400" style={{ width: `${(claim.sensor_score || 0) * 100}%` }} />
                    </div>
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Variance between GPS trajectory and accelerometer/gyroscope data. High variance suggests simulated movement.
                    </div>
                  </div>

                  {/* Behavioral Score */}
                  <div className="group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        Behavior <Info className="w-2.5 h-2.5 cursor-help" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-700">
                        {claim.behavioral_score !== null ? `${(claim.behavioral_score * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400" style={{ width: `${(claim.behavioral_score || 0) * 100}%` }} />
                    </div>
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Analysis of submission timing, frequency, and historical trust patterns for this user.
                    </div>
                  </div>

                  {/* Network Risk */}
                  <div className="group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        Network <Info className="w-2.5 h-2.5 cursor-help" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-700">
                        {claim.network_risk !== null ? `${(claim.network_risk * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400" style={{ width: `${(claim.network_risk || 0) * 100}%` }} />
                    </div>
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Reputation of the IP address and Device ID. Checks against known fraud blacklists and VPN/proxy usage.
                    </div>
                  </div>

                  {/* Graph Risk */}
                  <div className="group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        Graph <Info className="w-2.5 h-2.5 cursor-help" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-700">
                        {claim.graph_risk !== null ? `${(claim.graph_risk * 100).toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400" style={{ width: `${(claim.graph_risk || 0) * 100}%` }} />
                    </div>
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      Community detection analysis. Flags connections to clusters of previously rejected or fraudulent accounts.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Claim Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">User</span>
                  <span className="text-sm font-medium text-slate-900">{claim.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Amount</span>
                  <span className="text-sm font-bold text-slate-900">${claim.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Weather</span>
                  <span className="text-sm font-medium text-slate-900">{claim.weather_condition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Submitted</span>
                  <span className="text-sm font-medium text-slate-900">{new Date(claim.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Wifi className="w-3 h-3" /> Network Info
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">IP Address</span>
                  <span className="text-xs font-mono text-slate-900">{network.ip || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Device ID</span>
                  <span className="text-xs font-mono text-slate-900">{network.deviceId || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Admin Status Management */}
            {user && ['admin', 'analyst'].includes(user.role) && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Actions</h3>
                <div className="grid grid-cols-1 gap-2">
                  {['pending', 'approved', 'flagged', 'rejected'].map((s) => (
                    <button
                      key={s}
                      disabled={claim.status === s}
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/admin/claims/${claim.id}/status`, {
                            method: "POST",
                            headers: { 
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${localStorage.getItem("token")}`
                            },
                            body: JSON.stringify({ status: s })
                          });
                          
                          const contentType = res.headers.get("content-type");
                          if (res.ok && contentType && contentType.includes("application/json")) {
                            const updated = await res.json();
                            setClaim({ ...claim, status: updated.status });
                          } else {
                            const text = await res.text();
                            console.error("Status update returned error or non-JSON:", text.substring(0, 100));
                            alert(`Failed to update status: ${res.status} ${res.statusText}`);
                          }
                        } catch (e) {
                          console.error(e);
                          alert("An unexpected error occurred while updating status.");
                        }
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        claim.status === s 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : s === 'approved' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' :
                            s === 'flagged' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' :
                            s === 'rejected' ? 'bg-red-50 text-red-600 hover:bg-red-100' :
                            'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {s === claim.status ? `Current: ${s}` : `Mark as ${s}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Forensic Data */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapIcon className="w-3 h-3" /> GPS Trajectory
              </h3>
              
              {/* Map Visualization */}
              <div className="h-80 w-full rounded-xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={15}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  <TrajectoryPolyline path={gps} />
                  {gps.map((point: any, i: number) => (
                    <AdvancedMarker key={i} position={point}>
                      <Pin 
                        background={i === 0 ? "#34A853" : i === gps.length - 1 ? "#EA4335" : "#4285F4"} 
                        glyphColor="#fff" 
                        scale={0.8}
                      />
                    </AdvancedMarker>
                  ))}
                </Map>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                {gps.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No GPS data available</p>
                ) : (
                  <div className="space-y-2">
                    {gps.map((point: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 text-xs">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <span className="font-mono text-slate-600">Lat: {point.lat.toFixed(6)}</span>
                        <span className="font-mono text-slate-600">Lng: {point.lng.toFixed(6)}</span>
                        {i > 0 && (
                          <span className="text-red-500 font-bold">
                            {Math.sqrt(Math.pow(point.lat - gps[i-1].lat, 2) + Math.pow(point.lng - gps[i-1].lng, 2)) > 0.01 ? "⚠️ Jump Detected" : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-3 h-3" /> Raw Sensor Fusion
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500">Accelerometer (m/s²)</p>
                  <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[10px] h-32 overflow-y-auto">
                    {sensors.accelerometer?.map((v: number, i: number) => (
                      <div key={i}>[{i}] {v.toFixed(4)}</div>
                    )) || "No data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500">Gyroscope (rad/s)</p>
                  <div className="bg-slate-900 text-indigo-400 p-3 rounded-lg font-mono text-[10px] h-32 overflow-y-auto">
                    {sensors.gyroscope?.map((v: number, i: number) => (
                      <div key={i}>[{i}] {v.toFixed(4)}</div>
                    )) || "No data"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};

const ClaimsHistory = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/claims/history", {
          headers: { 
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setClaims(data);
        } else {
          const text = await res.text();
          console.error("Claims history fetch returned non-JSON:", text.substring(0, 100));
        }
      } catch (e) {
        console.error("Claims history fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="p-8 text-slate-500 font-medium">Loading history...</div>;

  const filteredClaims = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Claim History</h1>
          <p className="text-slate-500 mt-1">Review your past parametric insurance claims</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {['all', 'pending', 'approved', 'flagged'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === status 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Weather</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Score</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No {filter !== 'all' ? filter : ''} claims found.</td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/claims/${claim.id}`)}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{new Date(claim.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400">{new Date(claim.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{claim.weather_condition}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">${claim.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              claim.risk_score > 0.7 ? 'bg-red-500' : 
                              claim.risk_score > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${claim.risk_score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{(claim.risk_score * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full ${
                        claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        claim.status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const UserProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile", {
          headers: { 
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setProfile(data);
        } else {
          const text = await res.text();
          console.error("User profile fetch returned non-JSON:", text.substring(0, 100));
        }
      } catch (e) {
        console.error("User profile fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="p-8 text-slate-500 font-medium">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-red-500 font-medium">Error loading profile</div>;

  const trustScore = profile.trust_score * 100;

  const breakdownData = [
    { subject: 'Tenure', A: profile.breakdown.tenure * 100, fullMark: 100 },
    { subject: 'Claim History', A: profile.breakdown.claimHistory * 100, fullMark: 100 },
    { subject: 'Sensor Reliability', A: profile.breakdown.sensorReliability * 100, fullMark: 100 },
    { subject: 'Network Reputation', A: profile.breakdown.networkReputation * 100, fullMark: 100 },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={552.92}
                  strokeDashoffset={552.92 - (552.92 * trustScore) / 100}
                  className={`${
                    trustScore > 70 ? 'text-emerald-500' : 
                    trustScore > 40 ? 'text-amber-500' : 'text-red-500'
                  } transition-all duration-1000 ease-out`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-900">{trustScore.toFixed(0)}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trust Score</span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900">{profile.email}</h2>
              <p className="text-slate-500 uppercase text-xs font-bold tracking-widest mt-1">{profile.role} • {profile.tenure_days} Days Active</p>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Score Breakdown</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={breakdownData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Trust Components"
                  dataKey="A"
                  stroke="#4f46e5"
                  fill="#4f46e5"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tenure Impact', value: profile.breakdown.tenure, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', desc: "Rewards long-term platform commitment." },
          { label: 'Claim History', value: profile.breakdown.claimHistory, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: "Accuracy of previous parametric submissions." },
          { label: 'Sensor Reliability', value: profile.breakdown.sensorReliability, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: "Consistency of GPS and motion data streams." },
          { label: 'Network Reputation', value: profile.breakdown.networkReputation, icon: Wifi, color: 'text-purple-600', bg: 'bg-purple-50', desc: "Security profile of your connection endpoints." },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-4 leading-tight">{item.desc}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold text-slate-900">{(item.value * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    item.value > 0.7 ? 'bg-emerald-500' : 
                    item.value > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${item.value * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {profile.payouts && profile.payouts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Payout History</h3>
              <p className="text-xs text-slate-400 mt-1">Real-time confirmation of parametric payouts</p>
            </div>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction ID</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profile.payouts.map((payout: any) => (
                  <tr key={payout.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4">
                      <span className="text-xs font-mono font-medium text-slate-900">{payout.transaction_id}</span>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-xs text-slate-500">{new Date(payout.timestamp).toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-xs font-bold text-slate-900">${payout.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const ClusterDetails = ({ user }: { user: any }) => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/admin/clusters/${id}`, {
          headers: { 
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (res.status === 403) {
          navigate("/admin");
          return;
        }
        
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          setData(await res.json());
        } else {
          const text = await res.text();
          console.error("Cluster details fetch returned non-JSON:", text.substring(0, 100));
        }
      } catch (e) {
        console.error("Cluster details fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, navigate]);

  if (loading) return <div className="p-8 text-slate-500 font-medium">Loading cluster details...</div>;
  if (!data) return <div className="p-8 text-red-500 font-medium">Cluster not found</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 transform rotate-180 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Fraud Cluster #{id}</h1>
          <p className="text-slate-500 mt-1">Detailed analysis of connected suspicious accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Involved Users</h3>
            <div className="space-y-4">
              {data.users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{user.email}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">ID: {user.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{(user.trust_score * 100).toFixed(0)}%</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Trust</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Recent Cluster Activity</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.claims.map((claim: any) => (
                    <tr key={claim.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/claims/${claim.id}`)}>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-900">{claim.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">{new Date(claim.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${claim.risk_score > 0.7 ? 'text-red-600' : 'text-amber-600'}`}>
                          {(claim.risk_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full ${
                          claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          claim.status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SimulationPage = ({ user }: { user: any }) => {
  const [simulating, setSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (['viewer', 'worker'].includes(user?.role)) {
      navigate(user?.role === 'viewer' ? "/admin" : "/claim");
    }
  }, [user, navigate]);

  const runSimulation = async () => {
    setSimulating(true);
    setLogs(["Initializing Fraud Ring Simulation...", "Generating 200 coordinated spoofed accounts...", "Injecting shared device fingerprints..."]);
    
    // Simulate batch submission
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 800));
      setLogs(prev => [...prev, `Submitting batch ${i+1}/5 with synchronized GPS jumps...`]);
    }

    setLogs(prev => [...prev, "Simulation complete. Check Admin Dashboard for cluster detection results."]);
    setSimulating(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="bg-slate-900 text-slate-100 p-8 rounded-2xl shadow-2xl border border-slate-800">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-600 rounded-xl">
            <Play className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Adversarial Simulator</h2>
            <p className="text-slate-400 text-sm">Stress test the fraud detection engine</p>
          </div>
        </div>

        <div className="bg-black/50 rounded-xl p-6 font-mono text-sm h-64 overflow-y-auto mb-8 border border-slate-700">
          {logs.map((log, i) => (
            <div key={i} className="mb-2">
              <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
            </div>
          ))}
          {simulating && <div className="animate-pulse text-indigo-400">_ Processing...</div>}
        </div>

        <button 
          onClick={runSimulation}
          disabled={simulating}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20"
        >
          {simulating ? "Simulating Attack..." : "Launch Coordinated Fraud Attack"}
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---

function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("/api/notifications", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.is_read).length);
          } else {
            const text = await res.text();
            console.error("Notifications fetch returned non-JSON:", text.substring(0, 100));
          }
        }
      } catch (e) {
        console.error("Notifications fetch error:", e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error("Mark all read error:", e);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-4 border-bottom border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Notifications</h4>
            <button 
              onClick={handleMarkAllRead}
              className="text-[10px] text-slate-400 hover:text-indigo-600 uppercase font-bold transition-colors"
            >
              Mark All Read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      n.type === 'fraud_alert' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {n.type === 'fraud_alert' ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-900 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Simple decode for UI state
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser(payload);
      } catch (e) {
        localStorage.removeItem("token");
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!payload.exp) return;

        const exp = payload.exp * 1000;
        const now = Date.now();
        const timeLeft = exp - now;

        // Refresh if less than 15 minutes left
        if (timeLeft < 15 * 60 * 1000 && timeLeft > 0) {
          const res = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("token", data.token);
            const newPayload = JSON.parse(atob(data.token.split(".")[1]));
            setUser(newPayload);
          }
        } else if (timeLeft <= 0) {
          handleLogout();
        }
      } catch (e) {
        console.error("Token refresh error:", e);
      }
    };

    const interval = setInterval(checkToken, 5 * 60 * 1000); // Check every 5 minutes
    checkToken();
    return () => clearInterval(interval);
  }, [user, handleLogout]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {user && (
          <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-indigo-600" />
                  <span className="font-bold text-lg tracking-tight">ParametricGuard</span>
                </div>
                <div className="flex items-center gap-1">
                  {['admin', 'analyst', 'viewer'].includes(user.role) && (
                    <Link to="/admin" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                  )}
                  {['worker', 'admin', 'analyst'].includes(user.role) && (
                    <Link to="/claim" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                      <FileText className="w-4 h-4" /> New Claim
                    </Link>
                  )}
                  <Link to="/history" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                    <Clock className="w-4 h-4" /> History
                  </Link>
                  <Link to="/profile" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  {['admin', 'analyst'].includes(user.role) && (
                    <Link to="/simulate" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                      <Play className="w-4 h-4" /> Simulator
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="h-8 w-[1px] bg-slate-200" />
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
                  <p className="text-sm font-medium text-slate-900">{user.email || 'User'}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </nav>
        )}

        <Routes>
          <Route path="/" element={
            !user ? <LoginPage onLogin={setUser} /> :
            ['admin', 'analyst', 'viewer'].includes(user.role) ? <AdminDashboard user={user} /> :
            <Navigate to="/claim" replace />
          } />
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin" element={
            ['admin', 'analyst', 'viewer'].includes(user?.role) ? <AdminDashboard user={user} /> : <Navigate to="/" replace />
          } />
          <Route path="/admin/clusters/:id" element={<ClusterDetails user={user} />} />
          <Route path="/claims/:id" element={<ClaimDetails user={user} />} />
          <Route path="/claim" element={<ClaimSubmission />} />
          <Route path="/history" element={<ClaimsHistory />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/simulate" element={<SimulationPage user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}
