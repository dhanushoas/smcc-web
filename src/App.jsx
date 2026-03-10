import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LiveScoreStrip from './components/LiveScoreStrip';
const Home = React.lazy(() => import('./pages/Home'));
const Profile = React.lazy(() => import('./pages/Profile'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const FullScorecard = React.lazy(() => import('./pages/FullScorecard'));
const GoogleAuth = React.lazy(() => import('./pages/GoogleAuth'));

// Footer Pages - Lazy Loaded
const Schedule = React.lazy(() => import('./pages/Schedule'));
const PointsTable = React.lazy(() => import('./pages/PointsTable'));
const Achievements = React.lazy(() => import('./pages/Achievements'));
const Contact = React.lazy(() => import('./pages/Contact'));
const Feedback = React.lazy(() => import('./pages/Feedback'));
const Report = React.lazy(() => import('./pages/Report'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Improvements = React.lazy(() => import('./pages/Improvements'));
const JoinCouncil = React.lazy(() => import('./pages/JoinCouncil'));
const Sponsorship = React.lazy(() => import('./pages/Sponsorship'));
const UserManual = React.lazy(() => import('./pages/UserManual'));
const AdminManual = React.lazy(() => import('./pages/AdminManual'));
const TournamentDashboard = React.lazy(() => import('./pages/TournamentDashboard'));
const TournamentView = React.lazy(() => import('./pages/TournamentView'));
const SeriesView = React.lazy(() => import('./pages/SeriesView'));

import { AppProvider } from './AppContext';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="d-flex flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
          <Navbar />
          <main className="flex-grow-1 overflow-auto no-scrollbar">
            <React.Suspense fallback={<div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary" role="status"></div></div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/match/:id" element={<FullScorecard />} />
                <Route path="/scorecard/:id" element={<FullScorecard />} />
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
                <Route path="/tournaments" element={<TournamentDashboard />} />
                <Route path="/tournaments/:id" element={<TournamentView />} />
                <Route path="/series/:id" element={<SeriesView />} />
              </Routes>
            </React.Suspense>
            <Footer />
          </main>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
