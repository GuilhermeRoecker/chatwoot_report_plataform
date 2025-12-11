const express = require('express');
const router = express.Router();
const relatorioController = require('../controller/relatorio');

router.get("/relatorio", relatorioController.getDynamic);
router.get("/inboxes", relatorioController.getInboxes);
router.post("/relatorio/pdf", relatorioController.gerarPDF);
router.get('/relatorio/exportar', relatorioController.exportarConversas);

module.exports = router;