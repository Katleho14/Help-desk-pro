import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, UserPlus, Shield, Sparkles } from "lucide-react";

export default function SignupPage() {
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.email || !form.password) {
      setError("Please fill in all required fields");
      return false;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (form.confirmPassword && form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        // Store token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Navigate to home page
        navigate("/");
      } else {
        // Handle error response - backend sends 'error' field
        setError(data.error || data.message || "Signup failed");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-indigo-500/5 to-cyan-500/10"></div>
      <div className="absolute top-32 right-16 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-32 left-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="card w-full max-w-md shadow-2xl bg-base-100/95 backdrop-blur-sm border border-base-300 animate-slide-up">
        <div className="card-body p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-secondary" />
            </div>
            <h2 className="card-title justify-center text-3xl font-bold text-secondary">Join Us</h2>
            <p className="text-base-content/70">Create your account</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="alert alert-error animate-fade-in">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className="input input-bordered pl-10 input-focus"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password (min 6 chars)"
                  className="input input-bordered pl-10 input-focus"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  minLength="6"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Confirm Password</span>
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  className="input input-bordered pl-10 input-focus"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-secondary w-full btn-glow text-lg py-3"
                disabled={loading}
              >
                {loading ? (
                  <>
            <span className="loading loading-spinner loading-sm"></span>
                    Signing up...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Sign Up
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="divider my-6">OR</div>

          <div className="text-center">
            <span className="text-base-content/70">Already have an account? </span>
            <Link to="/login" className="link link-secondary font-medium hover:text-secondary-focus transition-colors">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
