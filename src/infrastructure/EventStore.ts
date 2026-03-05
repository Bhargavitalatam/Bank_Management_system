// src/infrastructure/EventStore.ts
import { query, getClient } from './db';
import { BankEvent } from '../domain/events/BankEvents';
import { BankAccountState } from '../domain/aggregates/BankAccount';

export class EventStore {
    async appendEvents(events: BankEvent[]) {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            for (const event of events) {
                const res = await client.query(
                    'INSERT INTO events (aggregate_id, aggregate_type, event_type, event_data, event_number, version) VALUES ($1, $2, $3, $4, $5, $6) RETURNING global_sequence',
                    [event.aggregateId, event.aggregateType, event.type, JSON.stringify(event.data), event.eventNumber, event.version || 1]
                );
                event.globalSequence = parseInt(res.rows[0].global_sequence);
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async getEvents(aggregateId: string, fromEventNumber: number = 0): Promise<BankEvent[]> {
        const res = await query(
            'SELECT * FROM events WHERE aggregate_id = $1 AND event_number > $2 ORDER BY event_number ASC',
            [aggregateId, fromEventNumber]
        );
        return res.rows.map((row: any) => ({
            aggregateId: row.aggregate_id,
            aggregateType: row.aggregate_type,
            type: row.event_type,
            data: row.event_data,
            eventNumber: row.event_number,
            globalSequence: row.global_sequence ? parseInt(row.global_sequence) : undefined,
            version: row.version,
            timestamp: row.timestamp
        })) as BankEvent[];
    }

    async saveSnapshot(aggregateId: string, state: any, lastEventNumber: number) {
        await query(
            'INSERT INTO snapshots (aggregate_id, snapshot_data, last_event_number) VALUES ($1, $2, $3) ON CONFLICT (aggregate_id) DO UPDATE SET snapshot_data = $2, last_event_number = $3, created_at = NOW()',
            [aggregateId, JSON.stringify(state), lastEventNumber]
        );
    }

    async getSnapshot(aggregateId: string): Promise<{ state: any, version: number } | null> {
        const res = await query('SELECT snapshot_data, last_event_number FROM snapshots WHERE aggregate_id = $1', [aggregateId]);
        if (res.rows.length === 0) return null;
        return {
            state: res.rows[0].snapshot_data,
            version: res.rows[0].last_event_number
        };
    }
}
