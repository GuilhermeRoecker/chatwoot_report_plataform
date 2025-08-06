const express = require('express');
const router = express.Router();
const { login } = require('../controller/authController');
const autenticarJWT = require('../middleware/authMiddleware');

router.post('/login', login);

router.get('/me', autenticarJWT, (req, res) => {
  res.json(req.usuario);
    credentials: 'include'
});

router.post('/logout', (req, res) => {
  credentials: 'include'
  res.clearCookie('token', {
    httpOnly: false,
    sameSite: 'lax',
    secure: true
  });
  res.sendStatus(200);
});

module.exports = router;