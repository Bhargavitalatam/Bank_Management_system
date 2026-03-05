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

    // Always ensure projection_status rows exist
    await query("INSERT INTO projection_status (projection_name, last_processed_global_id) VALUES ('AccountSummaries', 0), ('TransactionHistory', 0) ON CONFLICT DO NOTHING");
    console.log('Database initialization check complete.');
}
