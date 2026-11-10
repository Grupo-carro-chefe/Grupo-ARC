'use strict';

// Os testes do PostgreSQL só rodam com DATABASE_URL_TESTE (no CI há um Postgres de serviço).
// Sem ela, o código de src/infra/postgres não é exercitado e sairia da conta da cobertura,
// derrubando os limites; por isso só entra na cobertura quando há banco para testá-lo.
const temBanco = Boolean(process.env.DATABASE_URL_TESTE);

module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', ...(temBanco ? [] : ['!src/infra/postgres/**'])],
  coverageThreshold: {
    global: { branches: 85, functions: 100, lines: 95, statements: 95 },
  },
};
