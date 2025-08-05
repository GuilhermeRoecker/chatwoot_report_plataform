const dbpsql = require("../database/dbpsql");

const relatorioController = {
  getByCidade: async (req, res) => {
    const { cidade } = req.params;
    try {
      const results = await dbpsql.query(
        "SELECT pm.content,  pm.sender_type, pm.sender_id, pm.conversation_id, pm.created_at FROM public.messages pm WHERE pm.conversation_id IN (SELECT DISTINCT pm2.conversation_id FROM public.messages pm2 JOIN public.contacts pc2 ON pc2.id = pm2.sender_id WHERE pc2.location ILIKE $1) ORDER BY pm.conversation_id, pm.created_at;",
        [`%${cidade}%`]
      );
      res.status(200).json(results.rows);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios" });
    }
  },

  getByUsuario: async (req, res) => {
    const { usuario } = req.params;
    try {
      const results = await dbpsql.query(
        "SELECT pm.content,  pm.sender_type, pm.sender_id, pm.conversation_id, pm.created_at FROM public.messages pm WHERE pm.conversation_id IN (SELECT DISTINCT pm2.conversation_id FROM public.messages pm2 JOIN public.contacts pc2 ON pc2.id = pm2.sender_id WHERE pc2.name ILIKE $1) ORDER BY pm.conversation_id, pm.created_at;",
        [`%${usuario}%`]
      );
      res.status(200).json(results.rows);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios" });
    }
  },

  getByData: async (req, res) => {
    let { dataInicio, dataFim } = req.params;

    dataInicio = `${dataInicio} 00:00:00`;
    dataFim = `${dataFim} 23:59:59`;

    const query = `SELECT pm.content, pm.sender_type, pm.sender_id, pm.conversation_id, pm.created_at FROM public.messages pm WHERE pm.created_at BETWEEN $1 AND $2 ORDER BY pm.conversation_id, pm.created_at;`;
    try {
      const results = await dbpsql.query(query, [dataInicio, dataFim]);
      res.status(200).json(results.rows);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios" });
    }
  },

  getByAll: async (req, res) => {
    const { cidade, usuario} = req.params;
    let {dataInicio, dataFim } = req.params;

    dataInicio = `${dataInicio} 00:00:00`;
    dataFim = `${dataFim} 23:59:59`;

    try {
      const results = await dbpsql.query(
        "SELECT pm.content,  pm.sender_type, pm.sender_id, pm.conversation_id, pm.created_at FROM public.messages pm WHERE pm.conversation_id IN (SELECT DISTINCT pm2.conversation_id FROM public.messages pm2 JOIN public.contacts pc2 ON pc2.id = pm2.sender_id WHERE pc2.location ILIKE $1 AND pc2.name ILIKE $2) AND pm.created_at BETWEEN $3 AND $4 ORDER BY pm.conversation_id, pm.created_at;",
        [`%${cidade}%`, `%${usuario}%`, dataInicio, dataFim]
      );
      res.status(200).json(results.rows);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios" });
    }
  },
};

module.exports = relatorioController;