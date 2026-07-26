# DEPLOY.md — Deployment Guide CareerCompass

> Dokumen ini berisi panduan lengkap deploy CareerCompass ke VPS Debian/Ubuntu
> dengan **Caddy** sebagai reverse proxy + SSL, **systemd** untuk manajemen service,
> dan **Redis** sebagai broker Celery.

---

## 1. Prasyarat

| Komponen | Versi Minimal | Cek |
|---|---|---|
| Ubuntu/Debian | 22.04+ | `cat /etc/os-release` |
| Caddy | v2.x | `caddy version` |
| Redis | 6.x+ | `redis-server --version` |
| Python | 3.11+ | `python3 --version` |
| Node.js | 20+ | `node --version` |
| PNPM | 9+ | `pnpm --version` |
| UV | 0.5+ | `uv --version` |

Domain harus sudah diarahkan (A record) ke IP VPS.

---

## 2. Struktur Direktori

```
/home/ubuntu/career-compass/
├── .env                      # Environment variables (jangan di-commit)
├── apps/
│   ├── agent-api/            # Backend FastAPI
│   │   ├── app/
│   │   ├── alembic/
│   │   ├── data/chroma_db/   # Vector database
│   │   └── pyproject.toml
│   └── agent-frontend/       # Frontend React
│       ├── src/
│       └── dist/             # Hasil build (di-serve Caddy)
├── data/
│   ├── raw_jobs.csv
│   └── learning_resources.json
└── DEPLOY.md                 # Dokumen ini
```

---

## 3. Environment Variables

Semua konfigurasi di `career-compass/.env`. Contoh isi:

```bash
DATABASE_URL=sqlite+aiosqlite:///./data/career_compass.db
CORS_ORIGINS=*
CHROMA_DB_PATH=./data/chroma_db
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
EMBEDDING_API_KEY=sk-xxx
EMBEDDING_BASE_URL=
EMBEDDING_MODEL=text-embedding-3-small
MISTRAL_API_KEY=xxx
TAVILY_API_KEY=tvly-xxx
REDIS_URL=redis://localhost:6379/0
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_HOST=https://cloud.langfuse.com
```

---

## 4. Build Frontend

```bash
cd /home/ubuntu/career-compass/apps/agent-frontend
VITE_API_URL=https://domain-anda.com/api/v1 pnpm build
# Hasil: dist/ → frontend siap serve
```

---

## 5. Caddy Configuration

File: `/etc/caddy/Caddyfile`

```caddy
domain-anda.com {
    # Frontend static files
    root * /home/ubuntu/career-compass/apps/agent-frontend/dist
    file_server

    # API reverse proxy
    handle_path /api/v1/* {
        reverse_proxy localhost:8000 {
            header_up Host {host}
        }
    }

    # SSE streaming (NO buffering)
    handle_path /api/v1/workflow/*/stream {
        reverse_proxy localhost:8000 {
            header_up Host {host}
            flush_interval -1
        }
    }
}
```

Reload: `sudo systemctl reload caddy`

---

## 6. Systemd Services

### 6.1 Backend API — `/etc/systemd/system/career-compass-api.service`

```ini
[Unit]
Description=CareerCompass FastAPI Backend
After=network.target redis-server.service
Wants=redis-server.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/career-compass/apps/agent-api
EnvironmentFile=/home/ubuntu/career-compass/.env
ExecStart=/home/ubuntu/.local/bin/uv run uvicorn app.api.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 2 \
    --log-level info
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 6.2 Celery Worker — `/etc/systemd/system/career-compass-worker.service`

```ini
[Unit]
Description=CareerCompass Celery Worker
After=network.target redis-server.service career-compass-api.service
Wants=redis-server.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/career-compass/apps/agent-api
EnvironmentFile=/home/ubuntu/career-compass/.env
ExecStart=/home/ubuntu/.local/bin/uv run celery -A app.core.celery_app worker \
    --loglevel=info \
    --concurrency=2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Enable & Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now career-compass-api.service
sudo systemctl enable --now career-compass-worker.service
sudo systemctl reload caddy
```

### Service Management

```bash
# Cek status
sudo systemctl status career-compass-api.service
sudo systemctl status career-compass-worker.service

# Logs
sudo journalctl -u career-compass-api.service -f
sudo journalctl -u career-compass-worker.service -f

# Restart
sudo systemctl restart career-compass-api.service
sudo systemctl restart career-compass-worker.service
```

---

## 7. Inisialisasi Data (Pertama Kali)

```bash
cd /home/ubuntu/career-compass/apps/agent-api

# 1. Jalankan migration database
uv run alembic upgrade head

# 2. Ingest data ke ChromaDB (120 jobs + 40 learning resources)
EMBEDDING_MODEL=gemini-embedding-001 uv run python3 -c "
from app.services.ingest import ingest_jobs, ingest_learning_resources
print(ingest_jobs('../../data/raw_jobs.csv', recreate=True))
print(ingest_learning_resources('../../data/learning_resources.json', recreate=True))
"

# 3. (Opsional) Seed demo profiles
uv run python3 ../../scripts/seed_db.py
```

---

## 8. Verifikasi

```bash
# Health check API
curl https://domain-anda.com/api/v1/health
# → {"status": "ok"}

# Cek frontend
curl -I https://domain-anda.com/
# → 200 OK, Content-Type: text/html

# Test workflow submit
curl -X POST https://domain-anda.com/api/v1/workflow/submit \
  -H 'Content-Type: application/json' \
  -d '{"initial_state":{"user_input_form":{"full_name":"Test","hard_skills":["Python"],"target_roles":["Data Analyst"]}}}'
# → {"job_id": "...", "status": "queued"}
```

---

## 9. Redeploy (Setelah Ada Perubahan)

Urutan cepat jika ada perubahan kode:

### 9.1 Perubahan Backend (Python)
```bash
cd /home/ubuntu/career-compass

# 1. Git pull perubahan
git pull

# 2. Update dependencies (jika ada pyproject.toml berubah)
cd apps/agent-api && uv sync

# 3. Migration database (jika ada model baru)
uv run alembic upgrade head

# 4. Restart service
sudo systemctl restart career-compass-api.service
sudo systemctl restart career-compass-worker.service
```

### 9.2 Perubahan Frontend (React)
```bash
cd /home/ubuntu/career-compass/apps/agent-frontend

# 1. Git pull
git pull

# 2. Install dependencies baru (jika ada)
pnpm install

# 3. Build ulang dengan VITE_API_URL yang sesuai
VITE_API_URL=https://1996coop.ahf.web.id/api/v1 pnpm build

# 4. Copy ke direktori public Caddy
sudo cp -r dist/* /var/www/career-compass/
sudo chown -R caddy:caddy /var/www/career-compass/
```

### 9.3 Perubahan Caddy Config
```bash
sudo systemctl reload caddy
# atau restart penuh:
sudo systemctl restart caddy
```

### 9.4 Perubahan Environment (.env)
```bash
# Edit file .env
nano /home/ubuntu/career-compass/.env

# Restart semua service yang pakai env tersebut
sudo systemctl restart career-compass-api.service
sudo systemctl restart career-compass-worker.service
```

### 9.5 Re-ingest Data ke ChromaDB (Reset Data Pasar)
```bash
cd /home/ubuntu/career-compass/apps/agent-api
EMBEDDING_MODEL=gemini-embedding-001 uv run python3 -c "
from app.services.ingest import ingest_jobs, ingest_learning_resources
print(ingest_jobs('../../data/raw_jobs.csv', recreate=True))
print(ingest_learning_resources('../../data/learning_resources.json', recreate=True))
"
```

### 9.6 Redeploy Full (Semua Layer)
```bash
cd /home/ubuntu/career-compass
git pull

# Backend
cd apps/agent-api && uv sync && uv run alembic upgrade head

# Frontend
cd ../agent-frontend && pnpm install && VITE_API_URL=https://1996coop.ahf.web.id/api/v1 pnpm build
sudo cp -r dist/* /var/www/career-compass/ && sudo chown -R caddy:caddy /var/www/career-compass/

# Restart services
sudo systemctl daemon-reload
sudo systemctl restart career-compass-api.service
sudo systemctl restart career-compass-worker.service
sudo systemctl restart caddy
```

---

## 10. Debugging

### 10.1 Cek Log Semua Service Sekaligus
```bash
# Ikuti log semua service terkait dalam satu terminal
sudo journalctl -u career-compass-api.service -u career-compass-worker.service -u caddy -f --no-hostname
```

### 10.2 Debug Backend (Python)

**Cek apakah backend merespon langsung (lewati Caddy):**
```bash
curl -s http://127.0.0.1:8000/api/v1/health
curl -s http://127.0.0.1:8000/api/v1/workflow/submit \
  -X POST -H 'Content-Type: application/json' \
  -d '{"initial_state":{"user_input_form":{"full_name":"Test","hard_skills":["Python"],"target_roles":["Data Analyst"]}}}'
```

**Cek log error detail FastAPI:**
```bash
sudo journalctl -u career-compass-api.service --no-pager -n 100 | grep -i "error\|traceback\|exception"
```

**Cek Celery worker log:**
```bash
sudo journalctl -u career-compass-worker.service --no-pager -n 100
```

**Cek apakah task terdaftar di Celery:**
```bash
cd /home/ubuntu/career-compass/apps/agent-api
uv run celery -A app.core.celery_app inspect registered
```

### 10.3 Debug Caddy

**Cek config yang sedang berjalan:**
```bash
# Lihat config aktif (via admin API)
curl -s http://localhost:2019/config/ | python3 -m json.tool | head -50

# Test konfigurasi tanpa reload
caddy validate --config /etc/caddy/Caddyfile
```

**Cek request log real-time:**
```bash
sudo journalctl -u caddy -f | grep -v "health"
```

**Cek sertifikat SSL:**
```bash
sudo caddy cert-info 2>&1
# atau manual:
openssl s_client -connect 1996coop.ahf.web.id:443 -servername 1996coop.ahf.web.id </dev/null 2>/dev/null | openssl x509 -text | grep "Not After\|Subject:"
```

**Cek apakah port 443 & 80 terbuka:**
```bash
ss -tlnp | grep -E ":(80|443)\b"
```

### 10.4 Debug Frontend

**Cek apakah file statis tersedia:**
```bash
curl -sI https://1996coop.ahf.web.id/ | head -10
curl -s https://1996coop.ahf.web.id/ | head -5  # lihat HTML title
```

**Cek path dan permission:**
```bash
ls -la /var/www/career-compass/
sudo -u caddy cat /var/www/career-compass/index.html | head -5
```

**Cek apakah frontend memanggil API yang benar:**
```bash
# Lihat URL yang dipanggil oleh JS bundle
grep -o 'https://[^"]*' /var/www/career-compass/assets/index-*.js | head -5
```

### 10.5 Debug Redis

```bash
# Cek koneksi
redis-cli ping

# Cek pubsub channel
redis-cli PUBSUB CHANNELS "workflow:*"

# Flush semua (HATI-HATI: hanya untuk dev)
# redis-cli FLUSHALL
```

### 10.6 Debug ChromaDB

```bash
cd /home/ubuntu/career-compass/apps/agent-api
uv run python3 -c "
import chromadb
client = chromadb.PersistentClient(path='./data/chroma_db')
for c in client.list_collections():
    print(f'{c.name}: {c.count()} dokumen')
"
```

### 10.7 Debug Network End-to-End

```bash
# Test DNS
dig +short 1996coop.ahf.web.id

# Test koneksi penuh
curl -vI https://1996coop.ahf.web.id/ 2>&1 | grep -E "TLS|HTTP/|SSL"

# Test API chain lengkap
curl -s https://1996coop.ahf.web.id/api/v1/health
```

---

## 11. Troubleshooting

### Caddy 502 Bad Gateway
```bash
# Cek apakah backend berjalan
curl http://localhost:8000/api/v1/health

# Cek log Caddy
sudo journalctl -u caddy -f
```

### Frontend 403 Forbidden
```bash
# Pastikan file bisa dibaca oleh user caddy
sudo -u caddy ls /var/www/career-compass/index.html

# Fix permission
sudo chown -R caddy:caddy /var/www/career-compass/
sudo chmod -R o+rX /var/www/career-compass/
```

### API 404 via Caddy tapi 200 via localhost
Caddy `handle_path` vs `handle` — `handle_path` striping prefix, `handle` tidak.
Gunakan `handle` (tanpa strip) jika backend sudah punya prefix sendiri.

### SSE tidak berfungsi (timeout / connection closed)
```bash
# 1. Pastikan Caddy config memiliki flush_interval -1
grep "flush_interval" /etc/caddy/Caddyfile

# 2. Pastikan Redis pubsub berfungsi
redis-cli PUBSUB CHANNELS "workflow:*"

# 3. Cek worker log
sudo journalctl -u career-compass-worker.service -n 20 --no-pager
```

### Internal Server Error (500)
```bash
# Lihat traceback Python
sudo journalctl -u career-compass-api.service --no-pager -n 50 | grep -A 20 "Traceback"
```

### ChromaDB error / collection kosong
```bash
# Pastikan path sesuai dan data ada
ls -la /home/ubuntu/career-compass/apps/agent-api/data/chroma_db/

# Cek collection
cd /home/ubuntu/career-compass/apps/agent-api
uv run python3 -c "
from app.services.vector_store import get_job_collection
c = get_job_collection()
print(f'job_postings: {c.count()} dokumen')
"
# Jika 0, jalankan ulang ingest (lihat §9.5)
```

### Embedding rate limit (Gemini free tier)
Tunggu ~1 menit antar ingest. Rate limit: 100 request/menit.
Atau ganti ke provider embedding berbayar (OpenAI text-embedding-3-small).

### Celery task tidak jalan
```bash
# Cek apakah worker jalan
sudo systemctl status career-compass-worker.service

# Cek log worker
sudo journalctl -u career-compass-worker.service -n 30 --no-pager

# Cek queue
redis-cli LLEN celery
```

### Redis connection refused
```bash
sudo systemctl status redis-server
sudo systemctl restart redis-server
redis-cli ping
# → PONG
```

### Permission denied (Caddy tidak bisa baca file)
```bash
# Caddy berjalan sebagai user 'caddy', pastikan path bisa dibaca
sudo -u caddy ls /var/www/career-compass/    # harusnya bisa
# Jika tidak:
sudo chown -R caddy:caddy /var/www/career-compass/
```

---

## 12. Domain & SSL

Semua SSL diurus otomatis oleh Caddy (Let's Encrypt via ACME).
Pastikan domain terdaftar di Caddyfile agar Caddy otomatis request sertifikat.

```bash
# Cek sertifikat
sudo caddy cert-info

# Renew manual (biasanya otomatis)
sudo systemctl reload caddy
```
