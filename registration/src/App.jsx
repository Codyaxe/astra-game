import { useState } from "react";
import RegisterForm from "./RegisterForm";
import Scanner from "./Scanner";
import Dashboard from "./Dashboard";

export default function App() {
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "scanner" ? "scanner" : "register";
  });

  if (page === "scanner") {
    return <Scanner onBack={() => setPage("register")} />;
  }

  if (page === "dashboard") {
    return <Dashboard onBack={() => setPage("register")} />;
  }

  return (
    <RegisterForm
      onOpenScanner={() => setPage("scanner")}
      onOpenDashboard={() => setPage("dashboard")}
    />
  );
}