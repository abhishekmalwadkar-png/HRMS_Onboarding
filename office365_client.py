"""
Office 365 / Microsoft Entra ID (Azure AD) Client for Enterprise Employee Account Creation.
Uses Microsoft Graph API v1.0.
"""

import os
import re
import time
import requests
from dotenv import load_dotenv

# Load environment configuration
load_dotenv(override=True)

class Office365Client:
    def __init__(self):
        self.client_id = os.getenv("O365_CLIENT_ID", "fbf2d69f-1a01-4141-b943-543285bbc5fe")
        self.client_secret = os.getenv("O365_CLIENT_SECRET", "mM88Q~PJp2~wpmlFZD6jZSuVv7vUTHAj8HCj~dcA")
        self.tenant_id = os.getenv("O365_TENANT_ID", "6b62a1c7-55b4-42ce-8c14-162851182af0")
        self.default_domain = os.getenv("O365_DEFAULT_DOMAIN", "automationedge.ai")
        self.refresh_token = os.getenv("O365_REFRESH_TOKEN", "")
        self.graph_base_url = "https://graph.microsoft.com/v1.0"

        self._cached_token = None
        self._token_expiry = 0

    def get_access_token(self) -> str:
        """Obtains an OAuth2 bearer access token for Microsoft Graph API."""
        now = time.time()
        if self._cached_token and now < self._token_expiry - 60:
            return self._cached_token

        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"

        # 1. Primary: client_credentials grant
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }

        resp = requests.post(token_url, data=payload, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            self._cached_token = data.get("access_token")
            expires_in = int(data.get("expires_in", 3600))
            self._token_expiry = now + expires_in
            return self._cached_token

        # 2. Fallback: refresh_token grant if client_credentials fails
        if self.refresh_token:
            payload_rf = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": self.refresh_token,
                "grant_type": "refresh_token"
            }
            resp_rf = requests.post(token_url, data=payload_rf, timeout=15)
            if resp_rf.status_code == 200:
                data = resp_rf.json()
                self._cached_token = data.get("access_token")
                expires_in = int(data.get("expires_in", 3600))
                self._token_expiry = now + expires_in
                return self._cached_token

        raise RuntimeError(f"Failed to authenticate with Microsoft Graph API: {resp.text}")

    def generate_upn(self, full_name: str, employee_id: str = "") -> tuple[str, str, str, str]:
        """
        Generates clean givenName, surname, mailNickname, and userPrincipalName.
        """
        parts = [p.strip() for p in full_name.strip().split() if p.strip()]
        if not parts:
            first = "employee"
            last = str(int(time.time()))[-4:]
        elif len(parts) == 1:
            first = parts[0]
            last = ""
        else:
            first = parts[0]
            last = parts[-1]

        clean_first = re.sub(r'[^a-zA-Z0-9]', '', first).lower()
        clean_last = re.sub(r'[^a-zA-Z0-9]', '', last).lower() if last else ""

        if clean_last:
            mail_nickname = f"{clean_first}.{clean_last}"
        else:
            clean_emp = re.sub(r'[^a-zA-Z0-9]', '', str(employee_id)).lower() if employee_id else ""
            mail_nickname = f"{clean_first}.{clean_emp}" if clean_emp else clean_first

        upn = f"{mail_nickname}@{self.default_domain}"
        return first, last, mail_nickname, upn

    def create_user_account(self, full_name: str, department: str = "", job_title: str = "",
                            employee_id: str = "", mobile_phone: str = "",
                            initial_password: str = "Welcome@2026!Onboard") -> dict:
        """
        Creates a new user account in Microsoft 365 / Entra ID using the candidate's name.
        """
        token = self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        given_name, surname, mail_nickname, upn = self.generate_upn(full_name, employee_id)

        user_body = {
            "accountEnabled": True,
            "displayName": full_name.strip(),
            "givenName": given_name,
            "surname": surname if surname else None,
            "mailNickname": mail_nickname,
            "userPrincipalName": upn,
            "department": department or "General",
            "jobTitle": job_title or "Employee",
            "mobilePhone": mobile_phone or None,
            "passwordProfile": {
                "forceChangePasswordNextSignIn": True,
                "password": initial_password
            }
        }

        # Check if user already exists
        check_url = f"{self.graph_base_url}/users/{upn}"
        chk_resp = requests.get(check_url, headers=headers, timeout=15)
        if chk_resp.status_code == 200:
            existing = chk_resp.json()
            user_id = existing.get("id")
            admin_url = f"https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserProfileMenuBlade/~/overview/userId/{user_id}"
            return {
                "status": "success",
                "mode": "existing_user",
                "userId": user_id,
                "userPrincipalName": upn,
                "displayName": existing.get("displayName", full_name),
                "jobTitle": existing.get("jobTitle", job_title),
                "department": existing.get("department", department),
                "initialPassword": initial_password,
                "adminUrl": admin_url,
                "tenantDomain": self.default_domain,
                "message": f"Office 365 account already active for {full_name} ({upn})."
            }

        # POST /users
        create_url = f"{self.graph_base_url}/users"
        resp = requests.post(create_url, headers=headers, json=user_body, timeout=20)

        if resp.status_code in [200, 201]:
            created = resp.json()
            user_id = created.get("id")
            admin_url = f"https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserProfileMenuBlade/~/overview/userId/{user_id}"

            return {
                "status": "success",
                "mode": "live_microsoft_graph_api",
                "userId": user_id,
                "userPrincipalName": created.get("userPrincipalName", upn),
                "displayName": created.get("displayName", full_name),
                "jobTitle": created.get("jobTitle", job_title),
                "department": created.get("department", department),
                "initialPassword": initial_password,
                "adminUrl": admin_url,
                "tenantDomain": self.default_domain,
                "message": f"Successfully created Office 365 account for {full_name} ({upn})."
            }
        else:
            # If conflict with username, try with employee ID appended
            if resp.status_code == 409 and employee_id:
                clean_emp = re.sub(r'[^a-zA-Z0-9]', '', str(employee_id)).lower()
                alt_nickname = f"{mail_nickname}.{clean_emp}"
                alt_upn = f"{alt_nickname}@{self.default_domain}"
                user_body["mailNickname"] = alt_nickname
                user_body["userPrincipalName"] = alt_upn

                resp_alt = requests.post(create_url, headers=headers, json=user_body, timeout=20)
                if resp_alt.status_code in [200, 201]:
                    created = resp_alt.json()
                    user_id = created.get("id")
                    admin_url = f"https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserProfileMenuBlade/~/overview/userId/{user_id}"
                    return {
                        "status": "success",
                        "mode": "live_microsoft_graph_api",
                        "userId": user_id,
                        "userPrincipalName": alt_upn,
                        "displayName": created.get("displayName", full_name),
                        "jobTitle": created.get("jobTitle", job_title),
                        "department": created.get("department", department),
                        "initialPassword": initial_password,
                        "adminUrl": admin_url,
                        "tenantDomain": self.default_domain,
                        "message": f"Successfully created Office 365 account for {full_name} ({alt_upn})."
                    }

            return {
                "status": "error",
                "statusCode": resp.status_code,
                "error": resp.text,
                "message": f"Failed to create Office 365 account: {resp.text}"
            }

    def delete_user_account(self, identifier: str) -> dict:
        """
        Deletes a user account from Microsoft 365 / Entra ID using Microsoft Graph API.
        identifier can be userPrincipalName (UPN), userId (GUID), email, or employee full name.
        """
        try:
            token = self.get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            target_user_id = None
            target_upn = None

            identifier = (identifier or "").strip()
            if not identifier:
                return {"status": "error", "message": "No identifier provided for O365 user deletion."}

            # If identifier is an email/upn with @
            if "@" in identifier:
                target_upn = identifier
                target_user_id = identifier
            else:
                # Try finding by generated UPN first
                _, _, _, gen_upn = self.generate_upn(identifier)
                chk_resp = requests.get(f"{self.graph_base_url}/users/{gen_upn}", headers=headers, timeout=15)
                if chk_resp.status_code == 200:
                    data = chk_resp.json()
                    target_user_id = data.get("id")
                    target_upn = data.get("userPrincipalName", gen_upn)
                else:
                    # Search by displayName
                    search_url = f"{self.graph_base_url}/users?$filter=startswith(displayName,'{identifier}')"
                    s_resp = requests.get(search_url, headers=headers, timeout=15)
                    if s_resp.status_code == 200:
                        users = s_resp.json().get("value", [])
                        if users:
                            target_user_id = users[0].get("id")
                            target_upn = users[0].get("userPrincipalName")

            # Fallback to generated UPN if not located via search
            if not target_user_id:
                _, _, _, target_upn = self.generate_upn(identifier)
                target_user_id = target_upn

            delete_url = f"{self.graph_base_url}/users/{target_user_id}"
            del_resp = requests.delete(delete_url, headers=headers, timeout=20)

            if del_resp.status_code in [200, 204]:
                return {
                    "status": "success",
                    "deleted": True,
                    "targetUser": target_upn or identifier,
                    "message": f"Successfully deleted Office 365 user account {target_upn or identifier} from Microsoft Entra ID."
                }
            elif del_resp.status_code == 404:
                return {
                    "status": "success",
                    "deleted": True,
                    "notFound": True,
                    "targetUser": target_upn or identifier,
                    "message": f"Office 365 account {target_upn or identifier} was already removed or not found in Microsoft Entra ID."
                }
            else:
                return {
                    "status": "error",
                    "statusCode": del_resp.status_code,
                    "error": del_resp.text,
                    "message": f"Failed to delete Office 365 account: {del_resp.text}"
                }
        except Exception as ex:
            return {
                "status": "error",
                "message": f"Exception during Office 365 user deletion: {str(ex)}"
            }

# Singleton instance
office365_client = Office365Client()
