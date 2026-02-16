@echo off
echo ==========================================
echo   INSTALACION AUTOMATICA DE CREDITCOL
echo ==========================================
echo.

echo 1. Verificando Node.js...
node -v
if %errorlevel% neq 0 (
    echo Error: Node.js no esta instalado o no esta en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b
)

echo.
echo 2. Instalandodependencias (esto puede tardar unos minutos)...
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias.
    pause
    exit /b
)

echo.
echo 3. Configurando variables de entorno...
if not exist .env.local (
    copy .env.example .env.local
    echo Archivo .env.local creado.
) else (
    echo El archivo .env.local ya existe.
)

echo.
echo ==========================================
echo   INSTALACION COMPLETADA
echo ==========================================
echo.
echo Para iniciar la aplicacion, ejecuta: npm run dev
echo.
pause
