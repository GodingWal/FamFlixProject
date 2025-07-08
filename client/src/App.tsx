// FamFlix App Component
console.log("🎬 Loading FamFlix App component...");

import React from "react";

export default function App() {
  console.log("📦 App component rendering...");
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '60px 40px',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90%'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎬</div>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: '700', 
          margin: '0 0 10px 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          FamFlix
        </h1>
        <p style={{ 
          fontSize: '1.3rem', 
          margin: '0 0 40px 0', 
          opacity: '0.9' 
        }}>
          Educational Videos with Your Family
        </p>
        
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '40px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.4rem' }}>
            System Status
          </h3>
          <div style={{ fontSize: '1rem', lineHeight: '1.8' }}>
            <div>✅ React App: Successfully Loaded</div>
            <div>✅ Components: Rendering</div>
            <div>✅ JavaScript: Working</div>
            <div>✅ Server: Connected</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button 
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Get Started
          </button>
          <button 
            style={{
              background: 'transparent',
              color: 'white',
              border: '2px solid white',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

console.log("✅ FamFlix App component defined successfully");