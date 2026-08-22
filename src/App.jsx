import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import ReportIssue from "./pages/ReportIssue";
import Help from "./pages/Help";
import "./App.css";

export default function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const scroll = () => {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };

    if (!scroll()) {
      const timer = setTimeout(scroll, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname, hash]);

  return (
    <AppProvider>
      <div className="app">
        <Navbar />
        <AuthModal />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/report-issue" element={<ReportIssue />} />
          <Route path="/help" element={<Help />} />
        </Routes>
        <Footer />
      </div>
    </AppProvider>
  );
}
