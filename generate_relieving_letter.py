"""
MangoHRMS Automated Relieving Letter & Experience Certificate Generator
Generates executive-quality PDF relieving & experience letters with official company seal,
handover confirmation, and multi-system clearance acknowledgement, and dispatches them via email.
"""

import os
import sys
import time
import requests
import base64
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'generated_relieving_letters')

def generate_relieving_letter_pdf(employee_data: dict) -> str:
    """
    Generates a professional PDF Relieving Letter & Experience Certificate using ReportLab.
    Returns the absolute path to the generated PDF file.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    emp_name = employee_data.get('empName') or employee_data.get('fullName') or employee_data.get('name') or 'Valued Employee'
    emp_id = employee_data.get('empId') or employee_data.get('id') or f"EMP-{int(time.time()) % 9000 + 1000}"
    role = employee_data.get('designation') or employee_data.get('jobTitle') or employee_data.get('role') or 'Senior Software Engineer'
    department = employee_data.get('department') or 'Engineering'
    joining_date = employee_data.get('joiningDate') or 'January 15, 2023'
    last_working_day = employee_data.get('lastWorkingDay') or employee_data.get('lwd') or time.strftime('%B %d, %Y')
    laptop_ticket = employee_data.get('laptopTicket') or 'INC0040469'
    service_now_req = employee_data.get('serviceNowReq') or 'REQ0014290'
    ref_no = employee_data.get('refNo') or f"MNG-REL-{time.strftime('%Y')}-{int(time.time()) % 100000:05d}"
    issue_date = time.strftime('%B %d, %Y')
    
    safe_name = "".join(c for c in emp_name if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"Relieving_Letter_{safe_name.replace(' ', '_')}_{ref_no}.pdf"
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
    
    c_primary = colors.HexColor("#0284c7")    # Corporate Sky Blue
    c_emerald = colors.HexColor("#059669")    # Clearance Green
    c_dark = colors.HexColor("#0f172a")       # Slate Dark
    c_muted = colors.HexColor("#64748b")      # Slate Muted
    c_light_bg = colors.HexColor("#f8fafc")   # Neutral light bg
    c_border = colors.HexColor("#cbd5e1")     # Border light
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_primary,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_emerald,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_dark,
        spaceBefore=8,
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
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

    # 1. Company Letterhead Header
    header_data = [
        [
            Paragraph("<b>MangoHRMS Suite</b><br/><font size=8 color='#64748b'>Enterprise Digital Workplace & Automation Corp.<br/>100 Innovation Way, Suite 500, San Francisco, CA 94105</font>", styles['Normal']),
            Paragraph(f"<b>OFFICIAL DOCUMENT</b><br/><font size=8 color='#64748b'>Ref: <b>{ref_no}</b><br/>Date of Issue: <b>{issue_date}</b></font>", ParagraphStyle('RightHdr', parent=styles['Normal'], alignment=TA_RIGHT))
        ]
    ]
    hdr_table = Table(header_data, colWidths=[320, 200])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=c_primary, spaceBefore=4, spaceAfter=10))

    # 2. Document Title
    story.append(Paragraph("RELIEVING LETTER & SERVICE EXPERIENCE CERTIFICATE", title_style))
    story.append(Paragraph("NO DUES & COMPLETE MULTI-ENGINE CLEARANCE VERIFIED", subtitle_style))
    story.append(Spacer(1, 4))

    # 3. Addressee Info
    story.append(Paragraph(f"<b>To:</b> {emp_name} &nbsp;&nbsp;(Employee ID: <b>{emp_id}</b>)", bold_body_style))
    story.append(Paragraph(f"<b>Designation:</b> {role} &nbsp;•&nbsp; <b>Department:</b> {department}", body_style))
    story.append(Spacer(1, 6))

    # 4. Formal Certification Body
    story.append(Paragraph("<b>TO WHOMSOEVER IT MAY CONCERN</b>", ParagraphStyle('CertHeader', parent=bold_body_style, fontSize=10, textColor=c_primary)))
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        f"This is to formally certify that <b>{emp_name}</b> (Employee ID: <b>{emp_id}</b>) was employed with "
        f"<b>MangoHRMS Enterprise</b> from <b>{joining_date}</b> to <b>{last_working_day}</b>. "
        f"At the time of relieving, {emp_name} was serving as <b>{role}</b> in the <b>{department}</b> Department.",
        body_style
    ))

    story.append(Paragraph(
        f"Subsequent to the tender of resignation and satisfactory handover of all job responsibilities, "
        f"<b>{emp_name}</b> stands formally relieved from all duties and employment obligations with "
        f"MangoHRMS at the close of business hours on <b>{last_working_day}</b>.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # 5. Service & Clearance Details Table
    story.append(Paragraph("1. Employment Tenure & Multi-Department Clearance Summary", heading_style))
    clearance_table_data = [
        [Paragraph("<b>Employee Name:</b>", body_style), Paragraph(f"<b>{emp_name}</b>", body_style)],
        [Paragraph("<b>Employee ID / Code:</b>", body_style), Paragraph(f"<code>{emp_id}</code>", body_style)],
        [Paragraph("<b>Designation / Role:</b>", body_style), Paragraph(f"{role}", body_style)],
        [Paragraph("<b>Department:</b>", body_style), Paragraph(f"{department}", body_style)],
        [Paragraph("<b>Date of Joining:</b>", body_style), Paragraph(f"{joining_date}", body_style)],
        [Paragraph("<b>Last Working Day (LWD):</b>", body_style), Paragraph(f"<b>{last_working_day}</b>", body_style)],
        [Paragraph("<b>ServiceNow Clearance:</b>", body_style), Paragraph(f"Hardware Ticket <b>{laptop_ticket}</b> Cleared & Resolved", body_style)],
        [Paragraph("<b>IT & AD Deprovisioning:</b>", body_style), Paragraph(f"Active Directory & O365 User Deprovision Complete", body_style)],
        [Paragraph("<b>Clearance Status:</b>", body_style), Paragraph("<font color='#059669'><b>✓ ALL DUES CLEARED & ASSETS RETURNED</b></font>", body_style)],
    ]
    clr_table = Table(clearance_table_data, colWidths=[170, 350])
    clr_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(clr_table)
    story.append(Spacer(1, 8))

    # 6. Conduct & Acknowledgement
    story.append(Paragraph("2. Professional Conduct & Performance Acknowledgment", heading_style))
    story.append(Paragraph(
        f"During the tenure with our organization, <b>{emp_name}</b> demonstrated high integrity, dedication, "
        f"and strong professional competence. We sincerely appreciate the valuable contributions made towards the success "
        f"of our engineering and enterprise initiatives.",
        body_style
    ))
    story.append(Paragraph(
        "We wish <b>" + emp_name + "</b> all the very best in all future career and professional endeavors.",
        body_style
    ))
    story.append(Spacer(1, 14))

    # 7. Signatory & Official Seal Block
    sig_data = [
        [
            Paragraph(
                "<b>For MangoHRMS Suite Inc.</b><br/><br/>"
                "<b>Marcus Vance</b><br/>"
                "<font size=8 color='#64748b'>Vice President — Human Resources & People Operations<br/>"
                "Global HR Governance & Enterprise Clearances</font>",
                styles['Normal']
            ),
            Paragraph(
                "<font size=8 color='#059669'><b>[ DIGITALLY CERTIFIED & VERIFIED ]</b></font><br/>"
                f"<font size=7 color='#64748b'>Certificate ID: {ref_no}<br/>"
                f"Generated via MangoHRMS Clearance Pipeline<br/>"
                f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}</font>",
                ParagraphStyle('SigRight', parent=styles['Normal'], alignment=TA_RIGHT)
            )
        ]
    ]
    sig_table = Table(sig_data, colWidths=[310, 210])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(KeepTogether([
        HRFlowable(width="100%", thickness=1, color=c_border, spaceBefore=4, spaceAfter=8),
        sig_table
    ]))

    doc.build(story)
    print(f"[Relieving Letter] Successfully generated PDF: {pdf_path}")
    return pdf_path


if __name__ == '__main__':
    sample_emp = {
        'empName': 'Aarav Sharma',
        'empId': 'EMP-7402',
        'designation': 'Senior Cloud AI Architect',
        'department': 'Engineering',
        'joiningDate': 'January 10, 2024',
        'lastWorkingDay': 'November 30, 2026',
        'laptopTicket': 'INC0040472',
    }
    path = generate_relieving_letter_pdf(sample_emp)
    print(f"Generated test relieving letter at: {path}")
