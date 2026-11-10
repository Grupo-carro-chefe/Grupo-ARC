-- O status da necessidade tem que bater com o dinheiro arrecadado, mesmo que um bug da aplicação
-- (ou um UPDATE manual) tente gravar o contrário. ENCERRADA fica livre: pode ser encerrada com
-- qualquer valor arrecadado.
ALTER TABLE necessidades
  ADD CONSTRAINT necessidades_atendida_completa
    CHECK (status <> 'ATENDIDA' OR valor_arrecadado_centavos = valor_estimado_centavos),
  ADD CONSTRAINT necessidades_aberta_incompleta
    CHECK (status <> 'ABERTA' OR valor_arrecadado_centavos < valor_estimado_centavos);
