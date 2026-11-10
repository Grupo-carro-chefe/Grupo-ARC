'use strict';

const path = require('path');
const { criarApp } = require('./api/app');

const porta = Number(process.env.PORT) || 3000;
const app = criarApp({
  // Os dados ficam em memória: os exemplos garantem que a demonstração nunca comece vazia.
  dadosExemplo: process.env.DADOS_EXEMPLO !== 'false',
  pastaPublica: path.join(__dirname, '..', 'public'),
});

// No Express 5 o callback do listen também recebe o erro de inicialização (ex.: porta em uso).
app.listen(porta, (erro) => {
  if (erro) {
    console.error(`Não foi possível iniciar a API na porta ${porta}: ${erro.message}`);
    process.exit(1);
  }
  console.log(`DoaGol ouvindo na porta ${porta}.`);
});
