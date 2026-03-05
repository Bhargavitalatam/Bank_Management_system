// src/application/projectors/AccountProjector.ts
import { query } from '../../infrastructure/db';
import { BankEvent } from '../../domain/events/BankEvents';

export class AccountProjector {
    async project(event: BankEvent) {
        switch (event.type) {
            case 'AccountCreated':
                await query(
                    'INSERT INTO account_summaries (account_id, owner_name, balance, currency, status, version) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (account_id) DO UPDATE SET owner_name = $2, balance = $3, currency = $4, status = $5, version = $6',
                    [event.data.accountId, event.data.ownerName, event.data.initialBalance, event.data.currency, 'OPEN', event.eventNumber]
                );
                await query(
                    'INSERT INTO transaction_history (transaction_id, account_id, type, amount, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (transaction_id) DO NOTHING',
                    [`initial-${event.data.accountId}`, event.data.accountId, 'INITIAL_DEPOSIT', event.data.initialBalance, 'Initial deposit', event.timestamp || new Date()]
                );
                break;
            case 'MoneyDeposited':
                await query(
                    'UPDATE account_summaries SET balance = balance + $1, version = $2 WHERE account_id = $3',
                    [event.data.amount, event.eventNumber, event.aggregateId]
                );
                await query(
                    'INSERT INTO transaction_history (transaction_id, account_id, type, amount, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
                    [event.data.transactionId, event.aggregateId, 'DEPOSIT', event.data.amount, event.data.description, event.timestamp || new Date()]
                );
                break;
            case 'MoneyWithdrawn':
                await query(
                    'UPDATE account_summaries SET balance = balance - $1, version = $2 WHERE account_id = $3',
                    [event.data.amount, event.eventNumber, event.aggregateId]
                );
                await query(
                    'INSERT INTO transaction_history (transaction_id, account_id, type, amount, description, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
                    [event.data.transactionId, event.aggregateId, 'WITHDRAWAL', event.data.amount, event.data.description, event.timestamp || new Date()]
                );
                break;
            case 'AccountClosed':
                await query(
                    'UPDATE account_summaries SET status = $1, version = $2 WHERE account_id = $3',
                    ['CLOSED', event.eventNumber, event.aggregateId]
                );
                break;
        }

        if (event.globalSequence) {
            await query(
                'INSERT INTO projection_status (projection_name, last_processed_global_id) VALUES ($1, $2) ON CONFLICT (projection_name) DO UPDATE SET last_processed_global_id = EXCLUDED.last_processed_global_id',
                ['AccountSummaries', event.globalSequence]
            );
            await query(
                'INSERT INTO projection_status (projection_name, last_processed_global_id) VALUES ($1, $2) ON CONFLICT (projection_name) DO UPDATE SET last_processed_global_id = EXCLUDED.last_processed_global_id',
                ['TransactionHistory', event.globalSequence]
            );
        }
    }

    async rebuild() {
        await query('TRUNCATE TABLE account_summaries, transaction_history CASCADE');
        await query('UPDATE projection_status SET last_processed_global_id = 0');
        const res = await query('SELECT * FROM events ORDER BY global_sequence ASC');
        for (const row of res.rows) {
            const event: BankEvent = {
                aggregateId: row.aggregate_id,
                aggregateType: row.aggregate_type,
                type: row.event_type,
                data: row.event_data,
                eventNumber: row.event_number,
                globalSequence: parseInt(row.global_sequence),
                version: row.version,
                timestamp: row.timestamp
            };
            await this.project(event);
        }
    }
}
