const bcrypt = require('bcrypt');
const db = require('../database/db');

async function createPessoa(req, res) {
  const {
    email,
    user_type,
    name,
    senha

  } = req.body;

  if (!email || !name || !senha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
    
        const [result] = await db.query(
        'INSERT INTO user (email, user_type, name, senha) VALUES (?, ?, ?, ?)',
        [ email, user_type, name, senhaHash]
        );
    
        res.status(201).json({ id: result.insertId, email, user_type, name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }

}

async function getAllPessoas(req, res) {
  try {
    const [rows] = await db.query('SELECT id, email, user_type, name FROM user');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
}

async function getPessoaById(req, res) {
  const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT id,  email, user_type, name FROM user WHERE id = ?', [id]);
        if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
}

async function updatePessoa(req, res) {
  const { id } = req.params;
  const {  email, user_type, name, senha } = req.body;
    if (!email || !name) {
        return res.status(400).json({ error: ' email e name são obrigatórios' });
    }
    try {
        const [existingRows] = await db.query('SELECT * FROM user WHERE id = ?', [id]);
        if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        let senhaHash = existingRows[0].senha;
        if (senha) {
            senhaHash = await bcrypt.hash(senha, 10);
        }

        await db.query(
        'UPDATE user SET email = ?, user_type = ?, name = ?, senha = ? WHERE id = ?',
        [ email, user_type, name, senhaHash, id]
        );

        res.json({ id,  email, user_type, name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
}

async function deletePessoa(req, res) {
  const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM user WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json({ message: 'Usuário deletado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
}   

module.exports = {createPessoa, getAllPessoas, getPessoaById, updatePessoa, deletePessoa};
