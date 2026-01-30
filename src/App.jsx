import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import FullScorecard from './pages/FullScorecard';
import GoogleAuth from './pages/GoogleAuth';
import { AppProvider } from './AppContext';

function App() {
  return (
    <AppProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Profile />} /> {/* Redirect old login to profile logic or keep alias */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/match/:id" element={<FullScorecard />} />
          <Route path="/google-auth" element={<GoogleAuth />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
