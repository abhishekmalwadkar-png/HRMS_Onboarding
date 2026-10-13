"""
MangoHRMS Automated Resignation Letter Generator
Generates executive-quality PDF employee resignation letters with official letterhead,
terms of exit handover, notice period schedule, and ServiceNow tracking details.
"""

import os
import sys
import time
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'generated_resignation_letters')


def generate_resignation_letter_pdf(employee_data: dict) -> str:
    """
    Generates a professional PDF Resignation Letter using ReportLab.
    Returns the absolute path to the generated PDF file.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    emp_name = employee_data.get('empName') or employee_data.get('fullName') or employee_data.get('name') or 'Employee'
    emp_id = employee_data.get('empId') or employee_data.get('id') or f"EMP-{int(time.time()) % 9000 + 1000}"
    role = employee_data.get('role') or employee_data.get('jobTitle') or employee_data.get('designation') or 'Software Engineer'
    department = employee_data.get('department') or 'Engineering'
    resignation_date = employee_data.get('resignationDate') or time.strftime('%B %d, %Y')
    last_working_day = employee_data.get('lastWorkingDay') or employee_data.get('lwd') or time.strftime('%B %d, %Y')
    reason = employee_data.get('reason') or 'Pursuing new professional and academic endeavors.'
    service_now_req = employee_data.get('serviceNowReq') or f"REQ001{int(time.time()) % 9000 + 1000}"
    laptop_ticket = employee_data.get('laptopTicket') or ''

    safe_name = "".join(c for c in emp_name if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"Resignation_Letter_{safe_name.replace(' ', '_')}_{emp_id}.pdf"
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

    c_primary = colors.HexColor("#0284c7")    # Corporate Blue
    c_orange = colors.HexColor("#f87917")     # Brand Orange
    c_dark = colors.HexColor("#0f172a")       # Slate Dark
    c_muted = colors.HexColor("#64748b")      # Slate Muted
    c_light_bg = colors.HexColor("#f8fafc")   # Neutral light bg
    c_border = colors.HexColor("#cbd5e1")     # Border light

    title_style = ParagraphStyle(
        'ResignationTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_dark,
        alignment=TA_CENTER,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'ResignationSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=c_orange,
        alignment=TA_CENTER,
        spaceAfter=12
    )

    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_primary,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
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
            Paragraph("<b>MangoHRMS Suite</b><br/><font size=8 color='#64748b'>Enterprise Digital Workplace & Human Resources<br/>AutomationEdge Operations Centre, Pune, India</font>", styles['Normal']),
            Paragraph(f"<b>EMPLOYEE RESIGNATION</b><br/><font size=8 color='#64748b'>ServiceNow Ticket: <b>{service_now_req}</b><br/>Date of Tender: <b>{resignation_date}</b></font>", ParagraphStyle('RightHdr', parent=styles['Normal'], alignment=TA_RIGHT))
        ]
    ]
    hdr_table = Table(header_data, colWidths=[320, 200])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(hdr_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=2, color=c_orange, spaceBefore=4, spaceAfter=8))

    # 2. Document Title
    story.append(Paragraph("FORMAL LETTER OF RESIGNATION", title_style))
    story.append(Paragraph("OFFICIAL NOTICE OF RESIGNATION & EXIT CLEARANCE REQUEST", subtitle_style))

    # 3. Addressee Info
    story.append(Paragraph("<b>To:</b>", bold_body_style))
    story.append(Paragraph("Head of Human Resources & Department Management<br/>MangoHRMS Enterprise Operations", body_style))
    story.append(Spacer(1, 4))

    # 4. From Info
    story.append(Paragraph(f"<b>From:</b> {emp_name} &nbsp;(Employee ID: <b>{emp_id}</b>)", bold_body_style))
    story.append(Paragraph(f"<b>Designation:</b> {role} &nbsp;•&nbsp; <b>Department:</b> {department}", body_style))
    story.append(Spacer(1, 6))

    # 5. Salutation & Notice Body
    story.append(Paragraph("Dear HR Management & Leadership Team,", bold_body_style))
    story.append(Paragraph(
        f"Please accept this letter as formal notification that I am tendering my resignation from my position as "
        f"<b>{role}</b> in the <b>{department}</b> Department with <b>MangoHRMS</b>, effective from <b>{resignation_date}</b>.",
        body_style
    ))

    story.append(Paragraph(
        f"In accordance with company policy and notice period requirements, my proposed last working day will be "
        f"<b>{last_working_day}</b>.",
        body_style
    ))

    story.append(Paragraph(
        f"<b>Reason for Resignation:</b> {reason}",
        body_style
    ))

    story.append(Paragraph(
        "I would like to express my sincere appreciation for the opportunities and professional experience I have "
        "had during my tenure with the organization. The support, guidance, and collaboration from management and "
        "colleagues have been truly invaluable to my professional journey.",
        body_style
    ))

    story.append(Paragraph(
        "During the transition period, I am fully committed to ensuring a comprehensive and smooth knowledge transfer "
        "of all ongoing responsibilities, codebases, workflows, and projects to designated team members. "
        "I will also ensure that all company assets, including hardware workstations and access tokens, "
        "are returned to the IT Asset and Deployment Desk prior to my final day.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # 6. Resignation Summary Table
    story.append(Paragraph("Resignation & Exit Particulars Summary", heading_style))
    summary_data = [
        [
            Paragraph("<b>Employee Name:</b>", styles['Normal']),
            Paragraph(f"{emp_name}", styles['Normal']),
            Paragraph("<b>Employee ID:</b>", styles['Normal']),
            Paragraph(f"<b>{emp_id}</b>", styles['Normal'])
        ],
        [
            Paragraph("<b>Designation:</b>", styles['Normal']),
            Paragraph(f"{role}", styles['Normal']),
            Paragraph("<b>Department:</b>", styles['Normal']),
            Paragraph(f"{department}", styles['Normal'])
        ],
        [
            Paragraph("<b>Resignation Tendered:</b>", styles['Normal']),
            Paragraph(f"{resignation_date}", styles['Normal']),
            Paragraph("<b>Last Working Day:</b>", styles['Normal']),
            Paragraph(f"<font color='#0284c7'><b>{last_working_day}</b></font>", styles['Normal'])
        ],
        [
            Paragraph("<b>ServiceNow Request:</b>", styles['Normal']),
            Paragraph(f"<b>{service_now_req}</b>", styles['Normal']),
            Paragraph("<b>Asset Ticket:</b>", styles['Normal']),
            Paragraph(f"{laptop_ticket or 'Pending Assignment'}", styles['Normal'])
        ]
    ]

    t_summary = Table(summary_data, colWidths=[125, 135, 125, 135])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 10))

    # 7. Signature Blocks
    sig_data = [
        [
            Paragraph(f"<b>Digitally Tendered & Signed by:</b><br/><br/><b>{emp_name}</b><br/>{role}<br/>Emp ID: {emp_id}<br/>Date: {resignation_date}", styles['Normal']),
            Paragraph("<b>HR Operations Acknowledgement:</b><br/><br/><b>Talent Operations Desk</b><br/>MangoHRMS Enterprise<br/>Status: <b>Logged & Under Clearance</b><br/>ServiceNow: Verified", styles['Normal'])
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LINEBEFORE', (1,0), (1,-1), 1, c_border),
        ('LEFTPADDING', (1,0), (1,-1), 16),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(KeepTogether(sig_table))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.75, color=c_border, spaceBefore=4, spaceAfter=4))
    story.append(Paragraph(
        "<font size=7 color='#64748b'>Confidential Employee Record — MangoHRMS Exit Clearance & Offboarding Gateway — Generated Automatically</font>",
        ParagraphStyle('FooterNote', parent=styles['Normal'], alignment=TA_CENTER)
    ))

    doc.build(story)
    return pdf_path


if __name__ == '__main__':
    test_pdf = generate_resignation_letter_pdf({
        'empName': 'Aarav Sharma',
        'empId': 'EMP-4058',
        'role': 'Senior AI Systems Engineer',
        'department': 'Engineering',
        'resignationDate': 'October 13, 2026',
        'lastWorkingDay': 'November 30, 2026',
        'reason': 'Accepted senior leadership fellowship in enterprise cloud intelligence.',
        'serviceNowReq': 'REQ0014290',
        'laptopTicket': 'INC0040469'
    })
    print(f"Generated test resignation letter: {test_pdf} (Size: {os.path.getsize(test_pdf)} bytes)")
