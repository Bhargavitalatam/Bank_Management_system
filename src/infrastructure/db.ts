// src/infrastructure/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function getConnectionString(): string {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    const database = process.env.DB_NAME || 'postgres';

    return `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const pool = new Pool({
    connectionString: getConnectionString(),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
