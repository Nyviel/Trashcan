import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RoomProvider } from './context/RoomContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RoomProvider>
      <App />
    </RoomProvider>
  </StrictMode>
);
