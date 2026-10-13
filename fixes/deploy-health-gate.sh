#!/usr/bin/env bash
# Finding BE-002 — deploy workflow ke `script:` block ke LAST mein yeh add karein
# (appleboy/ssh-action ke andar, docker compose up -d ke baad)
set -euo pipefail

echo "── Post-deploy health gate ──"
OK=0
for i in $(seq 1 15); do          # 15 × 4s ≈ 60s window
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/health | grep -q '"status":"ok"'; then
    OK=1; break
  fi
  sleep 4
done

if [ "$OK" != "1" ]; then
  echo "HEALTH GATE FAILED — rolling back to previous image"
  # Rollback option A: git par previous deploy commit (compose rebuild — slow)
  # git reset --hard HEAD@{1} && docker compose -f docker-compose.prod.yml build && up -d
  # Rollback option B (fast, recommended): image tags ko date ke saath rakhna shuru karo:
  #   image: xsypher-web:${DEPLOY_SHA:-latest}  → previous tag par `up -d`
  docker compose -f docker-compose.prod.yml ps
  exit 1                      # workflow red → alert aapko milta hai
fi

echo "Health gate OK (status: ok)"
# Optional: smoke checks
curl -fsS -o /dev/null https://xsypher.com/robots.txt && echo "robots.txt OK"
curl -fsS -o /dev/null https://xsypher.com/sitemap.xml && echo "sitemap OK"
