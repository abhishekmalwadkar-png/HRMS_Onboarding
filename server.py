import http.server
import socketserver
import json
import os
import time
import random
import threading
import base64
from ae_rpa_client import ae_client
from generate_offer_letter import create_and_email_offer_letter
from generate_relieving_letter import generate_relieving_letter_pdf
from servicenow_client import sn_client
from office365_client import office365_client
from orangehrm_client import orangehrm_client
import resume_screener

PORT = int(os.environ.get('PORT', 8081))
# Bind address: '' = all interfaces (default). Set HOST=127.0.0.1 behind Nginx so only Nginx can reach it.
HOST = os.environ.get('HOST', '')
DATA_FILE = os.path.join(os.path.dirname(__file__), 'employees.json')
AUTOFILL_FILE = os.path.join(os.path.dirname(__file__), 'autofill.json')
HEALTH_CHECK_TIMEOUT = 15


def _check_servicenow():
    import urllib.request
    if not sn_client.is_configured():
        return False, "Not configured"
    url = f"{sn_client.instance_url}/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id"
    req = urllib.request.Request(url, headers=sn_client._get_headers())
    with urllib.request.urlopen(req, timeout=10, context=sn_client.ctx):
        return True, "Connected"


def _check_automationedge():
    return (True, "Authenticated") if ae_client.authenticate() else (False, "Authentication failed")


def _check_office365():
    return (True, "Token acquired") if office365_client.get_access_token() else (False, "Token request failed")


def _check_orangehrm():
    orangehrm_client._get_authenticated_session()
    return True, "Reachable"


def check_integrations_health():
    """Runs a live connectivity check against each integrated system in parallel."""
    checks = {
        "servicenow": _check_servicenow,
        "automationedge": _check_automationedge,
        "office365": _check_office365,
        "orangehrm": _check_orangehrm,
    }
    results = {name: {"ok": False, "message": "Timed out"} for name in checks}

    def run(name, fn):
        try:
            ok, message = fn()
            results[name] = {"ok": ok, "message": message}
        except Exception as e:
            results[name] = {"ok": False, "message": str(e)[:200]}

    threads = [threading.Thread(target=run, args=(n, f), daemon=True) for n, f in checks.items()]
    for t in threads:
        t.start()
    deadline = time.time() + HEALTH_CHECK_TIMEOUT
    for t in threads:
        t.join(max(0, deadline - time.time()))
    return dict(results)

class MangoHRMSRequestHandler(http.server.SimpleHTTPRequestHandler):

    def translate_path(self, path):
        dist_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
        if os.path.exists(dist_dir) and not path.startswith('/api/') and not path.startswith('/generated_offers/'):
            clean_path = path.split('?', 1)[0].split('#', 1)[0]
            rel_path = clean_path.lstrip('/')
            full_path = os.path.join(dist_dir, rel_path)
            if os.path.exists(full_path) and not os.path.isdir(full_path):
                return full_path
            index_path = os.path.join(dist_dir, 'index.html')
            if os.path.exists(index_path):
                return index_path
        return super().translate_path(path)

    def read_autofill_db(self):
        if not os.path.exists(AUTOFILL_FILE):
            return {"autofillProfiles": []}
        with open(AUTOFILL_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return {"autofillProfiles": []}

    def read_db(self):
        if not os.path.exists(DATA_FILE):
            return {"employees": [], "recruitment": [], "leaveRequests": [], "exitRequests": []}
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if isinstance(data, list):
                    return {"employees": data, "recruitment": [], "leaveRequests": [], "exitRequests": []}
                return data
            except json.JSONDecodeError:
                return {"employees": [], "recruitment": [], "leaveRequests": [], "exitRequests": []}

    def write_db(self, db):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=2)

    def do_GET(self):
        if self.path.startswith('/api/'):
            db = self.read_db()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()

            if self.path.startswith('/api/employees'):
                self.wfile.write(json.dumps(db.get('employees', [])).encode('utf-8'))
            elif self.path.startswith('/api/servicenow/sync-approvals'):
                changed, synced = sn_client.check_and_sync_servicenow_approvals(db.get('employees', []))
                if changed:
                    self.write_db(db)
                self.wfile.write(json.dumps({"status": "success", "syncedCount": len(synced), "synced": synced}).encode('utf-8'))
            elif self.path.startswith('/api/recruitment/jobs'):
                self.wfile.write(json.dumps(resume_screener.JOB_DESCRIPTIONS).encode('utf-8'))
            elif self.path.startswith('/api/recruitment'):
                rec_list = db.get('recruitment', [])
                if not rec_list:
                    rec_list = [
                        { "id": "CAND-901", "name": "Aarav Sharma", "candidateName": "Aarav Sharma", "email": "aarav.sharma@example.com", "role": "Senior AI Engineer", "appliedRole": "Senior AI Engineer", "department": "Engineering", "score": "94%", "matchScore": "94%", "stage": "Offer Accepted", "skills": ["Python", "PyTorch", "Generative AI", "LangChain", "FastAPI"], "experienceYears": 5.5 },
                        { "id": "CAND-902", "name": "Priya Iyer", "candidateName": "Priya Iyer", "email": "priya.iyer@example.com", "role": "Lead Product Manager", "appliedRole": "Lead Product Manager", "department": "Product", "score": "89%", "matchScore": "89%", "stage": "Technical Interview", "skills": ["Product Strategy", "Agile", "Roadmapping", "Scrum", "User Stories"], "experienceYears": 6.0 },
                        { "id": "CAND-903", "name": "Rohan Mehta", "candidateName": "Rohan Mehta", "email": "rohan.mehta@example.com", "role": "Enterprise ServiceNow Architect", "appliedRole": "Enterprise ServiceNow Architect", "department": "IT Systems", "score": "91%", "matchScore": "91%", "stage": "HR Screening", "skills": ["ServiceNow", "ITSM", "Workflow Design", "Service Catalog", "IntegrationHub"], "experienceYears": 5.0 }
                    ]
                    db['recruitment'] = rec_list
                    self.write_db(db)
                self.wfile.write(json.dumps(rec_list).encode('utf-8'))
            elif self.path.startswith('/api/leave/requests') or self.path.startswith('/api/leaves'):
                leaves = db.get('leaveRequests', [])
                if not leaves:
                    leaves = [
                        { "id": "LR-301", "employeeName": "Karthik Swaminathan", "empNumber": 41, "type": "Privilege Leave", "from": "2026-10-10", "to": "2026-10-14", "days": 5, "reason": "Annual family travel", "status": "Approved", "orangeHrmAssigned": True, "leaveId": "1" },
                        { "id": "LR-302", "employeeName": "Samantha Chang", "empNumber": 34, "type": "Casual Leave", "from": "2026-10-24", "to": "2026-10-24", "days": 1, "reason": "Personal errands", "status": "Approved", "orangeHrmAssigned": True, "leaveId": "2" }
                    ]
                    db['leaveRequests'] = leaves
                    self.write_db(db)
                self.wfile.write(json.dumps(leaves).encode('utf-8'))
            elif self.path.startswith('/api/exit'):
                self.wfile.write(json.dumps(db.get('exitRequests', [])).encode('utf-8'))
            elif self.path.startswith('/api/rpa/config'):
                self.wfile.write(json.dumps(ae_client.get_config_summary()).encode('utf-8'))
            elif self.path.startswith('/api/servicenow/config'):
                self.wfile.write(json.dumps(sn_client.get_config_summary()).encode('utf-8'))
            elif self.path.startswith('/api/integrations/health'):
                self.wfile.write(json.dumps(check_integrations_health()).encode('utf-8'))
            elif self.path.startswith('/api/autofill'):
                autofill_data = self.read_autofill_db()
                profiles = autofill_data.get('autofillProfiles', [])
                selected = dict(random.choice(profiles)) if profiles else {}
                selected['autofillProfiles'] = profiles
                self.wfile.write(json.dumps(selected).encode('utf-8'))
            elif self.path.startswith('/api/orangehrm/random-employee'):
                emp = orangehrm_client.get_random_employee()
                self.wfile.write(json.dumps(emp).encode('utf-8'))
            elif self.path.startswith('/api/orangehrm/employees'):
                emps = orangehrm_client.get_active_employees()
                self.wfile.write(json.dumps(emps).encode('utf-8'))
            elif self.path.startswith('/api/db'):
                self.wfile.write(json.dumps(db).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({}).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        db = self.read_db()
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode('utf-8')) if post_data else {}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')

        # ServiceNow Service Catalog: Create Onboarding REQ & RITM
        if self.path == '/api/servicenow/create-request':
            sn_result = sn_client.create_onboarding_request(payload)
            self.end_headers()
            self.wfile.write(json.dumps(sn_result).encode('utf-8'))

        # ServiceNow, OrangeHRM & Office 365: HR Approval, Laptop Provisioning & User Provisioning
        elif self.path == '/api/servicenow/approve':
            approve_result = sn_client.approve_and_provision_laptop(payload, payload.get('reqNumber'))
            target_id = payload.get('id')
            if target_id:
                for emp in db.get('employees', []):
                    if emp.get('id') == target_id:
                        emp['status'] = 'Approved'
                        emp['serviceNowStatus'] = 'Approved'
                        emp['hardwareDispatched'] = True
                        emp['laptopTicket'] = approve_result.get('laptopProvisioning', {}).get('ticketNumber')
                        emp['laptopTicketUrl'] = approve_result.get('laptopProvisioning', {}).get('ticketUrl')
                        emp['approvedAt'] = approve_result.get('approvedAt')
                        emp['orangeHrmProfileUrl'] = approve_result.get('orangeHrmProfileUrl')
                        emp['orangeHrmEmpNumber'] = approve_result.get('orangeHrmEmpNumber')
                        emp['orangeHrmStatus'] = 'Profile Created in OrangeHRM PIM'

                        # Office 365 Account Details
                        o365_info = approve_result.get('office365', {})
                        if o365_info.get('status') == 'success':
                            emp['o365UserId'] = o365_info.get('userId')
                            emp['o365Email'] = o365_info.get('userPrincipalName')
                            emp['o365UserPrincipalName'] = o365_info.get('userPrincipalName')
                            emp['o365DisplayName'] = o365_info.get('displayName')
                            emp['o365InitialPassword'] = o365_info.get('initialPassword')
                            emp['o365AdminUrl'] = o365_info.get('adminUrl')
                            emp['o365Status'] = 'Account Active in Office 365'

                        # AutomationEdge T4 Active Directory Workflow Details
                        ae_ad_info = approve_result.get('aeT4Ad', {})
                        if ae_ad_info.get('status') == 'success' or approve_result.get('aeT4RequestId'):
                            emp['aeT4RequestId'] = approve_result.get('aeT4RequestId')
                            emp['aeT4Workflow'] = approve_result.get('aeT4Workflow') or 'AD-Create User and Assin Role'
                        # Offer Letter Email Details
                        offer_info = approve_result.get('offerLetter', {})
                        if offer_info.get('status') == 'success' or offer_info.get('sent'):
                            emp['offerLetterEmailed'] = True
                            emp['offerLetterRecipient'] = offer_info.get('recipient', 'abhishek.malwadkar@valuedx.com')
                            emp['offerLetterPdf'] = offer_info.get('pdfFilename')

                        break
                self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps(approve_result).encode('utf-8'))

        # AutomationEdge RPA: Disabled per user configuration
        elif self.path == '/api/rpa/screen-resume' or self.path == '/api/rpa/schedule-interview' or self.path == '/api/rpa/candidate-communication' or self.path == '/api/rpa/create-ad-account' or self.path == '/api/rpa/asset-allocation' or self.path == '/api/rpa/access-provisioning' or self.path == '/api/rpa/schedule-induction' or self.path == '/api/rpa/onboarding-notification' or self.path == '/api/rpa/trigger-all-onboarding' or self.path == '/api/rpa/submit-resignation':
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Workflow triggers disabled"}).encode('utf-8'))

        # Python Offer Letter PDF Generation & Email Dispatch
        elif self.path == '/api/offer-letter/generate' or self.path == '/api/rpa/generate-offer-letter':
            offer_result = create_and_email_offer_letter(payload)
            c_name = payload.get('candidateName')
            if c_name:
                for cand in db.get('recruitment', []):
                    if cand.get('candidateName') == c_name:
                        cand['status'] = 'Offer Letter Generated & Emailed'
                        cand['offerPdfUrl'] = offer_result.get('downloadUrl')
                        cand['offerPdfFilename'] = offer_result.get('filename')
                        cand['offerGeneratedAt'] = offer_result.get('timestamp')
                        break
                self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps(offer_result).encode('utf-8'))

        elif self.path == '/api/employees':
            if not payload.get('id'):
                payload['id'] = f"EMP-{int(time.time()) % 9000 + 1000}"
            if not payload.get('status'):
                payload['status'] = 'Pending Review'

            # 1. Trigger ServiceNow Service Catalog Onboarding Request (REQ & RITM)
            sn_result = sn_client.create_onboarding_request(payload)
            payload['serviceNowReq'] = sn_result.get('reqNumber')
            payload['serviceNowRitm'] = sn_result.get('ritmNumber')
            payload['serviceNowReqId'] = sn_result.get('requestId')
            payload['serviceNowRitmId'] = sn_result.get('ritmId')
            payload['reqUrl'] = sn_result.get('reqUrl')
            payload['ritmUrl'] = sn_result.get('ritmUrl')
            payload['serviceNowStatus'] = sn_result.get('approvalStatus', 'Pending Approval')
            payload['serviceNowStage'] = sn_result.get('stage', 'HR Document Verification')

            # 2. Trigger T4 Workflow: "HR Demo Req getEMPDetails" with name, email, contact
            ae_emp_result = {}
            try:
                ae_emp_result = ae_client.trigger_req_get_emp_details(payload)
                payload['aeGetEmpDetailsReqId'] = ae_emp_result.get('automationRequestId')
                payload['aeGetEmpDetailsStatus'] = ae_emp_result.get('executionStatus')
            except Exception as e:
                print(f"[AE RPA Error in trigger_req_get_emp_details]: {e}")
                payload['aeGetEmpDetailsError'] = str(e)

            # Save directly to employees list
            employees = db.get('employees', [])
            employees.insert(0, payload)
            db['employees'] = employees
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "data": payload,
                "serviceNow": sn_result,
                "aeGetEmpDetails": ae_emp_result
            }).encode('utf-8'))

        elif self.path == '/api/employees/clear-approved' or self.path == '/api/approvals/clear':
            # Clear approved/completed onboarding history records
            db['employees'] = [e for e in db.get('employees', []) if e.get('status') == 'Pending Review']
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Approval history logs cleared", "data": db['employees']}).encode('utf-8'))

        elif self.path == '/api/employees/clear':
            db['employees'] = []
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "All employee records cleared", "data": []}).encode('utf-8'))

        elif self.path == '/api/employees/update':
            employees = db.get('employees', [])
            target_id = payload.get('id')
            for emp in employees:
                if emp.get('id') == target_id:
                    for k, v in payload.items():
                        if k != 'id':
                            emp[k] = v
                    break
            db['employees'] = employees
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "updated", "data": employees}).encode('utf-8'))

        elif self.path == '/api/recruitment/screen-resume' or self.path == '/api/recruitment/upload':
            file_data_b64 = payload.get('fileData') or payload.get('file') or ""
            file_name = payload.get('fileName') or payload.get('name') or "resume.pdf"
            raw_text = payload.get('rawText') or payload.get('resumeText') or ""
            sample_type = payload.get('sampleType')

            # Pre-built realistic sample resumes for fast screening tests
            if sample_type == 'ai-engineer' and not raw_text and not file_data_b64:
                raw_text = """
                Vikram Adve
                Email: vikram.adve@valuedx.com | Phone: +91 98451 22345 | Bangalore, India
                Senior AI Engineer & LLM Architect
                Summary: Over 5.5 years of progressive experience building production-grade Generative AI pipelines, LangChain agents, PyTorch model fine-tuning, RAG frameworks, Vector Databases (Pinecone, ChromaDB), FastAPI microservices, and multi-agent systems.
                Skills: Python, PyTorch, Generative AI, LLMs, LangChain, RAG, FastAPI, Docker, Machine Learning, Transformers, NLP, Vector Databases, Prompt Engineering, Cloud Architecture, AWS, Kubernetes.
                Experience:
                - Lead AI Engineer at NeuralTech Solutions (2022 - Present): Designed end-to-end Enterprise RAG pipeline processing 2M+ docs with sub-second latency.
                - Machine Learning Engineer at DataVortex Labs (2019 - 2022): Trained custom BERT models, deployed FastAPI prediction servers with 99.9% uptime.
                Education: B.Tech in Computer Science, IIT Bombay (2019)
                """
            elif sample_type == 'servicenow-architect' and not raw_text and not file_data_b64:
                raw_text = """
                Sameer Kulkarni
                Email: sameer.kulkarni@valuedx.com | Phone: +91 97654 33210 | Pune, India
                Enterprise ServiceNow Architect & Lead Consultant
                Summary: 6 years of expertise architecting ServiceNow ITSM, Service Catalog, ITIL processes, Workflow Automation, IntegrationHub REST APIs, CMDB, and Service Portal UI customization.
                Skills: ServiceNow, ITSM, Service Catalog, Workflow Design, GlideScript, JavaScript, REST APIs, IntegrationHub, CMDB, ITIL Certified, Incident Management, Change Management.
                Experience:
                - Senior ServiceNow Architect at CloudApex Systems (2021 - Present): Implemented Service Catalog automation across 15 global business units.
                - ServiceNow Developer at InfoEdge Global (2018 - 2021): Built custom scoped applications and REST IntegrationHub flows.
                """
            elif sample_type == 'product-manager' and not raw_text and not file_data_b64:
                raw_text = """
                Ananya Sen
                Email: ananya.sen@valuedx.com | Phone: +91 98112 44556 | Mumbai, India
                Lead Product Manager - Enterprise SaaS & HR Tech
                Summary: 6+ years driving cross-functional product lifecycle, Agile roadmapping, customer discovery, PRDs, UX wireframing, and Go-To-Market strategies for B2B SaaS platforms.
                Skills: Product Strategy, Agile, Scrum, Roadmapping, User Stories, Stakeholder Management, Data Analytics, UX/UI Design, Market Research, Go-To-Market, Jira, SaaS Metrics.
                Experience:
                - Principal Product Manager at WorkPulse (2022 - Present): Scaled HR Tech enterprise suite from $2M to $12M ARR.
                """

            if file_data_b64 and not raw_text:
                try:
                    if ',' in file_data_b64:
                        file_data_b64 = file_data_b64.split(',', 1)[1]
                    file_bytes = base64.b64decode(file_data_b64)
                    raw_text = resume_screener.extract_text_from_file_bytes(file_bytes, file_name)
                except Exception as ex:
                    print(f"[Resume Screen Error decoding base64]: {ex}")
                    raw_text = ""

            if not raw_text:
                raw_text = "Experienced Professional with strong software engineering and technical background."

            # Parse candidate & match against all Job Descriptions
            candidate_data = resume_screener.parse_resume_details(raw_text, file_name)
            matched_job_name = candidate_data.get('role') or candidate_data.get('appliedRole') or payload.get('jobName') or "Senior AI Engineer"

            # Execute T4 Workflows: "HR Demo Recruitment Get JD" & "HR Demo Recruitment Match JD" with param job_name
            ae_screening_res = {}
            try:
                ae_screening_res = ae_client.trigger_recruitment_screening_pipeline(
                    job_name=matched_job_name,
                    candidate_name=candidate_data.get('name')
                )
                candidate_data['t4RecruitmentPipeline'] = ae_screening_res
                candidate_data['getJdResult'] = ae_screening_res.get('getJd')
                candidate_data['matchJdResult'] = ae_screening_res.get('matchJd')
            except Exception as ae_err:
                print(f"[AE T4 Recruitment Pipeline Error]: {ae_err}")
                candidate_data['t4RecruitmentError'] = str(ae_err)

            # Store in DB recruitment pipeline
            rec_list = db.get('recruitment', [])
            rec_list.insert(0, candidate_data)
            db['recruitment'] = rec_list
            self.write_db(db)

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "candidate": candidate_data,
                "data": rec_list,
                "aeScreening": ae_screening_res
            }).encode('utf-8'))

        elif self.path == '/api/recruitment/schedule-interview':
            cand_id = payload.get('candidateId') or payload.get('id')
            cand_name = payload.get('candidateName') or payload.get('name') or "Candidate"
            role = payload.get('appliedRole') or payload.get('role') or payload.get('jobTitle') or "Senior Engineer"
            dept = payload.get('department') or payload.get('dept') or "Engineering"
            int_date = payload.get('interviewDate') or time.strftime("%A, %B %d, %Y")
            int_time = payload.get('interviewTime') or "03:00 PM - 03:45 PM IST"
            int_type = payload.get('interviewType') or "Technical & AI Architecture Screening"
            panel = payload.get('panel') or "Lead Technical Architect & Talent Acquisition Team"
            
            # Generate Google Meet link
            chars = "abcdefghijklmnopqrstuvwxyz"
            meet_code = f"{''.join(random.choice(chars) for _ in range(3))}-{''.join(random.choice(chars) for _ in range(4))}-{''.join(random.choice(chars) for _ in range(3))}"
            meet_link = payload.get('meetingLink') or f"https://meet.google.com/{meet_code}"

            interview_payload = {
                "id": cand_id,
                "candidateId": cand_id,
                "candidateName": cand_name,
                "appliedRole": role,
                "role": role,
                "department": dept,
                "interviewDate": int_date,
                "interviewTime": int_time,
                "interviewType": int_type,
                "panel": panel,
                "meetingLink": meet_link,
                "score": payload.get('score') or payload.get('matchScore') or "94%",
                "skills": payload.get('skills') or ["Python", "Cloud Architecture", "Generative AI"]
            }

            # 1. Send Google Meet Interview Email via Microsoft Graph API to abhishek.malwadkar@valuedx.com
            email_res = {}
            try:
                print(f"[RECRUITMENT] Sending Google Meet Interview Invitation for {cand_name} to abhishek.malwadkar@valuedx.com...")
                email_res = office365_client.send_interview_email(
                    candidate_data=interview_payload,
                    meeting_link=meet_link,
                    recipient_email="abhishek.malwadkar@valuedx.com"
                )
            except Exception as mail_err:
                print(f"[RECRUITMENT] Email Dispatch Error: {mail_err}")
                email_res = {"status": "error", "message": str(mail_err)}

            # 2. AutomationEdge T4 Interview Scheduling & Candidate Communication
            ae_sched_res = {}
            try:
                ae_sched_res = ae_client.trigger_interview_scheduling(interview_payload)
            except Exception as ae_err:
                print(f"[AE Interview Sched Warning]: {ae_err}")

            # 3. Update candidate in recruitment database
            rec_list = db.get('recruitment', [])
            matched = False
            for cand in rec_list:
                if cand.get('id') == cand_id or cand.get('name') == cand_name or cand.get('candidateName') == cand_name:
                    cand['stage'] = 'Interview Scheduled (Google Meet)'
                    cand['meetingLink'] = meet_link
                    cand['interviewDate'] = int_date
                    cand['interviewTime'] = int_time
                    cand['interviewType'] = int_type
                    cand['interviewScheduled'] = True
                    cand['emailSent'] = True
                    cand['emailRecipient'] = "abhishek.malwadkar@valuedx.com"
                    matched = True
                    break
            
            if not matched:
                interview_payload['stage'] = 'Interview Scheduled (Google Meet)'
                interview_payload['interviewScheduled'] = True
                interview_payload['emailSent'] = True
                rec_list.insert(0, interview_payload)

            db['recruitment'] = rec_list
            self.write_db(db)

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "meetingLink": meet_link,
                "emailResult": email_res,
                "aeScheduling": ae_sched_res,
                "data": rec_list
            }).encode('utf-8'))

        elif self.path == '/api/recruitment/clear':
            db['recruitment'] = []
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Recruitment candidate records cleared", "data": []}).encode('utf-8'))

        elif self.path == '/api/recruitment':
            rec = db.get('recruitment', [])
            rec.insert(0, payload)
            db['recruitment'] = rec
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "data": payload}).encode('utf-8'))

        elif self.path == '/api/leaves':
            leaves = db.get('leaveRequests', [])
            leaves.insert(0, payload)
            db['leaveRequests'] = leaves
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "data": payload}).encode('utf-8'))

        elif self.path == '/api/exit':
            emp_name = payload.get('empName') or payload.get('name') or payload.get('employeeName') or payload.get('email') or "Employee"
            if not payload.get('id'):
                payload['id'] = f"EXIT-{int(time.time()) % 900 + 100}"
            
            # Lookup or determine employee ID
            emp_id = payload.get('empId') or payload.get('emp_id')
            if not emp_id:
                employees = db.get('employees', [])
                for emp in employees:
                    if emp.get('fullName') == emp_name or emp.get('name') == emp_name:
                        emp_id = emp.get('id') or emp.get('empId')
                        break
            if not emp_id:
                emp_id = payload.get('id') or f"EMP-{int(time.time()) % 9000 + 1000}"
            payload['empId'] = emp_id

            # 1. Trigger AutomationEdge T4 Workflow: "HR Demo Offboarding SN Req" (Input: emp_id)
            ae_sn_req_res = {}
            try:
                print(f"\n[OFFBOARDING] Triggering T4 RPA Workflow 'HR Demo Offboarding SN Req' for emp_id: {emp_id}...")
                ae_sn_req_res = ae_client.trigger_offboarding_sn_req(emp_id)
                payload['aeSnReqWorkflow'] = ae_sn_req_res
            except Exception as ae_err:
                print(f"[OFFBOARDING] Error triggering T4 'HR Demo Offboarding SN Req': {ae_err}")
                ae_sn_req_res = {"status": "error", "message": str(ae_err)}

            # 2. Create ServiceNow Offboarding Request & Laptop Recovery Incident assigned to IT
            sn_offboarding_res = sn_client.create_offboarding_request(payload)
            payload['serviceNowReq'] = sn_offboarding_res.get('serviceNowReq')
            payload['serviceNowRitm'] = sn_offboarding_res.get('serviceNowRitm')
            payload['laptopTicket'] = sn_offboarding_res.get('laptopTicket')
            payload['laptopTicketSysId'] = sn_offboarding_res.get('laptopTicketSysId')
            payload['laptopTicketUrl'] = sn_offboarding_res.get('laptopTicketUrl')
            payload['assignedTo'] = sn_offboarding_res.get('assignedTo')
            payload['itClearance'] = False
            payload['itClearanceStatus'] = 'Clearance waiting from IT department'
            payload['accessRevoked'] = False
            payload['o365Deleted'] = False
            payload['orangeHrmDeleted'] = False
            payload['emailSent'] = False

            # Update status in employees list if present
            employees = db.get('employees', [])
            for emp in employees:
                if emp.get('fullName') == emp_name or emp.get('name') == emp_name or emp.get('id') == emp_id:
                    emp['status'] = 'Resigned / Pending HR Offboarding'
                    break
            db['employees'] = employees

            exits = db.get('exitRequests', [])
            exits.insert(0, payload)
            db['exitRequests'] = exits
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "data": payload,
                "aeWorkflow": ae_sn_req_res,
                "serviceNow": sn_offboarding_res
            }).encode('utf-8'))

        elif self.path == '/api/exit/check-clearance':
            target_id = payload.get('id')
            laptop_ticket = payload.get('laptopTicket') or payload.get('ticketNumber')
            exits = db.get('exitRequests', [])
            target_item = None

            for item in exits:
                if item.get('id') == target_id or (laptop_ticket and item.get('laptopTicket') == laptop_ticket):
                    target_item = item
                    break

            if not target_item and exits:
                target_item = exits[0]

            check_res = {}
            if target_item:
                ticket_to_check = target_item.get('laptopTicket') or laptop_ticket
                check_res = sn_client.check_incident_clearance(ticket_to_check)
                target_item['itClearance'] = check_res.get('isCleared', False)
                target_item['itClearanceStatus'] = check_res.get('uiMessage', 'Clearance waiting from IT department')
                target_item['laptopIncidentState'] = check_res.get('stateLabel', 'In Progress')
                if check_res.get('assignedTo') and check_res.get('assignedTo') != "IT Asset Specialist":
                    target_item['assignedTo'] = check_res.get('assignedTo')
                self.write_db(db)

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "clearance": check_res,
                "data": target_item
            }).encode('utf-8'))

        elif self.path == '/api/exit/toggle-clearance' or self.path == '/api/exit/resolve-incident':
            target_id = payload.get('id')
            laptop_ticket = payload.get('laptopTicket') or payload.get('ticketNumber')
            resolve_flag = payload.get('resolve')
            exits = db.get('exitRequests', [])
            target_item = None

            for item in exits:
                if item.get('id') == target_id or (laptop_ticket and item.get('laptopTicket') == laptop_ticket):
                    target_item = item
                    break

            if not target_item and exits:
                target_item = exits[0]

            check_res = {}
            if target_item:
                ticket_to_check = target_item.get('laptopTicket') or laptop_ticket
                # If resolve_flag is not explicitly provided, toggle based on current status
                if resolve_flag is None:
                    resolve_flag = not target_item.get('itClearance', False)
                
                check_res = sn_client.resolve_laptop_incident(ticket_to_check, resolve=resolve_flag)
                target_item['itClearance'] = check_res.get('isCleared', False)
                target_item['itClearanceStatus'] = check_res.get('uiMessage', 'Clearance waiting from IT department')
                target_item['laptopIncidentState'] = check_res.get('stateLabel', 'Resolved' if resolve_flag else 'In Progress')
                if check_res.get('assignedTo') and check_res.get('assignedTo') != "IT Asset Specialist":
                    target_item['assignedTo'] = check_res.get('assignedTo')
                self.write_db(db)

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "clearance": check_res,
                "data": target_item
            }).encode('utf-8'))

        elif self.path == '/api/exit/clear':
            db['exitRequests'] = []
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "message": "Exit requests cleared", "data": []}).encode('utf-8'))

        elif self.path == '/api/exit/update':
            exits = db.get('exitRequests', [])
            target_id = payload.get('id')
            for item in exits:
                if item.get('id') == target_id:
                    for k, v in payload.items():
                        if k != 'id':
                            item[k] = v
                    break
            db['exitRequests'] = exits
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "data": exits}).encode('utf-8'))

        elif self.path == '/api/exit/revoke' or self.path == '/api/o365/delete-user':
            emp_ident = payload.get('empName') or payload.get('employeeName') or payload.get('fullName') or payload.get('identifier') or payload.get('email') or "Employee"
            target_id = payload.get('id')
            emp_id = payload.get('empId') or payload.get('emp_id')

            exits = db.get('exitRequests', [])
            target_exit = None
            for item in exits:
                if item.get('id') == target_id or item.get('empName') == emp_ident:
                    target_exit = item
                    if not emp_id and item.get('empId'):
                        emp_id = item.get('empId')
                    break

            employees = db.get('employees', [])
            for emp in employees:
                if emp.get('fullName') == emp_ident or emp.get('name') == emp_ident or (emp_id and emp.get('id') == emp_id):
                    if not emp_id and emp.get('id'):
                        emp_id = emp.get('id')
                    break

            if not emp_id:
                emp_id = target_id or f"EMP-{int(time.time()) % 9000 + 1000}"

            ad_username = payload.get('adUsername') or payload.get('ad_username') or payload.get('AD username')
            if not ad_username:
                name_parts = emp_ident.strip().split()
                if len(name_parts) >= 2:
                    ad_username = f"{name_parts[0]}.{name_parts[1]}"
                else:
                    ad_username = name_parts[0] if name_parts else "Employee"

            # -------------------------------------------------------------------------
            # 1. Trigger AutomationEdge T4 Deprovisioning Workflows in Sequence:
            #    1. "HR Demo OffboardingRemoveADUser" (Param: "AD username")
            #    2. "HR DEMO offboarding Delete O365 user" (Params: "emp_id", "emp_name")
            #    3. "HR DEMO Offboarding Delete OrangeHRM User" (Params: "emp_id", "emp_name")
            # -------------------------------------------------------------------------
            ae_revoke_pipeline = {}
            try:
                ae_revoke_pipeline = ae_client.trigger_offboarding_deprovision_pipeline(
                    emp_id=emp_id,
                    emp_name=emp_ident,
                    ad_username=ad_username
                )
            except Exception as ae_pipeline_err:
                print(f"[OFFBOARDING] T4 Deprovisioning Pipeline Error: {ae_pipeline_err}")
                ae_revoke_pipeline = {"status": "error", "message": str(ae_pipeline_err)}

            # 2. Direct Office 365 Entra ID User Account Deletion
            o365_result = office365_client.delete_user_account(emp_ident)

            # 3. Direct OrangeHRM Employee Profile Deletion
            orangehrm_result = orangehrm_client.delete_employee_profile(emp_ident)

            # 4. Send Clearance Email Notification to abhishek.malwadkar@valuedx.com
            email_result = office365_client.send_offboarding_email(
                {"empName": emp_ident, "department": payload.get("department", "Engineering"), "lastWorkingDay": payload.get("lastWorkingDay", "2026-11-30")},
                recipient_email="abhishek.malwadkar@valuedx.com"
            )

            # Update status in db
            for item in exits:
                if item.get('id') == target_id or item.get('empName') == emp_ident:
                    item['accessRevoked'] = True
                    item['o365Deleted'] = True
                    item['orangeHrmDeleted'] = True
                    item['emailSent'] = True
                    item['t4RevokePipeline'] = ae_revoke_pipeline
                    break
            db['exitRequests'] = exits

            for emp in employees:
                if emp.get('fullName') == emp_ident or emp.get('name') == emp_ident or (emp_id and emp.get('id') == emp_id):
                    emp['status'] = 'Offboarded & Deprovisioned'
                    emp['o365Deleted'] = True
                    emp['orangeHrmDeleted'] = True
                    emp['accessRevoked'] = True
                    break
            db['employees'] = employees

            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "aeWorkflows": ae_revoke_pipeline,
                "office365": o365_result,
                "orangehrm": orangehrm_result,
                "email": email_result,
                "data": exits
            }).encode('utf-8'))

        elif self.path == '/api/exit/issue-relieving-letter':
            emp_ident = payload.get('empName') or payload.get('employeeName') or payload.get('fullName') or "Valued Employee"
            target_id = payload.get('id')
            emp_id = payload.get('empId') or payload.get('emp_id') or target_id

            exits = db.get('exitRequests', [])
            target_exit = None
            for item in exits:
                if item.get('id') == target_id or item.get('empName') == emp_ident:
                    target_exit = item
                    break

            employees = db.get('employees', [])
            target_emp = None
            for emp in employees:
                if emp.get('fullName') == emp_ident or emp.get('name') == emp_ident or (emp_id and emp.get('id') == emp_id):
                    target_emp = emp
                    break

            emp_data = {
                'empName': emp_ident,
                'empId': emp_id or (target_exit and target_exit.get('empId')) or (target_emp and target_emp.get('id')) or f"EMP-{int(time.time()) % 9000 + 1000}",
                'designation': payload.get('designation') or (target_emp and target_emp.get('jobTitle')) or payload.get('jobTitle') or 'Senior Software Engineer',
                'department': payload.get('department') or (target_exit and target_exit.get('department')) or (target_emp and target_emp.get('department')) or 'Engineering',
                'joiningDate': payload.get('joiningDate') or (target_emp and target_emp.get('joiningDate')) or 'January 15, 2023',
                'lastWorkingDay': payload.get('lastWorkingDay') or (target_exit and target_exit.get('lastWorkingDay')) or time.strftime('%B %d, %Y'),
                'laptopTicket': (target_exit and target_exit.get('laptopTicket')) or payload.get('laptopTicket') or 'INC0040469',
                'serviceNowReq': (target_exit and target_exit.get('serviceNowReq')) or payload.get('serviceNowReq') or 'REQ0014290',
            }

            # 1. Generate PDF Relieving & Experience Letter
            pdf_path = generate_relieving_letter_pdf(emp_data)

            # 2. Send Relieving Letter Email to abhishek.malwadkar@valuedx.com
            recipient = payload.get('recipientEmail') or "abhishek.malwadkar@valuedx.com"
            email_res = office365_client.send_relieving_letter_email(emp_data, pdf_path, recipient_email=recipient)

            # 3. Update DB
            if target_exit:
                target_exit['relievingLetterIssued'] = True
                target_exit['relievingLetterPdf'] = pdf_path
                target_exit['relievingLetterDate'] = time.strftime('%Y-%m-%d %H:%M:%S')
            else:
                for item in exits:
                    if item.get('empName') == emp_ident:
                        item['relievingLetterIssued'] = True
                        item['relievingLetterPdf'] = pdf_path
                        item['relievingLetterDate'] = time.strftime('%Y-%m-%d %H:%M:%S')
                        break
            db['exitRequests'] = exits
            self.write_db(db)

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": f"Relieving letter issued and emailed to {recipient} for {emp_ident}",
                "pdfPath": pdf_path,
                "emailResult": email_res,
                "data": target_exit or exits
            }).encode('utf-8'))

        # Leave Request Submission
        elif self.path == '/api/leave/request':
            leaves = db.get('leaveRequests', [])
            req_id = payload.get('id') or f"LR-{random.randint(400, 999)}"
            emp_number = payload.get('empNumber') or 41
            new_leave = {
                "id": req_id,
                "employeeName": payload.get('employeeName') or payload.get('fullName') or "Karthik Swaminathan",
                "empNumber": emp_number,
                "type": payload.get('type') or payload.get('leaveType') or "Casual Leave",
                "from": payload.get('from') or payload.get('fromDate') or time.strftime('%Y-%m-%d'),
                "to": payload.get('to') or payload.get('toDate') or time.strftime('%Y-%m-%d'),
                "days": payload.get('days') or 1,
                "reason": payload.get('reason') or "Personal event",
                "status": "Pending HR Approval",
                "createdAt": time.strftime('%Y-%m-%d %H:%M:%S')
            }
            leaves.insert(0, new_leave)
            db['leaveRequests'] = leaves
            self.write_db(db)

            # Trigger AutomationEdge T4 "HR Demo Apply Leave" workflow in background
            print(f"[RPA TRIGGER] Triggering T4 'HR Demo Apply Leave' for Emp #{emp_number}...")
            threading.Thread(
                target=ae_client.trigger_apply_leave,
                args=(emp_number,),
                daemon=True
            ).start()

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": f"Leave request {req_id} submitted for HR approval and T4 'HR Demo Apply Leave' triggered.",
                "data": new_leave,
                "requests": leaves
            }).encode('utf-8'))

        # OrangeHRM Assign Leave / HR Leave Approval Endpoint
        elif self.path in ['/api/leave/application/assign', '/api/leave/assign', '/api/leave/approve']:
            emp_ident = payload.get('employeeName') or payload.get('empNumber') or payload.get('fullName') or "Karthik Swaminathan"
            emp_num = payload.get('empNumber') or 41
            leave_type = payload.get('leaveType') or payload.get('type') or "Casual Leave"
            from_date = payload.get('fromDate') or payload.get('from') or time.strftime('%Y-%m-%d')
            to_date = payload.get('toDate') or payload.get('to') or from_date
            comment = payload.get('comment') or payload.get('reason') or "Leave assigned and approved via MangoHRMS Portal"
            req_id = payload.get('id') or payload.get('requestId')

            print(f"[LEAVE ASSIGN] Assigning {leave_type} in OrangeHRM for {emp_ident} ({from_date} to {to_date})...")
            assign_res = orangehrm_client.assign_employee_leave(
                employee_name_or_id=emp_ident,
                leave_type_name=leave_type,
                from_date=from_date,
                to_date=to_date,
                comment=comment
            )

            resolved_emp_num = assign_res.get('empNumber') or emp_num

            # Update DB leave requests
            leaves = db.get('leaveRequests', [])
            updated_req = None
            for l in leaves:
                if (req_id and l.get('id') == req_id) or (l.get('from') == from_date and l.get('status') == 'Pending HR Approval'):
                    l['status'] = 'Approved'
                    l['orangeHrmAssigned'] = True
                    l['orangeHrmLeaveId'] = assign_res.get('leaveId')
                    l['approvedAt'] = time.strftime('%Y-%m-%d %H:%M:%S')
                    updated_req = l
                    break

            db['leaveRequests'] = leaves
            self.write_db(db)

            # Trigger AutomationEdge T4 "HR Demo Leave Approval" workflow in background
            print(f"[RPA TRIGGER] Triggering T4 'HR Demo Leave Approval' for Emp #{resolved_emp_num}...")
            threading.Thread(
                target=ae_client.trigger_leave_approval,
                args=(resolved_emp_num,),
                daemon=True
            ).start()

            # Trigger notification in background thread
            subject = f"Leave Request Approved & Assigned in OrangeHRM: {emp_ident} ({leave_type})"
            threading.Thread(
                target=office365_client._dispatch_mail,
                kwargs={
                    "subject": subject,
                    "html_body": f"<p>Leave for <strong>{emp_ident}</strong> ({leave_type}: {from_date} to {to_date}) has been approved and assigned in OrangeHRM.</p>",
                    "log_title": "Leave Approval Email"
                },
                daemon=True
            ).start()

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": f"Leave approved, assigned in OrangeHRM, and T4 'HR Demo Leave Approval' triggered for {emp_ident}.",
                "orangeHrm": assign_res,
                "data": updated_req,
                "requests": leaves
            }).encode('utf-8'))

        else:
            self.send_error(404, "Endpoint Not Found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

import threading


def servicenow_watcher_loop():
    """
    Periodically checks if any pending request has been approved directly in ServiceNow PDI.
    When approved in ServiceNow, automatically triggers:
    1st: AD account creation (AutomationEdge T4)
    2nd: Office 365 account creation
    3rd: OrangeHRM profile creation with Office 365 email
    4th: ServiceNow IT Provisioning Ticket
    """
    time.sleep(10)
    while True:
        try:
            time.sleep(25)
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    db = json.load(f)
                changed, synced = sn_client.check_and_sync_servicenow_approvals(db.get('employees', []))
                if changed:
                    with open(DATA_FILE, 'w', encoding='utf-8') as f:
                        json.dump(db, f, indent=2)
                    print(f"[ServiceNow Poller] Successfully processed {len(synced)} approval(s) detected from ServiceNow!")
        except Exception as e:
            pass

if __name__ == '__main__':
    os.chdir(os.path.dirname(__file__))
    watcher_thread = threading.Thread(target=servicenow_watcher_loop, daemon=True)
    watcher_thread.start()
    with socketserver.TCPServer((HOST, PORT), MangoHRMSRequestHandler) as httpd:
        print(f"AutomationEdge HR server running at http://localhost:{PORT}")
        httpd.serve_forever()

