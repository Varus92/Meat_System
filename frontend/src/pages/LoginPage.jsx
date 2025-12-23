import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Store, FlaskConical, Eye, EyeOff } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_319faa5c-5fca-49f2-9e55-096d5a0f1183/artifacts/hvvg6jn6_518372070_1411016301023513_6348586323466964816_n.jpg";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === "laboratorio" ? "/laboratorio" : "/banco");
    } catch (error) {
      // Error handled in auth context
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role) => {
    setLoading(true);
    try {
      const credentials = role === "banco" 
        ? { username: "banco", password: "banco123" }
        : { username: "laboratorio", password: "lab123" };
      
      const user = await login(credentials.username, credentials.password);
      navigate(user.role === "laboratorio" ? "/laboratorio" : "/banco");
    } catch (error) {
      // Error handled in auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#F9F5F0',
        backgroundImage: `linear-gradient(rgba(249, 245, 240, 0.9), rgba(249, 245, 240, 0.95)), url('https://images.unsplash.com/photo-1759682763274-5d6edfca514d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwzfHxzaWNpbGlhbiUyMGxhbmRzY2FwZSUyMHZpbmV5YXJkfGVufDB8fHx8MTc2NjM2NjI5NHww&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <Card className="w-full max-w-md shadow-xl border-[#D6CFC7]" data-testid="login-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-[#5D1919] shadow-lg">
            <img 
              src={LOGO_URL} 
              alt="Macelleria Tumminello" 
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="text-3xl text-[#5D1919]">Macelleria Tumminello</CardTitle>
          <CardDescription className="text-base mt-2">
            Sistema Gestione Ordini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#2D2D2D] font-medium">
                Nome utente
              </Label>
              <Input
                id="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci nome utente"
                className="h-12 border-[#D6CFC7] focus:border-[#5D1919] focus:ring-[#5D1919]/20"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#2D2D2D] font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci password"
                  className="h-12 border-[#D6CFC7] focus:border-[#5D1919] focus:ring-[#5D1919]/20 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  data-testid="toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full h-12 bg-[#5D1919] hover:bg-[#4A1212] text-white font-semibold text-base"
              disabled={loading || !username || !password}
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#D6CFC7]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Accesso rapido</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              data-testid="quick-login-banco"
              onClick={() => quickLogin("banco")}
              disabled={loading}
              className="h-14 border-[#D6CFC7] hover:bg-[#F9F5F0] hover:border-[#5D1919] flex flex-col items-center gap-1"
            >
              <Store className="w-5 h-5 text-[#5D1919]" />
              <span className="text-sm font-medium">Banco/Cassa</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="quick-login-laboratorio"
              onClick={() => quickLogin("laboratorio")}
              disabled={loading}
              className="h-14 border-[#D6CFC7] hover:bg-[#F9F5F0] hover:border-[#5D1919] flex flex-col items-center gap-1"
            >
              <FlaskConical className="w-5 h-5 text-[#5D1919]" />
              <span className="text-sm font-medium">Laboratorio</span>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Contrada Ettore Infersa 126, Marsala
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
