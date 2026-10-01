# 🚀 Enterprise HRMS & Automated Onboarding Orchestrator

An end-to-end enterprise employee onboarding and HR management platform that orchestrates seamless multi-system provisioning across **ServiceNow ITSM**, **Active Directory (via AutomationEdge T4 RPA)**, **Microsoft 365 / Entra ID**, and **OrangeHRM PIM**.

---

## 📋 Table of Contents
- [Overview](#-overview)
- [4-Engine Sequential Provisioning Flow](#-4-engine-sequential-provisioning-flow)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Configuration (.env)](#-configuration-env)
- [API Endpoints](#-api-endpoints)
- [Folder Structure](#-folder-structure)

---

## 🌟 Overview

When HR approves an onboarding candidate from the dashboard or directly via ServiceNow, the orchestrator triggers automated workflows across all four enterprise platforms in an exact sequential pipeline:

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│   1. ServiceNow ITSM      │ ───► │  2. Active Directory (AD) │ ───► │   3. Microsoft 365        │ ───► │     4. OrangeHRM PIM      │
│   • sc_request Approved   │      │   • AutomationEdge T4     │      │   • Entra ID User Created │      │   • Profile Created       │
│   • Laptop Incident (INC) │      │   • AD User & Role Assign │      │   • Corporate Mail Active │      │   • Synced with O365 Mail │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

---

## 🔄 4-Engine Sequential Provisioning Flow

| Step | Engine | Action & Integration | Output |
|:---:|:---|:---|:---|
| **1** | **ServiceNow ITSM** | Approves the Service Catalog Request (`sc_request`) and creates a live IT hardware ticket (`incident`) for laptop dispatch. | `REQ#`, `RITM#`, `INC# (Laptop Ticket)` |
| **2** | **Active Directory (AD)** | Authenticates to **AutomationEdge T4** cloud engine and executes the workflow `AD-Create User and Assin Role`. | `Automation Request #` (Live execution tracking) |
| **3** | **Microsoft 365 / Entra ID** | Calls Microsoft Graph API via OAuth2 refresh token to create an enterprise Azure AD / M365 user account. | `userPrincipalName` (e.g. `fname.lname@automationedge.ai`) |
| **4** | **OrangeHRM** | Creates an employee profile in OrangeHRM PIM, populating their work email with the corporate email generated in Step 3. | `empNumber` (e.g. `#17`), live profile link |

---

## ✨ Key Features

- 📑 **Candidate Verification & Approvals Hub**: Review uploaded candidate documents (Government ID/Aadhaar, Degree Certificate, Tax Form 16/W-4, Signed Offer Letter) and trigger all 4 engines with a single click.
- ⚡ **Auto-Fill Indian Database**: Instant 1-click test data generation with 15 realistic Indian candidate profiles (names, PAN, Aadhaar, departments, salary packages, and addresses).
- 📜 **Dynamic Offer Letter Generator**: Generates formal PDF offer letters formatted with company letterhead, compensation breakdown, CTC components, and terms.
- 🖥️ **Direct Live System Deep-Links**: Direct 1-click navigation chips to ServiceNow REQs/Incidents, AutomationEdge T4 Workflow instances, Microsoft 365 Admin Center, and OrangeHRM PIM profiles.
- 🎨 **Modern Enterprise UI**: Collapsible sidebar navigation, live pulse status badges, responsive layout, glassmorphism design, and real-time toast notifications.

---

## 🏗️ System Architecture

- **Backend**: Native Python multi-threaded HTTP server (`server.py`) handling REST API routing, JSON persistence, and external system SDK integrations.
- **Service Integrations**:
  - `servicenow_client.py`: ServiceNow Table API client (requests, items, approvals, incidents).
  - `ae_rpa_client.py`: AutomationEdge T4 REST API client with session management, workflow execution, and status polling.
  - `office365_client.py`: Microsoft Graph API integration using OAuth2 refresh tokens and Entra ID user provisioning.
  - `orangehrm_client.py`: OrangeHRM REST client with session authentication, CSRF handling, and PIM employee creation.
  - `generate_offer_letter.py`: Python PDF offer letter generation.
- **Frontend**: Vanilla JavaScript (ES6+ modular structure), responsive CSS with custom design tokens, FontAwesome icons, and Google Fonts (Inter / Plus Jakarta Sans).

---

## 🛠️ Tech Stack

- **Server Runtime**: Python 3.8+
- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript (ES6+)
- **Icons & Fonts**: Font Awesome 6.5, Google Fonts (Plus Jakarta Sans, Inter)
- **External Integrations**:
  - ServiceNow REST Table API
  - AutomationEdge T4 RPA REST Engine
  - Microsoft Graph API / Entra ID (Azure AD)
  - OrangeHRM Enterprise / Open Source REST PIM

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.8 or higher installed
- Git installed

### 2. Clone the Repository
```bash
git clone https://github.com/abhishekmalwadkar-png/HRMS_Onboarding.git
cd HRMS_Onboarding
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Start the Application Server
```bash
python server.py
```
The server will start at:
👉 **`http://127.0.0.1:8080`** or **`http://localhost:8080`**

---

## ⚙️ Configuration (.env)

| Variable | Description |
|:---|:---|
| `SN_INSTANCE_URL` | ServiceNow instance URL (e.g. `https://devXXXXX.service-now.com`) |
| `SN_USERNAME` / `SN_PASSWORD` | ServiceNow REST API credentials |
| `SN_CATALOG_ITEM_SYS_ID` | Catalog Item sys_id for onboarding requests |
| `AE_SERVER_URL` | AutomationEdge T4 API base URL (`https://t4.automationedge.com/aeengine`) |
| `AE_ORG_CODE` | AutomationEdge Organization Code |
| `AE_USERNAME` / `AE_PASSWORD` | AutomationEdge T4 user credentials |
| `AE_WORKFLOW_CREATE_AD_ACCOUNT` | Name of workflow (e.g. `AD-Create User and Assin Role`) |
| `O365_CLIENT_ID` / `O365_CLIENT_SECRET` | Azure Entra ID App Registration credentials |
| `O365_TENANT_ID` | Azure Tenant ID |
| `O365_DEFAULT_DOMAIN` | Domain for generated emails (e.g. `automationedge.ai`) |
| `O365_REFRESH_TOKEN` | Microsoft Graph OAuth2 Refresh Token |
| `ORANGEHRM_BASE_URL` | OrangeHRM instance URL (e.g. `http://10.41.5.39/orangehrm`) |
| `ORANGEHRM_USERNAME` / `ORANGEHRM_PASSWORD` | OrangeHRM Admin credentials |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/employees` | Fetch all onboarding employee records |
| `POST` | `/api/employees` | Create or update candidate onboarding details |
| `GET` | `/api/autofill` | Get randomized Indian candidate demo data |
| `POST` | `/api/servicenow/approve` | Trigger the 4-engine sequential approval and provisioning pipeline |
| `GET` | `/api/servicenow/sync-approvals` | Poll ServiceNow PDI for external approvals |
| `POST` | `/api/servicenow/test-connection` | Verify live connection to ServiceNow |
| `POST` | `/api/generate-offer` | Generate dynamic candidate offer letter PDF |

---

## 📁 Folder Structure

```
HRMS_Onboarding/
├── .env.example             # Template for environment variables & API keys
├── .gitignore               # Ignored files (secrets, caches, runtime PDFs)
├── README.md                # Project documentation & architecture
├── server.py                # Python HTTP Server & REST API router
├── servicenow_client.py     # ServiceNow REST client & pipeline orchestrator
├── ae_rpa_client.py         # AutomationEdge T4 Active Directory client
├── office365_client.py      # Microsoft Graph API / Office 365 client
├── orangehrm_client.py      # OrangeHRM PIM integration client
├── generate_offer_letter.py # Dynamic PDF offer letter generator
├── index.html               # Main single-page web app container
├── autofill.json            # 15 pre-configured Indian candidate profiles
├── employees.json           # Active candidate database store
├── css/
│   ├── main.css             # Design system tokens, layouts & components
│   └── ...
└── js/
    ├── app.js               # Navigation & app bootstrapping
    ├── approvals.js         # Approvals UI & 4-engine execution handler
    ├── dashboard.js         # Candidate dossier & KPI metrics
    ├── onboarding.js        # Multi-step onboarding form
    └── servicenow.js        # ServiceNow configuration & status sync
```

---

## 📄 License
This project is proprietary and intended for enterprise HRMS and IT automation onboarding workflows.
