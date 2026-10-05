import http.server
import socketserver
import json
import os
import time
import random
import threading
from ae_rpa_client import ae_client
from generate_offer_letter import create_and_email_offer_letter
from servicenow_client import sn_client
from office365_client import office365_client
from orangehrm_client import orangehrm_client

PORT = int(os.environ.get('PORT', 8081))
DATA_FILE = os.path.join(os.path.dirname(__file__), 'employees.json')
AUTOFILL_FILE = os.path.join(os.path.dirname(__file__), 'autofill.json')

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
            elif self.path.startswith('/api/recruitment'):
                self.wfile.write(json.dumps(db.get('recruitment', [])).encode('utf-8'))
            elif self.path.startswith('/api/leaves'):
                self.wfile.write(json.dumps(db.get('leaveRequests', [])).encode('utf-8'))
            elif self.path.startswith('/api/exit'):
                self.wfile.write(json.dumps(db.get('exitRequests', [])).encode('utf-8'))
            elif self.path.startswith('/api/rpa/config'):
                self.wfile.write(json.dumps(ae_client.get_config_summary()).encode('utf-8'))
            elif self.path.startswith('/api/servicenow/config'):
                self.wfile.write(json.dumps(sn_client.get_config_summary()).encode('utf-8'))
            elif self.path.startswith('/api/autofill'):
                autofill_data = self.read_autofill_db()
                profiles = autofill_data.get('autofillProfiles', [])
                selected = dict(random.choice(profiles)) if profiles else {}
                selected['autofillProfiles'] = profiles
                self.wfile.write(json.dumps(selected).encode('utf-8'))
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
                            emp['aeT4Status'] = approve_result.get('aeT4Status') or 'Complete'
                            emp['aeT4Agent'] = approve_result.get('aeT4Agent')
                            emp['aeT4Message'] = approve_result.get('aeT4Message')
                            emp['aeT4Url'] = approve_result.get('aeT4Url')
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
            emp_name = payload.get('empName') or payload.get('name') or payload.get('employeeName') or payload.get('email')
            o365_result = {}
            orangehrm_result = {}
            email_result = {}

            if emp_name:
                # 1. Delete Office 365 / Entra ID User Account
                try:
                    o365_result = office365_client.delete_user_account(emp_name)
                    payload['o365DeleteResult'] = o365_result
                    payload['o365Deleted'] = o365_result.get('deleted', True)
                except Exception as e:
                    payload['o365DeleteResult'] = {"status": "error", "message": str(e)}
                    payload['o365Deleted'] = False

                # 2. Delete Employee Record from OrangeHRM PIM
                try:
                    orangehrm_result = orangehrm_client.delete_employee_profile(emp_name)
                    payload['orangeHrmDeleteResult'] = orangehrm_result
                    payload['orangeHrmDeleted'] = orangehrm_result.get('deleted', True)
                except Exception as e:
                    payload['orangeHrmDeleteResult'] = {"status": "error", "message": str(e)}
                    payload['orangeHrmDeleted'] = False

                # 3. Send Automated Offboarding & Clearance Notification Email
                try:
                    email_result = office365_client.send_offboarding_email(payload, recipient_email="abhishek.malwadkar@valuedx.com")
                    payload['emailNotificationResult'] = email_result
                    payload['emailNotificationSent'] = email_result.get('sent', True)
                except Exception as e:
                    payload['emailNotificationResult'] = {"status": "error", "message": str(e)}
                    payload['emailNotificationSent'] = False

            # Update status in employees list if present
            employees = db.get('employees', [])
            for emp in employees:
                if emp.get('fullName') == emp_name or emp.get('name') == emp_name or emp.get('id') == payload.get('empId'):
                    emp['status'] = 'Resigned / Offboarding'
                    emp['o365Deleted'] = True
                    emp['orangeHrmDeleted'] = True
                    emp['accessRevoked'] = True
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
                "office365": o365_result,
                "orangehrm": orangehrm_result,
                "email": email_result
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

        elif self.path == '/api/o365/delete-user':
            emp_ident = payload.get('identifier') or payload.get('email') or payload.get('employeeName') or payload.get('empName')
            o365_result = office365_client.delete_user_account(emp_ident)
            orangehrm_result = orangehrm_client.delete_employee_profile(emp_ident)
            email_result = office365_client.send_offboarding_email(
                {"empName": emp_ident, "department": payload.get("department", "Engineering"), "lastWorkingDay": payload.get("lastWorkingDay", "2026-11-30")},
                recipient_email="abhishek.malwadkar@valuedx.com"
            )
            self.end_headers()
            self.wfile.write(json.dumps({
                "office365": o365_result,
                "orangehrm": orangehrm_result,
                "email": email_result
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
    with socketserver.TCPServer(("", PORT), MangoHRMSRequestHandler) as httpd:
        print(f"MangoHRMS Server running at http://localhost:{PORT}")
        httpd.serve_forever()

