import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Navbar() {
  const { currentUser, openAuthModal, handleSignOut } = useApp();

  return (
    <header className="navbar">

      <div className="logo">
        🚦
        <span>
          Smart Road Safety
        </span>
      </div>

      <nav>
        <Link to="/">
          Home
        </Link>

        <Link to="/dashboard">
          Dashboard
        </Link>

        <Link to="/reports">
          Reports
        </Link>

        <Link to="/report-issue">
          Report Issue
        </Link>

        <Link to="/help">
          Help
        </Link>
      </nav>

      {currentUser ? (
        <button
          type="button"
          className="nav-button"
          onClick={handleSignOut}
          title={`Signed in as ${currentUser.email || "Google user"}`}
          style={{ border: 0, cursor: "pointer" }}
        >
          Sign out
        </button>
      ) : (
        <button
          type="button"
          className="nav-button"
          onClick={() => openAuthModal("signin")}
          style={{ border: 0, cursor: "pointer" }}
        >
          Sign in
        </button>
      )}

    </header>
  );
}
