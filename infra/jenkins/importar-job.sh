#!/bin/bash
# Cria o job "DoaGol" num Jenkins a partir de doagol-job.xml, pela API REST.
# Uso: bash importar-job.sh http://<IP_PUBLICO>:8080
# Pede usuário e senha do Jenkins na hora; nada fica salvo.
set -euo pipefail
J="${1:?Informe a URL do Jenkins, ex.: http://1.2.3.4:8080}"
XML="$(dirname "$0")/doagol-job.xml"

read -r -p "Usuário do Jenkins: " AU
read -r -s -p "Senha: " AP; echo

LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -u "$AU:$AP" "$J/whoAmI/api/json")
if [ "$LOGIN" != "200" ]; then
  echo "Login recusado (HTTP $LOGIN). Confira usuário e senha."
  exit 1
fi

CJ=$(mktemp)
trap 'rm -f "$CJ"' EXIT
CR=$(curl -s -c "$CJ" -u "$AU:$AP" "$J/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,\":\",//crumb)")

CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$CJ" -u "$AU:$AP" -H "$CR" \
  -H "Content-Type: application/xml" --data-binary @"$XML" "$J/createItem?name=DoaGol")
case "$CODE" in
  200) echo "Job DoaGol criado em $J/job/DoaGol/" ;;
  400) echo "HTTP 400: já existe um job chamado DoaGol nesse Jenkins." ;;
  *)   echo "Falhou (HTTP $CODE)." ; exit 1 ;;
esac
