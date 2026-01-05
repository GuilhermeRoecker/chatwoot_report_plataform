const dbpsql = require("../database/dbpsql");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const archiver = require("archiver");

const relatorioController = {
  getDynamic: async (req, res) => {
    const {
      cidade,
      usuario,
      dataInicio,
      dataFim,
      naoMostrarPrivadas,
      naoMostrarSistema,
      inbox_ids,
    } = req.query;

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
      whereClauses.push(
        `pm2.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`
      );
      params.push(`${dataInicio} 00:00:00`);
      params.push(`${dataFim} 23:59:59`);
      paramIndex += 2;
    }

    if (naoMostrarPrivadas === "true") {
      whereClauses.push(`pm2.private = FALSE`);
    }

    if (naoMostrarSistema === "true") {
      whereClauses.push(
        `NOT (pm2.sender_type IS NULL AND pm2.message_type = 2)`
      );
    }

    if (inbox_ids) {
      const ids = inbox_ids.split(",").map((id) => parseInt(id.trim(), 10));
      if (ids.length > 0) {
        whereClauses.push(`pm2.inbox_id = ANY($${paramIndex}::int[])`);
        params.push(ids);
        paramIndex++;
      }
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
        JOIN public.inboxes pi ON pi.id = pm2.inbox_id
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
        ...new Set(messages.map((m) => m.original_conversation_id)),
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
      const convResult = await dbpsql.query(convQuery, [
        originalConversationIds,
      ]);

      // Mapeia dados das conversas
      const convDataMap = new Map();
      convResult.rows.forEach((row) => {
        convDataMap.set(row.conversation_id, {
          contact_id: row.contact_id,
          contact_name: row.contact_name,
          cidade: row.cidade,
        });
      });

      // --- Enriquecimento das mensagens ---
      const enrichedMessages = messages.map((msg) => {
        const convData = convDataMap.get(msg.original_conversation_id);
        return {
          ...msg,
          contact_id: convData?.contact_id || null,
          contact_name: convData?.contact_name || "N/A",
          cidade: convData?.cidade || msg.sender_location || "N/A",
        };
      });

      res.status(200).json(enrichedMessages);
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios" });
    }
  },
  getInboxes: async (req, res) => {
    try {
      const result = await dbpsql.query(
        "SELECT id, name FROM public.inboxes ORDER BY name"
      );
      res.status(200).json(result.rows);
    } catch (error) {
      console.error("Erro ao buscar inboxes:", error);
      res.status(500).json({ error: "Erro ao buscar inboxes" });
    }
  },
  gerarPDF: async (req, res) => {
    const { htmlContent, conversationId, solicitante, data, location } =
      req.body;

    if (!htmlContent || !conversationId || !solicitante || !data) {
      return res
        .status(400)
        .json({ error: "Dados insuficientes para gerar o PDF." });
    }

    let browser;

    try {
      const date = new Date(data);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      const contactLocation = location || "Indefinido";

      // Tenta extrair UF e Cidade (assume formato "Cidade - UF" ou "Cidade, UF")
      let uf = "Geral";
      let cidade =
        contactLocation !== "Indefinido" ? contactLocation : "SemCidade";
      const ufMatch = contactLocation.match(/[-\s,]+([A-Z]{2})$/); // Procura por 2 letras maiúsculas no final
      if (ufMatch) {
        uf = ufMatch[1];
        cidade = contactLocation.substring(0, ufMatch.index).trim();
      }
      cidade = cidade.replace(/[\\/]/g, "-"); // Sanitize city name

      // Cria estrutura de pastas: conversas/UF/CIDADE/ANO/MES/DIA
      const dirPath = path.join(
        __dirname,
        "..",
        "..",
        "conversas",
        uf,
        cidade,
        String(year),
        month,
        day
      );
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const fileName = `${conversationId} - ${solicitante} - ${day}-${month}-${year}.pdf`;
      const filePath = path.join(dirPath, fileName);

      browser = await puppeteer.launch({
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
        headless: "new",
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      await page.pdf({ path: filePath, format: "A4", timeout: 60000 }); // 60s timeout

      res.status(200).json({ message: "PDF gerado com sucesso!", filePath });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      res.status(500).json({ error: "Erro ao gerar PDF" });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
 exportarConversas: async (req, res) => {
  const {
    cidade,
    usuario,
    dataInicio,
    dataFim,
    naoMostrarPrivadas,
    naoMostrarSistema,
    inbox_ids,
  } = req.query;

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
    whereClauses.push(
      `pm2.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`
    );
    params.push(`${dataInicio} 00:00:00`);
    params.push(`${dataFim} 23:59:59`);
    paramIndex += 2;
  }

  if (naoMostrarPrivadas === "true") {
    whereClauses.push(`pm2.private = FALSE`);
  }

  if (naoMostrarSistema === "true") {
    whereClauses.push(
      `NOT (pm2.sender_type IS NULL AND pm2.message_type = 2)`
    );
  }

  if (inbox_ids) {
    const ids = inbox_ids.split(",").map((id) => parseInt(id.trim(), 10));
    if (ids.length > 0) {
      whereClauses.push(`pm2.inbox_id = ANY($${paramIndex}::int[])`);
      params.push(ids);
      paramIndex++;
    }
  }

  let innerWhereSQL = "";
  if (whereClauses.length > 0) {
    innerWhereSQL = "WHERE " + whereClauses.join(" AND ");
  }

  const query = `
    SELECT 
      COALESCE(pc.name, pu.name) AS sender_name,
      pm.processed_message_content,
      pm.created_at,
      SPLIT_PART(pm.conversation_id::text, '-', 1)::int AS original_conversation_id,
      conv_contact.name AS contact_name,
      conv_contact.location AS contact_location,
      pm.private,
      pm.sender_type
    FROM public.messages pm
    LEFT JOIN public.contacts pc ON pc.id = pm.sender_id AND pm.sender_type = 'Contact'
    LEFT JOIN public.users pu ON pu.id = pm.sender_id AND pm.sender_type = 'User'
    JOIN public.conversations conv ON conv.id = SPLIT_PART(pm.conversation_id::text, '-', 1)::int
    JOIN public.contacts conv_contact ON conv_contact.id = conv.contact_id
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
    const result = await dbpsql.query(query, params);
    const messages = result.rows;

    if (messages.length === 0) {
      return res.status(404).json({ message: "Nenhuma conversa encontrada." });
    }

    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="conversas_exportadas.zip"',
    });

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Erro no zip:", err);
      if (!res.headersSent) res.status(500).end();
    });

    archive.pipe(res);

    // agrupa
    const conversations = {};
    messages.forEach((msg) => {
      if (!conversations[msg.original_conversation_id])
        conversations[msg.original_conversation_id] = [];
      conversations[msg.original_conversation_id].push(msg);
    });

    // 🚀 UM ÚNICO BROWSER (solução definitiva)
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const total = Object.keys(conversations).length;
    let count = 0;

    try {
      for (const [id, msgs] of Object.entries(conversations)) {
        count++;
        console.log(`Gerando PDF ${count}/${total} para conversa ${id}`);

        const contactName = msgs[0].contact_name;
        const contactLocation = msgs[0].contact_location || "Indefinido";

        const date = new Date(msgs[0].created_at);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        // UF e cidade
        let uf = "Geral";
        let cidade = contactLocation;
        const ufMatch = contactLocation.match(/[-\s,]+([A-Z]{2})$/);
        if (ufMatch) {
          uf = ufMatch[1];
          cidade = contactLocation.substring(0, ufMatch.index).trim();
        }
        cidade = cidade.replace(/[\\/]/g, "-");

        const fileName = `${id} - ${contactName} - ${day}-${month}-${year}.pdf`;

        // MONTA HTML
        let htmlContent = `
          <!DOCTYPE html>
          <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: sans-serif;">
              <h2>${day}/${month}/${year} - ${contactName}</h2>
              <hr>
        `;

        for (const m of msgs) {
          const tipo =
            m.sender_type === "Contact"
              ? "Cliente"
              : m.sender_type === "User"
              ? "Atendente"
              : "Sistema";

          htmlContent += `
            <p><strong>${m.sender_name} (${tipo}):</strong><br>
            ${m.processed_message_content}<br>
            <small>${new Date(m.created_at).toLocaleString("pt-BR")}</small></p>
          `;
        }

        htmlContent += `</body></html>`;

        // GERA PDF
        const page = await browser.newPage();
        try {
          await page.setContent(htmlContent, {
            waitUntil: "networkidle0",
          });

          // Garante que o corpo foi renderizado
          await page.waitForSelector('body');

          const pdfUint8Array = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
          });

          const pdfBuffer = Buffer.from(pdfUint8Array);

          if (pdfBuffer.length > 100) {
            archive.append(pdfBuffer, {
              name: `${uf}/${cidade}/${year}/${month}/${day}/${fileName}`,
            });
          } else {
            console.log(`PDF inválido (tamanho: ${pdfBuffer.length}), pulando`, id);
          }
        } catch (pageError) {
          console.error(`Erro ao gerar PDF da conversa ${id}:`, pageError);
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
    await archive.finalize();
  } catch (err) {
    console.error("Erro exportando:", err);
    if (!res.headersSent)
      res.status(500).json({ error: "Erro ao exportar conversas" });
  }
},
};

module.exports = relatorioController;
