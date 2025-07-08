// FamFlix Main Entry Point
console.log("🚀 Starting FamFlix main.tsx...");

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

console.log("📦 Imports loaded successfully");

const container = document.getElementById("root");
console.log("🔍 Root container found:", !!container);

if (container) {
  try {
    console.log("⚛️ Creating React root...");
    const root = createRoot(container);
    
    console.log("🎨 Rendering FamFlix app...");
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log("🎉 FamFlix loaded successfully!");
  } catch (error) {
    console.error("💥 React render error:", error);
    // Fallback HTML if React fails
    container.innerHTML = `
      <div style="padding: 40px; font-family: Arial; background: #fee2e2; color: #dc2626; border-radius: 10px; margin: 20px;">
        <h1>🎬 FamFlix</h1>
        <h2>React Loading Error</h2>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Check the browser console for more details.</p>
        <hr>
        <p><strong>Troubleshooting:</strong></p>
        <ul>
          <li>Refresh the page</li>
          <li>Check network connectivity</li>
          <li>Verify Vite dev server is running</li>
          <li>Look for JavaScript errors in console</li>
        </ul>
      </div>
    `;
  }
} else {
  console.error("💥 Root element not found in DOM!");
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: Arial; background: #fef3c7; color: #d97706;">
      <h1>🎬 FamFlix</h1>
      <h2>HTML Structure Error</h2>
      <p>The root element with id="root" was not found in the HTML.</p>
      <p>Please check the client/index.html file.</p>
    </div>
  `;
}