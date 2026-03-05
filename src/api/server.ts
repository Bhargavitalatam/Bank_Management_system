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
