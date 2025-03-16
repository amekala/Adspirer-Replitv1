import { Pool } from '@neondatabase/serverless';
export declare const pool: Pool;
export declare const db: import("drizzle-orm/neon-serverless").NeonDatabase<any> & {
    $client: Pool;
};
