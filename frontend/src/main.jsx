import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CompanyAuthProvider } from "./context/CompanyAuthContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <CompanyAuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </CompanyAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
