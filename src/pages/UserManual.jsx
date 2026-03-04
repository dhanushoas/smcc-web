import React from 'react';
import { Container, Card } from 'react-bootstrap';

const UserManual = () => {
    return (
        <Container className="py-5">
            <Card className="shadow-sm border-0 rounded-3">
                <Card.Body className="p-5">
                    <h1 className="fw-black premium-gradient-text mb-4">SMCC USER MANUAL</h1>
                    <p className="lead text-muted mb-5">Welcome to the official SMCC-Web user guide. This manual will help you navigate the platform and stay updated with your favorite cricket matches.</p>

                    <section className="mb-5">
                        <h3 className="fw-bold text-primary mb-3">1. Getting Started</h3>
                        <p>SMCC-Web is your go-to platform for live cricket scores, schedules, and tournament standing. You can access it from any modern web browser on your phone, tablet, or computer.</p>
                    </section>

                    <section className="mb-5">
                        <h3 className="fw-bold text-primary mb-3">2. Viewing Live Scores</h3>
                        <p>On the <strong>Home Page</strong>, you'll see a live match strip at the top. This shows high-level summaries. Below that, the "Live Match" section provides detailed ball-by-ball updates, including:</p>
                        <ul>
                            <li>Current runs and wickets</li>
                            <li>Overs completed</li>
                            <li>Active batsmen and their individual scores</li>
                            <li>Current bowler and recent balls in the over</li>
                        </ul>
                    </section>

                    <section className="mb-5">
                        <h3 className="fw-bold text-primary mb-3">3. Match Schedules and Standings</h3>
                        <ul>
                            <li><strong>Upcoming Schedule</strong>: Find this in the footer or menu. It lists all planned matches with venues and timings.</li>
                            <li><strong>Points Table</strong>: View team rankings, wins, losses, and Net Run Rate (NRR).</li>
                        </ul>
                    </section>

                    <section className="mb-5">
                        <h3 className="fw-bold text-primary mb-3">4. Mobile App</h3>
                        <p>For a better experience on the go, click the <strong>"Download SMCC App"</strong> button in the navigation bar to download the Android APK directly to your device.</p>
                    </section>

                    <section className="mb-5">
                        <h3 className="fw-bold text-primary mb-3">5. Support and Feedback</h3>
                        <p>We value your experience! Use the links in the footer to:</p>
                        <ul>
                            <li><strong>Contact Us</strong>: For general inquiries.</li>
                            <li><strong>Share Feedback</strong>: To help us improve.</li>
                            <li><strong>Report Issues</strong>: If you encounter any bugs or errors.</li>
                        </ul>
                    </section>

                    <div className="mt-5 pt-3 border-top text-center">
                        <button className="btn btn-outline-primary d-print-none" onClick={() => window.print()}>
                            <i className="bi bi-printer me-2"></i> Print as PDF
                        </button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default UserManual;
