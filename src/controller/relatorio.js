const dbpsql = require("../database/dbpsql");

const relatorioController = {
  getDynamic: async (req, res) => {
    const { cidade, usuario, dataInicio, dataFim } = req.query;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (cidade) {
      whereClauses.push(`pc2.location ILIKE $${paramIndex}`);
      params.push(`%${cidade}%`);
      paramIndex++;
    }

    if (usuario) {
      whereClauses.push(`pc2.name ILIKE $${paramIndex}`);
      params.push(`%${usuario}%`);
      paramIndex++;
    }

    if (dataInicio && dataFim) {
      whereClauses.push(`pm2.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(`${dataInicio} 00:00:00`);
      params.push(`${dataFim} 23:59:59`);
      paramIndex += 2;
    }

    let innerWhereSQL = "";
    if (whereClauses.length > 0) {
      innerWhereSQL = "WHERE " + whereClauses.join(" AND ");
    }

    const query = `
      SELECT COALESCE(pc.name, pu.name) AS sender_name,
             pm.processed_message_content,
             pm.sender_type,
             pm.sender_id,
             pm.conversation_id,
             pm.created_at
      FROM public.messages pm
      LEFT JOIN public.contacts pc ON pc.id = pm.sender_id AND pm.sender_type = 'Contact'
      LEFT JOIN public.users pu ON pu.id = pm.sender_id AND pm.sender_type = 'User'
      WHERE pm.conversation_id IN (
        SELECT DISTINCT pm2.conversation_id
        FROM public.messages pm2
        JOIN public.contacts pc2 ON pc2.id = pm2.sender_id
        ${innerWhereSQL}
      )
      ORDER BY pm.conversation_id, pm.created_at;
    `;

    try {
      const results = await dbpsql.query(query, params);
      res.status(200).json(results.rows);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios" });
    }
  },
};

module.exports = relatorioController;
