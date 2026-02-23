#!/bin/bash
echo "============================================"
echo "  5S Docs - Instalação Inicial"
echo "============================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python3 não encontrado."
    echo "  Mac: brew install python3"
    echo "  Linux: sudo apt install python3 python3-pip python3-venv"
    exit 1
fi
echo "[OK] Python encontrado: $(python3 --version)"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado."
    echo "  Mac: brew install node"
    echo "  Linux: sudo apt install nodejs npm"
    exit 1
fi
echo "[OK] Node.js encontrado: $(node --version)"

# Criar venv e instalar backend
echo ""
echo "--- Instalando dependências do Backend ---"
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "[OK] Ambiente virtual criado"
fi

source venv/bin/activate
pip install -e . 2>&1
if [ $? -ne 0 ]; then
    echo "[ERRO] Falha ao instalar dependências Python."
    exit 1
fi
echo "[OK] Backend instalado"
cd ..

# Instalar frontend
echo ""
echo "--- Instalando dependências do Frontend ---"
cd frontend
npm install 2>&1
if [ $? -ne 0 ]; then
    echo "[ERRO] Falha ao instalar dependências Node."
    exit 1
fi
echo "[OK] Frontend instalado"
cd ..

# Criar pastas
echo ""
echo "--- Criando pastas de armazenamento ---"
mkdir -p storage/originals storage/formatted storage/templates storage/temp
echo "[OK] Pastas criadas"

# Criar .env
echo ""
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << 'EOF'
DATABASE_URL=sqlite+aiosqlite:///./fives.db
DATABASE_URL_SYNC=sqlite:///./fives.db
OPENAI_API_KEY=
STORAGE_PATH=../storage
EOF
    echo "[OK] Arquivo .env criado em backend/.env"
    echo "     Edite para adicionar sua OPENAI_API_KEY se desejar análise por IA."
else
    echo "[OK] Arquivo .env já existe"
fi

echo ""
echo "============================================"
echo "  Instalação concluída!"
echo ""
echo "  Para iniciar o sistema, execute:"
echo "    ./iniciar.sh"
echo ""
echo "  (Opcional) Instale o LibreOffice para"
echo "  conversão PDF:"
echo "    Mac: brew install --cask libreoffice"
echo "    Linux: sudo apt install libreoffice"
echo "============================================"
