import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "./stores/useAuthStore";

// Initialize auth store
useAuthStore.getState().initialize();

createRoot(document.getElementById("root")!).render(<App />);
