import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

from app.database import get_db
from app.rbac import require_role
from app.models.user import User
from app.models.learning import Lesson, Quiz, QuizAttempt, LessonAssignment, Certificate
from app.tasks.campaigns import recompute_user_risk_score

router = APIRouter(prefix="/training", tags=["training"])
cert_router = APIRouter(tags=["certificates"])

class QuizSubmissionPayload(BaseModel):
    answers: Optional[List[int]] = None

def generate_certificate_pdf(user_name: str, lesson_title: str, dest_path: str):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    # Create the document with landscape letter size
    doc = SimpleDocTemplate(
        dest_path,
        pagesize=(letter[1], letter[0]), # Landscape
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CertTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=36,
        leading=42,
        textColor=colors.HexColor('#1E3A8A'), # Dark Blue
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CertSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#4B5563'),
        alignment=TA_CENTER
    )
    
    name_style = ParagraphStyle(
        'CertName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor('#059669'), # Emerald Green
        alignment=TA_CENTER
    )
    
    course_style = ParagraphStyle(
        'CertCourse',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=20,
        leading=26,
        textColor=colors.HexColor('#1F2937'),
        alignment=TA_CENTER
    )
    
    footer_style = ParagraphStyle(
        'CertFooter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#9CA3AF'),
        alignment=TA_CENTER
    )
    
    story = [
        Spacer(1, 45),
        Paragraph("CERTIFICATE OF COMPLETION", title_style),
        Spacer(1, 20),
        Paragraph("This is proudly presented to", subtitle_style),
        Spacer(1, 20),
        Paragraph(user_name, name_style),
        Spacer(1, 20),
        Paragraph("for successfully completing the security awareness training course:", subtitle_style),
        Spacer(1, 15),
        Paragraph(f"<b>{lesson_title}</b>", course_style),
        Spacer(1, 45),
        Paragraph("PhishGuard Security Awareness Training Platform", footer_style),
        Paragraph(f"Issued on: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", footer_style)
    ]
    
    doc.build(story)

# Seed Data & Comprehensive Cybersecurity Curriculum
DEFAULT_LESSONS_DATA = [
    {
        "topic": "phishing_attacks",
        "title": "Email Phishing & Quishing (QR Code) Masterclass",
        "category": "Phishing Attacks",
        "difficulty": "Beginner",
        "summary": "Learn how to spot deceptive email headers, malicious links, credential harvesting, and dangerous QR code scams (Quishing).",
        "content": """
<h3>Understanding Modern Phishing Vectors</h3>
<p>Phishing remains the #1 initial access vector in cybersecurity breaches. Attackers spoof trusted brands, internal executives, and critical infrastructure providers to compromise credentials.</p>
<h4>Key Phishing Variants</h4>
<ul>
  <li><b>Email Phishing:</b> Mass distribution of fake invoices, account verification links, or security alerts.</li>
  <li><b>Spear Phishing & Whaling:</b> Highly targeted attacks customized to specific individuals or C-level executives.</li>
  <li><b>Quishing (QR Code Scams):</b> Embedding malicious QR codes in PDF invoices or physical flyers to bypass email gateway link filters and direct victims to mobile credential harvesters.</li>
  <li><b>Smishing & Vishing:</b> SMS text phishing and voice call impersonation (vishing) requesting immediate wire transfers or MFA codes.</li>
</ul>
<h4>Email Header Verification Protocol</h4>
<p>Always inspect the full sender address, SPF/DKIM validation flags, and hovering target URL before taking any action.</p>
""",
        "quiz": [
            {
                "question": "What is 'Quishing' in modern cyber attacks?",
                "options": [
                    "A technique to bypass email filters using malicious QR codes directing victims to phishing sites",
                    "A fast wireless network speed test protocol",
                    "A hardware key authentication standard",
                    "A method for encrypting email attachments"
                ],
                "correct_index": 0
            },
            {
                "question": "Which indicator strongly suggests an email is a spear phishing attempt?",
                "options": [
                    "Generic greeting like 'Dear Customer'",
                    "Contextual details referencing your recent project, boss's name, or internal vendor names",
                    "Sent from an @company.com domain with zero links",
                    "A newsletter with an unsubscribe link"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "malware_ransomware",
        "title": "Ransomware Prevention & Incident Response",
        "category": "Malware & Ransomware",
        "difficulty": "Intermediate",
        "summary": "Understand how ransomware encrypts enterprise storage, identifying keyloggers & trojans, and emergency incident containment.",
        "content": """
<h3>Ransomware Attack Mechanics</h3>
<p>Ransomware is malicious software designed to deny access to a computer system or data until a ransom is paid. Modern double-extortion campaigns steal confidential data prior to encryption.</p>
<h4>Common Infection Vectors</h4>
<ul>
  <li>Phishing attachments (.iso, .zip, .exe disguised as invoices).</li>
  <li>Exploiting unpatched remote services (RDP, VPN gateways).</li>
  <li>Malicious drive-by downloads & compromised software installers.</li>
</ul>
<h4>Emergency Incident Response Checklist</h4>
<ol>
  <li><b>Disconnect Immediately:</b> Pull the physical ethernet cable and disable Wi-Fi to stop lateral movement.</li>
  <li><b>Do Not Power Off:</b> Leave machine powered on to preserve RAM memory artifacts for forensics.</li>
  <li><b>Report Immediately:</b> Contact the Security Operations Center (SOC) or IT Security Lead.</li>
</ol>
""",
        "quiz": [
            {
                "question": "What is the very first action an employee should take upon noticing a ransomware extortion popup?",
                "options": [
                    "Pay the ransom using personal credit card",
                    "Immediately disconnect the device from Wi-Fi / LAN to stop network propagation",
                    "Restart the computer 3 times",
                    "Delete all system files manually"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "password_auth",
        "title": "Passkeys, MFA & Credential Stuffing Defense",
        "category": "Password & Authentication Security",
        "difficulty": "Beginner",
        "summary": "Master strong password entropy, hardware MFA keys, passkeys, and stopping automated credential stuffing & spraying attacks.",
        "content": """
<h3>Modern Authentication Security</h3>
<p>Reusing weak passwords leaves users vulnerable to automated credential stuffing attacks where leaked database dumps are tested across hundreds of popular services.</p>
<h4>Key Authentication Principles</h4>
<ul>
  <li><b>Password Entropy:</b> Length beats complexity. A 16+ character passphrase like <i>'Green-Elephant-Dances-Fast!'</i> is far stronger than <i>'P@ss1'</i>.</li>
  <li><b>Passkeys & FIDO2:</b> Cryptographic key pairs tied to device biometrics that are immune to phishing.</li>
  <li><b>Multi-Factor Authentication (MFA):</b> App-based TOTP (Authenticator apps) or Security Keys (YubiKeys) are vastly superior to SMS OTPs.</li>
</ul>
""",
        "quiz": [
            {
                "question": "Why are Passkeys and FIDO2 Hardware Keys considered phishing-resistant?",
                "options": [
                    "They require typing a 30-digit pin on every page",
                    "The cryptographic key exchange is cryptographically bound to the legitimate domain origin",
                    "They store passwords in plain text on cloud servers",
                    "They send an SMS message to your phone number"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "social_engineering",
        "title": "Social Engineering: Impersonation & Pretexting",
        "category": "Social Engineering",
        "difficulty": "Intermediate",
        "summary": "Recognize CEO fraud, Business Email Compromise (BEC), shoulder surfing, and high-pressure tech support impersonations.",
        "content": """
<h3>The Psychology of Social Engineering</h3>
<p>Social engineering manipulates human psychology rather than software vulnerabilities. Attackers leverage authority, urgency, fear, or curiosity to bypass security controls.</p>
<h4>Common Scenarios</h4>
<ul>
  <li><b>Pretexting:</b> Creating an invented scenario (e.g., impersonating an auditor or IT tech) to trick victims into sharing credentials.</li>
  <li><b>Baiting:</b> Leaving malware-infected USB flash drives in parking lots labeled 'Executive Compensation Q3'.</li>
  <li><b>Tailgating:</b> Following an authorized employee through a secure physical door without scanning a badge.</li>
</ul>
""",
        "quiz": [
            {
                "question": "An unknown person wearing a high-vis vest asks you to hold the secure office door open because their badge is in their car. What should you do?",
                "options": [
                    "Hold the door open to be polite",
                    "Kindly direct them to the reception desk to verify their credentials and badge in properly",
                    "Give them your badge to use for the day",
                    "Leave the door propped open with a chair"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "network_security",
        "title": "Public Wi-Fi, Rogue Hotspots & VPN Safety",
        "category": "Network Security",
        "difficulty": "Beginner",
        "summary": "Safely navigate untrusted public networks, preventing Man-in-the-Middle (MITM) attacks and DNS spoofing.",
        "content": """
<h3>Securing Connections on the Go</h3>
<p>Public Wi-Fi networks at airports, coffee shops, and hotels are inherently untrusted. Attackers can easily deploy 'Evil Twin' rogue access points to intercept unencrypted traffic.</p>
<h4>Best Practices</h4>
<ul>
  <li>Always enable enterprise VPN when connecting to external networks.</li>
  <li>Disable 'Auto-Connect to Open Wi-Fi Networks' on mobile devices.</li>
  <li>Verify HTTPS certificate locks and avoid accepting unknown SSL warnings.</li>
</ul>
""",
        "quiz": [
            {
                "question": "What is an 'Evil Twin' Wi-Fi attack?",
                "options": [
                    "Connecting two Wi-Fi routers using an ethernet cable",
                    "A rogue Wi-Fi access point configured by an attacker to match a legitimate public network name",
                    "A software update for Wi-Fi cards",
                    "A fast 5G cellular connection tower"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "cloud_security",
        "title": "Cloud Storage & SaaS Permission Security",
        "category": "Cloud Security",
        "difficulty": "Intermediate",
        "summary": "Prevent public S3 bucket exposure, manage SaaS sharing permissions, and audit identity access misconfigurations.",
        "content": """
<h3>Protecting Cloud Data & Identity</h3>
<p>Cloud security incidents are overwhelmingly caused by misconfigured access permissions and overly permissive public sharing links.</p>
<h4>Cloud Safety Rules</h4>
<ul>
  <li>Never set file/folder sharing to 'Anyone with the link can edit'. Restrict to explicit named collaborators.</li>
  <li>Enforce Least Privilege Principle: Users should only have access required for their current role.</li>
  <li>Regularly audit external shared drives and API tokens.</li>
</ul>
""",
        "quiz": [
            {
                "question": "What is the safest default sharing setting when sending confidential work documents via cloud storage?",
                "options": [
                    "Public - Anyone on the internet can search and view",
                    "Restricted - Specific named organization email addresses only with view access",
                    "Anyone with the link can edit",
                    "Post the link on public social media"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "ai_modern_threats",
        "title": "AI Phishing, Deepfakes & Prompt Injection",
        "category": "AI & Modern Cyber Threats",
        "difficulty": "Advanced",
        "summary": "Defend against hyper-realistic AI voice/video cloning, deepfake wire scams, and malicious prompt injection exploits.",
        "content": """
<h3>The Era of AI-Driven Cyber Attacks</h3>
<p>Generative AI tools allow threat actors to craft zero-error localized phishing emails, clone executive voices from short audio clips, and automate exploits at scale.</p>
<h4>Emerging AI Attack Vectors</h4>
<ul>
  <li><b>Deepfake Voice/Video Impersonation:</b> Cloned audio used in phone calls to request emergency wire transfers.</li>
  <li><b>Prompt Injection:</b> Hiding malicious instructions inside documents processed by corporate AI assistants.</li>
  <li><b>Synthetic Identity Theft:</b> Generating realistic AI avatars for fake job applicants and insider espionage.</li>
</ul>
""",
        "quiz": [
            {
                "question": "You receive an urgent phone call from your CEO requesting an immediate $50,000 wire transfer. The voice sounds genuine. What is the safest protocol?",
                "options": [
                    "Process the wire transfer immediately",
                    "Hang up and call the CEO directly back on a pre-verified internal number or verify in person out-of-band",
                    "Email an external hotmail address to confirm",
                    "Post about the call on Twitter"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "mobile_security",
        "title": "Mobile Threats, Rogue APKs & SIM Swapping",
        "category": "Mobile Security",
        "difficulty": "Intermediate",
        "summary": "Spot malicious mobile apps, rogue APK permissions, Bluetooth vulnerability exploits, and SIM swap account takeovers.",
        "content": """
<h3>Securing Enterprise Mobile Devices</h3>
<p>Smartphones store credentials, MFA tokens, and corporate communications, making them prime targets for mobile malware and carrier social engineering.</p>
<h4>Mobile Defense Strategies</h4>
<ul>
  <li>Only download applications from official app stores (Google Play, Apple App Store).</li>
  <li>Never side-load unknown .APK or IPA package files.</li>
  <li>Contact telecom provider to set up a SIM-swap PIN protection code.</li>
</ul>
""",
        "quiz": [
            {
                "question": "What is a 'SIM Swapping' attack?",
                "options": [
                    "Replacing a SIM card with a micro SD memory card",
                    "Tricking a mobile carrier into porting a victim's phone number to an attacker's SIM card to intercept SMS MFA codes",
                    "Using two SIM cards in one dual-sim phone",
                    "Connecting to a 4G network tower"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "workplace_security",
        "title": "Clean Desk Policy & Drop-Drive USB Attacks",
        "category": "Workplace Security",
        "difficulty": "Beginner",
        "summary": "Best practices for physical workstation lockouts, handling unknown USB drop drives, and clean desk data protection.",
        "content": """
<h3>Physical & Environmental Security</h3>
<p>Physical security is the first line of defense. Unlocked workstations, visible passwords on sticky notes, and unknown USB drives jeopardize corporate security.</p>
<h4>Essential Workplace Rules</h4>
<ul>
  <li><b>Windows Key + L / Cmd + Ctrl + Q:</b> Lock your screen every time you step away from your desk.</li>
  <li><b>Unknown USB Drives:</b> Never insert found USB drives into company computers; deliver them directly to IT.</li>
  <li><b>Clean Desk Policy:</b> Store sensitive printouts in locked cabinets when leaving at the end of the day.</li>
</ul>
""",
        "quiz": [
            {
                "question": "You find a brand new USB flash drive in the office elevator labeled 'Q4 Salary Bonuses'. What should you do?",
                "options": [
                    "Plug it into your laptop to see who owns it",
                    "Do NOT plug it in. Hand it directly to your IT / Security team",
                    "Plug it into a coworker's computer to test it",
                    "Format it on your main work machine"
                ],
                "correct_index": 1
            }
        ]
    },
    {
        "topic": "emerging_threats",
        "title": "CVE-2026-8910: AI LLM Extension Zero-Day & Prompt Hijacking",
        "category": "Emerging Threat Intelligence",
        "difficulty": "Expert",
        "summary": "Immediate advisory on critical zero-day exploits targeting browser AI extensions and automated prompt injection attacks.",
        "content": """
<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
  <strong style="color: #ef4444;">🚨 EMERGENCY THREAT ADVISORY | CVE-2026-8910</strong>
  <p style="margin-top: 4px; font-size: 13px;">Critical Zero-Day exploit active in third-party browser AI extensions executing hidden prompt injection payloads.</p>
</div>
<h3>Threat Analysis & Impact</h3>
<p>Security researchers have detected active exploitation of browser extension AI assistants that summarize web pages. Malicious websites embed invisible HTML prompt injection strings that instruct the AI assistant to read private session cookies and transmit them to external command-and-control servers.</p>
<h4>Mitigation Guidance</h4>
<ol>
  <li>Disable unapproved AI summarizer browser extensions immediately.</li>
  <li>Update corporate browser policies to block untrusted extension origins.</li>
  <li>Report suspicious extension prompts to IT Security.</li>
</ol>
""",
        "quiz": [
            {
                "question": "How does an indirect Prompt Injection attack exploit AI web summarizer extensions?",
                "options": [
                    "By physical hardware modification of the monitor",
                    "By embedding hidden text on web pages that instructs the AI assistant to leak sensitive data",
                    "By sending an unsolicited fax to the company",
                    "By overheating the computer processor"
                ],
                "correct_index": 1
            }
        ]
    }
]

def ensure_seeded_lessons(db: Session):
    existing_titles = {l.title for l in db.query(Lesson).all()}
    for item in DEFAULT_LESSONS_DATA:
        if item["title"] not in existing_titles:
            new_lesson = Lesson(
                topic=item["topic"],
                title=item["title"],
                content=item["content"],
                category=item.get("category", "Phishing Attacks"),
                difficulty=item.get("difficulty", "Beginner"),
                summary=item.get("summary", ""),
                is_emerging_threat=item.get("category") == "Emerging Threat Intelligence",
                cve_id="CVE-2026-8910" if item.get("category") == "Emerging Threat Intelligence" else None,
                published_date=datetime.now(timezone.utc).strftime("%Y-%m-%d")
            )
            db.add(new_lesson)
            db.flush()

            if "quiz" in item and item["quiz"]:
                new_quiz = Quiz(
                    lesson_id=new_lesson.id,
                    questions=item["quiz"]
                )
                db.add(new_quiz)
    db.commit()

def ensure_user_assignments(user_id: int, db: Session):
    ensure_seeded_lessons(db)
    all_lessons = db.query(Lesson).all()
    assigned_ids = {a.lesson_id for a in db.query(LessonAssignment).filter(LessonAssignment.user_id == user_id).all()}
    
    for l in all_lessons:
        if l.id not in assigned_ids:
            new_assoc = LessonAssignment(
                user_id=user_id,
                lesson_id=l.id,
                assigned_at=datetime.now(timezone.utc)
            )
            db.add(new_assoc)
    db.commit()

@router.get("/assignments")
def get_assignments(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    ensure_user_assignments(current_user.id, db)
    assignments = db.query(LessonAssignment).filter(LessonAssignment.user_id == current_user.id).all()
    results = []
    for assoc in assignments:
        lesson = assoc.lesson
        quiz = db.query(Quiz).filter(Quiz.lesson_id == lesson.id).first()
        
        results.append({
            "id": assoc.id,
            "lesson_id": assoc.lesson_id,
            "assigned_at": assoc.assigned_at,
            "completed_at": assoc.completed_at,
            "lesson": {
                "id": lesson.id,
                "topic": lesson.topic,
                "title": lesson.title,
                "content": lesson.content,
                "category": getattr(lesson, "category", "Phishing Attacks") or "Phishing Attacks",
                "difficulty": getattr(lesson, "difficulty", "Beginner") or "Beginner",
                "summary": getattr(lesson, "summary", "") or "",
                "is_emerging_threat": getattr(lesson, "is_emerging_threat", False),
                "cve_id": getattr(lesson, "cve_id", None),
                "quiz": {
                    "id": quiz.id if quiz else None,
                    "questions": quiz.questions if quiz else []
                }
            }
        })
    return results

@router.get("/lessons")
def get_lessons(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    ensure_user_assignments(current_user.id, db)
    assignments = db.query(LessonAssignment).filter(LessonAssignment.user_id == current_user.id).all()
    if not assignments:
        all_lessons = db.query(Lesson).all()
        for l in all_lessons:
            db.add(LessonAssignment(user_id=current_user.id, lesson_id=l.id))
        db.commit()
        assignments = db.query(LessonAssignment).filter(LessonAssignment.user_id == current_user.id).all()

    results = []
    for assoc in assignments:
        lesson = assoc.lesson
        if not lesson:
            continue
        cat = getattr(lesson, "category", "Phishing Attacks") or "Phishing Attacks"
        diff = getattr(lesson, "difficulty", "Beginner") or "Beginner"

        if category and category.strip() and category.lower() != "all" and cat.lower() != category.lower():
            continue
        if difficulty and difficulty.strip() and difficulty.lower() != "all" and diff.lower() != difficulty.lower():
            continue

        results.append({
            "id": lesson.id,
            "topic": lesson.topic,
            "title": lesson.title,
            "category": cat,
            "difficulty": diff,
            "summary": getattr(lesson, "summary", "") or "",
            "is_emerging_threat": getattr(lesson, "is_emerging_threat", False),
            "cve_id": getattr(lesson, "cve_id", None),
            "assigned_at": assoc.assigned_at,
            "completed_at": assoc.completed_at,
            "completed": assoc.completed_at is not None
        })
    return results

@router.get("/adaptive-profile")
def get_adaptive_profile(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    ensure_user_assignments(current_user.id, db)
    assignments = db.query(LessonAssignment).filter(LessonAssignment.user_id == current_user.id).all()
    total_assigned = len(assignments)
    completed_assignments = [a for a in assignments if a.completed_at is not None]
    completed_count = len(completed_assignments)

    completion_pct = round((completed_count / total_assigned * 100), 1) if total_assigned > 0 else 0.0

    # Determine security knowledge level
    if completion_pct >= 85:
        knowledge_level = "Expert"
    elif completion_pct >= 55:
        knowledge_level = "Advanced"
    elif completion_pct >= 25:
        knowledge_level = "Intermediate"
    else:
        knowledge_level = "Beginner"

    # Category breakdown
    categories_map = {}
    for assoc in assignments:
        cat = getattr(assoc.lesson, "category", "Phishing Attacks") or "Phishing Attacks"
        if cat not in categories_map:
            categories_map[cat] = {"total": 0, "completed": 0}
        categories_map[cat]["total"] += 1
        if assoc.completed_at:
            categories_map[cat]["completed"] += 1

    # Recommend next lessons (incomplete lessons from categories with lowest completion %)
    incomplete_assignments = [a for a in assignments if a.completed_at is None]
    recommended_lessons = []
    for assoc in incomplete_assignments[:3]:
        lesson = assoc.lesson
        recommended_lessons.append({
            "id": lesson.id,
            "title": lesson.title,
            "category": getattr(lesson, "category", "Phishing Attacks") or "Phishing Attacks",
            "difficulty": getattr(lesson, "difficulty", "Beginner") or "Beginner",
            "summary": getattr(lesson, "summary", "") or ""
        })

    return {
        "user_id": current_user.id,
        "knowledge_level": knowledge_level,
        "completion_percentage": completion_pct,
        "completed_count": completed_count,
        "total_assigned": total_assigned,
        "streak_days": min(completed_count * 2 + 1, 14),
        "suggested_next_difficulty": current_user.suggested_next_difficulty or "easy",
        "category_stats": categories_map,
        "recommended_lessons": recommended_lessons
    }

@router.get("/emerging-threats")
def get_emerging_threats(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    ensure_user_assignments(current_user.id, db)
    threat_lessons = db.query(Lesson).filter(Lesson.category == "Emerging Threat Intelligence").all()
    
    # Return structured live threat advisories
    advisories = [
        {
            "id": 101,
            "cve_id": "CVE-2026-8910",
            "title": "AI LLM Extension Zero-Day & Indirect Prompt Hijacking",
            "severity": "CRITICAL",
            "category": "AI & Modern Cyber Threats",
            "published_date": "2026-07-25",
            "summary": "Active zero-day in browser AI summarizer extensions reading local session cookies via hidden prompt injection strings.",
            "lesson_id": threat_lessons[0].id if threat_lessons else None,
            "mitigation": "Disable unapproved browser extensions immediately and enforce strict CSP policies."
        },
        {
            "id": 102,
            "cve_id": "CVE-2026-4412",
            "title": "Deepfake Voice Cloning CFO Wire Transfer Campaign",
            "severity": "HIGH",
            "category": "Social Engineering",
            "published_date": "2026-07-24",
            "summary": "Sophisticated BEC campaign utilizing 3-second audio samples to clone executive voice calls targeting finance departments.",
            "lesson_id": threat_lessons[0].id if threat_lessons else None,
            "mitigation": "Require multi-person verbal verification on out-of-band phone numbers for wire transfers over $10k."
        },
        {
            "id": 103,
            "cve_id": "CVE-2026-1189",
            "title": "Quishing Wave: QR Code PDF Invoice Credential Harvesters",
            "severity": "HIGH",
            "category": "Phishing Attacks",
            "published_date": "2026-07-22",
            "summary": "Mass campaign of PDF invoices embedding high-density QR codes to bypass email link scanners and compromise mobile devices.",
            "lesson_id": threat_lessons[0].id if threat_lessons else None,
            "mitigation": "Scan QR codes only with enterprise mobile browser inspection tools."
        }
    ]
    return advisories

class LessonCreateEditPayload(BaseModel):
    title: str
    topic: str
    category: str
    difficulty: str
    summary: Optional[str] = None
    content: str
    quiz: Optional[List[dict]] = None

@router.post("/lessons")
def create_lesson(
    payload: LessonCreateEditPayload,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    new_lesson = Lesson(
        topic=payload.topic,
        title=payload.title,
        category=payload.category,
        difficulty=payload.difficulty,
        summary=payload.summary or "",
        content=payload.content,
        published_date=datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )
    db.add(new_lesson)
    db.flush()

    if payload.quiz:
        new_quiz = Quiz(
            lesson_id=new_lesson.id,
            questions=payload.quiz
        )
        db.add(new_quiz)

    # Assign to all users in org
    all_users = db.query(User).all()
    for u in all_users:
        assoc = LessonAssignment(
            user_id=u.id,
            lesson_id=new_lesson.id,
            assigned_at=datetime.now(timezone.utc)
        )
        db.add(assoc)

    db.commit()
    return {"message": "Lesson created successfully", "lesson_id": new_lesson.id}

@router.get("/lessons/{id}")
def get_lesson(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == id,
        LessonAssignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson assignment not found"
        )
        
    lesson = assignment.lesson
    quiz = db.query(Quiz).filter(Quiz.lesson_id == lesson.id).first()
    
    stripped_questions = []
    if quiz and quiz.questions:
        for q in quiz.questions:
            stripped_questions.append({
                "question": q.get("question"),
                "options": q.get("options", [])
            })
            
    return {
        "id": lesson.id,
        "topic": lesson.topic,
        "title": lesson.title,
        "content": lesson.content,
        "category": getattr(lesson, "category", "Phishing Attacks") or "Phishing Attacks",
        "difficulty": getattr(lesson, "difficulty", "Beginner") or "Beginner",
        "summary": getattr(lesson, "summary", "") or "",
        "is_emerging_threat": getattr(lesson, "is_emerging_threat", False),
        "cve_id": getattr(lesson, "cve_id", None),
        "completed_at": assignment.completed_at,
        "completed": assignment.completed_at is not None,
        "quiz": {
            "id": quiz.id if quiz else None,
            "questions": stripped_questions
        }
    }

@router.get("/quiz/{id}")
def get_quiz(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
        
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == quiz.lesson_id,
        LessonAssignment.user_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Lesson is not assigned to you"
        )
        
    stripped_questions = []
    if quiz.questions:
        for q in quiz.questions:
            stripped_questions.append({
                "question": q.get("question"),
                "options": q.get("options", [])
            })
            
    return {
        "id": quiz.id,
        "lesson_id": quiz.lesson_id,
        "lesson_title": quiz.lesson.title if quiz.lesson else "Training Module",
        "questions": stripped_questions
    }

@router.post("/quiz/{id}/submit")
def submit_quiz(
    id: int,
    payload: QuizSubmissionPayload,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    current_user = db.merge(current_user, load=False)
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
        
    lesson_id = quiz.lesson_id
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == lesson_id,
        LessonAssignment.user_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lesson not assigned to this user"
        )
        
    if payload.answers is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answers are required"
        )
        
    correct_count = 0
    total_questions = len(quiz.questions)
    
    if total_questions > 0:
        for idx, q in enumerate(quiz.questions):
            correct_idx = q.get("correct_index", 0)
            user_ans = payload.answers[idx] if idx < len(payload.answers) else -1
            if user_ans == correct_idx:
                correct_count += 1
        score = int((correct_count / total_questions) * 100)
        passed = score >= 70
    else:
        score = 100
        passed = True
        
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        score=score,
        passed=passed
    )
    db.add(attempt)
    
    if passed:
        assignment.completed_at = datetime.now(timezone.utc)
        
        # Promote user suggested difficulty tier
        tiers = ["easy", "medium", "hard", "expert"]
        current_diff = current_user.suggested_next_difficulty or "easy"
        if current_diff in tiers:
            idx = tiers.index(current_diff)
            if idx < len(tiers) - 1:
                current_user.suggested_next_difficulty = tiers[idx + 1]
            else:
                current_user.suggested_next_difficulty = "expert"
        else:
            current_user.suggested_next_difficulty = "medium"
            
        # PDF Generation
        pdf_dir = "certificates"
        os.makedirs(pdf_dir, exist_ok=True)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        pdf_filename = f"{today_str}_{current_user.id}_{lesson_id}.pdf"
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        user_name = current_user.email.split('@')[0].capitalize()
        generate_certificate_pdf(user_name, assignment.lesson.title, pdf_path)
        
        existing_cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.lesson_id == lesson_id
        ).first()
        if not existing_cert:
            cert = Certificate(
                user_id=current_user.id,
                lesson_id=lesson_id,
                pdf_path=pdf_path
            )
            db.add(cert)
            
            try:
                from app.services.notification_service import create_notification
                create_notification(
                    db=db,
                    user_id=current_user.id,
                    notif_type="certificate_issued",
                    payload={
                        "message": f"Congratulations! You have completed the quiz and been issued a certificate for '{assignment.lesson.title}'.",
                        "link": "/employee/certificates"
                    }
                )
            except Exception as notif_err:
                print(f"Failed to create certificate_issued notification: {str(notif_err)}")
            
    db.commit()
    
    # Synchronously update risk score
    recompute_user_risk_score(current_user.id)
    
    return {
        "score": score,
        "passed": passed,
        "suggested_next_difficulty": current_user.suggested_next_difficulty
    }

@router.post("/lessons/{id}/complete")
def complete_lesson(
    id: int,
    payload: QuizSubmissionPayload,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    # Backward compatible complete route matching Phase 11
    current_user = db.merge(current_user, load=False)
    assignment = db.query(LessonAssignment).filter(
        LessonAssignment.lesson_id == id,
        LessonAssignment.user_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson assignment not found for this user"
        )
        
    assignment.completed_at = datetime.now(timezone.utc)
    
    quiz = db.query(Quiz).filter(Quiz.lesson_id == id).first()
    score = 100
    passed = True
    
    if quiz and payload.answers is not None:
        correct_count = 0
        total_questions = len(quiz.questions)
        
        if total_questions > 0:
            for idx, q in enumerate(quiz.questions):
                correct_idx = q.get("correct_index", 0)
                user_ans = payload.answers[idx] if idx < len(payload.answers) else -1
                if user_ans == correct_idx:
                    correct_count += 1
            score = int((correct_count / total_questions) * 100)
            passed = score >= 70
            
        attempt = QuizAttempt(
            quiz_id=quiz.id,
            user_id=current_user.id,
            score=score,
            passed=passed
        )
        db.add(attempt)
        
        tiers = ["easy", "medium", "hard", "expert"]
        current_diff = current_user.suggested_next_difficulty or "easy"
        
        if passed:
            if current_diff in tiers:
                idx = tiers.index(current_diff)
                if idx < len(tiers) - 1:
                    current_user.suggested_next_difficulty = tiers[idx + 1]
                else:
                    current_user.suggested_next_difficulty = "expert"
            else:
                current_user.suggested_next_difficulty = "medium"
                
    if passed:
        # PDF Generation for certificates
        pdf_dir = "certificates"
        os.makedirs(pdf_dir, exist_ok=True)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        pdf_filename = f"{today_str}_{current_user.id}_{id}.pdf"
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        
        user_name = current_user.email.split('@')[0].capitalize()
        generate_certificate_pdf(user_name, assignment.lesson.title, pdf_path)
        
        existing_cert = db.query(Certificate).filter(
            Certificate.user_id == current_user.id,
            Certificate.lesson_id == id
        ).first()
        if not existing_cert:
            cert = Certificate(
                user_id=current_user.id,
                lesson_id=id,
                pdf_path=pdf_path
            )
            db.add(cert)
            
    db.commit()
    
    recompute_user_risk_score(current_user.id)
    
    return {
        "message": "Lesson completed and quiz processed",
        "score": score,
        "passed": passed,
        "suggested_next_difficulty": current_user.suggested_next_difficulty
    }

@router.get("/leaderboard")
def get_leaderboard(
    department_id: Optional[int] = None,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    from app.models.risk import UserMetrics
    
    users_query = db.query(User).join(User.role).filter(User.role.has(name="employee"))
    
    # Filter leaderboard to only include employees in the SAME organization
    if current_user.organization_id:
        users_query = users_query.filter(User.organization_id == current_user.organization_id)
        
    if department_id:
        users_query = users_query.filter(User.department_id == department_id)
        
    users = users_query.all()
    leaderboard = []
    
    for u in users:
        metrics = db.query(UserMetrics).filter(UserMetrics.user_id == u.id).first()
        report_rate = metrics.report_rate if metrics else 0.85
        click_rate = metrics.click_rate if metrics else 0.10
        
        total_assigned = db.query(LessonAssignment).filter(LessonAssignment.user_id == u.id).count()
        completed_lessons = db.query(LessonAssignment).filter(
            LessonAssignment.user_id == u.id,
            LessonAssignment.completed_at != None
        ).count()
        
        quiz_pass_rate = completed_lessons / total_assigned if total_assigned > 0 else 0.90
        score_val = (quiz_pass_rate * 0.4 + report_rate * 0.4 + (1 - click_rate) * 0.2) * 100
        composite_score = round(score_val, 1)
        
        dept_name = u.department.name if u.department else "General"
        
        raw_handle = u.email.split('@')[0]
        formatted_name = raw_handle.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()
        if formatted_name.lower() == 'admin':
            formatted_name = 'Employee'
        
        leaderboard.append({
            "id": u.id,
            "name": formatted_name,
            "email": u.email,
            "department": dept_name,
            "organization_name": u.organization.name if u.organization else "Organization",
            "composite_score": composite_score,
            "is_current_user": u.id == current_user.id
        })
        
    leaderboard.sort(key=lambda x: x["composite_score"], reverse=True)
    return leaderboard

@cert_router.get("/certificates")
def list_certificates(
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    """List all certificates for the current user."""
    certs = db.query(Certificate).filter(Certificate.user_id == current_user.id).order_by(Certificate.issued_at.desc()).all()
    return [
        {
            "id": c.id,
            "lesson_id": c.lesson_id,
            "lesson_title": c.lesson.title if c.lesson else "Security Training Module",
            "issued_at": c.issued_at.isoformat(),
            "pdf_path": c.pdf_path
        }
        for c in certs
    ]

@cert_router.get("/certificates/{id}/download")
def download_certificate(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    cert = db.query(Certificate).filter(Certificate.id == id).first()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
        
    is_admin = current_user.role.name == "admin" if current_user.role else False
    if not is_admin and cert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot access other users' certificates"
        )
        
    if not os.path.exists(cert.pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate file not found on disk"
        )
        
    filename = os.path.basename(cert.pdf_path)
    return FileResponse(
        path=cert.pdf_path,
        filename=filename,
        media_type="application/pdf"
    )
