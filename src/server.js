'use strict';

const { criarApp } = require('./api/app');

const porta = Number(process.env.PORT) || 3000;
criarApp().listen(porta, () => {
  console.log(`DoaGol API ouvindo na porta ${porta}.`);
});
