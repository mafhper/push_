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
const redirectedUrl = redirectedPath && redirectedPath.startsWith("/") && !redirectedPath.startsWith("//")
  ? new URL(redirectedPath, window.location.origin)
  : null;

if (redirectedUrl?.origin === window.location.origin) {
  sessionStorage.removeItem("push_redirect");
  window.history.replaceState(null, "", `${redirectedUrl.pathname}${redirectedUrl.search}${redirectedUrl.hash}`);
}

createRoot(document.getElementById("root")!).render(<App />);
