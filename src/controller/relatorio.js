const dbpsql = require("../database/dbpsql");

const relatorioController = {
  getDynamic: async (req, res) => {
    const { cidade, usuario, dataInicio, dataFim } = req.query;

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // --- Filtros dinâmicos ---
    if (cidade) {
      whereClauses.push(`conv_contact.location ILIKE $${paramIndex}`);
      params.push(`%${cidade}%`);
      paramIndex++;
    }

    if (usuario) {
      whereClauses.push(`conv_contact.name ILIKE $${paramIndex}`);
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

    // --- Consulta principal das mensagens ---
    const query = `
      SELECT 
        COALESCE(pc.name, pu.name) AS sender_name,
        pm.processed_message_content,
        pm.sender_type,
        pm.sender_id,
        pm.conversation_id,
        SPLIT_PART(pm.conversation_id::text, '-', 1)::int AS original_conversation_id,
        pm.created_at,
        pm.private,
        pm.message_type,
        pm.inbox_id,
        pi.name,
        pc.location AS sender_location
      FROM public.messages pm
      LEFT JOIN public.contacts pc 
        ON pc.id = pm.sender_id AND pm.sender_type = 'Contact'
      LEFT JOIN public.inboxes pi 
        ON pi.id = pm.inbox_id
      LEFT JOIN public.users pu 
        ON pu.id = pm.sender_id AND pm.sender_type = 'User'
      WHERE pm.conversation_id IN (
        SELECT DISTINCT pm2.conversation_id
        FROM public.messages pm2
        JOIN public.conversations conv ON conv.id = pm2.conversation_id
        JOIN public.contacts conv_contact ON conv_contact.id = conv.contact_id
        ${innerWhereSQL}
      )
      ORDER BY pm.conversation_id, pm.created_at;
    `;

    try {
      // --- Busca todas as mensagens ---
      const messagesResult = await dbpsql.query(query, params);
      const messages = messagesResult.rows;

      if (messages.length === 0) {
        return res.status(200).json([]);
      }

      // Extrai todos os conversation_ids originais (sem -0, -1 etc.)
      const originalConversationIds = [
        ...new Set(messages.map(m => m.original_conversation_id))
      ];

      // --- Busca os contatos das conversas ---
      const convQuery = `
        SELECT 
          c.id AS conversation_id, 
          ct.id AS contact_id,
          ct.name AS contact_name, 
          ct.location AS cidade
        FROM public.conversations c
        JOIN public.contacts ct ON c.contact_id = ct.id
        WHERE c.id = ANY($1::int[])
      `;
      const convResult = await dbpsql.query(convQuery, [originalConversationIds]);

      // Mapeia dados das conversas
      const convDataMap = new Map();
      convResult.rows.forEach(row => {
        convDataMap.set(row.conversation_id, {
          contact_id: row.contact_id,
          contact_name: row.contact_name,
          cidade: row.cidade
        });
      });

      // --- Enriquecimento das mensagens ---
      const enrichedMessages = messages.map(msg => {
        const convData = convDataMap.get(msg.original_conversation_id);
        return {
          ...msg,
          contact_id: convData?.contact_id || null,
          contact_name: convData?.contact_name || "N/A",
          cidade: convData?.cidade || msg.sender_location || "N/A"
        };
      });

      res.status(200).json(enrichedMessages);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios" });
    }
  },
};

module.exports = relatorioController;
