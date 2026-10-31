import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Landing } from "./components/landing/landing";
import { Chat } from "./components/chat";
import { Me } from "./components/me";
import { Train } from "./components/train";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Employee side, no sign-in: #/train (guided training), #/text (coach chat), #/me (private progress).
// #/home is always the landing, even in demo mode. Everything else is the employer side.
function Route() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  if (hash.startsWith("#/home")) return <Landing />;
  if (hash.startsWith("#/train")) return <Train />;
  return hash.startsWith("#/me") ? <Me /> : hash.startsWith("#/text") ? <Chat /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        appearance={{
          variables: {
            colorPrimary: "#1f272b",
            colorText: "#191f22",
            fontFamily: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
            borderRadius: "0.5rem",
          },
        }}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <Route />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
