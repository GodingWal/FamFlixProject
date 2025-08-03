import React from 'react';
import './index.css';

console.log("App.tsx: App component starting to render");

export default function App() {
  console.log("App.tsx: App component rendering");
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      marginTop: '50px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>FamFlix Test Page</h1>
      <p style={{ color: '#666' }}>If you can see this, React is working!</p>
      <div style={{ 
        backgroundColor: '#007bff', 
        color: 'white', 
        padding: '10px 20px', 
        borderRadius: '5px',
        display: 'inline-block',
        marginTop: '20px'
      }}>
        ✅ React App is Loading Successfully
      </div>
    </div>
  );
}