@echo off
title MangoHRMS Cloudflare Tunnel
echo ===================================================
echo Starting Cloudflare Tunnel for MangoHRMS (Port 8081)...
echo ===================================================
cloudflared.exe tunnel --url http://localhost:8081
pause
