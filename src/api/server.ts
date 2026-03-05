// src/api/server.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { BankCommandHandler } from '../application/commands/BankCommandHandler';
import { AccountQueries } from '../application/queries/AccountQueries';
import { AccountProjector } from '../application/projectors/AccountProjector';
import { initializeDatabase } from '../infrastructure/init-db';

dotenv.config();

const app = express();
const port = process.env.API_PORT || 3000;

app.use(express.json());

// Initialize DB schema
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
});

const commandHandler = new BankCommandHandler();
const queryQueries = new AccountQueries();

// Health Check
app.get('/', (req, res) => {
    res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bank Account Management System | ES/CQRS</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg: #0f172a;
                    --glass: rgba(30, 41, 59, 0.7);
                    --accent: #38bdf8;
                    --text: #f8fafc;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                    background: radial-gradient(circle at top right, #1e293b, #0f172a);
                    color: var(--text);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    overflow: hidden;
                }
                .container {
                    background: var(--glass);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 3rem;
                    border-radius: 24px;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    max-width: 500px;
                    width: 90%;
                    animation: fadeIn 0.8s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                h1 {
                    font-weight: 800;
                    font-size: 2rem;
                    margin-bottom: 1rem;
                    background: linear-gradient(to right, #38bdf8, #818cf8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                p {
                    color: #94a3b8;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    background: rgba(34, 197, 94, 0.2);
                    color: #4ade80;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 2rem;
                    border: 1px solid rgba(74, 222, 128, 0.2);
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #22c55e;
                    border-radius: 50%;
                    margin-right: 8px;
                    box-shadow: 0 0 10px #22c55e;
                }
                .links {
                    display: grid;
                    gap: 1rem;
                }
                a {
                    text-decoration: none;
                    color: white;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 1rem;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    font-weight: 600;
                }
                a:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--accent);
                    transform: scale(1.02);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="status-badge">
                    <div class="status-dot"></div>
                    System Operational
                </div>
                <h1>Bank Management System</h1>
                <p>Advanced Event Sourcing & CQRS Account Management API. The cloud infrastructure is fully initialized and ready.</p>
                
                <div id="stats" style="margin-bottom: 2rem;">
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">Live System Stats</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent);" id="eventCount">...</div>
                            <div style="font-size: 0.7rem; color: #94a3b8;">Total Events</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 1.5rem; font-weight: 800; color: #4ade80;" id="syncLag">...</div>
                            <div style="font-size: 0.7rem; color: #94a3b8;">Sync Lag</div>
                        </div>
                    </div>
                </div>

                <div class="links">
                    <a href="/health">Health Status</a>
                    <a href="https://github.com/Bhargavitalatam/Bank_Management_system" target="_blank">API Documentation</a>
                </div>
            </div>
            <script>
                async function updateStats() {
                    try {
                        const res = await fetch('/api/projections/status');
                        if (!res.ok) throw new Error('API Error');
                        const data = await res.json();
                        
                        document.getElementById('stats').style.display = 'block';
                        document.getElementById('eventCount').innerText = data.totalEventsInStore ?? 0;
                        
                        if (data.projections && data.projections.length > 0) {
                            const lags = data.projections.map(p => p.lag || 0);
                            document.getElementById('syncLag').innerText = Math.max(...lags);
                        } else {
                            document.getElementById('syncLag').innerText = '0';
                        }
                    } catch (e) {
                        console.error('Failed to fetch stats:', e);
                        document.getElementById('eventCount').innerText = '...';
                        document.getElementById('syncLag').innerText = '...';
                    }
                }
                setTimeout(updateStats, 1000);
                setInterval(updateStats, 10000);
            </script>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

// Commands
app.post('/api/accounts', async (req, res) => {
    try {
        const { accountId, ownerName, initialBalance, currency } = req.body;
        if (!accountId || !ownerName || initialBalance === undefined) {
            return res.status(400).json({ error: 'Invalid request body' });
        }
        await commandHandler.createAccount(accountId, ownerName, initialBalance, currency);
        res.status(202).json({ message: 'Command accepted' });
    } catch (e: any) {
        if (e.message === 'Account already exists') {
            res.status(409).json({ error: e.message });
        } else {
            res.status(400).json({ error: e.message });
        }
    }
});

app.post('/api/accounts/:id/deposit', async (req, res) => {
    try {
        const { amount, transactionId, description } = req.body;
        if (amount === undefined || !transactionId || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await commandHandler.depositMoney(req.params.id, amount, transactionId, description);
        res.status(202).json({ message: 'Command accepted' });
    } catch (e: any) {
        if (e.message === 'Account not found') {
            res.status(404).json({ error: e.message });
        } else if (e.message === 'Account is closed') {
            res.status(409).json({ error: e.message });
        } else {
            res.status(400).json({ error: e.message });
        }
    }
});

app.post('/api/accounts/:id/withdraw', async (req, res) => {
    try {
        const { amount, transactionId, description } = req.body;
        if (amount === undefined || !transactionId || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await commandHandler.withdrawMoney(req.params.id, amount, transactionId, description);
        res.status(202).json({ message: 'Command accepted' });
    } catch (e: any) {
        if (e.message === 'Account not found') {
            res.status(404).json({ error: e.message });
        } else if (e.message === 'Account is closed' || e.message === 'Insufficient funds') {
            res.status(409).json({ error: e.message });
        } else {
            res.status(400).json({ error: e.message });
        }
    }
});

app.post('/api/accounts/:id/close', async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Missing reason' });
        }
        await commandHandler.closeAccount(req.params.id, reason);
        res.status(202).json({ message: 'Command accepted' });
    } catch (e: any) {
        if (e.message === 'Account not found') {
            res.status(404).json({ error: e.message });
        } else if (e.message === 'Account is already closed' || e.message === 'Account balance must be zero to close') {
            res.status(409).json({ error: e.message });
        } else {
            res.status(400).json({ error: e.message });
        }
    }
});

// Queries
app.get('/api/accounts/:id', async (req, res) => {
    try {
        const summary = await queryQueries.getAccountSummary(req.params.id);
        if (!summary) return res.status(404).json({ error: 'Account not found' });
        res.status(200).json({
            accountId: summary.account_id,
            ownerName: summary.owner_name,
            balance: parseFloat(summary.balance),
            currency: summary.currency,
            status: summary.status
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/accounts/:id/transactions', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;

        const result = await queryQueries.getTransactionHistory(req.params.id, page, pageSize);

        res.status(200).json({
            currentPage: page,
            pageSize: pageSize,
            totalPages: result.totalPages,
            totalCount: result.totalCount,
            items: result.items.map((row: any) => ({
                transactionId: row.transaction_id,
                type: row.type,
                amount: parseFloat(row.amount),
                description: row.description,
                timestamp: row.timestamp
            }))
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/accounts/:id/balance-at/:timestamp', async (req, res) => {
    try {
        const timestamp = decodeURIComponent(req.params.timestamp);
        const balance = await queryQueries.getBalanceAt(req.params.id, timestamp);
        if (balance === null) {
            return res.status(404).json({ error: 'Account not found or no events before this timestamp' });
        }
        res.status(200).json({
            accountId: req.params.id,
            balanceAt: balance,
            timestamp: timestamp
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/accounts/:id/events', async (req, res) => {
    try {
        const events = await queryQueries.getEvents(req.params.id);
        const formattedEvents = events.map((row: any) => ({
            eventId: row.event_id,
            eventType: row.event_type,
            eventNumber: row.event_number,
            data: row.event_data,
            timestamp: row.timestamp
        }));
        res.status(200).json(formattedEvents);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/projections/status', async (req, res) => {
    try {
        const status = await queryQueries.getProjectionStatus();
        res.status(200).json(status);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projections/rebuild', async (req, res) => {
    try {
        const projector = new AccountProjector();
        await projector.rebuild();
        res.status(202).json({ message: 'Projection rebuild initiated.' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
