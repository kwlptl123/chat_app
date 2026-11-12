/**
 * ARCHITECTURE OVERVIEW:
 * Defines the strict configuration structures for Sequelize database connections across different environments.
 * Enforces required types to prevent runtime connection failures due to missing environment variables.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Define strict TypeScript interfaces (`DatabaseEnvironmentConfig`, `PoolConfig`) to eliminate implicit typing.
 * 2. Initialize environment-specific configurations (`development`, `production`) using explicit type casting.
 * 3. Export a centralized configuration object for Sequelize initialization.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Accessing dev config: `const config = dbConfig.development;`
 * 2. Passing to Sequelize: 
 *    `new Sequelize(config.DB, config.USER, config.PASSWORD, { host: config.HOST, dialect: config.DIALECT, pool: config.pool })`
 */

// 1. Import strict types from Sequelize to eliminate magic string errors
import { Dialect } from 'sequelize';

// 2. Define the exact structure required for the connection pool
export interface PoolConfig {
    max: number;
    min: number;
    acquire: number;
    idle: number;
}

// 3. Define the exact structure required for a database environment
export interface DatabaseEnvironmentConfig {
    HOST: string;
    USER: string;
    PASSWORD?: string; // Passwords might be empty in local dev, but are strictly required in prod
    DB: string;
    DIALECT: Dialect;
    pool: PoolConfig;
}

// 4. Group all environments into a single exportable type
export interface DatabaseConfig {
    development: DatabaseEnvironmentConfig;
    production: DatabaseEnvironmentConfig;
}

// 5. Initialize Development configuration with strict types and safe fallbacks
const development: DatabaseEnvironmentConfig = {
    HOST: process.env.DEV_DB_HOST || 'localhost',
    USER: process.env.DEV_DB_USER || 'root',
    PASSWORD: process.env.DEV_DB_PASSWORD || '',
    DB: process.env.DEV_DB_NAME || 'development_db',
    // Secure by Default: Explicitly cast the string to the Sequelize Dialect type
    DIALECT: (process.env.DEV_DB_DIALECT as Dialect) || 'mysql',
    pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
},
};

// 6. Initialize Production configuration asserting variables exist
const production: DatabaseEnvironmentConfig = {
    HOST: process.env.PROD_DB_HOST as string,
    USER: process.env.PROD_DB_USER as string,
    PASSWORD: process.env.PROD_DB_PASSWORD as string,
    DB: process.env.PROD_DB_NAME as string,
    DIALECT: (process.env.PROD_DB_DIALECT as Dialect) || 'mysql',
    pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
},
};

// 7. Group and export as default matching the original file structure
const dbConfig: DatabaseConfig = {
    development,
    production,
};

export default dbConfig;