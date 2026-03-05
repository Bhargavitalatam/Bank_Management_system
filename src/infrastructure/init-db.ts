import { query } from './db';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase() {
    console.log('--- Database Surgical Sync Starting ---');

    // 1. Ensure events table exists first
    const eventsExist = await query("SELECT to_regclass('public.events')");
    if (!eventsExist.rows[0].to_regclass) {
        console.log('Events table missing. Running init.sql...');
        const initSqlPath = path.join(__dirname, '../../seeds/init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        await query(initSql);
        console.log('Base schema created.');
    } else {
        // 2. Migration: Ensure global_sequence exists if events table exists
        const colCheck = await query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='events' AND column_name='global_sequence' AND table_schema='public'
        `);

        if (colCheck.rows.length === 0) {
            console.log('Migration: Adding global_sequence to existing events table...');
            await query('ALTER TABLE events ADD COLUMN global_sequence BIGSERIAL UNIQUE');
            await query('CREATE INDEX IF NOT EXISTS idx_events_global_sequence ON events(global_sequence)');
            console.log('Migration complete.');
        }
    }

    // 3. Ensure other tables exist (surgical check)
    const otherTables = ['snapshots', 'account_summaries', 'transaction_history', 'projection_status'];
    for (const table of otherTables) {
        const res = await query(`SELECT to_regclass('public.${table}')`);
        if (!res.rows[0].to_regclass) {
            console.log(`Missing table ${table}. Ensuring existence...`);
            // We just re-run the relevant CREATE TABLE block or the whole init.sql (it has IF NOT EXISTS)
            // But now it's safe because global_sequence already exists!
            const initSqlPath = path.join(__dirname, '../../seeds/init.sql');
            const initSql = fs.readFileSync(initSqlPath, 'utf8');
            await query(initSql);
            console.log(`Table ${table} check complete.`);
            break;
        }
    }

    // 4. Final seed check
    await query("INSERT INTO projection_status (projection_name, last_processed_global_id) VALUES ('AccountSummaries', 0), ('TransactionHistory', 0) ON CONFLICT DO NOTHING");
    console.log('--- Database Surgical Sync Complete ---');
}
