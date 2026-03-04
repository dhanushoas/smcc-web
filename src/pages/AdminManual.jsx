import React from 'react';
import { Container, Card, Accordion } from 'react-bootstrap';

const AdminManual = () => {
    return (
        <Container className="py-5">
            <Card className="shadow-sm border-0 rounded-3">
                <Card.Body className="p-5">
                    <h1 className="fw-black premium-gradient-text mb-4">SMCC ADMIN MANUAL</h1>
                    <p className="lead text-muted mb-5">This guide is for SMCC officials and scorers. It covers the full lifecycle of match management and real-time scoring.</p>

                    <Accordion defaultActiveKey="0" className="manual-accordion">
                        <Accordion.Item eventKey="0" className="mb-3 border rounded">
                            <Accordion.Header><span className="fw-bold">1. Accessing the Console</span></Accordion.Header>
                            <Accordion.Body>
                                <p>To manage matches, you must log in to the <strong>Admin Console</strong>:</p>
                                <ol>
                                    <li>Scroll to the footer and click <strong>"Console"</strong>.</li>
                                    <li>Enter your official username and password.</li>
                                    <li>Once logged in, you will be redirected to the Admin Dashboard.</li>
                                </ol>
                            </Accordion.Body>
                        </Accordion.Item>

                        <Accordion.Item eventKey="1" className="mb-3 border rounded">
                            <Accordion.Header><span className="fw-bold">2. Managing Matches</span></Accordion.Header>
                            <Accordion.Body>
                                <ul>
                                    <li><strong>Create Match</strong>: Click "New Match", enter teams, series, venue, and overs. Use the picker for strict time formatting.</li>
                                    <li><strong>Copy Match</strong>: Click the dynamic "Copy" icon on an existing match to pre-fill details for a new match.</li>
                                    <li><strong>Edit Match</strong>: Update metadata like venue or time if plans change.</li>
                                    <li><strong>Delete Match</strong>: Remove incorrect or cancelled match records.</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>

                        <Accordion.Item eventKey="2" className="mb-3 border rounded">
                            <Accordion.Header><span className="fw-bold">3. Squads Management</span></Accordion.Header>
                            <Accordion.Body>
                                <p>Before scoring can start, you must finalize the squads:</p>
                                <ol>
                                    <li>Click <strong>"Score Match"</strong> or <strong>"Squads"</strong>.</li>
                                    <li>Select 11 players for each team.</li>
                                    <li>Ensure player names are accurate for the scorecard.</li>
                                </ol>
                            </Accordion.Body>
                        </Accordion.Item>

                        <Accordion.Item eventKey="3" className="mb-3 border rounded">
                            <Accordion.Header><span className="fw-bold">4. Real-time Scoring</span></Accordion.Header>
                            <Accordion.Body>
                                <p>The scoring panel is the heart of the console:</p>
                                <ul>
                                    <li><strong>Runs</strong>: Precise buttons for 0, 1, 2, 3, 4, and 6.</li>
                                    <li><strong>Extras</strong>: Modals for Wide, No Ball, Bye, and Leg Bye. For No Balls, indicate if it was hit by the bat.</li>
                                    <li><strong>Wickets</strong>: Select dismissal type. For Run Outs, the system will ask which batsman was out.</li>
                                    <li><strong>Strike Rotation</strong>: Automatically handled by the engine, but can be manually swapped using "Change Strike".</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>

                        <Accordion.Item eventKey="4" className="mb-3 border rounded">
                            <Accordion.Header><span className="fw-bold">5. Advanced Controls</span></Accordion.Header>
                            <Accordion.Body>
                                <ul>
                                    <li><strong>DLS</strong>: Adjust target and overs for rain-affected games.</li>
                                    <li><strong>Reverse Action</strong>: Undo the last delivery if a mistake was made.</li>
                                    <li><strong>Pause Match</strong>: Halt scoring with a reason (e.g., Rain, Bad Light).</li>
                                    <li><strong>Super Over</strong>: Initiate a super over if the match ends in a tie.</li>
                                    <li><strong>Declare Tie</strong>: Manually end the match as a tie if needed.</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>

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

export default AdminManual;
