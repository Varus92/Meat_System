import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import LoginPage from "./pages/LoginPage";
import BancoPage from "./pages/BancoPage";
import LaboratorioPage from "./pages/LaboratorioPage";
import StoricoPage from "./pages/StoricoPage";
import CatalogoPage from "./pages/CatalogoPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Auth error:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(userData);
      toast.success(`Benvenuto, ${userData.username}!`);
      return userData;
    } catch (error) {
      const message = error.response?.data?.detail || "Errore di login";
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.info("Disconnesso");
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F5F0]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "laboratorio" ? "/laboratorio" : "/banco"} replace />;
  }

  return children;
};

// App Routes
const AppRoutes = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === "laboratorio" ? "/laboratorio" : "/banco"} replace />
          ) : (
            <LoginPage />
          )
        } 
      />
      <Route
        path="/banco"
        element={
          <ProtectedRoute allowedRoles={["banco"]}>
            <BancoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/laboratorio"
        element={
          <ProtectedRoute allowedRoles={["laboratorio"]}>
            <LaboratorioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/storico"
        element={
          <ProtectedRoute allowedRoles={["banco", "laboratorio"]}>
            <StoricoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogo"
        element={
          <ProtectedRoute allowedRoles={["banco"]}>
            <CatalogoPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  // Seed data on first load
  useEffect(() => {
    const seedData = async () => {
      try {
        await axios.post(`${API}/seed`);
      } catch (error) {
        // Ignore if already seeded
      }
    };
    seedData();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster 
          position="top-right" 
          richColors 
          toastOptions={{
            style: {
              fontFamily: 'Manrope, sans-serif'
            }
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
