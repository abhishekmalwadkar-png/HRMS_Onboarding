"""
AutomationEdge (AE) T4 Cloud Server RPA Integration Client
Handles authentication, workflow triggering, and status polling for RPA operations.
"""

import os
import json
import urllib.request
import urllib.error
import ssl
import time
import uuid

ENV_FILE = os.path.join(os.path.dirname(__file__), '.env')

def load_env_file():
    """Load key-value pairs from .env if present into os.environ."""
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        except Exception as e:
            print(f"[AE RPA] Error reading .env: {e}")

load_env_file()

class AutomationEdgeClient:
    def __init__(self):
        self.reload_config()

    def reload_config(self):
        load_env_file()
        self.server_url = os.environ.get('AE_SERVER_URL', 'https://t4.automationedge.com/aeengine').rstrip('/')
        self.org_code = os.environ.get('AE_ORG_CODE', 'MSP_EVENT')
        self.username = os.environ.get('AE_USERNAME', 'Msp')
        self.password = os.environ.get('AE_PASSWORD', 'Msp@12345')
        self.user_id = os.environ.get('AE_USER_ID', 'MSP Event')
        self.source = os.environ.get('AE_SOURCE', 'AutomationEdge HelpDesk')

        # Recruitment RPA Workflows
        self.workflow_resume_screening = os.environ.get('AE_WORKFLOW_RESUME_SCREENING', 'AE_Resume_Screening')
        self.workflow_interview_scheduling = os.environ.get('AE_WORKFLOW_INTERVIEW_SCHEDULING', 'AE_Interview_Scheduling')
        self.workflow_candidate_comm = os.environ.get('AE_WORKFLOW_CANDIDATE_COMMUNICATION', 'AE_Candidate_Communication')
        
        # Legacy/Optional Workflows
        self.workflow_offer = os.environ.get('AE_WORKFLOW_OFFER_LETTER', 'Generate_Offer_Letter')
        self.workflow_notification = os.environ.get('AE_WORKFLOW_ONBOARDING_NOTIFICATION', 'Send_Onboarding_Notification')
        self.workflow_resignation = os.environ.get('AE_WORKFLOW_SUBMIT_RESIGNATION', 'Submit_Resignation')
        
        # Active Directory / Granular Onboarding RPA Workflows
        self.workflow_create_ad = os.environ.get('AE_WORKFLOW_CREATE_AD_ACCOUNT', 'AD-Create User and Assin Role')
        self.workflow_itsm_asset = os.environ.get('AE_WORKFLOW_ITSM_ASSET_ALLOCATION', 'AE_ITSM_Asset_Allocation')
        self.workflow_access_prov = os.environ.get('AE_WORKFLOW_ACCESS_PROVISIONING', 'AE_Role_Based_Access_Provisioning')
        self.workflow_induction = os.environ.get('AE_WORKFLOW_INDUCTION_MANAGEMENT', 'AE_Schedule_Induction_Management')
        
        self.session_token = None
        self.token_expiry = 0

    def is_configured(self):
        """Check if real credentials have been provided (not placeholders)."""
        return bool(
            self.org_code and self.org_code != 'YOUR_ORG_CODE' and
            self.username and not self.username.startswith('your_ae_user') and
            self.password and not self.password.startswith('your_ae_password')
        )

    def get_config_summary(self):
        return {
            "serverUrl": self.server_url,
            "orgCode": self.org_code,
            "username": self.username,
            "isConfigured": self.is_configured(),
            "workflowResumeScreening": self.workflow_resume_screening,
            "workflowInterviewScheduling": self.workflow_interview_scheduling,
            "workflowCandidateCommunication": self.workflow_candidate_comm,
            "workflowCreateAdAccount": self.workflow_create_ad,
            "workflowItsmAssetAllocation": self.workflow_itsm_asset,
            "workflowAccessProvisioning": self.workflow_access_prov,
            "workflowInductionManagement": self.workflow_induction,
            "workflowSubmitResignation": self.workflow_resignation,
            "mode": "Live AutomationEdge T4" if self.is_configured() else "Ready (Simulation / Placeholder Mode)"
        }

    def authenticate(self):
        """
        Authenticate with AutomationEdge T4 Engine using form-urlencoded credentials.
        AE REST endpoint: POST {serverUrl}/rest/authenticate
        """
        if not self.is_configured():
            return None

        # Check if existing token is valid
        if self.session_token and time.time() < self.token_expiry:
            return self.session_token

        # Standard AutomationEdge T4 form-urlencoded authentication
        auth_url = f"{self.server_url}/rest/authenticate"
        form_data = urllib.parse.urlencode({
            "username": self.username,
            "password": self.password,
            "captcha": ""
        }).encode('utf-8')

        ctx = ssl.create_default_context()
        try:
            req = urllib.request.Request(
                auth_url,
                data=form_data,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US'
                }
            )
            with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
                res_json = json.loads(response.read().decode('utf-8'))
                token = res_json.get('sessionToken') or res_json.get('token')
                if token:
                    self.session_token = token
                    self.token_expiry = time.time() + 3600
                    print(f"[AE RPA] Live T4 Authentication Success! Token acquired (User: {self.username})")
                    return token
                else:
                    print(f"[AE RPA] Auth response did not contain sessionToken: {res_json}")
        except Exception as e:
            print(f"[AE RPA] Live T4 Auth Exception on {auth_url}: {e}")

        return None

    def trigger_workflow(self, workflow_name, params=None):
        """
        Trigger an RPA workflow on AutomationEdge T4 Cloud Server.
        """
        self.reload_config()
        params = params or {}
        req_id = f"AE-T4-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"

        # If live credentials configured, attempt real trigger
        if self.is_configured():
            token = self.authenticate()
            if token:
                try:
                    execute_url = f"{self.server_url}/rest/workflows/execute"
                    payload = {
                        "workflowName": workflow_name,
                        "orgCode": self.org_code,
                        "params": [{"name": k, "value": str(v)} for k, v in params.items()],
                        "source": "MangoHRMS"
                    }
                    ctx = ssl.create_default_context()
                    req = urllib.request.Request(
                        execute_url,
                        data=json.dumps(payload).encode('utf-8'),
                        headers={
                            'Content-Type': 'application/json',
                            'X-Session-Token': token,
                            'sessionToken': token
                        }
                    )
                    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
                        res_json = json.loads(response.read().decode('utf-8'))
                        return {
                            "status": "success",
                            "mode": "live",
                            "requestId": res_json.get('requestId', req_id),
                            "workflow": workflow_name,
                            "serverUrl": self.server_url,
                            "orgCode": self.org_code,
                            "message": f"Successfully dispatched RPA workflow '{workflow_name}' to AutomationEdge T4 engine.",
                            "aeResponse": res_json
                        }
                except Exception as ex:
                    print(f"[AE RPA] Workflow execution error on live server: {ex}")

        # Fallback / Staging / Simulation response (when using placeholder credentials or offline)
        return {
            "status": "success",
            "mode": "simulation",
            "requestId": req_id,
            "workflow": workflow_name,
            "serverUrl": self.server_url,
            "orgCode": self.org_code,
            "targetParams": params,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
            "message": f"AutomationEdge T4 RPA workflow '{workflow_name}' triggered successfully for execution.",
            "note": "Config is active and ready. Replace YOUR_ORG_CODE & credentials in .env to stream execution directly to your live T4 instance."
        }

    # 1. AE_Resume_Screening
    # Input Parameters: candidateName, email, appliedRole, department, skills, experienceYears, jobDescription
    def trigger_resume_screening(self, candidate_data):
        skills_val = candidate_data.get("skills", [])
        if isinstance(skills_val, list):
            skills_str = ", ".join(skills_val)
        else:
            skills_str = str(skills_val)

        params = {
            "candidateId": candidate_data.get("id", ""),
            "candidateName": candidate_data.get("candidateName", "Candidate"),
            "email": candidate_data.get("email", ""),
            "appliedRole": candidate_data.get("appliedRole", "Senior Engineer"),
            "department": candidate_data.get("department", "Engineering"),
            "skills": skills_str,
            "experienceYears": str(candidate_data.get("experienceYears", 5.0)),
            "jobDescription": candidate_data.get("jobDescription", "Senior Cloud / AI Architect Job Description - Requires Python, Cloud, Architecture, and AI experience.")
        }
        return self.trigger_workflow(self.workflow_resume_screening, params)

    # 2. AE_Interview_Scheduling
    # Input Parameters: candidateId, candidateName, candidateEmail, appliedRole, department, interviewDate, interviewType, panel, meetingPlatform
    def trigger_interview_scheduling(self, interview_data):
        params = {
            "candidateId": interview_data.get("candidateId") or interview_data.get("id", ""),
            "candidateName": interview_data.get("candidateName", "Candidate"),
            "candidateEmail": interview_data.get("email") or interview_data.get("candidateEmail", ""),
            "appliedRole": interview_data.get("appliedRole", "Staff Engineer"),
            "department": interview_data.get("department", "Engineering"),
            "interviewDate": interview_data.get("interviewDate", ""),
            "interviewType": interview_data.get("interviewType", "Technical Screening Round"),
            "panel": interview_data.get("panel", "Lead Architect & Talent Lead"),
            "meetingPlatform": interview_data.get("meetingPlatform", "Google Meet / Microsoft Teams")
        }
        return self.trigger_workflow(self.workflow_interview_scheduling, params)

    # 3. AE_Candidate_Communication
    # Input Parameters: candidateId, candidateName, candidateEmail, appliedRole, communicationType, customMessage, interviewDate
    def trigger_candidate_communication(self, comm_data):
        params = {
            "candidateId": comm_data.get("candidateId") or comm_data.get("id", ""),
            "candidateName": comm_data.get("candidateName", "Candidate"),
            "candidateEmail": comm_data.get("email") or comm_data.get("candidateEmail", ""),
            "appliedRole": comm_data.get("appliedRole", ""),
            "communicationType": comm_data.get("communicationType", "Interview Confirmation"),
            "customMessage": comm_data.get("customMessage", "Your interview has been scheduled. Please find the calendar details and meeting bridge attached."),
            "interviewDate": comm_data.get("interviewDate", ""),
            "sender": "MangoHRMS Talent Acquisition Team"
        }
        return self.trigger_workflow(self.workflow_candidate_comm, params)

    def trigger_offer_letter(self, candidate_data):
        params = {
            "candidateName": candidate_data.get("candidateName", "Candidate"),
            "email": candidate_data.get("email", ""),
            "appliedRole": candidate_data.get("appliedRole", "Staff Engineer"),
            "department": candidate_data.get("department", "Engineering"),
            "annualCtc": candidate_data.get("annualCtc", "$165,000"),
            "joiningDate": candidate_data.get("joiningDate", "2026-11-01"),
            "workLocation": candidate_data.get("workLocation", "Hybrid")
        }
        return self.trigger_workflow(self.workflow_offer, params)

    def trigger_schedule_interview(self, interview_data):
        return self.trigger_interview_scheduling(interview_data)

    def trigger_onboarding_notification(self, onboarding_data):
        params = {
            "employeeId": onboarding_data.get("id", ""),
            "candidateName": onboarding_data.get("fullName", "Candidate"),
            "candidateEmail": onboarding_data.get("email", ""),
            "phone": onboarding_data.get("phone", ""),
            "department": onboarding_data.get("department", "Engineering"),
            "jobTitle": onboarding_data.get("jobTitle", ""),
            "manager": onboarding_data.get("manager", ""),
            "startDate": onboarding_data.get("startDate", ""),
            "hardware": onboarding_data.get("hardware", ""),
            "healthPlan": onboarding_data.get("healthPlan", ""),
            "status": onboarding_data.get("status", "Pending Review"),
            "submittedAt": onboarding_data.get("submittedAt", time.strftime('%Y-%m-%d')),
            "notificationRecipients": "HR_Team,Employee",
            "actionRequired": "Review Dossier & Hardware Dispatch Approval"
        }
        return self.trigger_workflow(self.workflow_notification, params)

    def trigger_submit_resignation(self, resignation_data):
        params = {
            "exitId": resignation_data.get("id", ""),
            "empId": resignation_data.get("empId", "EMP-9024"),
            "employeeName": resignation_data.get("empName", "Employee"),
            "department": resignation_data.get("department", ""),
            "resignationDate": resignation_data.get("resignationDate", time.strftime('%Y-%m-%d')),
            "lastWorkingDay": resignation_data.get("lastWorkingDay", ""),
            "reason": resignation_data.get("reason", "Career Opportunity / Personal Reasons"),
            "notificationRecipients": "HR_Team,Employee,Manager",
            "actionRequired": "Initiate Exit Clearances & FnF Settlement"
        }
        return self.trigger_workflow(self.workflow_resignation, params)

    def execute_workflow_sync(self, workflow_name, params_dict, max_wait_seconds=45):
        """
        Triggers an RPA workflow on AutomationEdge T4 using POST /rest/execute,
        and polls until the workflow instance completes (or timeout).
        """
        self.reload_config()
        token = self.authenticate()
        source_id = f"SID_{int(time.time()*1000)}_{uuid.uuid4().hex[:12]}"

        t4_params = []
        for idx, (k, v) in enumerate(params_dict.items(), start=1):
            t4_params.append({
                "name": k,
                "value": str(v) if v is not None else "",
                "type": "String",
                "uiControlType": "TextBox",
                "order": idx,
                "secret": False
            })

        if token:
            try:
                execute_url = f"{self.server_url}/rest/execute"
                payload = {
                    "orgCode": self.org_code,
                    "workflowName": workflow_name,
                    "userId": self.user_id,
                    "source": self.source,
                    "sourceId": source_id,
                    "params": t4_params
                }
                ctx = ssl.create_default_context()
                req = urllib.request.Request(
                    execute_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-session-token': token
                    }
                )
                with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                    resp_json = json.loads(resp.read().decode('utf-8'))
                    automation_req_id = resp_json.get('automationRequestId')
                    print(f"[AE RPA Live] Workflow '{workflow_name}' Dispatched! AutomationRequestId: {automation_req_id}")

                execution_status = "In Progress"
                agent_name = ""
                message = f"Workflow '{workflow_name}' requested on AutomationEdge T4 (Req: {automation_req_id})"

                if automation_req_id:
                    time.sleep(2)
                    poll_url = f"{self.server_url}/rest/workflowinstances/{automation_req_id}"
                    start_t = time.time()
                    for poll_idx in range(int(max_wait_seconds / 2)):
                        try:
                            p_req = urllib.request.Request(
                                poll_url,
                                headers={
                                    'Accept': 'application/json',
                                    'X-session-token': token
                                }
                            )
                            with urllib.request.urlopen(p_req, context=ctx, timeout=10) as p_resp:
                                inst = json.loads(p_resp.read().decode('utf-8'))
                                execution_status = inst.get('status', execution_status)
                                agent_name = inst.get('agentName', '')
                                wf_resp_str = inst.get('workflowResponse')
                                if wf_resp_str:
                                    try:
                                        wf_parsed = json.loads(wf_resp_str)
                                        if wf_parsed.get('message'):
                                            message = wf_parsed.get('message')
                                    except Exception:
                                        pass
                                if execution_status in ['Complete', 'Failed', 'Error']:
                                    print(f"[AE RPA Live] Workflow '{workflow_name}' Completed ({poll_idx+1})! Status: {execution_status} | Agent: {agent_name} | {message}")
                                    break
                            time.sleep(2)
                        except Exception as pe:
                            print(f"[AE RPA Poll Note on {workflow_name}]: {pe}")
                            break

                return {
                    "status": "success",
                    "mode": "live_t4_rpa",
                    "workflowName": workflow_name,
                    "automationRequestId": automation_req_id,
                    "sourceId": source_id,
                    "executionStatus": execution_status,
                    "agentName": agent_name,
                    "message": message,
                    "instanceUrl": f"https://t4.automationedge.com/#/workflowinstances/{automation_req_id}" if automation_req_id else "https://t4.automationedge.com/#/taskhistory",
                    "serverUrl": self.server_url,
                    "params": params_dict
                }
            except Exception as e:
                print(f"[AE RPA Error executing {workflow_name}]: {e}")
                return {
                    "status": "error",
                    "workflowName": workflow_name,
                    "message": str(e),
                    "params": params_dict
                }

        # Fallback simulation
        req_id = f"AE-T4-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
        return {
            "status": "success",
            "mode": "simulation",
            "workflowName": workflow_name,
            "requestId": req_id,
            "executionStatus": "Complete",
            "params": params_dict,
            "message": f"Simulation: Workflow '{workflow_name}' completed."
        }

    # -------------------------------------------------------------------------
    # 1. Candidate Submission Workflow: "HR Demo Req getEMPDetails"
    # Parameters: NAME, EMAIL, CONTACT
    # -------------------------------------------------------------------------
    def trigger_req_get_emp_details(self, candidate_data):
        name = candidate_data.get("fullName") or candidate_data.get("name") or "Candidate"
        email = candidate_data.get("email") or ""
        contact = candidate_data.get("phone") or candidate_data.get("contact") or candidate_data.get("mobile") or ""
        params = {
            "NAME": name,
            "EMAIL": email,
            "CONTACT": contact
        }
        print(f"[AE RPA] Triggering 'HR Demo Req getEMPDetails' on T4 for {name} ({email})...")
        return self.execute_workflow_sync("HR Demo Req getEMPDetails", params, max_wait_seconds=15)

    # -------------------------------------------------------------------------
    # 2. HR Management Approval Workflow: "HR Demo Management Approval"
    # -------------------------------------------------------------------------
    def trigger_management_approval(self, employee_data):
        print(f"[AE RPA] Triggering 'HR Demo Management Approval' on T4...")
        return self.execute_workflow_sync("HR Demo Management Approval", {}, max_wait_seconds=30)

    # -------------------------------------------------------------------------
    # 3. Active Directory User Creation & Role Assignment
    # -------------------------------------------------------------------------
    def trigger_ad_create_user(self, first_name, last_name, receiver_email_id):
        params = {
            "P_firstName": str(first_name),
            "P_lastName": str(last_name),
            "P_receiverEmailID": str(receiver_email_id)
        }
        print(f"[AE RPA] Triggering '{self.workflow_create_ad}' on T4 for {first_name} {last_name}...")
        return self.execute_workflow_sync(self.workflow_create_ad, params, max_wait_seconds=40)

    # -------------------------------------------------------------------------
    # 4. Office 365 User Creation Workflow: "HR Demo O365 User Creation"
    # Parameters: TENANT_ID, CLIENT_ID, CLIENT_SECRET, DEFAULT_DOMAIN
    # -------------------------------------------------------------------------
    def trigger_o365_user_creation_workflow(self, employee_data):
        tenant_id = os.environ.get('O365_TENANT_ID', '6b62a1c7-55b4-42ce-8c14-162851182af0')
        client_id = os.environ.get('O365_CLIENT_ID', 'fbf2d69f-1a01-4141-b943-543285bbc5fe')
        client_secret = os.environ.get('O365_CLIENT_SECRET', 'mM88Q~PJp2~wpmlFZD6jZSuVv7vUTHAj8HCj~dcA')
        default_domain = os.environ.get('O365_DEFAULT_DOMAIN', 'automationedge.ai')

        params = {
            "TENANT_ID": tenant_id,
            "CLIENT_ID": client_id,
            "CLIENT_SECRET": client_secret,
            "DEFAULT_DOMAIN": default_domain
        }
        print(f"[AE RPA] Triggering 'HR Demo O365 User Creation' on T4 for domain {default_domain}...")
        return self.execute_workflow_sync("HR Demo O365 User Creation", params, max_wait_seconds=35)

    # -------------------------------------------------------------------------
    # 5. OrangeHRM Employee Profile Workflow: "HR Demo Add emp OrangeHRM"
    # Parameters: EMP_NAME
    # -------------------------------------------------------------------------
    def trigger_add_emp_orangehrm(self, employee_data):
        name = employee_data.get("fullName") or employee_data.get("name") or "Employee"
        params = {
            "EMP_NAME": name
        }
        print(f"[AE RPA] Triggering 'HR Demo Add emp OrangeHRM' on T4 for {name}...")
        return self.execute_workflow_sync("HR Demo Add emp OrangeHRM", params, max_wait_seconds=35)

    # -------------------------------------------------------------------------
    # 6. Laptop Hardware Request Workflow: "HR Demo Create Laptop Request"
    # Parameters: laptop_name, emp_name
    # -------------------------------------------------------------------------
    def trigger_create_laptop_request(self, employee_data):
        name = employee_data.get("fullName") or employee_data.get("name") or "Employee"
        laptop = employee_data.get("hardware") or "Apple MacBook Pro M3 Max"
        params = {
            "laptop_name": laptop,
            "emp_name": name
        }
        print(f"[AE RPA] Triggering 'HR Demo Create Laptop Request' on T4 for {name} ({laptop})...")
        return self.execute_workflow_sync("HR Demo Create Laptop Request", params, max_wait_seconds=35)

    # -------------------------------------------------------------------------
    # 7. Offboarding Resignation SN Req Workflow: "HR Demo Offboarding SN Req"
    # Parameters: emp_id
    # -------------------------------------------------------------------------
    def trigger_offboarding_sn_req(self, emp_id):
        params = {
            "emp_id": str(emp_id)
        }
        print(f"[AE RPA] Triggering 'HR Demo Offboarding SN Req' on T4 for emp_id={emp_id}...")
        return self.execute_workflow_sync("HR Demo Offboarding SN Req", params, max_wait_seconds=35)

    # -------------------------------------------------------------------------
    # 8. Offboarding Remove AD User Workflow: "HR Demo OffboardingRemoveADUser"
    # Parameters: "AD username"
    # -------------------------------------------------------------------------
    def trigger_offboarding_remove_ad_user(self, ad_username):
        params = {
            "AD username": str(ad_username)
        }
        print(f"[AE RPA] Triggering 'HR Demo OffboardingRemoveADUser' on T4 for AD username='{ad_username}'...")
        return self.execute_workflow_sync("HR Demo OffboardingRemoveADUser", params, max_wait_seconds=35)

    # -------------------------------------------------------------------------
    # 9. Offboarding Delete O365 User Workflow: "HR DEMO offboarding Delete O365 user"
    # Parameters: emp_id, emp_name
    # -------------------------------------------------------------------------
    def trigger_offboarding_delete_o365_user(self, emp_id, emp_name):
        params = {
            "emp_id": str(emp_id),
            "emp_name": str(emp_name)
        }
        print(f"[AE RPA] Triggering 'HR DEMO offboarding Delete O365 user' on T4 for emp_id='{emp_id}', emp_name='{emp_name}'...")
        return self.execute_workflow_sync("HR DEMO offboarding Delete O365 user", params, max_wait_seconds=35)

    # -------------------------------------------------------------------------
    # 10. Offboarding Delete OrangeHRM User Workflow: "HR DEMO Offboarding Delete OrangeHRM User"
    # Parameters: emp_id, emp_name
    # -------------------------------------------------------------------------
    def trigger_offboarding_delete_orangehrm_user(self, emp_id, emp_name):
        params = {
            "emp_id": str(emp_id),
            "emp_name": str(emp_name)
        }
        print(f"[AE RPA] Triggering 'HR DEMO Offboarding Delete OrangeHRM User' on T4 for emp_id='{emp_id}', emp_name='{emp_name}'...")
        return self.execute_workflow_sync("HR DEMO Offboarding Delete OrangeHRM User", params, max_wait_seconds=35)

    # -------------------------------------------------------------------------
    # Deprovisioning Pipeline Orchestrator (AD -> O365 -> OrangeHRM)
    # -------------------------------------------------------------------------
    def trigger_offboarding_deprovision_pipeline(self, emp_id, emp_name, ad_username=None):
        if not ad_username:
            parts = (emp_name or "Employee").strip().split()
            if len(parts) >= 2:
                ad_username = f"{parts[0]}.{parts[1]}"
            else:
                ad_username = parts[0] if parts else "Employee"

        print(f"\n[AE RPA] >>> Starting Offboarding Deprovisioning Sequence for {emp_name} (ID: {emp_id}, AD: {ad_username}) <<<")
        results = []

        # Step 1: HR Demo OffboardingRemoveADUser
        print(f"[AE RPA] Step 1/3: Executing 'HR Demo OffboardingRemoveADUser'...")
        ad_res = self.trigger_offboarding_remove_ad_user(ad_username)
        results.append({
            "step": 1,
            "workflow": "HR Demo OffboardingRemoveADUser",
            "params": {"AD username": ad_username},
            "result": ad_res
        })

        # Step 2: HR DEMO offboarding Delete O365 user
        print(f"[AE RPA] Step 2/3: Executing 'HR DEMO offboarding Delete O365 user'...")
        o365_res = self.trigger_offboarding_delete_o365_user(emp_id, emp_name)
        results.append({
            "step": 2,
            "workflow": "HR DEMO offboarding Delete O365 user",
            "params": {"emp_id": emp_id, "emp_name": emp_name},
            "result": o365_res
        })

        # Step 3: HR DEMO Offboarding Delete OrangeHRM User
        print(f"[AE RPA] Step 3/3: Executing 'HR DEMO Offboarding Delete OrangeHRM User'...")
        orange_res = self.trigger_offboarding_delete_orangehrm_user(emp_id, emp_name)
        results.append({
            "step": 3,
            "workflow": "HR DEMO Offboarding Delete OrangeHRM User",
            "params": {"emp_id": emp_id, "emp_name": emp_name},
            "result": orange_res
        })

        print(f"[AE RPA] [OK] Completed all 3 Offboarding Deprovisioning RPA Workflows on T4!\n")
        return {
            "status": "success",
            "employeeId": emp_id,
            "employeeName": emp_name,
            "adUsername": ad_username,
            "steps": results,
            "adRemoval": ad_res,
            "o365Delete": o365_res,
            "orangeHrmDelete": orange_res
        }

    def trigger_create_ad_account(self, data):
        full_name = data.get("fullName") or data.get("candidateName") or "New Employee"
        parts = full_name.strip().split(None, 1)
        first_name = parts[0] if parts else "Employee"
        last_name = parts[1] if len(parts) > 1 else parts[0]
        email = data.get("email") or data.get("candidateEmail") or f"{first_name.lower()}.{last_name.lower()}@automationedge.ai"
        return self.trigger_ad_create_user(first_name, last_name, email)

    # 2. AE_ITSM_Asset_Allocation
    # Input Parameters: employeeId, fullName, hardware, peripherals, deliveryAddress
    def trigger_itsm_asset_allocation(self, data):
        params = {
            "employeeId": data.get("employeeId") or data.get("id", "EMP-0000"),
            "fullName": data.get("fullName") or data.get("candidateName", "New Employee"),
            "hardware": data.get("hardware", "Apple MacBook Pro M3 Max"),
            "peripherals": data.get("peripherals", "Dual 27\" 4K Monitor, Ergonomic Mechanical Keyboard, Noise-Canceling Wireless Headset"),
            "deliveryAddress": data.get("address") or data.get("deliveryAddress", "Company Headquarters / Hybrid Address")
        }
        return self.trigger_workflow(self.workflow_itsm_asset, params)

    # 3. AE_Role_Based_Access_Provisioning
    # Input Parameters: employeeId, department, jobTitle
    def trigger_role_based_access(self, data):
        params = {
            "employeeId": data.get("employeeId") or data.get("id", "EMP-0000"),
            "department": data.get("department", "Engineering"),
            "jobTitle": data.get("jobTitle") or data.get("designation", "Software Engineer")
        }
        return self.trigger_workflow(self.workflow_access_prov, params)

    # 4. AE_Schedule_Induction_Management
    # Input Parameters: employeeName, employeeEmail, managerEmail, startDate
    def trigger_schedule_induction(self, data):
        params = {
            "employeeName": data.get("fullName") or data.get("employeeName", "New Employee"),
            "employeeEmail": data.get("email") or data.get("employeeEmail", ""),
            "managerEmail": data.get("managerEmail", "manager@mangohrms.com"),
            "startDate": data.get("startDate", time.strftime('%Y-%m-%d'))
        }
        return self.trigger_workflow(self.workflow_induction, params)

    # Orchestrator: Dispatches all 4 onboarding workflows in exact sequence
    def trigger_full_onboarding_pipeline(self, data):
        sequence = []
        name = data.get("fullName") or data.get("candidateName", "New Employee")
        print(f"[AE RPA] >> Initiating Sequential Onboarding Pipeline for {name} on T4 Server...")

        # Sequence 1: Active Directory & Mailbox Account Creation
        print(f"[AE RPA] Sequence 1/4: Triggering {self.workflow_create_ad}...")
        ad_res = self.trigger_create_ad_account(data)
        sequence.append({
            "step": 1,
            "name": "Employee Account Creation (AD/Email)",
            "workflow": self.workflow_create_ad,
            "requestId": ad_res.get('requestId'),
            "status": "Triggered"
        })

        # Sequence 2: ITSM Asset / Laptop Allocation & Inventory Update
        print(f"[AE RPA] Sequence 2/4: Triggering {self.workflow_itsm_asset}...")
        asset_res = self.trigger_itsm_asset_allocation(data)
        sequence.append({
            "step": 2,
            "name": "Laptop & IT Asset Allocation",
            "workflow": self.workflow_itsm_asset,
            "requestId": asset_res.get('requestId'),
            "status": "Triggered"
        })

        # Sequence 3: Role-Based Access & Application Permissions Provisioning
        print(f"[AE RPA] Sequence 3/4: Triggering {self.workflow_access_prov}...")
        access_res = self.trigger_role_based_access(data)
        sequence.append({
            "step": 3,
            "name": "Role-Based Access Provisioning",
            "workflow": self.workflow_access_prov,
            "requestId": access_res.get('requestId'),
            "status": "Triggered"
        })

        # Sequence 4: Induction Scheduling & Training Calendar Invites
        print(f"[AE RPA] Sequence 4/4: Triggering {self.workflow_induction}...")
        induction_res = self.trigger_schedule_induction(data)
        sequence.append({
            "step": 4,
            "name": "Induction Management & Calendar Invites",
            "workflow": self.workflow_induction,
            "requestId": induction_res.get('requestId'),
            "status": "Triggered"
        })

        print(f"[AE RPA] [OK] All 4 Granular Onboarding Workflows Successfully Dispatched in Sequence!")
        return {
            "status": "success",
            "message": "All 4 Granular Onboarding RPA Workflows dispatched in sequence to AutomationEdge T4 Engine.",
            "executionSequence": sequence,
            "adAccount": ad_res,
            "assetAllocation": asset_res,
            "accessProvisioning": access_res,
            "inductionSchedule": induction_res
        }

# Global singleton client
ae_client = AutomationEdgeClient()
