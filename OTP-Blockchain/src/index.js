// index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';

// Create the React root element and render the app inside the div with id 'root'
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
