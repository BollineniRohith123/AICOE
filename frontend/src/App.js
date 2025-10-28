import React, { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainInterface from './components/MainInterface';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainInterface />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
