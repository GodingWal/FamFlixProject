console.log("Main.tsx loading...");

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#6366f1' }}>🎬 FamFlix</h1>
      <p>Educational Videos with Your Family</p>
      <div style={{ 
        backgroundColor: '#f8fafc', 
        padding: '20px', 
        borderRadius: '8px', 
        marginTop: '20px' 
      }}>
        <h2>System Status</h2>
        <p>✅ React is working</p>
        <p>✅ Server is online</p>
        <p>✅ Basic rendering successful</p>
      </div>
    </div>
  );
}

console.log("About to mount React app...");

const container = document.getElementById("root");
console.log("Root container:", container);

if (container) {
  try {
    const root = createRoot(container);
    console.log("Root created, rendering...");
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log("React app rendered successfully!");
  } catch (error) {
    console.error("Error rendering React app:", error);
  }
} else {
  console.error("Root element not found");
}