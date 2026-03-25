const { getAgentDbConnection } = require('../config/CON_DBConnection');

async function deleteAgentMemorybySessionId(sessionId) {
    const pool = getAgentDbConnection();

    const query = `
        DELETE FROM agent_memory WHERE session_id = $1
    `;

    try {
        await pool.query(query, [sessionId]);
        return { success: true };
    } catch (error) {
        console.error('deleteAgentMemorybySessionId (' + sessionId + '):', error);
        return { success: false, error: error.message };
    }
}


async function deleteAgentMemory() {
    const pool = getAgentDbConnection();

    const query = `
        DELETE FROM agent_memory agmem
        WHERE agmem.session_id IN (
            SELECT session_id FROM agent_memory
            GROUP BY session_id
            HAVING MAX(created_at) < NOW() - INTERVAL '15 minutes'
        );
    `

    try {
        await pool.query(query);
        return { success: true };
    } catch (error) {
        console.error('deleteAgentMemory:', error);
        return { success: false, error: error.message };
    }
}


module.exports = {
    deleteAgentMemorybySessionId,
    deleteAgentMemory
};