#!/usr/bin/env bash
# Monta a entrega do TG3: entrega/GrupoARC.zip.
# Uso: ./scripts/gerar-entrega.sh /caminho/do/video.mp4
# Sem o caminho do vídeo, o script avisa e não gera o zip final.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

VIDEO="${1:-}"
SAIDA="entrega"
STAGE="$SAIDA/GrupoARC"

if [ -z "$VIDEO" ]; then
  echo "AVISO: falta o vídeo. Rode: ./scripts/gerar-entrega.sh /caminho/video.mp4" >&2
  echo "O zip final não foi gerado." >&2
  exit 1
fi
if [ ! -f "$VIDEO" ]; then
  echo "ERRO: vídeo não encontrado: $VIDEO" >&2
  exit 1
fi
if [ ! -f docs/tg3/Telas-DoaGol.docx ]; then
  echo "ERRO: falta docs/tg3/Telas-DoaGol.docx" >&2
  exit 1
fi

rm -rf "$SAIDA"
mkdir -p "$STAGE"

echo "1/5 Zip do repositório (git archive do HEAD)"
git archive --format=zip -o "$STAGE/Grupo-ARC-repositorio.zip" HEAD
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "    AVISO: há alterações não commitadas; o zip contém só o que está no HEAD." >&2
fi

echo "2/5 Telas (.docx)"
cp docs/tg3/Telas-DoaGol.docx "$STAGE/"

echo "3/5 Vídeo"
cp "$VIDEO" "$STAGE/"

echo "4/5 Documentação (.docx e .pdf de docs/documentacao/)"
achou=0
for f in docs/documentacao/*.docx docs/documentacao/*.pdf; do
  [ -f "$f" ] || continue
  cp "$f" "$STAGE/"
  echo "    copiado: $f"
  achou=1
done
if [ "$achou" -eq 0 ]; then
  echo "    AVISO: nenhum .docx ou .pdf em docs/documentacao/." >&2
fi

echo "5/5 GrupoARC.zip"
( cd "$STAGE" && zip -q -r ../GrupoARC.zip . )
rm -rf "$STAGE"
unzip -l "$SAIDA/GrupoARC.zip"
echo "Pronto: $SAIDA/GrupoARC.zip"
