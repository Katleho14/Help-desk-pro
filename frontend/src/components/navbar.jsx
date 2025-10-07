import { Link, useNavigate } from "react-router-dom";
import { Ticket, User, Settings, LogOut, LogIn, UserPlus } from "lucide-react";

export default function Navbar() {
  const token = localStorage.getItem("token");
  let user = localStorage.getItem("user");
  if (user) {
    user = JSON.parse(user);
  }
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="navbar bg-base-200/80 backdrop-blur-md border-b border-base-300 shadow-lg animate-fade-in">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl font-bold hover:bg-primary/20 transition-colors">
          <Ticket className="w-6 h-6 mr-2 text-primary" />
          Ticket AI
        </Link>
      </div>
      <div className="flex gap-2 items-center">
        {!token ? (
          <>
            <Link to="/signup" className="btn btn-outline btn-sm btn-glow">
              <UserPlus className="w-4 h-4 mr-1" />
              Signup
            </Link>
            <Link to="/login" className="btn btn-primary btn-sm btn-glow">
              <LogIn className="w-4 h-4 mr-1" />
              Login
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Hi, {user?.email}</span>
            </div>
            {user && user?.role === "admin" && (
              <Link to="/admin" className="btn btn-accent btn-sm btn-glow">
                <Settings className="w-4 h-4 mr-1" />
                Admin
              </Link>
            )}
            <button onClick={logout} className="btn btn-error btn-sm btn-glow">
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
