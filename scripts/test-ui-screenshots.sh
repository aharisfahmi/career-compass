#!/usr/bin/env bash
set -euo pipefail

OUTDIR="${HOME}/pictures"
mkdir -p "$OUTDIR"

FRONTEND_URL="http://localhost:5173"

cleanup() {
  playwright-cli close 2>/dev/null || true
}
trap cleanup EXIT

step_screenshot() {
  local name="$1"
  playwright-cli screenshot --filename="${OUTDIR}/${name}" --hires 2>&1 | tail -1
  echo "  -> ${OUTDIR}/${name}"
}

echo "=== CareerCompass UI Screenshot Test ==="
echo "Output: ${OUTDIR}"
echo ""

# 1. Buka halaman
echo "[1/4] Opening frontend..."
playwright-cli open "${FRONTEND_URL}" > /dev/null 2>&1
sleep 2
step_screenshot "01-home.png"

# 2. Isi form + upload CV
echo "[2/4] Filling form..."
playwright-cli fill "getByRole('textbox', { name: 'Nama Lengkap:' })" "Ahmad Haris Fahmi" > /dev/null 2>&1
playwright-cli fill "getByRole('textbox', { name: 'Posisi Saat Ini:' })" "Backend Developer" > /dev/null 2>&1
playwright-cli fill "getByRole('spinbutton', { name: 'Tahun Pengalaman:' })" "2" > /dev/null 2>&1
playwright-cli fill "getByRole('textbox', { name: 'Hard Skills' })" "Go, PHP, SQL" > /dev/null 2>&1
playwright-cli fill "getByRole('textbox', { name: 'Soft Skills' })" "Komunikasi, Teamwork" > /dev/null 2>&1
playwright-cli fill "getByRole('textbox', { name: 'Pendidikan:' })" "S1 Informatika" > /dev/null 2>&1
playwright-cli fill "getByRole('textbox', { name: 'Role Target' })" "Senior Backend Developer, Golang Developer, PHP Developer" > /dev/null 2>&1
playwright-cli fill "getByRole('spinbutton', { name: 'Jam Belajar' })" "20" > /dev/null 2>&1
playwright-cli fill "getByRole('spinbutton', { name: 'Budget' })" "5000000" > /dev/null 2>&1

playwright-cli click "getByRole('button', { name: 'Choose File' })" > /dev/null 2>&1
playwright-cli upload "${HOME}/src/career-compass/cv.pdf" > /dev/null 2>&1
sleep 3
step_screenshot "02-form-filled.png"

# 3. Konfirmasi Profil
echo "[3/4] Confirming profile..."
playwright-cli click "getByRole('button', { name: 'Lanjutkan' })" > /dev/null 2>&1
sleep 2
step_screenshot "03-konfirmasi-profil.png"

# 4. Proses Career Blueprint
echo "[4/4] Processing Career Blueprint..."
playwright-cli click "getByRole('button', { name: 'Proses Career Blueprint' })" > /dev/null 2>&1

# Tunggu sampai tombol Mulai Lagi muncul (tanda blueprint sudah tampil)
echo "  Waiting for result..."
for i in $(seq 1 90); do
  if playwright-cli find "Mulai Lagi" 2>/dev/null | grep -q "Mulai Lagi"; then
    echo "  Done after ${i}s"
    break
  fi
  sleep 2
done

step_screenshot "04-career-blueprint.png"

echo ""
echo "=== All screenshots saved to ${OUTDIR} ==="
ls -lh "${OUTDIR}"/*.png 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'
