@echo off
chcp 65001 >nul
echo ============================================
echo   5S Docs - Instalacao Inicial
echo ============================================
echo.

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado.
    echo Baixe em: https://www.python.org/downloads/
    echo IMPORTANTE: Marque "Add Python to PATH" durante a instalacao.
    pause
    exit /b 1
)
echo [OK] Python encontrado
python --version

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo Baixe em: https://nodejs.org/ (versao LTS)
    pause
    exit /b 1
)
echo [OK] Node.js encontrado
node --version

echo.
echo --- Instalando dependencias do Backend ---
cd backend
pip install -e . 2>&1
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias Python.
    pause
    exit /b 1
)
echo [OK] Backend instalado
cd ..

echo.
echo --- Instalando dependencias do Frontend ---
cd frontend
call npm install 2>&1
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias Node.
    pause
    exit /b 1
)
echo [OK] Frontend instalado
cd ..

echo.
echo --- Criando pastas de armazenamento ---
if not exist "storage\originals" mkdir storage\originals
if not exist "storage\formatted" mkdir storage\formatted
if not exist "storage\templates" mkdir storage\templates
if not exist "storage\temp" mkdir storage\temp
echo [OK] Pastas criadas

echo.
echo --- Criando arquivo .env ---
if not exist "backend\.env" (
    echo DATABASE_URL=sqlite+aiosqlite:///./fives.db> backend\.env
    echo DATABASE_URL_SYNC=sqlite:///./fives.db>> backend\.env
    echo OPENAI_API_KEY=>> backend\.env
    echo STORAGE_PATH=../storage>> backend\.env
    echo [OK] Arquivo .env criado em backend\.env
    echo     Edite para adicionar sua OPENAI_API_KEY se desejar analise por IA.
) else (
    echo [OK] Arquivo .env ja existe
)

echo.
echo ============================================
echo   Instalacao concluida!
echo.
echo   Para iniciar o sistema, execute:
echo     iniciar.bat
echo.
echo   (Opcional) Instale o LibreOffice para
echo   conversao PDF: https://www.libreoffice.org
echo ============================================
pause
