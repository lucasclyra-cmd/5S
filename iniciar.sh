#!/bin/bash
echo "============================================"
echo "  5S Docs - Iniciando Sistema"
echo "============================================"
echo ""

# Verificar se setup foi executado
if [ ! -f "backend/.env" ]; then
    echo "[ERRO] Execute ./setup.sh antes de iniciar."
    exit 1
fi

# Ativar venv se existir
if [ -f "backend/venv/bin/activate" ]; then
    source backend/venv/bin/activate
fi

echo "Iniciando Backend (porta 8000)..."
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Aguardar backend iniciar
sleep 3

echo "Iniciando Frontend (porta 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  Sistema iniciado!"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Pressione Ctrl+C para parar."
echo "============================================"

# Abrir no navegador (Mac)
if command -v open &> /dev/null; then
    sleep 3
    open http://localhost:3000
fi

# Capturar Ctrl+C e matar ambos processos
trap "echo ''; echo 'Parando...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Aguardar
wait
