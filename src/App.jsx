import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LiveScoreStrip from './components/LiveScoreStrip';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import FullScorecard from './pages/FullScorecard';
import GoogleAuth from './pages/GoogleAuth';

// Footer Pages
import Schedule from './pages/Schedule';
import PointsTable from './pages/PointsTable';
import Achievements from './pages/Achievements';
import Contact from './pages/Contact';
import Feedback from './pages/Feedback';
import Report from './pages/Report';
import Privacy from './pages/Privacy';
import Improvements from './pages/Improvements';
import JoinCouncil from './pages/JoinCouncil';
import Sponsorship from './pages/Sponsorship';
import UserManual from './pages/UserManual';
import AdminManual from './pages/AdminManual';

import { AppProvider } from './AppContext';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="d-flex flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
          <Navbar />
          <main className="flex-grow-1 overflow-auto no-scrollbar">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/match/:id" element={<FullScorecard />} />
              <Route path="/google-auth" element={<GoogleAuth />} />

              {/* Footer Pages */}
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/points-table" element={<PointsTable />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/report" element={<Report />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/improvements" element={<Improvements />} />
              <Route path="/join" element={<JoinCouncil />} />
              <Route path="/sponsorship" element={<Sponsorship />} />
              <Route path="/user-manual" element={<UserManual />} />
              <Route path="/admin-manual" element={<AdminManual />} />
            </Routes>
            <Footer />
          </main>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
