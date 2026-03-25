// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pools = {};

function getDbConnection() {
    if (!pools.main) {
        pools.main = new Pool({
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_BBDD,
            port: process.env.SQL_PORT,
            max: 151,
            idleTimeoutMillis: 30000
        });
    }

    return pools.main;
}

async function connectDb(databaseName) {
    try {
        const pool = getDbConnection(databaseName);
        const client = await pool.connect();
        client.release();

        return { success: true, code: 0, connection: pool };
    } catch (err) {
        return { success: false, code: 2, message: 'Error de conexión: ' + err.message };
    }
}

function getAgentDbConnection() {
    if (!pools.agent) {
        pools.agent = new Pool({
            host: process.env.AGENT_SQL_HOST,
            user: process.env.AGENT_SQL_USER,
            password: process.env.AGENT_SQL_PASSWORD,
            database: process.env.AGENT_SQL_BBDD,
            port: process.env.AGENT_SQL_PORT,
            max: 151,
            idleTimeoutMillis: 30000
        });
    }

    return pools.agent;
}

async function connectAgentDb() {
    try {
        const pool = getAgentDbConnection();
        const client = await pool.connect();
        client.release();

        return { success: true, code: 0, connection: pool };
    } catch (err) {
        return { success: false, code: 2, message: 'Error de conexión a la base de datos del agente: ' + err.message };
    }
}

module.exports = { 
    getDbConnection, 
    connectDb,
    getAgentDbConnection,
    connectAgentDb
};
