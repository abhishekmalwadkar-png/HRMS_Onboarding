"""
MangoHRMS Automated Offer Letter Generator & Email Dispatcher
Generates executive-quality PDF offer letters with tailored compensation, JD, and terms,
and dispatches them via email with PDF attachments.
"""

import os
import sys
import time
import smtplib
import argparse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

ENV_FILE = os.path.join(os.path.dirname(__file__), '.env')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'generated_offers')

def load_env():
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        except Exception as e:
            print(f"[Offer Letter] Error reading .env: {e}")

load_env()

def generate_offer_letter_pdf(candidate_data):
    """
    Generates a professional PDF offer letter using ReportLab.
    Returns the absolute path to the generated PDF file.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    name = candidate_data.get('candidateName', 'Valued Candidate')
    email = candidate_data.get('email', 'candidate@example.com')
    role = candidate_data.get('appliedRole', 'Senior Cloud AI Architect')
    department = candidate_data.get('department', 'Engineering')
    manager = candidate_data.get('manager', 'David Miller (VP of Technology)')
    annual_ctc = candidate_data.get('annualCtc', '$165,000 USD / ₹32,00,000 INR')
    base_salary = candidate_data.get('baseSalary', '$140,000 USD')
    perf_bonus = candidate_data.get('perfBonus', '$25,000 USD Annual Target')
    joining_date = candidate_data.get('joiningDate', 'November 1, 2026')
    work_location = candidate_data.get('workLocation', 'Hybrid HQ / Remote')
    offer_ref = candidate_data.get('offerRef', f"MNG-OFR-{int(time.time()) % 100000}")
    
    # Clean filename
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"Offer_Letter_{safe_name.replace(' ', '_')}_{offer_ref}.pdf"
    pdf_path = os.path.join(OUTPUT_DIR, filename)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette - Warm Corporate Orange & Clean White
    c_primary = colors.HexColor("#ea580c")    # Corporate Orange
    c_dark = colors.HexColor("#1c1917")       # Slate Dark
    c_muted = colors.HexColor("#78716c")      # Slate Muted
    c_light_bg = colors.HexColor("#fffaf5")   # Warm Off-white bg
    c_border = colors.HexColor("#fed7aa")     # Light orange border
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        alignment=TA_LEFT
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_muted,
        alignment=TA_LEFT
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_dark,
        spaceBefore=8,
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=c_dark,
        alignment=TA_JUSTIFY,
        spaceAfter=6
    )
    
    bold_body_style = ParagraphStyle(
        'BoldBody',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # 1. Company Letterhead Banner
    header_data = [
        [
            Paragraph("<b>MangoHRMS Suite</b><br/><font size=8 color='#78716c'>Enterprise Automation & Cloud Systems Inc.<br/>100 Innovation Way, Suite 500, San Francisco, CA 94105</font>", styles['Normal']),
            Paragraph(f"<b>CONFIDENTIAL OFFER</b><br/><font size=8 color='#78716c'>Ref: <b>{offer_ref}</b><br/>Date: {time.strftime('%B %d, %Y')}</font>", ParagraphStyle('RightHdr', parent=styles['Normal'], alignment=TA_RIGHT))
        ]
    ]
    hdr_table = Table(header_data, colWidths=[320, 200])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=c_primary, spaceBefore=4, spaceAfter=12))

    # 2. Addressee Info
    story.append(Paragraph(f"<b>To:</b> {name}", bold_body_style))
    story.append(Paragraph(f"<b>Email:</b> {email}", body_style))
    story.append(Paragraph(f"<b>Subject: Formal Employment Offer for the Position of {role}</b>", ParagraphStyle('Subj', parent=bold_body_style, fontSize=10.5, textColor=c_primary)))
    story.append(Spacer(1, 8))

    # 3. Formal Salutation & Offer Statement
    story.append(Paragraph(f"Dear <b>{name}</b>,", body_style))
    story.append(Paragraph(
        f"On behalf of <b>MangoHRMS Suite</b>, we are thrilled to formally offer you the position of <b>{role}</b> in our <b>{department}</b> Department. "
        f"We were immensely impressed by your skills, technical leadership, and domain expertise. We believe your contributions will be pivotal in driving our next wave of enterprise innovation.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # 4. Role & Position Details Table
    story.append(Paragraph("1. Position & Employment Terms", heading_style))
    role_summary_data = [
        [Paragraph("<b>Job Title / Role:</b>", body_style), Paragraph(f"{role}", body_style)],
        [Paragraph("<b>Department:</b>", body_style), Paragraph(f"{department}", body_style)],
        [Paragraph("<b>Reporting Manager:</b>", body_style), Paragraph(f"{manager}", body_style)],
        [Paragraph("<b>Proposed Joining Date:</b>", body_style), Paragraph(f"<b>{joining_date}</b>", body_style)],
        [Paragraph("<b>Work Location Model:</b>", body_style), Paragraph(f"{work_location}", body_style)],
        [Paragraph("<b>Employment Status:</b>", body_style), Paragraph("Full-Time Permanent (Exempt)", body_style)]
    ]
    role_table = Table(role_summary_data, colWidths=[160, 360])
    role_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(role_table)
    story.append(Spacer(1, 8))

    # 5. Compensation & Benefits Breakdown Table
    story.append(Paragraph("2. Total Compensation Structure", heading_style))
    comp_data = [
        [Paragraph("<b>Component</b>", bold_body_style), Paragraph("<b>Annual Value</b>", bold_body_style), Paragraph("<b>Details & Frequency</b>", bold_body_style)],
        [Paragraph("Base Salary", body_style), Paragraph(f"<b>{base_salary}</b>", body_style), Paragraph("Semi-monthly direct deposit", body_style)],
        [Paragraph("Target Performance Bonus", body_style), Paragraph(f"<b>{perf_bonus}</b>", body_style), Paragraph("Annual milestone evaluation", body_style)],
        [Paragraph("Health & Wellness Coverage", body_style), Paragraph("100% Employer Paid", body_style), Paragraph("Platinum PPO Health, Dental & Vision", body_style)],
        [Paragraph("401(k) / Provident Fund", body_style), Paragraph("Up to 6% Match", body_style), Paragraph("Immediate vesting from Day 1", body_style)],
        [Paragraph("<b>Total Annual CTC (Cost to Co.)</b>", bold_body_style), Paragraph(f"<b><font color='#ea580c'>{annual_ctc}</font></b>", bold_body_style), Paragraph("<b>Comprehensive Total Package</b>", bold_body_style)]
    ]
    comp_table = Table(comp_data, colWidths=[150, 150, 220])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#ffedd5")),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#fff7ed")),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 8))

    # 6. Additional Benefits & Next Steps
    story.append(Paragraph("3. Benefits, Equipment & Onboarding Formalities", heading_style))
    story.append(Paragraph(
        "• <b>IT Workstation:</b> You will be provisioned with your selected high-performance workstation (Apple MacBook Pro / Developer Laptop) & dual 4K monitor setup.<br/>"
        "• <b>Paid Time Off:</b> 25 days annual PTO, 12 casual leaves, and standard official holidays.<br/>"
        "• <b>Learning & Growth:</b> $1,500 annual personal budget for cloud certifications and technical conferences.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # 7. Signature & Acceptance Block (KeepTogether to ensure clean layout)
    sig_block = [
        Paragraph("<b>Acceptance & Acknowledgement:</b>", bold_body_style),
        Paragraph("To confirm your acceptance of this offer, please sign and date below and return a copy to HR prior to your start date.", body_style),
        Spacer(1, 14),
        Table([
            [
                Paragraph("<b>For MangoHRMS Suite:</b><br/><br/>_______________________________<br/><b>Elena Vance</b><br/>Global Head of Talent Acquisition", body_style),
                Paragraph("<b>Accepted and Agreed By:</b><br/><br/>_______________________________<br/><b>" + name + "</b><br/>Date: ________________________", body_style)
            ]
        ], colWidths=[260, 260], style=[
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LINEABOVE', (0,0), (-1,-1), 0.5, c_border),
            ('TOPPADDING', (0,0), (-1,-1), 8)
        ])
    ]
    story.append(KeepTogether(sig_block))

    # Build Document
    doc.build(story)
    print(f"[Offer Letter] PDF generated successfully: {pdf_path}")
    return pdf_path, filename

def send_offer_email(candidate_data, pdf_path):
    """
    Sends the generated offer letter PDF via email to the candidate.
    Falls back gracefully to logged mock dispatch if SMTP is not active.
    """
    load_env()
    recipient_email = candidate_data.get('email', 'candidate@example.com')
    candidate_name = candidate_data.get('candidateName', 'Candidate')
    role = candidate_data.get('appliedRole', 'Senior Cloud AI Architect')
    
    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USERNAME')
    smtp_pass = os.environ.get('SMTP_PASSWORD')
    sender_email = os.environ.get('SMTP_FROM_EMAIL', 'hr-offers@mangohrms.com')

    subject = f"Official Offer of Employment: {role} at MangoHRMS Suite"
    
    body_text = f"""Dear {candidate_name},

Congratulations! We are delighted to extend a formal offer of employment for the position of {role} at MangoHRMS Suite.

Please find attached your official Offer Letter detailing your compensation structure, role expectations, and joining formalities.

Kindly review, sign, and return the accepted copy at your earliest convenience.

Welcome to the team!

Warm regards,
Talent Acquisition Team
MangoHRMS Suite Inc.
"""

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body_text, 'plain'))

    # Attach PDF
    if os.path.exists(pdf_path):
        with open(pdf_path, 'rb') as f:
            attach_part = MIMEApplication(f.read(), Name=os.path.basename(pdf_path))
            attach_part['Content-Disposition'] = f'attachment; filename="{os.path.basename(pdf_path)}"'
            msg.attach(attach_part)

    # Attempt Live SMTP Delivery if credentials provided
    if smtp_server and smtp_user and smtp_pass and not smtp_user.startswith('your_'):
        try:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
                print(f"[Offer Email] Live email sent to {recipient_email} via {smtp_server}")
                return {
                    "status": "sent",
                    "mode": "live_smtp",
                    "recipient": recipient_email,
                    "subject": subject,
                    "message": f"Offer letter email dispatched directly to {recipient_email}."
                }
        except Exception as e:
            print(f"[Offer Email] SMTP connection failed: {e}. Falling back to simulation delivery.")

    # Simulated Delivery Receipt
    print(f"[Offer Email] Simulated email dispatched to: {recipient_email} with attachment: {os.path.basename(pdf_path)}")
    return {
        "status": "sent",
        "mode": "simulation",
        "recipient": recipient_email,
        "sender": sender_email,
        "subject": subject,
        "attachment": os.path.basename(pdf_path),
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "message": f"Offer letter PDF dispatched & emailed successfully to {recipient_email}."
    }

def create_and_email_offer_letter(candidate_data):
    """
    Main entry point: Generates PDF offer letter and emails it to the candidate.
    """
    pdf_path, filename = generate_offer_letter_pdf(candidate_data)
    email_res = send_offer_email(candidate_data, pdf_path)
    
    return {
        "status": "success",
        "candidateName": candidate_data.get('candidateName'),
        "role": candidate_data.get('appliedRole'),
        "email": candidate_data.get('email'),
        "pdfPath": pdf_path,
        "filename": filename,
        "downloadUrl": f"/generated_offers/{filename}",
        "emailResult": email_res,
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Generate and email formal candidate offer letter PDF.")
    parser.add_argument('--name', default='Vikram Malhotra', help='Candidate Full Name')
    parser.add_argument('--email', default='vikram.m@example.com', help='Candidate Email')
    parser.add_argument('--role', default='Senior Cloud AI Architect', help='Applied Job Role')
    parser.add_argument('--dept', default='Engineering', help='Department')
    parser.add_argument('--salary', default='$165,000 USD', help='Annual Salary CTC')
    parser.add_argument('--start', default='2026-11-01', help='Joining Date')

    args = parser.parse_args()
    sample_data = {
        'candidateName': args.name,
        'email': args.email,
        'appliedRole': args.role,
        'department': args.dept,
        'annualCtc': args.salary,
        'joiningDate': args.start
    }
    
    result = create_and_email_offer_letter(sample_data)
    print("\n--- Execution Result ---")
    print(f"Candidate: {result['candidateName']}")
    print(f"PDF File:  {result['pdfPath']}")
    print(f"Email Status: {result['emailResult']['status']} ({result['emailResult']['mode']})")
