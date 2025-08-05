const db = require('../database/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

async function login(req, res) {
  const { email, senha } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM pessoa WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = rows[0];

    const senhaCorreta = await bcrypt.compare(senha, user.senhaHash);

    if (!senhaCorreta) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        pessoaId: user.id,
        nomeCompleto: user.nomeCompleto,
        email: user.email,
        tipoPessoa: user.tipoPessoa,
        empresaId: user.empresaId,
        cargo: user.cargo
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Envia o token via cookie HTTP only
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000, // 1 dia
      sameSite: 'lax' 
    });


    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
}

module.exports = { login };