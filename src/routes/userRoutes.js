const express = require('express');
const router = express.Router();
const controller = require('../controller/userController');

router.post('/profile', controller.createPessoa);
router.put('/profile', controller.getAllPessoas);
router.get('/profile/:id', controller.getPessoaById);
router.put('/profile/:id', controller.updatePessoa);
router.delete('/profile/:id', controller.deletePessoa);

module.exports = router;