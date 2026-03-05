import { query } from './db';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase() {
    const tables = ['events', 'snapshots', 'account_summaries', 'transaction_history', 'projection_status'];

    for (const table of tables) {
        const res = await query(`SELECT to_regclass('public.${table}')`);
        if (!res.rows[0].to_regclass) {
            console.log(`Table ${table} missing. Running full initialization...`);
            const initSqlPath = path.join(__dirname, '../../seeds/init.sql');
            const initSql = fs.readFileSync(initSqlPath, 'utf8');
            await query(initSql);
            console.log('Database schema created.');
            break;
        }
    }

    // Explicit migration for global_sequence if table exists but column is missing
    const colCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='events' AND column_name='global_sequence' AND table_schema='public'
    `);

    if (colCheck.rows.length === 0) {
        console.log('Migration: Adding global_sequence column to events table...');
        await query('ALTER TABLE events ADD COLUMN global_sequence BIGSERIAL UNIQUE');
        await query('CREATE INDEX IF NOT EXISTS idx_events_global_sequence ON events(global_sequence)');
        console.log('Migration complete.');
    }

    // Always ensure projection_status rows exist
    await query("INSERT INTO projection_status (projection_name, last_processed_global_id) VALUES ('AccountSummaries', 0), ('TransactionHistory', 0) ON CONFLICT DO NOTHING");
    console.log('Database initialization check complete.');
}
