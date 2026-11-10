'use strict';

const path = require('path');
const { criarApp } = require('./api/app');

const porta = Number(process.env.PORT) || 3000;
// Os exemplos garantem que a demonstração nunca comece vazia.
const dadosExemplo = process.env.DADOS_EXEMPLO !== 'false';

async function iniciar() {
  const opcoes = { pastaPublica: path.join(__dirname, '..', 'public') };
  let pool = null;

  if (process.env.DATABASE_URL) {
    // Com banco: aplica as migrations e só semeia os exemplos se ele estiver vazio.
    // Nunca imprima a DATABASE_URL (tem a senha): só o que aconteceu.
    const { iniciarPostgres } = require('./infra/postgres');
    const pg = await iniciarPostgres(process.env.DATABASE_URL, { semear: dadosExemplo });
    pool = pg.pool;
    opcoes.repositorios = pg.repositorios;
    opcoes.bloqueio = pg.bloqueio;
    console.log(`Banco PostgreSQL conectado e migrations em dia${pg.semeou ? '; dados de exemplo carregados' : ''}.`);
  } else {
    // Sem banco: tudo em memória, e os dados somem ao reiniciar.
    opcoes.dadosExemplo = dadosExemplo;
    console.log('DATABASE_URL ausente: usando repositórios em memória.');
  }

  const app = criarApp(opcoes);

  // No Express 5 o callback do listen também recebe o erro de inicialização (ex.: porta em uso).
  const servidor = app.listen(porta, (erro) => {
    if (erro) {
      console.error(`Não foi possível iniciar a API na porta ${porta}: ${erro.message}`);
      process.exit(1);
    }
    console.log(`DoaGol ouvindo na porta ${porta}.`);
  });

  // Desligamento limpo (Render envia SIGTERM): para de aceitar conexões, espera as em curso e fecha o pool.
  const encerrar = () => {
    servidor.close(async () => {
      if (pool) await pool.end().catch(() => {});
      process.exit(0);
    });
    // Conexões keep-alive podem segurar o close; não deixa o deploy esperar para sempre.
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
}

iniciar().catch((erro) => {
  // Só a classe e o código: a mensagem de erros de conexão pode conter host e usuário.
  console.error(`Falha ao iniciar o DoaGol: ${erro.code ?? erro.name}`);
  process.exit(1);
});
