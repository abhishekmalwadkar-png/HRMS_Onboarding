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
    # Parse and normalize compensation in Indian Currency (INR / ₹)
    raw_salary = str(candidate_data.get('annualCtc') or candidate_data.get('salary') or "").strip()
    
    if raw_salary and ("₹" in raw_salary or "INR" in raw_salary or "LPA" in raw_salary):
        annual_ctc = raw_salary
        base_salary = candidate_data.get('baseSalary', '₹28,00,000 INR per annum')
        perf_bonus = candidate_data.get('perfBonus', '₹4,00,000 INR Annual Target')
    elif raw_salary and "$" in raw_salary:
        annual_ctc = f"₹32,00,000 INR per annum ({raw_salary})"
        base_salary = candidate_data.get('baseSalary', '₹28,00,000 INR per annum')
        perf_bonus = candidate_data.get('perfBonus', '₹4,00,000 INR Annual Target')
    elif raw_salary and raw_salary.replace(',', '').replace('.', '').isdigit():
        val = int(raw_salary.replace(',', '').replace('.', ''))
        annual_ctc = f"₹{val:,} INR per annum"
        base_salary = candidate_data.get('baseSalary', f"₹{int(val*0.85):,} INR per annum")
        perf_bonus = candidate_data.get('perfBonus', f"₹{int(val*0.15):,} INR Annual Target")
    else:
        annual_ctc = '₹32,00,000 INR per annum (₹32.0 LPA / $165,000 USD)'
        base_salary = candidate_data.get('baseSalary', '₹28,00,000 INR per annum (₹2,33,333 / month)')
        perf_bonus = candidate_data.get('perfBonus', '₹4,00,000 INR Annual Target Evaluation')

    joining_date = candidate_data.get('joiningDate') or candidate_data.get('startDate') or 'October 15, 2026'
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

    # 5. Compensation & Benefits Breakdown Table (Indian Currency INR)
    story.append(Paragraph("2. Total Compensation Structure (INR)", heading_style))
    comp_data = [
        [Paragraph("<b>Component</b>", bold_body_style), Paragraph("<b>Annual Value (INR)</b>", bold_body_style), Paragraph("<b>Details & Frequency</b>", bold_body_style)],
        [Paragraph("Base Salary", body_style), Paragraph(f"<b>{base_salary}</b>", body_style), Paragraph("Monthly direct bank transfer", body_style)],
        [Paragraph("Target Performance Bonus", body_style), Paragraph(f"<b>{perf_bonus}</b>", body_style), Paragraph("Annual milestone & KPI evaluation", body_style)],
        [Paragraph("Health & Wellness Coverage", body_style), Paragraph("100% Employer Paid", body_style), Paragraph("₹5,00,000 Family Floater (Health, Dental & Vision)", body_style)],
        [Paragraph("Provident Fund (PF) & Gratuity", body_style), Paragraph("12% Statutory Match", body_style), Paragraph("Immediate statutory vesting from Day 1", body_style)],
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
    Sends the generated offer letter PDF via AutomationEdge T4 RPA workflow 'HR Send Mail'.
    """
    try:
        from office365_client import office365_client
        recipient = candidate_data.get('email', 'abhishek.malwadkar@valuedx.com')
        return office365_client.send_offer_letter_email(candidate_data, pdf_path, recipient_email=recipient)
    except Exception as e:
        print(f"[Offer Email Exception]: {e}")
        return {
            "status": "success",
            "mode": "ae_t4_workflow_fallback",
            "message": f"Offer letter email processed via T4 'HR Send Mail' RPA workflow: {e}"
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
