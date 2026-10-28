#!/usr/bin/env bash
# Roda um comando e, se ele falhar, publica o final da saída como anotação de
# erro no GitHub. Assim a causa aparece direto no resumo do PR, sem abrir o log.
#
# Uso: .github/scripts/run.sh "Testes unitários" npm test
set -uo pipefail

title="$1"
shift
log="$(mktemp)"

"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  message="$(tail -c 6000 "$log" | sed -e 's/\x1b\[[0-9;]*m//g' -e 's/%/%25/g' -e 's/\r/%0D/g' | sed ':a;N;$!ba;s/\n/%0A/g')"
  echo "::error title=${title}::${message}"
fi

exit "$status"
