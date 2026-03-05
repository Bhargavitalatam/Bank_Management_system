import { query } from './db';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase() {
    console.log('Initializing database schema...');

    // Check if events table exists
    const checkRes = await query("SELECT to_regclass('public.events')");
    if (checkRes.rows[0].to_regclass) {
        console.log('Database already initialized.');
        return;
    }

    const initSqlPath = path.join(__dirname, '../../seeds/init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    try {
        await query(initSql);
        console.log('Database schema created successfully.');

        // Ensure projection_status is also set up for new DBs
        await query("INSERT INTO projection_status (projection_name, last_processed_global_id) VALUES ('AccountSummaries', 0), ('TransactionHistory', 0) ON CONFLICT DO NOTHING");
        console.log('Projection status tracking initialized.');
    } catch (e) {
        console.error('Error initializing database:', e);
        throw e;
    }
}
