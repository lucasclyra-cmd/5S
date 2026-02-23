@echo off
chcp 65001 >nul
echo ============================================
echo   5S Docs - Iniciando Sistema
echo ============================================
echo.

:: Verificar se setup foi executado
if not exist "backend\.env" (
    echo [ERRO] Execute setup.bat antes de iniciar.
    pause
    exit /b 1
)

echo Iniciando Backend (porta 8000)...
start "5S Backend" cmd /k "cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Aguardar backend iniciar
timeout /t 3 /nobreak >nul

echo Iniciando Frontend (porta 3000)...
start "5S Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo   Sistema iniciado!
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo   Duas janelas de terminal foram abertas.
echo   Feche-as para parar o sistema.
echo ============================================
echo.
echo Abrindo o navegador em 5 segundos...
timeout /t 5 /nobreak >nul
start http://localhost:3000
