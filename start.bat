@echo off
title Cerberus Orbit Launcher

echo ===================================================
echo   CERBERUS ORBIT - GESTURE CONTROLLED COSMOLOGY
echo ===================================================

echo.
echo [1/3] Checking Python Dependencies...
pip install -r requirements.txt

echo.
echo [2/3] Starting Backend Server...
start "Cerberus Backend" cmd /k "python server/websocket_server.py"

echo.
echo [3/3] Starting Web Server...
start "Cerberus Frontend" cmd /k "cd web && python -m http.server 8000"

echo.
echo ===================================================
echo   SYSTEM READY
echo ===================================================
echo   Please open your browser to: http://localhost:8000
echo.
pause
