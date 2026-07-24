import os
import sys
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_pdf(output_path="PhishGuard_Progress_Report.pdf"):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0F172A")       # Deep Slate 900
    ACCENT_BLUE = colors.HexColor("#2563EB")   # Royal Blue 600
    ACCENT_GREEN = colors.HexColor("#059669")  # Emerald 600
    TEXT_DARK = colors.HexColor("#1E293B")     # Slate 800
    TEXT_MUTED = colors.HexColor("#64748B")    # Slate 500
    BG_LIGHT = colors.HexColor("#F8FAFC")      # Slate 50
    BORDER_COLOR = colors.HexColor("#E2E8F0")  # Slate 200

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=ACCENT_BLUE,
        spaceAfter=15
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_DARK,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=12,
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=PRIMARY
    )

    story = []

    # 1. Header Banner Title
    story.append(Paragraph("🛡️ PhishGuard — Enterprise Platform Progress Report", title_style))
    story.append(Paragraph("Next-Generation AI Cyber Awareness & Phishing Simulation Infrastructure", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT_BLUE, spaceAfter=12))

    # Metadata Summary Box
    meta_data = [
        [
            Paragraph("<b>Repository:</b> github.com/Aryan130805/AI-PhishGuard", table_cell_style),
            Paragraph("<b>Live URL:</b> phisguard-ochre.vercel.app", table_cell_style)
        ],
        [
            Paragraph("<b>Supabase Project ID:</b> ezjmrpdqgiicfprkgadi", table_cell_style),
            Paragraph(f"<b>Generated Date:</b> {datetime.now().strftime('%B %d, %Y')}", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[3.6 * inch, 3.6 * inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 2. Executive Overview
    story.append(Paragraph("1. Executive Overview", section_heading))
    story.append(Paragraph(
        "PhishGuard is an enterprise-ready, multi-tenant cybersecurity awareness platform designed to transform workforce employees into an active security defense layer. Engineered with modern SaaS aesthetics (inspired by Linear, Vercel, and Clerk), the platform features <b>floating rounded glassmorphic navigation bars</b>, <b>AI-driven phishing campaign generators</b>, <b>automated behavioral risk scoring</b>, <b>interactive micro-learning</b>, and <b>multi-portal role-based access control (RBAC)</b>.",
        body_style
    ))

    # 3. System Architecture & Portal Flow
    story.append(Paragraph("2. Portal Architecture & Navigation Flow", section_heading))
    story.append(Paragraph("• <b>Landing Page (<code>/</code>):</b> Public entry featuring platform highlights, enterprise capabilities, and floating glass navigation.", bullet_style))
    story.append(Paragraph("• <b>Portal Selection Gateway (<code>/portal</code>):</b> Enterprise portal selection hub routing users cleanly between Employee and Organization Auth.", bullet_style))
    story.append(Paragraph("• <b>Employee Portal (<code>/auth/employee</code> & <code>/dashboard</code>):</b> Searchable organization selection, employee registration, interactive micro-learning lessons, quizzes, certificates, and personal risk scores.", bullet_style))
    story.append(Paragraph("• <b>Organization Admin Portal (<code>/auth/organization</code> & <code>/admin/dashboard</code>):</b> Full enterprise manager dashboard, campaign builder, department heatmaps, AI generators, and audit reporting.", bullet_style))

    story.append(Spacer(1, 8))

    # 4. Feature Implementation Matrix (Table)
    story.append(Paragraph("3. Implemented Feature Matrix", section_heading))
    
    feature_data = [
        [
            Paragraph("Module Feature", table_header_style),
            Paragraph("Technical Description & Capabilities", table_header_style),
            Paragraph("Status", table_header_style)
        ],
        [
            Paragraph("Multi-Portal Authentication", table_cell_bold),
            Paragraph("Separated Employee & Organization portals with searchable verified org dropdown, JWT bearer token persistence, and quick demo logins.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ],
        [
            Paragraph("Glassmorphism UX/UI", table_cell_bold),
            Paragraph("Floating rounded navbars (`backdrop-blur-2xl`, `bg-slate-900/40`, `ring-1 ring-white/10`), sticky viewport scrolling, dark theme aesthetic.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ],
        [
            Paragraph("AI Phishing Campaign Engine", table_cell_bold),
            Paragraph("AI-generated phishing email templates, industry targeting, difficulty levels, tracking token links (`/simulated-landing/:token`), and event logs.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ],
        [
            Paragraph("Behavioral Risk Metrics", table_cell_bold),
            Paragraph("Automated DB triggers computing click rate, open rate, report rate, time-to-click, department threat heatmaps, and AI predictive risk models.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ],
        [
            Paragraph("Security Learning Center", table_cell_bold),
            Paragraph("Micro-training lessons, interactive quizzes with score validation, auto-generated PDF certificates, and employee badges.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ],
        [
            Paragraph("PhishGuard AI Copilot", table_cell_bold),
            Paragraph("Embedded floating interactive AI security chatbot assistant accessible across employee and admin layouts.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ],
        [
            Paragraph("Supabase & PostgreSQL DB", table_cell_bold),
            Paragraph("21 relational tables, automated SQL triggers & functions for metrics, RLS policies, connection pooling, and `supabase_setup.py` tool.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ],
        [
            Paragraph("Vercel & Analytics Deploy", table_cell_bold),
            Paragraph("Configured `vercel.json` SPA rewrites (fixes 404 on refresh), integrated `@vercel/analytics` and `@vercel/speed-insights`.", table_cell_style),
            Paragraph("<b>Completed</b>", table_cell_style)
        ]
    ]

    feature_table = Table(feature_data, colWidths=[1.8 * inch, 4.4 * inch, 1.0 * inch])
    feature_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(feature_table)

    story.append(Spacer(1, 10))

    # 5. Demo Test Credentials Table
    story.append(KeepTogether([
        Paragraph("4. Quick Test Credentials & Live Access", section_heading),
        Paragraph("The platform includes 1-click test credentials embedded directly on the auth pages for immediate verification:", body_style)
    ]))

    demo_data = [
        [
            Paragraph("Role / Portal", table_header_style),
            Paragraph("Direct Portal URL", table_header_style),
            Paragraph("Email", table_header_style),
            Paragraph("Password", table_header_style)
        ],
        [
            Paragraph("Employee Portal", table_cell_bold),
            Paragraph("<code>/auth/employee</code>", table_cell_style),
            Paragraph("alice.smith@acme.com", table_cell_style),
            Paragraph("employeepassword123", table_cell_style)
        ],
        [
            Paragraph("Employee Portal", table_cell_bold),
            Paragraph("<code>/auth/employee</code>", table_cell_style),
            Paragraph("tony.stark@stark.com", table_cell_style),
            Paragraph("employeepassword123", table_cell_style)
        ],
        [
            Paragraph("Organization Admin", table_cell_bold),
            Paragraph("<code>/auth/organization</code>", table_cell_style),
            Paragraph("admin@demo.com", table_cell_style),
            Paragraph("adminpassword123", table_cell_style)
        ],
        [
            Paragraph("Organization Admin", table_cell_bold),
            Paragraph("<code>/auth/organization</code>", table_cell_style),
            Paragraph("admin@acme.com", table_cell_style),
            Paragraph("adminpassword123", table_cell_style)
        ]
    ]

    demo_table = Table(demo_data, colWidths=[1.6 * inch, 2.0 * inch, 2.1 * inch, 1.5 * inch])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(demo_table)

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceAfter=8))
    story.append(Paragraph("<i>PhishGuard Security Platform Report · Generated Automatically · Confidential</i>", ParagraphStyle('FooterText', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, textColor=TEXT_MUTED, alignment=1)))

    doc.build(story)
    print(f"PDF Progress Report generated successfully at: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    out_pdf = "PhishGuard_Progress_Report.pdf"
    if len(sys.argv) > 1:
        out_pdf = sys.argv[1]
    generate_pdf(out_pdf)
