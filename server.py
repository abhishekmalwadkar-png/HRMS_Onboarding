import http.server
import socketserver
import json
import os
import shutil
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
from task_queue import task_queue, retry_on_failure

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

INDIAN_FIRST_NAMES = [
    "Aarav", "Aditya", "Advait", "Akash", "Alok", "Amit", "Ananya", "Aniket", "Anjali", "Arjun",
    "Aryan", "Ashwin", "Ayush", "Bhavna", "Chetan", "Deepak", "Devendra", "Divya", "Gaurav", "Harish",
    "Ishaan", "Karan", "Karthik", "Kavita", "Kunal", "Manish", "Mayank", "Meera", "Mohit", "Naveen",
    "Neha", "Nikhil", "Nilesh", "Omkar", "Pankaj", "Pooja", "Pranav", "Prateek", "Priya", "Priyanka",
    "Rahul", "Rajesh", "Rakesh", "Ramesh", "Rhea", "Rishabh", "Ritu", "Riya", "Rohan", "Rohit",
    "Sachin", "Sameer", "Sanjay", "Saurabh", "Shalini", "Shivam", "Shreya", "Siddharth", "Simran", "Sneha",
    "Soham", "Sumit", "Sunil", "Suresh", "Swati", "Tanvi", "Tarun", "Tushar", "Varun", "Vikram",
    "Vinay", "Vishal", "Vivek", "Yash"
]

INDIAN_LAST_NAMES = [
    "Agarwal", "Bansal", "Bhandari", "Bhatia", "Bhosale", "Chavan", "Chopra", "Deshmukh", "Dubey", "Gaikwad",
    "Goel", "Gokhale", "Gupta", "Gupte", "Hegde", "Iyer", "Jadhav", "Jain", "Jindal", "Joshi",
    "Kadam", "Kamath", "Kapoor", "Khanna", "Kulkarni", "Malhotra", "Mane", "Mehta", "Menon", "Mishra",
    "Mittal", "More", "Mukherjee", "Nair", "Pandey", "Patel", "Patil", "Pawar", "Pillai", "Prabhu",
    "Rao", "Reddy", "Salunkhe", "Sawant", "Saxena", "Sethi", "Sharma", "Shetty", "Shinde", "Singhal",
    "Srivastava", "Tambe", "Tendulkar", "Tiwari", "Varma", "Verma"
]

JOB_ROLES_POOL = [
    ("Engineering", "Staff AI Systems Engineer", "Amit Deshmukh (VP of Engineering)", "Apple MacBook Pro M3 Max", "₹34,50,000 INR / annum (₹34.5 LPA)"),
    ("Engineering", "Lead Cloud Solutions Architect", "Suresh Nair (Director of Cloud Infrastructure)", "Apple MacBook Pro M3 Max", "₹36,00,000 INR / annum (₹36.0 LPA)"),
    ("Engineering", "Senior Machine Learning Specialist", "Amit Deshmukh (VP of Engineering)", "Apple MacBook Pro M3 Max", "₹29,00,000 INR / annum (₹29.0 LPA)"),
    ("Engineering", "Full Stack DevOps Engineer", "David Miller (Director of Engineering)", "Dell Precision 5680 Workstation", "₹24,50,000 INR / annum (₹24.5 LPA)"),
    ("Engineering", "Senior Backend Platform Engineer", "Amit Deshmukh (VP of Engineering)", "Apple MacBook Pro M3 Max", "₹27,00,000 INR / annum (₹27.0 LPA)"),
    ("Data & AI", "Principal Data Platform Architect", "Priya Iyer (Head of Data & AI)", "Apple MacBook Pro M3 Max", "₹38,00,000 INR / annum (₹38.0 LPA)"),
    ("Data & AI", "Lead Data Science Engineer", "Priya Iyer (Head of Data & AI)", "Apple MacBook Pro M3 Max", "₹28,50,000 INR / annum (₹28.5 LPA)"),
    ("Quality Assurance", "Lead Automation QA Engineer", "Rohan Mehta (Director of QA)", "Lenovo ThinkPad P1 Gen 6", "₹21,00,000 INR / annum (₹21.0 LPA)"),
    ("Cloud Infrastructure", "Senior Site Reliability Engineer", "Suresh Nair (Director of Cloud Infrastructure)", "Apple MacBook Pro M3 Max", "₹26,00,000 INR / annum (₹26.0 LPA)"),
    ("Product Management", "Senior Technical Product Manager", "Pooja Deshmukh (VP of Product)", "Apple MacBook Pro M3 Max", "₹31,00,000 INR / annum (₹31.0 LPA)"),
    ("Cybersecurity", "Enterprise Security Architect", "Vikram Malhotra (CISO)", "Lenovo ThinkPad P1 Gen 6", "₹33,00,000 INR / annum (₹33.0 LPA)")
]

BANKS_POOL = [
    ("HDFC Bank", "HDFC0001234"),
    ("ICICI Bank", "ICIC0000456"),
    ("State Bank of India", "SBIN0008765"),
    ("Axis Bank", "UTIB0001122"),
    ("Kotak Mahindra Bank", "KKBK0000123")
]

ADDRESSES_POOL = [
    "Flat 402, Marvel Palms, Baner, Pune, Maharashtra 411045",
    "Tower 8, Apt 1104, Blue Ridge Town, Hinjawadi Phase 2, Pune, Maharashtra 411057",
    "B-303, Rohan Tarang, Wakad, Pune, Maharashtra 411057",
    "1200 Silicon Residency, Sector 5, HSR Layout, Bengaluru, Karnataka 560102",
    "Apt 601, Prestige Oasis, Whitefield, Bengaluru, Karnataka 560066",
    "Flat 15B, Lodha Bellissimo, Apollo Mills, Lower Parel, Mumbai, Maharashtra 400011",
    "Plot 45, Jubilee Hills, Road No. 36, Hyderabad, Telangana 500033",
    "Villa 12, Palm Meadows, Kharadi, Pune, Maharashtra 411014",
    "B-12, Panchsheel Park, New Delhi, Delhi 110017",
    "Row House 7, Amanora Sweet Water Villas, Hadapsar, Pune, Maharashtra 411028"
]


_OHRM_NAMES_CACHE = {"names": set(), "last_updated": 0}


class MangoHRMSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def read_autofill_db(self):
        if not os.path.exists(AUTOFILL_FILE):
            return {"autofillProfiles": []}
        with open(AUTOFILL_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return {"autofillProfiles": []}

    def generate_unique_candidate_profile(self):
        """
        Dynamically generates a 100% unique Indian employee profile on every request.
        Cross-checks existing employees in employees.json and OrangeHRM to guarantee zero duplicates.
        """
        existing_names = set()
        try:
            db = self.read_db()
            for emp in db.get('employees', []):
                n = emp.get('fullName') or emp.get('name')
                if n:
                    existing_names.add(n.strip().lower())
            for c in db.get('recruitment', []):
                n = c.get('fullName') or c.get('candidateName') or c.get('name')
                if n:
                    existing_names.add(n.strip().lower())
        except Exception:
            pass

        # Check OrangeHRM active employees (cached 60s for instant UI responsiveness)
        global _OHRM_NAMES_CACHE
        now = time.time()
        if now - _OHRM_NAMES_CACHE.get("last_updated", 0) > 60:
            try:
                ohrm_emps = orangehrm_client.get_active_employees()
                names = set()
                for oemp in ohrm_emps:
                    n = oemp.get('fullName') or f"{oemp.get('firstName', '')} {oemp.get('lastName', '')}".strip()
                    if n:
                        names.add(n.strip().lower())
                _OHRM_NAMES_CACHE["names"] = names
                _OHRM_NAMES_CACHE["last_updated"] = now
            except Exception:
                pass
        existing_names.update(_OHRM_NAMES_CACHE.get("names", set()))

        # Pick a unique First + Last Name that has never been used
        first_name = random.choice(INDIAN_FIRST_NAMES)
        last_name = random.choice(INDIAN_LAST_NAMES)
        full_name = f"{first_name} {last_name}"

        attempts = 0
        while full_name.lower() in existing_names and attempts < 300:
            first_name = random.choice(INDIAN_FIRST_NAMES)
            last_name = random.choice(INDIAN_LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            attempts += 1

        if full_name.lower() in existing_names:
            first_name = f"{first_name}"
            last_name = f"{last_name}{random.randint(10, 99)}"
            full_name = f"{first_name} {last_name}"

        dept, role, mgr, hardware, salary = random.choice(JOB_ROLES_POOL)
        bank_name, ifsc = random.choice(BANKS_POOL)
        addr = random.choice(ADDRESSES_POOL)

        rand_id_num = random.randint(1000, 9999)
        pan_char = random.choice("FGHJKLMNPQRSTUVWXYZ")
        pan = f"ABCDE{rand_id_num}{pan_char}"

        aadhaar_p1 = random.randint(2000, 8999)
        aadhaar_p2 = random.randint(1000, 9999)
        aadhaar_p3 = random.randint(1000, 9999)
        aadhaar = f"{aadhaar_p1} {aadhaar_p2} {aadhaar_p3}"

        uan = f"1012 {random.randint(1000, 9999)} {random.randint(1000, 9999)}"
        phone = f"+91 {random.choice([98, 97, 96, 95, 99, 93])}{random.randint(10, 99)} {random.randint(10000, 99999)}"
        account_num = f"{random.randint(100000000000, 999999999999)}"

        clean_slug = f"{first_name.lower()}.{last_name.lower()}"
        email = f"{clean_slug}@example.com"

        dob_year = random.randint(1991, 1999)
        dob_month = random.randint(1, 12)
        dob_day = random.randint(1, 28)
        dob = f"{dob_year}-{dob_month:02d}-{dob_day:02d}"

        relative_relation = random.choice(['Father', 'Mother', 'Spouse', 'Brother', 'Sister'])
        relative_first = random.choice(INDIAN_FIRST_NAMES)
        emergency_name = f"{relative_first} {last_name} ({relative_relation})"
        emergency_phone = f"+91 {random.choice([98, 97, 96, 95])}{random.randint(10, 99)} {random.randint(10000, 99999)}"

        unique_profile = {
            "id": f"DEMO-{random.randint(100, 999)}",
            "profileName": f"{full_name} ({role})",
            "fullName": full_name,
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "phone": phone,
            "dob": dob,
            "pan": pan,
            "aadhaar": aadhaar,
            "uan": uan,
            "emergencyName": emergency_name,
            "emergencyPhone": emergency_phone,
            "address": addr,
            "department": dept,
            "jobTitle": role,
            "manager": mgr,
            "employmentType": "Full-Time Permanent",
            "workLocation": random.choice(["Hybrid", "On-Site (Pune Tech Park)", "Remote"]),
            "startDate": "2026-10-25",
            "bankName": bank_name,
            "bankAccount": account_num,
            "accountNumber": account_num,
            "routingCode": ifsc,
            "hardware": hardware,
            "healthPlan": "Platinum Premier PPO ($0 Deductible)",
            "pfContribution": "12%",
            "lndPerk": "Tech Conferences & Cloud Certifications",
            "salary": salary,
            "idDocumentName": f"Aadhaar_Passport_{first_name}_{last_name}.pdf",
            "educationDocName": f"Degree_Certificate_{first_name}_{last_name}.pdf",
            "taxDocumentName": f"Form16_Tax_Compliance_{first_name}_{last_name}.pdf",
            "offerDocumentName": f"Signed_Offer_Letter_{first_name}_{last_name}.pdf",
            "uanDocumentName": f"UAN_Card_{first_name}_{last_name}_EPFO.pdf",
            "salarySlipDocName": f"Salary_Slip_{first_name}_{last_name}_Recent.pdf"
        }
        return unique_profile

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
        # Direct ServiceNow Single-Click Auto-Login Bridge (Serves auto-submitting session page)
        if self.path.split('?')[0] in ('/api/servicenow/direct-login', '/servicenow/direct-login', '/servicenow-login'):
            query = self.path.split('?')[1] if '?' in self.path else ''
            import urllib.parse
            params = urllib.parse.parse_qs(query)
            target = params.get('target', [None])[0] or params.get('url', [None])[0] or params.get('destination', [None])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            html = sn_client.generate_direct_login_html(target_url=target)
            self.wfile.write(html.encode('utf-8'))
            return

        # Direct AutomationEdge T4 Single-Click Auto-Login Bridge
        if self.path.split('?')[0] in ('/api/rpa/direct-login', '/rpa/direct-login', '/t4-login', '/t4/direct-login'):
            query = self.path.split('?')[1] if '?' in self.path else ''
            import urllib.parse
            params = urllib.parse.parse_qs(query)
            target = params.get('target', [None])[0] or params.get('url', [None])[0] or "https://t4.automationedge.com/#/requests/list"
            self.send_response(302)
            self.send_header('Location', target)
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            return

        if self.path.startswith('/api/'):
            db = self.read_db()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()

            if self.path.startswith('/api/servicenow/token'):
                try:
                    token_info = sn_client.get_token_info()
                    self.wfile.write(json.dumps(token_info).encode('utf-8'))
                except Exception as e:
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            elif self.path.startswith('/api/employees'):
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
            elif self.path.startswith('/api/orangehrm/token'):
                try:
                    session = orangehrm_client._get_authenticated_session()
                    self.wfile.write(json.dumps({
                        "status": "success",
                        "authenticated": True,
                        "user": orangehrm_client.username,
                        "portalUrl": f"{orangehrm_client.base_url}/web/index.php/pim/viewEmployeeList",
                        "loginUrl": f"{orangehrm_client.base_url}/web/index.php/auth/login",
                        "message": "OrangeHRM session authenticated & verified successfully."
                    }).encode('utf-8'))
                except Exception as e:
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            elif self.path.startswith('/api/rpa/token'):
                try:
                    token = ae_client.authenticate()
                    self.wfile.write(json.dumps({
                        "status": "success" if token else "error",
                        "authenticated": bool(token),
                        "token": token,
                        "user": ae_client.username,
                        "orgCode": ae_client.org_code,
                        "portalUrl": "https://t4.automationedge.com/#/requests/list",
                        "message": "AutomationEdge T4 token generated successfully." if token else "Authentication failed"
                    }).encode('utf-8'))
                except Exception as e:
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            elif self.path.startswith('/api/rpa/config'):
                self.wfile.write(json.dumps(ae_client.get_config_summary()).encode('utf-8'))
            elif self.path.startswith('/api/servicenow/config'):
                self.wfile.write(json.dumps(sn_client.get_config_summary()).encode('utf-8'))
            elif self.path.startswith('/api/integrations/health'):
                self.wfile.write(json.dumps(check_integrations_health()).encode('utf-8'))
            elif self.path.startswith('/api/autofill'):
                profile = self.generate_unique_candidate_profile()
                profile_copy = dict(profile)
                profile['autofillProfiles'] = [profile_copy]
                self.wfile.write(json.dumps(profile).encode('utf-8'))
            elif self.path.startswith('/api/orangehrm/random-employee'):
                emp = orangehrm_client.get_random_employee()
                self.wfile.write(json.dumps(emp).encode('utf-8'))
            elif self.path.startswith('/api/orangehrm/employees'):
                emps = orangehrm_client.get_active_employees()
                self.wfile.write(json.dumps(emps).encode('utf-8'))
            elif self.path.startswith('/api/tasks/queue'):
                self.wfile.write(json.dumps({
                    "status": "success",
                    "metrics": task_queue.get_metrics(),
                    "tasks": task_queue.list_tasks(limit=50)
                }).encode('utf-8'))
            elif self.path.startswith('/api/tasks/status'):
                task_id = self.path.split('taskId=', 1)[1].split('&', 1)[0] if 'taskId=' in self.path else ''
                task_info = task_queue.get_task(task_id) if task_id else None
                self.wfile.write(json.dumps({
                    "status": "success" if task_info else "error",
                    "task": task_info
                }).encode('utf-8'))
            elif self.path.startswith('/api/db'):
                self.wfile.write(json.dumps(db).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({}).encode('utf-8'))
        elif self.path.split('?')[0] in ('/app-debug.apk', '/HRMS_Onboarding.apk', '/download-apk', '/api/download-apk'):
            apk_path = os.path.join(os.path.dirname(__file__), 'app-debug.apk')
            if not os.path.exists(apk_path):
                apk_path = os.path.join(os.path.dirname(__file__), 'frontend', 'public', 'HRMS_Onboarding.apk')
            if os.path.exists(apk_path):
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.android.package-archive')
                self.send_header('Content-Disposition', 'attachment; filename="HRMS_Onboarding.apk"')
                self.send_header('Content-Length', str(os.path.getsize(apk_path)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(apk_path, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)
                return
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'APK file not found')
                return
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
                        # Offer Letter Email & PDF Download Details
                        offer_info = approve_result.get('offerLetter', {})
                        pdf_fn = offer_info.get('pdfFilename') or approve_result.get('offerPdfFilename')
                        if pdf_fn:
                            emp['offerLetterPdf'] = pdf_fn
                            emp['offerPdfUrl'] = f"/generated_offers/{pdf_fn}"
                            emp['offerDownloadUrl'] = f"/generated_offers/{pdf_fn}"
                        if offer_info.get('status') == 'success' or offer_info.get('sent'):
                            emp['offerLetterEmailed'] = True
                            emp['offerLetterRecipient'] = offer_info.get('recipient') or os.environ.get('HR_NOTIFICATION_RECIPIENT', '')

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

            # 1. Send Google Meet Interview Email
            email_res = {}
            recip = payload.get('email') or payload.get('recipientEmail') or os.environ.get('HR_NOTIFICATION_RECIPIENT', '')
            try:
                print(f"[RECRUITMENT] Sending Google Meet Interview Invitation for {cand_name} to {recip}...")
                email_res = office365_client.send_interview_email(
                    candidate_data=interview_payload,
                    meeting_link=meet_link,
                    recipient_email=recip
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
                    cand['emailRecipient'] = recip
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

        elif self.path == '/api/exit/demo':
            now_ts = int(time.time())
            date_today = time.strftime('%Y-%m-%d')

            # 1. Fetch live employees present in OrangeHRM
            orange_emps = []
            try:
                orange_emps = orangehrm_client.get_active_employees()
            except Exception as oe:
                print(f"[OrangeHRM Fetch for Demo Exit Note]: {oe}")

            # Also consider approved employees in database that were synced to OrangeHRM
            db_emps = [e for e in db.get('employees', []) if e.get('orangeHrmEmpNumber') or e.get('status') == 'Approved']

            # Avoid re-adding employees that already have an active exit clearance
            active_exit_names = {str(x.get('empName', '')).strip().lower() for x in db.get('exitRequests', [])}

            candidate_pool = []
            seen_names = set()

            # Exclude specific employees like Suhas Kajawe per requirement
            def is_excluded_resignation_employee(name_str):
                n = str(name_str or '').lower()
                return 'suhas' in n or 'kajawe' in n or 'kajwe' in n

            for emp in orange_emps:
                name = str(emp.get('fullName') or '').strip()
                if name and not is_excluded_resignation_employee(name) and name.lower() not in seen_names and name.lower() not in active_exit_names:
                    seen_names.add(name.lower())
                    candidate_pool.append({
                        "fullName": name,
                        "empId": emp.get('empId') or f"EMP-{emp.get('empNumber', '1000')}",
                        "empNumber": emp.get('empNumber'),
                        "department": emp.get('department') or "Engineering",
                        "jobTitle": emp.get('jobTitle') or "Software Specialist"
                    })

            for emp in db_emps:
                name = str(emp.get('fullName') or emp.get('name') or '').strip()
                if name and not is_excluded_resignation_employee(name) and name.lower() not in seen_names and name.lower() not in active_exit_names:
                    seen_names.add(name.lower())
                    candidate_pool.append({
                        "fullName": name,
                        "empId": emp.get('id') or f"EMP-{emp.get('orangeHrmEmpNumber', '2000')}",
                        "empNumber": emp.get('orangeHrmEmpNumber'),
                        "department": emp.get('department') or "Engineering",
                        "jobTitle": emp.get('jobTitle') or "Staff Engineer"
                    })

            # If still fewer than 3, pick from all OrangeHRM employees (strictly excluding Suhas Kajawe)
            if len(candidate_pool) < 3:
                for emp in orange_emps:
                    name = str(emp.get('fullName') or '').strip()
                    if name and not is_excluded_resignation_employee(name) and name.lower() not in seen_names:
                        seen_names.add(name.lower())
                        candidate_pool.append({
                            "fullName": name,
                            "empId": emp.get('empId') or f"EMP-{emp.get('empNumber', '1000')}",
                            "empNumber": emp.get('empNumber'),
                            "department": emp.get('department') or "Engineering",
                            "jobTitle": emp.get('jobTitle') or "Software Specialist"
                        })
                    if len(candidate_pool) >= 5:
                        break

            # Select up to 3 employees
            selected_emps = candidate_pool[:3]
            sample_reasons = [
                "Pursuing higher executive fellowship and cloud architecture research.",
                "Accepted senior leadership position at enterprise partner organization.",
                "Relocating internationally / family relocation abroad.",
                "Transitioning to specialized independent AI consultancy.",
                "Pursuing entrepreneurial venture in enterprise automation."
            ]

            created_demo_exits = []

            for i, emp in enumerate(selected_emps):
                emp_name = emp.get('fullName')
                emp_id = emp.get('empId') or f"EMP-{1000 + i}"
                dept = emp.get('department') or "Engineering"
                role = emp.get('jobTitle') or "Senior Specialist"
                reason = sample_reasons[i % len(sample_reasons)]
                lwd_date = time.strftime('%Y-%m-%d', time.localtime(now_ts + (20 + i * 5) * 86400))
                exit_id = f"EXIT-{now_ts % 900 + 100 + i}"

                item_payload = {
                    "id": exit_id,
                    "empId": emp_id,
                    "empNumber": emp.get('empNumber'),
                    "empName": emp_name,
                    "department": dept,
                    "role": role,
                    "jobTitle": role,
                    "resignationDate": date_today,
                    "lastWorkingDay": lwd_date,
                    "reason": reason,
                    "itClearance": False,
                    "itClearanceStatus": "Clearance waiting from IT department",
                    "laptopIncidentState": "In Progress",
                    "accessRevoked": False,
                    "o365Deleted": False,
                    "orangeHrmDeleted": False,
                    "emailSent": False,
                    "relievingLetterIssued": False,
                    "fnfStatus": "Pending Initiation"
                }

                # 1. Trigger AutomationEdge T4 Workflow: "HR Demo Offboarding SN Req" (asynchronous)
                try:
                    ae_sn_req_res = ae_client.trigger_workflow("HR Demo Offboarding SN Req", {"EmpID": str(emp_id)})
                    item_payload['aeSnReqWorkflow'] = ae_sn_req_res
                except Exception as ae_err:
                    print(f"[Demo Offboarding T4 Note]: {ae_err}")

                # 2. Create ACTUAL ServiceNow Parent Request & Laptop Recovery Incident!
                try:
                    sn_res = sn_client.create_offboarding_request(item_payload)
                    item_payload['serviceNowReq'] = sn_res.get('serviceNowReq')
                    item_payload['serviceNowRitm'] = sn_res.get('serviceNowRitm')
                    item_payload['laptopTicket'] = sn_res.get('laptopTicket')
                    item_payload['laptopTicketSysId'] = sn_res.get('laptopTicketSysId')
                    item_payload['laptopTicketUrl'] = sn_res.get('laptopTicketUrl')
                    item_payload['assignedTo'] = sn_res.get('assignedTo')
                except Exception as sn_err:
                    print(f"[Demo Offboarding ServiceNow Note]: {sn_err}")

                created_demo_exits.append(item_payload)

            exits = [item for item in db.get('exitRequests', []) if not is_excluded_resignation_employee(item.get('empName'))]
            for item in reversed(created_demo_exits):
                exits.insert(0, item)
            db['exitRequests'] = exits
            self.write_db(db)

            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": f"Created {len(created_demo_exits)} live resignation requests for OrangeHRM employees in ServiceNow",
                "data": created_demo_exits,
                "allRequests": exits
            }).encode('utf-8'))

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

            # 4. Send Clearance Email Notification
            recip = payload.get('recipientEmail') or os.environ.get('HR_NOTIFICATION_RECIPIENT', '')
            email_result = office365_client.send_offboarding_email(
                {"empName": emp_ident, "department": payload.get("department", "Engineering"), "lastWorkingDay": payload.get("lastWorkingDay", "2026-11-30")},
                recipient_email=recip
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

            # 2. Send Relieving Letter Email
            recipient = payload.get('recipientEmail') or os.environ.get('HR_NOTIFICATION_RECIPIENT', '')
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

        # OrangeHRM Assign Leave / HR Leave Approval Endpoint (Instant Non-Blocking)
        elif self.path in ['/api/leave/application/assign', '/api/leave/assign', '/api/leave/approve']:
            emp_ident = payload.get('employeeName') or payload.get('empNumber') or payload.get('fullName') or "Karthik Swaminathan"
            emp_num = payload.get('empNumber') or 41
            leave_type = payload.get('leaveType') or payload.get('type') or "Casual Leave"
            from_date = payload.get('fromDate') or payload.get('from') or time.strftime('%Y-%m-%d')
            to_date = payload.get('toDate') or payload.get('to') or from_date
            comment = payload.get('comment') or payload.get('reason') or "Leave assigned and approved via MangoHRMS Portal"
            req_id = payload.get('id') or payload.get('requestId')

            # 1. Update DB leave requests immediately
            leaves = db.get('leaveRequests', [])
            updated_req = None
            for l in leaves:
                if (req_id and l.get('id') == req_id) or (l.get('from') == from_date and l.get('status') == 'Pending HR Approval'):
                    l['status'] = 'Approved'
                    l['orangeHrmAssigned'] = True
                    l['approvedAt'] = time.strftime('%Y-%m-%d %H:%M:%S')
                    updated_req = l
                    break

            db['leaveRequests'] = leaves
            self.write_db(db)

            # 2. Return HTTP response immediately (0ms blocking)
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": f"Leave approved instantly. OrangeHRM assignment and T4 'HR Demo Leave Approval' dispatched for {emp_ident}.",
                "data": updated_req,
                "requests": leaves
            }).encode('utf-8'))

            # 3. Background Executor: T4 Leave Approval FIRST -> OrangeHRM Assign Leave SECOND -> Email
            def _async_leave_approval_worker(e_ident, e_num, l_type, f_date, t_date, c_text, r_id):
                try:
                    # Step 1: Trigger AutomationEdge T4 "HR Demo Leave Approval" RPA workflow FIRST
                    print(f"\n[RPA TRIGGER 1ST] Immediately triggering T4 'HR Demo Leave Approval' for Emp #{e_num}...")
                    ae_res = ae_client.trigger_leave_approval(e_num)
                    print(f"[RPA TRIGGER 1ST COMPLETED] T4 'HR Demo Leave Approval' executed. Status: {ae_res.get('status') or ae_res.get('executionStatus')}")

                    # Step 2: Hit OrangeHRM Assign Leave API SECOND
                    print(f"\n[ORANGEHRM 2ND] Assigning {l_type} in OrangeHRM for {e_ident} ({f_date} to {t_date})...")
                    assign_res = orangehrm_client.assign_employee_leave(
                        employee_name_or_id=e_ident,
                        leave_type_name=l_type,
                        from_date=f_date,
                        to_date=t_date,
                        comment=c_text
                    )
                    print(f"[ORANGEHRM 2ND COMPLETED] OrangeHRM leave record assigned: {assign_res}")

                    # Step 3: Dispatch Formal HTML Email Notification
                    leave_email_data = {
                        'employeeName': e_ident,
                        'fullName': e_ident,
                        'empNumber': e_num,
                        'empId': f"EMP-{e_num}",
                        'leaveType': l_type,
                        'fromDate': f_date,
                        'toDate': t_date,
                        'days': (updated_req and updated_req.get('days')) or 1,
                        'reason': c_text,
                        'approvedAt': time.strftime('%B %d, %Y at %I:%M %p')
                    }
                    hr_recip = os.environ.get('HR_NOTIFICATION_RECIPIENT', '')
                    print(f"\n[EMAIL 3RD] Dispatching formal Leave Approval notification for {e_ident} to {hr_recip}...")
                    office365_client.send_leave_approval_email(
                        leave_data=leave_email_data,
                        recipient_email=hr_recip
                    )
                except Exception as ex:
                    print(f"[LEAVE ASYNC ERROR]: {ex}")

            threading.Thread(
                target=_async_leave_approval_worker,
                args=(emp_ident, emp_num, leave_type, from_date, to_date, comment, req_id),
                daemon=True
            ).start()
        # Clear All Leave Requests / Logs
        elif self.path in ['/api/leave/clear', '/api/leave/requests/clear', '/api/leaves/clear']:
            db['leaveRequests'] = []
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": "All leave request logs cleared",
                "data": []
            }).encode('utf-8'))

        # Delete Single Leave Request
        elif self.path in ['/api/leave/delete', '/api/leave/requests/delete']:
            target_id = payload.get('id')
            leaves = [l for l in db.get('leaveRequests', []) if l.get('id') != target_id]
            db['leaveRequests'] = leaves
            self.write_db(db)
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "message": f"Leave request {target_id} deleted",
                "data": leaves
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

