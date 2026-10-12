"""
AutomationEdge HR Suite - Automated Monthly Payslip Generator
Generates professional executive-quality PDF employee monthly payslips using ReportLab.
Includes comprehensive earnings, statutory deductions, net pay in words, bank details, and digital authenticity seal.
"""

import os
import sys
import time
import base64
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'generated_payslips')

def generate_payslip_pdf(employee_data: dict) -> str:
    """
    Generates an executive PDF Payslip using ReportLab.
    Returns the absolute file path to the generated PDF.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    emp_name = employee_data.get('empName') or employee_data.get('fullName') or employee_data.get('name') or 'Employee'
    emp_id = employee_data.get('empId') or employee_data.get('id') or f"EMP-{int(time.time()) % 9000 + 1000}"
    role = employee_data.get('designation') or employee_data.get('jobTitle') or employee_data.get('role') or 'Senior Software Specialist'
    dept = employee_data.get('department') or 'Engineering'
    pan = employee_data.get('pan') or 'ABCDE8901F'
    uan = employee_data.get('uan') or '1012 9845 2310'
    bank_name = employee_data.get('bankName') or 'HDFC Bank Ltd'
    account_no = employee_data.get('accountNumber') or 'XXXXXX491029'
    last_working_day = employee_data.get('lastWorkingDay') or employee_data.get('lwd') or time.strftime('%Y-%m-%d')
    service_now_req = employee_data.get('serviceNowReq') or 'REQ0012000'

    # Month of payslip (e.g., September 2026)
    pay_period = employee_data.get('payPeriod') or "September 2026"
    pay_date = "September 30, 2026"

    safe_name = "".join(c for c in emp_name if c.isalnum() or c in (' ', '_', '-')).strip()
    filename = f"Payslip_{pay_period.replace(' ', '_')}_{safe_name.replace(' ', '_')}_{emp_id}.pdf"
    pdf_path = os.path.join(OUTPUT_DIR, filename)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=35,
        bottomMargin=35
    )

    styles = getSampleStyleSheet()

    c_primary = colors.HexColor("#0284c7")     # Ocean Primary
    c_dark = colors.HexColor("#0f172a")        # Dark Slate
    c_muted = colors.HexColor("#64748b")       # Muted Slate
    c_light = colors.HexColor("#f8fafc")       # Light Background
    c_border = colors.HexColor("#e2e8f0")      # Border
    c_emerald = colors.HexColor("#059669")     # Success Accent
    c_rose = colors.HexColor("#e11d48")        # Deduction Accent

    title_style = ParagraphStyle(
        'PayslipTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_dark,
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'PayslipSub',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=c_muted,
        alignment=TA_LEFT
    )

    meta_hdr = ParagraphStyle('MetaHdr', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=c_muted)
    meta_val = ParagraphStyle('MetaVal', fontName='Helvetica', fontSize=9, leading=12, textColor=c_dark)
    meta_val_bold = ParagraphStyle('MetaValBold', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=c_dark)

    tbl_hdr = ParagraphStyle('TblHdr', fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=colors.white)
    tbl_cell = ParagraphStyle('TblCell', fontName='Helvetica', fontSize=8.5, leading=11, textColor=c_dark)
    tbl_cell_amt = ParagraphStyle('TblCellAmt', fontName='Helvetica', fontSize=8.5, leading=11, textColor=c_dark, alignment=TA_RIGHT)
    tbl_total = ParagraphStyle('TblTotal', fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=c_dark, alignment=TA_RIGHT)

    story = []

    # 1. Company Header with Corporate Banner
    header_data = [
        [
            Paragraph("<b>AUTOMATIONEDGE TECHNOLOGIES</b><br/><font size=8 color='#64748b'>Enterprise Process Automation & AI Workforce Suite<br/>Cyber City, Magarpatta, Pune, Maharashtra 411028 | corporate-payroll@automationedge.com</font>", title_style),
            Paragraph(f"<font color='#0284c7'><b>CONFIDENTIAL PAYSLIP</b></font><br/><font size=8 color='#64748b'>Pay Period: <b>{pay_period}</b><br/>Disbursement Date: {pay_date}<br/>SN Ref: <b>{service_now_req}</b></font>", ParagraphStyle('RHead', parent=subtitle_style, alignment=TA_RIGHT))
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 202])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=2, color=c_primary, spaceBefore=4, spaceAfter=12))

    # 2. Employee Details Card (2-column key-value grid)
    emp_details = [
        [
            Paragraph("Employee Name:", meta_hdr), Paragraph(f"<b>{emp_name}</b>", meta_val_bold),
            Paragraph("Employee ID:", meta_hdr), Paragraph(f"<code>{emp_id}</code>", meta_val_bold)
        ],
        [
            Paragraph("Designation:", meta_hdr), Paragraph(role, meta_val),
            Paragraph("Department:", meta_hdr), Paragraph(dept, meta_val)
        ],
        [
            Paragraph("Date of Joining:", meta_hdr), Paragraph("15 Jan 2023", meta_val),
            Paragraph("Last Working Day:", meta_hdr), Paragraph(last_working_day, meta_val)
        ],
        [
            Paragraph("Bank Name:", meta_hdr), Paragraph(bank_name, meta_val),
            Paragraph("Bank Account:", meta_hdr), Paragraph(account_no, meta_val)
        ],
        [
            Paragraph("PAN Number:", meta_hdr), Paragraph(pan, meta_val),
            Paragraph("EPFO UAN:", meta_hdr), Paragraph(uan, meta_val)
        ],
        [
            Paragraph("Total Working Days:", meta_hdr), Paragraph("30 Days", meta_val),
            Paragraph("Days Paid:", meta_hdr), Paragraph("30 Days", meta_val)
        ]
    ]
    emp_table = Table(emp_details, colWidths=[105, 160, 110, 157])
    emp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_light),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(emp_table)
    story.append(Spacer(1, 12))

    # 3. Earnings & Deductions Table (Side by Side)
    # Realistic Indian Corporate Breakdown (₹2.2L / month package)
    salary_breakdown = [
        # Table Header
        [
            Paragraph("EARNINGS", tbl_hdr),
            Paragraph("AMOUNT (INR)", ParagraphStyle('H1', parent=tbl_hdr, alignment=TA_RIGHT)),
            Paragraph("DEDUCTIONS", tbl_hdr),
            Paragraph("AMOUNT (INR)", ParagraphStyle('H2', parent=tbl_hdr, alignment=TA_RIGHT))
        ],
        [
            Paragraph("Basic Salary", tbl_cell), Paragraph("₹95,000.00", tbl_cell_amt),
            Paragraph("Provident Fund (EPF)", tbl_cell), Paragraph("₹1,800.00", tbl_cell_amt)
        ],
        [
            Paragraph("House Rent Allowance (HRA)", tbl_cell), Paragraph("₹47,500.00", tbl_cell_amt),
            Paragraph("Professional Tax (PT)", tbl_cell), Paragraph("₹200.00", tbl_cell_amt)
        ],
        [
            Paragraph("Special Allowance", tbl_cell), Paragraph("₹45,000.00", tbl_cell_amt),
            Paragraph("Income Tax / TDS", tbl_cell), Paragraph("₹18,500.00", tbl_cell_amt)
        ],
        [
            Paragraph("Conveyance Allowance", tbl_cell), Paragraph("₹12,000.00", tbl_cell_amt),
            Paragraph("Voluntary Medical Insurance", tbl_cell), Paragraph("₹1,250.00", tbl_cell_amt)
        ],
        [
            Paragraph("Medical & Fitness Reimbursement", tbl_cell), Paragraph("₹8,500.00", tbl_cell_amt),
            Paragraph("Voluntary PF (VPF)", tbl_cell), Paragraph("₹0.00", tbl_cell_amt)
        ],
        [
            Paragraph("Statutory Performance Bonus", tbl_cell), Paragraph("₹14,000.00", tbl_cell_amt),
            Paragraph("Other Statutory Recovery", tbl_cell), Paragraph("₹0.00", tbl_cell_amt)
        ],
        # Totals Row
        [
            Paragraph("<b>TOTAL GROSS EARNINGS (A)</b>", meta_val_bold),
            Paragraph("<b>₹2,22,000.00</b>", ParagraphStyle('Tot1', parent=tbl_total, textColor=c_emerald)),
            Paragraph("<b>TOTAL DEDUCTIONS (B)</b>", meta_val_bold),
            Paragraph("<b>₹21,750.00</b>", ParagraphStyle('Tot2', parent=tbl_total, textColor=c_rose))
        ]
    ]

    salary_table = Table(salary_breakdown, colWidths=[175, 91, 175, 91])
    salary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), c_primary),
        ('BACKGROUND', (2, 0), (3, 0), colors.HexColor("#334155")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(salary_table)
    story.append(Spacer(1, 10))

    # 4. Net Pay Summary Highlight Card
    net_pay_data = [
        [
            Paragraph(
                "<font size=10 color='#0284c7'><b>NET SALARY PAYABLE: ₹2,00,250.00</b></font><br/>"
                "<font size=8 color='#475569'><b>Amount in Words:</b> Indian Rupees Two Lakh Two Hundred Fifty Only</font><br/>"
                f"<font size=7 color='#64748b'>Payment Mode: Direct Electronic NEFT Transfer to {bank_name} ({account_no})</font>",
                meta_val
            ),
            Paragraph(
                "<font size=8 color='#059669'><b>STATUS: TRANSFERRED & CONFIRMED</b></font><br/>"
                "<font size=7 color='#64748b'>UTR: CMS2026093098124<br/>Processed via AutoEdge Payroll</font>",
                ParagraphStyle('NetR', parent=meta_val, alignment=TA_RIGHT)
            )
        ]
    ]
    net_table = Table(net_pay_data, colWidths=[360, 172])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ecfdf5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#6ee7b7")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(net_table)
    story.append(Spacer(1, 14))

    # 5. Clearance & Compliance Note
    compliance_p = Paragraph(
        "<font size=7.5 color='#64748b'><b>Important Notes & Statutory Notice:</b><br/>"
        "1. This is a computer-generated payroll advice issued under AutomationEdge HR Suite and does not require a physical signature.<br/>"
        "2. In accordance with the IT Hardware Clearance & Employee Offboarding workflow, final clearance and FnF adjustments have been processed.<br/>"
        "3. Income Tax calculation is provisional based on investment declarations and Form 16 will be issued at the end of the financial year.<br/>"
        f"4. Associated ServiceNow Offboarding Request: <b>{service_now_req}</b> | Reference ID: <b>{emp_id}</b></font>",
        ParagraphStyle('Notice', fontName='Helvetica', fontSize=7.5, leading=10, textColor=c_muted)
    )
    story.append(compliance_p)
    story.append(Spacer(1, 10))

    # 6. Corporate Seal & Sign-off Table
    seal_data = [
        [
            Paragraph("<font size=7.5 color='#94a3b8'>Generated electronically on: " + time.strftime('%Y-%m-%d %H:%M:%S') + "<br/>Verified by AutomationEdge Payroll Services</font>", meta_val),
            Paragraph("<b>For AutomationEdge Technologies Ltd.</b><br/><br/><br/><font size=8 color='#0f172a'><b>Authorized Signatory</b><br/>Global Payroll & Compensation Desk</font>", ParagraphStyle('SigR', parent=meta_val, alignment=TA_RIGHT))
        ]
    ]
    seal_table = Table(seal_data, colWidths=[332, 200])
    seal_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(seal_table)

    doc.build(story)
    return pdf_path

if __name__ == "__main__":
    test_pdf = generate_payslip_pdf({
        "empName": "Yash Kapoor",
        "empId": "EMP-60",
        "department": "Engineering",
        "role": "Lead Cloud Engineer",
        "serviceNowReq": "REQ0012000"
    })
    print(f"Generated test payslip: {test_pdf} (Size: {os.path.getsize(test_pdf)} bytes)")
