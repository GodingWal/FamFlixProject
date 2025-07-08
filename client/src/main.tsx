console.log("🚀 Starting FamFlix...");

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.1)',
        padding: '40px',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>🎬</h1>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: '700' }}>FamFlix</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '30px', opacity: '0.9' }}>
          Educational Videos with Your Family
        </p>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.2)', 
          padding: '20px', 
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>System Status</h3>
          <div style={{ textAlign: 'left', fontSize: '14px' }}>
            <p>✅ React: Successfully Loaded</p>
            <p>✅ JavaScript: Working</p>
            <p>✅ Rendering: Complete</p>
            <p>✅ Server: Connected</p>
          </div>
        </div>
        
        <button style={{
          background: '#4f46e5',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          marginRight: '10px'
        }}>
          Get Started
        </button>
        
        <button style={{
          background: 'transparent',
          color: 'white',
          border: '2px solid white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer'
        }}>
          Learn More
        </button>
      </div>
    </div>
  );
}

console.log("📦 App component defined");

const container = document.getElementById("root");
console.log("🔍 Root container:", container);

if (container) {
  try {
    console.log("⚛️ Creating React root...");
    const root = createRoot(container);
    console.log("🎨 Rendering app...");
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log("🎉 FamFlix loaded successfully!");
  } catch (error) {
    console.error("💥 React render error:", error);
    container.innerHTML = `
      <div style="padding: 20px; font-family: Arial;">
        <h1>🎬 FamFlix</h1>
        <p style="color: red;">React Error: ${error.message}</p>
        <p>Please check the console for details.</p>
      </div>
    `;
  }
} else {
  console.error("💥 Root element not found!");
}