#!/usr/bin/env bash
# Finding CRW-005 — IndexNow key banao aur set karo
# Chalao: bash fixes/indexnow-key.sh   (phir printed value ko server ki .env.production mein dalo)
set -euo pipefail
KEY="$(openssl rand -hex 16)"
echo "Generated INDEXNOW_KEY: ${KEY}"
echo
echo "1) Server ki /home/ubuntu/apps/xsypher/.env.production mein add karein:"
echo "   INDEXNOW_KEY=${KEY}"
echo
echo "2) (Optional) key file host karni ho to repo mein public/xsypher-key.txt banao:"
echo "   ${KEY}"
echo
echo "3) lib/google-indexing.ts:104 se fallback hatao — sirf env:"
echo '   const key = process.env.INDEXNOW_KEY; if (!key) return console.warn("[indexnow] INDEXNOW_KEY missing — skipped");'
echo
echo "NOTE: api.indexnow.org GET URL-submission key-file verify nahi karta,"
echo "lekin key unique + secret rakho taake koi aur aapke naam se spam na kare."
