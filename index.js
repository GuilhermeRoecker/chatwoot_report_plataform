const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const app = express();
require('dotenv').config()
app.use(cookieParser());
app.use(express.json());

const allowlist = ['http://localhost:3000'];
const corsOptionsDelegate = function (req, callback) {
  let corsOptions;
  if (allowlist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = {
      origin: req.header('Origin'),
      credentials: true
    };
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));
app.use(express.static(path.join(__dirname, 'public')));


const relatorioRoutes = require('./src/routes/relatorioRoutes');
app.use('/', relatorioRoutes);

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});


