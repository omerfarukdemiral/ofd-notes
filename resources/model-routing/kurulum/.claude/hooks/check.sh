#!/bin/bash
# her Edit ve Write'tan sonra çalışır. hata varsa exit 2, stderr Claude'a gider.
# kendi projene göre komutları değiştir. hızlı tut, burası her düzenlemede koşuyor.
out=$( { npx tsc --noEmit && npm test --silent; } 2>&1 )
if [ $? -ne 0 ]; then
  echo "$out" | tail -40 >&2
  exit 2
fi
exit 0
