#!/usr/bin/env bash

set -e

echo "======================================"
echo "    🧪 Barcha Testlarni Boshlash      "
echo "======================================"

# Backend Testlar
echo ""
echo "[1/3] Backend Unit va Integration testlarini ishga tushirish (Pytest)..."
cd "backend"
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "Python muhiti (venv) topilmadi. Avval o'rnating."
else
    # Muhitga ulanish
    if [ -d "venv" ]; then source venv/bin/activate; fi
    if [ -d ".venv" ]; then source .venv/bin/activate; fi
    
    # Testlarni ishga tushirish
    python -m pytest tests/ -v
fi
cd ..

# Locust orqali stress test
echo ""
echo "[2/3] Locust yordamida Stress Test (10 foydalanuvchi, 10 sekund)..."
if command -v locust &> /dev/null; then
    locust -f stress_tests/locustfile.py --headless -u 10 -r 2 -t 10s --host http://localhost:8000
else
    echo "Locust o'rnatilmagan! O'rnatish uchun: pip install locust"
fi

# Frontend (Mavjud bo'lsa)
echo ""
echo "[3/3] Frontend testlari (ixtiyoriy)..."
cd "frontend"
if [ -f "package.json" ]; then
    # Agar frontendda jest yoki vitest bolsa: npm run test
    echo "Frontend testlari qo'shilmagan bo'lishi mumkin. Hozircha o'tkazib yuboriladi."
else
    echo "Frontend papkasi yoki package.json topilmadi."
fi
cd ..

echo "======================================"
echo "          ✅ Testlar tugadi           "
echo "======================================"
