import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "./ui/button";
import { 
  Store, FlaskConical, History, Package, LogOut, 
  Menu, X
} from "lucide-react";
import { useState } from "react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const bancoLinks = [
    { to: "/banco", label: "Nuovo Ordine", icon: Store },
    { to: "/catalogo", label: "Catalogo", icon: Package },
    { to: "/storico", label: "Storico Ordini", icon: History },
  ];

  const laboratorioLinks = [
    { to: "/laboratorio", label: "Dashboard", icon: FlaskConical },
    { to: "/storico", label: "Storico Ordini", icon: History },
  ];

  const links = user?.role === "laboratorio" ? laboratorioLinks : bancoLinks;

  const NavLinks = () => (
    <>
      {links.map(link => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            data-testid={`nav-${link.to.replace('/', '')}`}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#5D1919] text-white rounded-lg shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="mobile-menu-btn"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          sidebar w-64 flex flex-col fixed md:relative z-40
          transform transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Store className="w-6 h-6 text-[#5D1919]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                Macelleria
              </h1>
              <p className="text-white/60 text-sm">Tumminello</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-white/60 text-xs uppercase tracking-wide mb-1">
            {user?.role === "laboratorio" ? "Laboratorio" : "Banco / Cassa"}
          </p>
          <p className="text-white font-medium">{user?.username}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="logout-btn"
            className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Esci
          </Button>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-white/40 text-xs">
          <p>Contrada Ettore Infersa 126</p>
          <p>Marsala (TP)</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
