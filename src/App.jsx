import { Routes, Route } from "react-router-dom";
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
