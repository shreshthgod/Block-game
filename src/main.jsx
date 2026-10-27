import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './context/GameProvider.jsx';
import { getBrowserStorage, readBootstrap } from './game/storage.js';
import App from './App.jsx';
import './styles/tokens.css';
const storage = getBrowserStorage();
const snapshot = readBootstrap(storage);
createRoot(document.getElementById('root')).render(<StrictMode><GameProvider initialState={snapshot} storage={storage}><App /></GameProvider></StrictMode>);
