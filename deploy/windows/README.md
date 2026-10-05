# Deploying AutomationEdge HR on Windows (Nginx, port 8099)

```
Browser ──► Nginx :8099 ──► frontend\dist        (React app, static files)
                       └──► 127.0.0.1:8081       (/api, Python server.py)
```

The Python backend listens only on `127.0.0.1`, so other machines can reach it **only through Nginx**.

## 1. Install prerequisites (once)

| Tool | Where |
|---|---|
| Python 3.10+ | python.org (tick **Add to PATH**) |
| Node.js 18+ | nodejs.org |
| Git | git-scm.com |
| Nginx for Windows | nginx.org/en/download.html: unzip to `C:\nginx` |

## 2. Get the code and credentials

```powershell
git clone https://github.com/abhishekmalwadkar-png/HRMS_Onboarding.git C:\AutomationEdgeHR
cd C:\AutomationEdgeHR
git checkout ui-upgrade
copy .env.example .env      # then edit .env with the real ServiceNow / T4 / O365 / OrangeHRM values
```

## 3. Set up (run PowerShell **as Administrator**)

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\setup.ps1 -NginxDir C:\nginx
```

This installs the Python packages, builds the frontend, writes `C:\nginx\conf\nginx.conf` (the original is saved as `nginx.conf.original`), tests it, and opens port 8099 in Windows Firewall.

## 4. Start / stop

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\start.ps1 -NginxDir C:\nginx
powershell -ExecutionPolicy Bypass -File deploy\windows\stop.ps1  -NginxDir C:\nginx
```

Open `http://<server-ip>:8099`. Backend logs go to `logs\backend.out.log` and `logs\backend.err.log`.

## 5. Start automatically after a reboot

```powershell
schtasks /Create /TN "AutomationEdge HR" /SC ONSTART /RU SYSTEM /RL HIGHEST /TR "powershell -ExecutionPolicy Bypass -File C:\AutomationEdgeHR\deploy\windows\start.ps1 -NginxDir C:\nginx"
```

`SYSTEM` must be able to find `python` on its PATH: install Python **for all users**, or replace `python` in `start.ps1` with its full path.

## 6. Updating to a new version

```powershell
cd C:\AutomationEdgeHR
git pull
powershell -ExecutionPolicy Bypass -File deploy\windows\stop.ps1  -NginxDir C:\nginx
powershell -ExecutionPolicy Bypass -File deploy\windows\setup.ps1 -NginxDir C:\nginx
powershell -ExecutionPolicy Bypass -File deploy\windows\start.ps1 -NginxDir C:\nginx
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Page loads but no data | Backend running? `http://127.0.0.1:8081/api/employees` on the server, and `logs\backend.err.log` |
| `502 Bad Gateway` | Backend is down or still starting: run `start.ps1` again |
| Page doesn't load from other PCs | Firewall rule for TCP 8099; correct server IP |
| `nginx: [emerg] bind() ... 8099` | Another program uses 8099: `Get-NetTCPConnection -LocalPort 8099` |
| Changes not visible after update | Re-run `setup.ps1` (rebuilds `frontend\dist`), then hard-refresh the browser |

## Before giving access to others

- **There is no real login.** The login screen is a demo. Anyone who can open the page can approve candidates (creating real AD, Microsoft 365 and OrangeHRM accounts) or revoke and delete users. Keep port 8099 reachable **only from your internal network**.
- **Rotate the secrets that were committed to git** (Azure client secret and passwords in `office365_client.py`, `ae_rpa_client.py`, `orangehrm_client.py`) and keep the new ones only in `.env`.
- `stop.ps1` stops **every** `python server.py` process on the machine. Use a dedicated server, or adjust the script if other Python apps run there.
