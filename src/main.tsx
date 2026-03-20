import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/700.css";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

document.documentElement.classList.add("terminal");

const redirectedPath = sessionStorage.getItem("push_redirect");
if (redirectedPath) {
  sessionStorage.removeItem("push_redirect");
  window.history.replaceState(null, "", redirectedPath);
}

createRoot(document.getElementById("root")!).render(<App />);
