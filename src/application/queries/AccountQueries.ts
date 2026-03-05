// src/application/queries/AccountQueries.ts
import { query } from '../../infrastructure/db';

export class AccountQueries {
    async getAccountSummary(accountId: string) {
        const res = await query('SELECT * FROM account_summaries WHERE account_id = $1', [accountId]);
        if (res.rows.length === 0) return null;
        return res.rows[0];
    }

    async getTransactionHistory(accountId: string, page: number = 1, pageSize: number = 10) {
        const offset = (page - 1) * pageSize;
        const countRes = await query('SELECT COUNT(*) FROM transaction_history WHERE account_id = $1', [accountId]);
        const totalCount = parseInt(countRes.rows[0].count);

        const itemsRes = await query(
            'SELECT * FROM transaction_history WHERE account_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
            [accountId, pageSize, offset]
        );

        return {
            items: itemsRes.rows,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize)
        };
    }

    async getEvents(accountId: string) {
        const res = await query('SELECT * FROM events WHERE aggregate_id = $1 ORDER BY event_number ASC', [accountId]);
        return res.rows;
    }

    async getBalanceAt(accountId: string, timestamp: string): Promise<number | null> {
        // Fetch events for the account up to the specified timestamp
        const res = await query(
            'SELECT event_type, event_data FROM events WHERE aggregate_id = $1 AND timestamp <= $2 ORDER BY event_number ASC',
            [accountId, timestamp]
        );

        if (res.rows.length === 0) return null;

        let balance = 0;
        for (const row of res.rows) {
            const data = row.event_data;
            switch (row.event_type) {
                case 'AccountCreated':
                    balance = data.initialBalance;
                    break;
                case 'MoneyDeposited':
                    balance += data.amount;
                    break;
                case 'MoneyWithdrawn':
                    balance -= data.amount;
                    break;
            }
        }
        return balance;
    }

    async getProjectionStatus() {
        let totalEvents = 0;
        try {
            const totalEventsRes = await query('SELECT MAX(global_sequence) as max_seq FROM events');
            totalEvents = parseInt(totalEventsRes.rows[0].max_seq || '0');
        } catch (err) {
            console.error('Migration Lag: global_sequence not ready yet.');
            totalEvents = 0;
        }

        const projectionsRes = await query('SELECT * FROM projection_status');

        return {
            totalEventsInStore: totalEvents,
            projections: projectionsRes.rows.map(row => {
                const lastId = parseInt(row.last_processed_global_id || '0');
                const total = totalEvents || 0;
                return {
                    name: row.projection_name,
                    lastProcessedEventNumberGlobal: lastId,
                    lag: Math.max(0, total - lastId)
                };
            })
        };
    }
}
