import { useApp } from "../context/AppContext";
import { firebaseIsConfigured } from "../firebase";

export default function AuthModal() {
  const {
    authModalOpen,
    authMode,
    authEmail,
    authPassword,
    authLoading,
    authError,
    setAuthModalOpen,
    setAuthMode,
    setAuthEmail,
    setAuthPassword,
    handleGoogleSignIn,
    handleEmailAuth,
  } = useApp();

  if (!authModalOpen) return null;

  const close = () => {
    setAuthModalOpen(false);
    setAuthEmail("");
    setAuthPassword("");
  };

  const switchMode = () => {
    setAuthMode(authMode === "signin" ? "signup" : "signin");
    setAuthEmail("");
    setAuthPassword("");
  };

  return (
    <div
      className="auth-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={authMode === "signin" ? "Sign in" : "Sign up"}
    >
      <div className="auth-modal">
        <button
          type="button"
          className="auth-close"
          onClick={close}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="auth-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b6cff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <h2 className="auth-title">
          {authMode === "signin"
            ? "Welcome back"
            : "Create your account"}
        </h2>

        <p className="auth-subtitle">
          {authMode === "signin"
            ? "Sign in to access your safety dashboard"
            : "Sign up to start monitoring road safety"}
        </p>

        {authError && (
          <div className="auth-error" role="alert">{authError}</div>
        )}

        {!firebaseIsConfigured && (
          <div className="auth-error" role="alert">
            Firebase is not configured. Set VITE_FIREBASE_* env vars.
          </div>
        )}

        <form onSubmit={handleEmailAuth} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              className="auth-input"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="auth-input"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete={
                authMode === "signin"
                  ? "current-password"
                  : "new-password"
              }
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={authLoading || !firebaseIsConfigured}
          >
            {authLoading ? (
              <span className="auth-spinner" />
            ) : authMode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <button
          type="button"
          className="auth-google"
          onClick={handleGoogleSignIn}
          disabled={authLoading || !firebaseIsConfigured}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>

        <p className="auth-switch">
          {authMode === "signin"
            ? "Don't have an account?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={switchMode}
          >
            {authMode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
