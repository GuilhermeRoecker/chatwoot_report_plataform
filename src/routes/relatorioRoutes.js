const express = require('express');
const router = express.Router();
const relatorioController = require('../controller/relatorio');

router.get("/relatorio", relatorioController.getDynamic);

module.exports = router;