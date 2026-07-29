import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import "./AuthPage.css";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate("/");
    } catch (err) {
      console.error("Login/signup error:", err); // TEMPORARY -- remove once bug is found
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-masthead">
          <span className="auth-eyebrow">Stock Savvy</span>
          <h1 className="auth-title">
            {mode === "login" ? "Welcome back" : "Open an account"}
          </h1>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Sign in to pick up your watchlist where you left it."
              : "Quick ticker lookups, plain-language recommendations, nothing overloaded."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              autoComplete="email"
              required
            />
            {fieldErrors.email && (
              <span className="auth-field-error">{fieldErrors.email[0]}</span>
            )}
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
            {fieldErrors.password && (
              <span className="auth-field-error">{fieldErrors.password[0]}</span>
            )}
          </label>

          {formError && <div className="auth-form-error">{formError}</div>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button className="auth-switch-link" onClick={() => switchMode("signup")}>
                Open an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="auth-switch-link" onClick={() => switchMode("login")}>
                Sign in
              </button>
            </>
          )}
        </div>

        <p className="auth-disclaimer">
          Stock Savvy provides educational analytics, not financial advice.
        </p>
      </div>
    </div>
  );
}