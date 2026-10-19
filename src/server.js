'use strict';

const { criarApp } = require('./api/app');

const porta = Number(process.env.PORT) || 3000;
// No Express 5 o callback do listen também recebe o erro de inicialização (ex.: porta em uso).
criarApp().listen(porta, (erro) => {
  if (erro) {
    console.error(`Não foi possível iniciar a API na porta ${porta}: ${erro.message}`);
    process.exit(1);
  }
  console.log(`DoaGol API ouvindo na porta ${porta}.`);
});
