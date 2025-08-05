const express = require('express');
const router = express.Router();
const relatorioController = require('../controller/relatorio');

router.get('/cidade/:cidade', relatorioController.getByCidade);
router.get('/usuario/:usuario', relatorioController.getByUsuario);
router.get('/data/:dataInicio/:dataFim', relatorioController.getByData);
router.get('/all/:cidade/:usuario/:dataInicio/:dataFim', relatorioController.getByAll);

module.exports = router;