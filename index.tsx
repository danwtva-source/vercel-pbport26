import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("✅ index.tsx is running!"); // Check your console for this message

const rootElement = document.getElementById('root');
if (!rootElement) {
    console.error("❌ FATAL: Root element not found");
    throw new Error("Failed to find the root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
