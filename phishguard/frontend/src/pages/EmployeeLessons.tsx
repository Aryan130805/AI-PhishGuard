import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  BookOpen, CheckCircle, ArrowRight, ArrowLeft, ChevronRight, BookOpenCheck, HelpCircle, Shield, 
  Sparkles, Flame, Award, AlertTriangle, Search, Plus, Edit3, Trash2, Filter,
  Zap, Lock, Smartphone, Wifi, Cloud, Bot, Eye, KeyRound, AlertCircle, Play, UserCheck,
  Check, X, RefreshCw, CheckSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';

interface ModuleQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface ModuleSection {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  questions: ModuleQuestion[];
}

interface LessonItem {
  id: number;
  topic: string;
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  is_emerging_threat: boolean;
  cve_id: string | null;
  assigned_at: string;
  completed_at: string | null;
  completed: boolean;
  completed_sections?: number[];
  current_section?: number;
}

interface LessonDetail extends LessonItem {
  content: string;
  sections?: ModuleSection[];
  quiz: {
    id: number | null;
    questions: any[];
  };
}

export function shuffleQuestionOptions<T extends { question: string; options: string[]; correct_index?: number; explanation?: string }>(questions: T[]): T[] {
  if (!questions || !Array.isArray(questions)) return [];

  return questions.map(q => {
    if (!q.options || !Array.isArray(q.options) || q.options.length <= 1) return q;

    const correctIdx = typeof q.correct_index === 'number' ? q.correct_index : 0;
    const items = q.options.map((opt, idx) => ({
      text: opt,
      isCorrect: idx === correctIdx
    }));

    // Fisher-Yates shuffle
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const newCorrectIdx = shuffled.findIndex(item => item.isCorrect);

    return {
      ...q,
      options: shuffled.map(item => item.text),
      correct_index: newCorrectIdx >= 0 ? newCorrectIdx : 0
    };
  });
}

interface AdaptiveProfile {
  knowledge_level: string;
  completion_percentage: number;
  completed_count: number;
  total_assigned: number;
  streak_days: number;
  category_stats: Record<string, { total: number; completed: number }>;
  recommended_lessons: {
    id: number;
    title: string;
    category: string;
    difficulty: string;
    summary: string;
  }[];
  suggested_next_difficulty?: string;
}

interface EmergingThreat {
  id: number;
  cve_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: string;
  published_date: string;
  summary: string;
  lesson_id: number | null;
  mitigation: string;
}

function getStructuredSectionsForLesson(lesson: any): ModuleSection[] {
  if (lesson.sections && Array.isArray(lesson.sections) && lesson.sections.length > 0) {
    return lesson.sections.map((sec: any) => ({
      ...sec,
      questions: shuffleQuestionOptions(sec.questions || [])
    }));
  }

  const category = lesson.category || 'Phishing Attacks';
  const title = lesson.title || 'Security Awareness';

  if (category === 'Phishing Attacks' || title.toLowerCase().includes('phish')) {
    const baseSections: ModuleSection[] = [
      {
        id: 'sec-1',
        title: '1. What is a Phishing Attack?',
        subtitle: 'Core Definition, History, Psychological Mechanics & Email Anatomy',
        content: `
          <h3>Comprehensive Masterclass: What is a Phishing Attack?</h3>
          <p><b>Phishing</b> (derived from 'fishing' for sensitive data using deceptive bait) is a form of social engineering cyber attack where threat actors masquerade as reputable entities—such as trusted banking institutions, internal corporate IT departments, cloud service providers, or C-level executives—to manipulate victims into revealing confidential information, handing over authentication credentials, or executing malicious code.</p>

          <h4>The Evolution of Phishing: From 1990s Spam to Modern SSO Theft</h4>
          <p>Phishing originated in the mid-1990s when cybercriminals used stolen credit cards to create fake America Online (AOL) accounts and messaged users posing as AOL customer support to harvest login passwords. Over the past three decades, phishing has transformed from simple generic spam into hyper-targeted, AI-driven, multi-stage enterprise attacks.</p>

          <h4>Why Phishing Causes Over 82% of Corporate Breaches</h4>
          <p>From an attacker's economic perspective, breaking 256-bit AES encryption or exploiting zero-day vulnerabilities in hardened firewalls requires months of specialized research and millions of dollars. Conversely, sending a psychological email that tricks an employee into typing their password into a fake portal takes minutes and costs virtually nothing. <b>Attacking human trust is the path of least resistance.</b></p>

          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(59, 130, 246, 0.35); padding: 18px; border-radius: 14px; margin: 16px 0;">
            <h4 style="color: #60a5fa; margin-top: 0; font-size: 15px;">🧠 Deep Dive: The 7 Core Psychological Triggers Used by Attackers</h4>
            <ul style="margin-bottom: 0; padding-left: 20px; line-height: 1.7;">
              <li><b>1. Artificial Urgency & Time Pressure:</b> <i>"Your account will be permanently deactivated within 2 hours!"</i> Forces victims to act on impulse before their rational brain can evaluate the claim.</li>
              <li><b>2. Authority & Hierarchical Impersonation:</b> Impersonating CEOs, HR Directors, or IT SOC Leads. Workplace social conditioning trains employees to obey executive requests immediately.</li>
              <li><b>3. Intimidation & Fear of Penalties:</b> Threats of legal lawsuits, IRS tax audits, compliance violations, or disciplinary termination.</li>
              <li><b>4. Curiosity, Vanity & Greed:</b> <i>"Confidential Q4 Salary & Bonus Distribution Sheet"</i> or <i>"You have received an unexpected performance award"</i>.</li>
              <li><b>5. Reciprocity & Helpful Intent:</b> <i>"We are performing a routine VPN upgrade; please log in so we can verify your account"</i>. Exploits an employee's natural desire to assist colleagues.</li>
              <li><b>6. Scarcity & FOMO (Fear Of Missing Out):</b> <i>"Only 5 corporate stock options remaining—claim yours now"</i>.</li>
              <li><b>7. Brand Familiarity & Social Proof:</b> Replicating official Microsoft 365, Google Workspace, DocuSign, Slack, or Workday email templates to instill false confidence.</li>
            </ul>
          </div>

          <h4>Anatomy of a Deceptive Phishing Email</h4>
          <p>Every phishing email contains structural elements engineered to mislead:</p>
          <ul style="padding-left: 20px; line-height: 1.7;">
            <li><b>Display Name Spoofing:</b> The email client displays <code>Microsoft Security Desk</code>, hiding the real sender address behind it.</li>
            <li><b>Lookalike Sender Domain:</b> Using subtle letter swaps like <code>notice@micr0soft-support.com</code> (zero instead of 'o').</li>
            <li><b>Generic or Manipulated Salutation:</b> Using <code>Dear Valued Employee</code> or scraping your first name from LinkedIn.</li>
            <li><b>Deceptive Hyperlink Anchor Text:</b> The email link text says <code>https://login.microsoftonline.com</code>, but hovering reveals it redirects to <code>http://attacker-phish-portal.ru/login</code>.</li>
            <li><b>Fake Security & Confidentiality Footers:</b> Including official-looking corporate disclaimers to appear legitimate.</li>
          </ul>

          <h4>Real-World Annotated Phishing Example #1: The Credential Harvester</h4>
          <div style="background: #020617; border: 1px solid #1e293b; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 12px; color: #94a3b8; margin: 14px 0;">
            <div><strong style="color: #ef4444;">From:</strong> IT Infrastructure Support &lt;notice@micr0soft-support.com&gt;</div>
            <div><strong style="color: #3b82f6;">To:</strong> employee@yourcompany.com</div>
            <div><strong style="color: #f59e0b;">Subject:</strong> 🚨 ACTION REQUIRED: Password Expiration Notice (Ticket #9921)</div>
            <hr style="border-color: #1e293b; margin: 10px 0;" />
            <div style="color: #e2e8f0; font-family: sans-serif; font-size: 13px; line-height: 1.6;">
              <p>Dear Corporate Team Member,</p>
              <p>Your Microsoft 365 single-sign-on password will expire in <b>30 minutes</b>. To retain uninterrupted access to your Outlook inbox, Teams channels, and OneDrive files, you must confirm your credentials immediately.</p>
              <p><a href="#" style="color: #3b82f6; text-decoration: underline; font-weight: bold;">👉 Click Here to Maintain Current Password Credentials</a></p>
              <p style="font-size: 11px; color: #64748b; margin-top: 14px;">Global IT Operations • Automated Security Notification • Do Not Reply</p>
            </div>
          </div>
          <p><b>Technical Breakdown:</b> The attacker uses artificial urgency ("expires in 30 minutes") combined with a typosquatted domain (<code>micr0soft-support.com</code>). Clicking the link opens a fake Microsoft SSO login form that records your password in real time.</p>
        `,
        questions: [
          {
            id: 'q1-1',
            question: 'What is the primary goal of a phishing attack?',
            options: [
              'To trick victims into disclosing confidential information or credentials',
              'To automatically upgrade your browser',
              'To perform a hardware speed test',
              'To scan local network printers'
            ],
            correct_index: 0,
            explanation: 'Phishing uses psychological trickery to steal sensitive logins or trick users into executing malware.'
          },
          {
            id: 'q1-2',
            question: 'Why do cybercriminals prefer phishing over breaking technical firewalls?',
            options: [
              'It targets human trust, which is often easier to manipulate than technical encryption',
              'Firewalls are completely impossible to hack',
              'Phishing requires zero internet connectivity',
              'Phishing is only sent by physical paper mail'
            ],
            correct_index: 0,
            explanation: 'Manipulating human behavior via social engineering bypasses many technical firewalls.'
          }
        ]
      },
      {
        id: 'sec-2',
        title: '2. Common Phishing Types & Attack Vectors',
        subtitle: 'Mass Phishing, Spear Phishing, Whaling, Quishing, Smishing, Vishing & BEC',
        content: `
          <h3>Exhaustive Breakdown of Phishing Attack Variants</h3>
          <p>Phishing is not a single threat vector. Modern threat actors deploy a wide spectrum of specialized attack methodologies tailored to different entry points.</p>

          <div style="display: grid; grid-template-columns: 1fr; gap: 14px; margin: 16px 0;">
            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 16px; border-radius: 12px;">
              <h4 style="color: #38bdf8; margin-top: 0;">📧 1. Mass Email Phishing (Broadcast Spam)</h4>
              <p style="margin-bottom: 0;">Generic, high-volume automated emails sent to millions of addresses simultaneously. Examples include fake package tracking alerts (FedEx, DHL) or generic bank account suspensions. While email filters catch many of these, sheer volume ensures some reach inboxes.</p>
            </div>

            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 16px; border-radius: 12px;">
              <h4 style="color: #a855f7; margin-top: 0;">🎯 2. Spear Phishing & Executive Whaling</h4>
              <p style="margin-bottom: 0;"><b>Spear Phishing</b> is hyper-targeted at specific individuals or departments. Attackers conduct extensive research on LinkedIn to include real project names, manager names, and vendor software tools. <b>Whaling</b> targets high-profile C-suite executives (CEOs, CFOs) to authorize million-dollar wire transfers or extract strategic trade secrets.</p>
            </div>

            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 16px; border-radius: 12px;">
              <h4 style="color: #eab308; margin-top: 0;">💼 3. Business Email Compromise (BEC) & Account Takeover (ATO)</h4>
              <p style="margin-bottom: 0;">Attackers compromise an employee's actual email account (via credential harvesting) and silently monitor ongoing email threads. When a major invoice payment is being discussed, the attacker replies within the real thread from the real account, directing payment to a fraudulent bank account.</p>
            </div>

            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 16px; border-radius: 12px;">
              <h4 style="color: #ec4899; margin-top: 0;">📱 4. Quishing (QR Code Phishing Scams)</h4>
              <p style="margin-bottom: 0;">Attackers embed malicious QR codes inside PDF attachments, Microsoft Word files, or physical signs in office parking lots. Because traditional email security gateways inspect text links rather than images, the email bypasses filters. When scanned on a personal smartphone, it routes the user to a malicious mobile credential portal outside corporate monitoring.</p>
            </div>

            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 16px; border-radius: 12px;">
              <h4 style="color: #f43f5e; margin-top: 0;">💬 5. Smishing (SMS) & Vishing (Voice Impersonation / AI Deepfakes)</h4>
              <p style="margin-bottom: 0;"><b>Smishing</b> uses SMS text messages (e.g., <i>"Bank Alert: Suspicious transaction detected. Click link to verify PIN"</i>). <b>Vishing</b> involves phone call impersonation where attackers pretend to be bank fraud specialists or internal IT support asking for your 6-digit MFA OTP code. Modern vishing uses <b>AI Voice Cloning</b> to replicate a CEO's voice from public speech recordings.</p>
            </div>

            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 16px; border-radius: 12px;">
              <h4 style="color: #10b981; margin-top: 0;">🌐 6. Watering Hole Attacks & Malvertising Search Clones</h4>
              <p style="margin-bottom: 0;">Attackers compromise legitimate niche industry websites frequently visited by target employees, or purchase sponsored Google Search ads for common software downloads (e.g., "AnyDesk Download" or "Bank Login"), driving victims to cloned malware landing pages.</p>
            </div>
          </div>
        `,
        questions: [
          {
            id: 'q2-1',
            question: "What is 'Quishing' in modern cyber security?",
            options: [
              'A technique using malicious QR codes to bypass email link scanners and direct victims to phishing portals',
              'A fast wireless charging protocol',
              'A hardware key authentication standard',
              'A tool for compressing PDF attachments'
            ],
            correct_index: 0,
            explanation: 'Quishing embeds QR codes in PDFs or physical signs to bypass email link filters and compromise mobile browsers.'
          },
          {
            id: 'q2-2',
            question: 'How does Spear Phishing differ from standard broadcast phishing?',
            options: [
              'It uses specific researched details about the recipient, their company, or vendor relationships',
              'It is sent to millions of random addresses simultaneously',
              'It only targets personal social media accounts',
              'It requires no email address'
            ],
            correct_index: 0,
            explanation: 'Spear phishing involves open-source research to tailor convincing messages to specific victims.'
          }
        ]
      },
      {
        id: 'sec-3',
        title: '3. Why & How Phishing Attacks Occur',
        subtitle: 'OSINT Recon, Typosquatting, AitM Reverse Proxies & Malicious Payloads',
        content: `
          <h3>The Technical Attack Lifecycle & Infrastructure Staging</h3>
          <p>Modern cybercrime syndicates operate structured, multi-stage attack pipelines. Understanding how an attack is engineered enables defenders to disrupt it at every phase.</p>

          <h4>Phase 1: Open-Source Intelligence (OSINT) Reconnaissance</h4>
          <p>Before launching an attack, threat actors gather intelligence without touching company servers:</p>
          <ul style="padding-left: 20px; line-height: 1.7;">
            <li><b>LinkedIn & Social Media Scraping:</b> Mapping company org charts, manager relationships, new employee hires, and technology stacks (e.g., Salesforce, Workday, AWS).</li>
            <li><b>DNS & Mail Record Inspection:</b> Querying MX records, SPF (Sender Policy Framework), DKIM, and DMARC policies to find email validation weaknesses.</li>
            <li><b>Email Address Pattern Identification:</b> Determining corporate email conventions (e.g., <code>firstname.lastname@company.com</code>).</li>
          </ul>

          <h4>Phase 2: Domain Infrastructure & Typosquatting</h4>
          <p>Attackers register lookalike domains designed to deceive the human eye:</p>
          <ul style="padding-left: 20px; line-height: 1.7;">
            <li><b>Typosquatting:</b> Replacing characters with visually similar ones:
              <ul>
                <li><code>paypa1.com</code> (number 1 instead of lowercase 'l')</li>
                <li><code>rnicrosoft.com</code> ('r' + 'n' combined to mimic 'm')</li>
                <li><code>g00gle.com</code> (zeros instead of 'o')</li>
              </ul>
            </li>
            <li><b>IDN Homograph Attacks:</b> Using Cyrillic or Greek characters that look identical to Latin letters in web browsers.</li>
            <li><b>Free SSL Certificates:</b> Acquiring Let's Encrypt SSL certificates so the phishing domain displays a trusted padlock icon in the browser address bar.</li>
          </ul>

          <h4>Phase 3: Adversary-in-the-Middle (AitM) Reverse Proxies</h4>
          <p>Modern phishing attacks don't just steal static passwords—they bypass legacy 2FA/MFA! Attackers deploy reverse proxy toolkits (such as <i>Evilginx</i>) positioned between the victim and the legitimate login portal (e.g., Microsoft 365 or Okta).</p>

          <div style="background: #020617; border: 1px solid #1e293b; padding: 16px; border-radius: 12px; font-size: 13px; margin: 14px 0;">
            <strong style="color: #ef4444; font-size: 14px;">⚙️ Technical Step-by-Step: How AitM Reverse Proxies Steal MFA Sessions</strong>
            <ol style="margin-top: 8px; margin-bottom: 0; padding-left: 20px; line-height: 1.7;">
              <li>Victim clicks a phishing link and arrives at the attacker's reverse proxy server.</li>
              <li>The proxy forwards the victim's login request to the real Microsoft/Okta server in real time.</li>
              <li>The real server sends a genuine 2FA prompt (SMS OTP or Authenticator push notification) to the victim's smartphone.</li>
              <li>The victim approves the 2FA prompt on their phone. The real server validates it and issues an active <b>Session Cookie / OAuth Token</b>.</li>
              <li>The attacker's reverse proxy intercepts the live <b>Session Cookie</b> and logs in as the victim without needing their password or 2FA code ever again!</li>
            </ol>
          </div>

          <h4>Phase 4: Weaponized Payloads & Malicious Attachments</h4>
          <p>When phishing involves file attachments, attackers use deceptive techniques:</p>
          <ul style="padding-left: 20px; line-height: 1.7;">
            <li><b>Double File Extensions:</b> Hiding executable files: <code>Invoice_Q3.pdf.exe</code> (Windows hides known extensions by default).</li>
            <li><b>Password-Protected Archives:</b> Hiding malware inside encrypted <code>.zip</code> or <code>.7z</code> files so email scanners cannot inspect the contents.</li>
            <li><b>ISO & IMG Container Files:</b> Encapsulating malware inside virtual disk image files that bypass email gateway attachment rules.</li>
            <li><b>Office Macro Scripts:</b> Embedding VBA macros inside <code>.docm</code> or <code>.xlsm</code> files that download trojans when opened.</li>
          </ul>
        `,
        questions: [
          {
            id: 'q3-1',
            question: 'Why do attackers perform Open Source Intelligence (OSINT) gathering before an attack?',
            options: [
              'To find employee names, managerial relationships, and software vendors to make emails believable',
              'To endorse employees on professional networks',
              'To check office building architectural blueprints',
              'To send birthday greetings'
            ],
            correct_index: 0,
            explanation: 'OSINT provides real context (e.g. manager name, active software) so the phishing attempt looks authentic.'
          },
          {
            id: 'q3-2',
            question: 'How do Adversary-in-the-Middle (AitM) reverse proxies bypass legacy SMS 2FA?',
            options: [
              'By intercepting genuine MFA approvals and active session cookies in real time between victim and authentic server',
              'By guessing SMS random numbers',
              'By disabling phone cell towers',
              'By sending physical paper mail'
            ],
            correct_index: 0,
            explanation: 'AitM proxies position themselves between victim and login server to capture authenticated session tokens in real time.'
          }
        ]
      },
      {
        id: 'sec-4',
        title: '4. Who Conducts Attacks & Who is Targeted',
        subtitle: 'Threat Actor Taxonomy & Enterprise High-Risk Role Profiling',
        content: `
          <h3>Threat Actor Profiles & Departmental Risk Matrix</h3>
          <p>Cyber attacks are executed by diverse threat actor groups with distinct motivations, financial backing, and technical skill sets.</p>

          <h4>Taxonomy of Threat Actor Groups</h4>
          <ul style="padding-left: 20px; line-height: 1.7;">
            <li><b>Cybercrime Syndicates (Financially Motivated):</b> Well-organized transnational syndicates focused on ransomware extortion, Business Email Compromise (BEC) wire fraud, and credit card harvesting.</li>
            <li><b>Initial Access Brokers (IABs):</b> Specialized threat actors who breach corporate networks via phishing and sell compromised Remote Desktop (RDP) or VPN access on dark web forums to ransomware gangs for $1,000–$10,000.</li>
            <li><b>Nation-State Advanced Persistent Threats (APTs):</b> Highly funded military and intelligence cyber units seeking long-term espionage, defense secrets, trade intellectual property, and critical infrastructure control.</li>
            <li><b>Hacktivists & Disgruntled Insiders:</b> Ideologically driven groups seeking public embarrassment or compromised former employees exploiting unrevoked credentials.</li>
          </ul>

          <h4>Departmental High-Risk Role Matrix</h4>
          <div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 14px;">
            <div style="background: rgba(15, 23, 42, 0.95); border-left: 4px solid #ef4444; padding: 14px; border-radius: 8px;">
              <strong style="color: #f87171; font-size: 14px;">💼 Finance, Payroll & Accounts Payable</strong>
              <p style="margin-top: 4px; margin-bottom: 0; font-size: 12px; color: #cbd5e1;">Targeted for fake vendor invoice changes, fraudulent executive wire transfers, and annual W-2 tax form theft. Attackers monitor financial calendars to send requests right before payment deadlines.</p>
            </div>

            <div style="background: rgba(15, 23, 42, 0.95); border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px;">
              <strong style="color: #fbbf24; font-size: 14px;">👥 Human Resources (HR) & Talent Acquisition</strong>
              <p style="margin-top: 4px; margin-bottom: 0; font-size: 12px; color: #cbd5e1;">Targeted with malicious resume attachments (.pdf, .docx, .zip) because HR personnel are required by their job role to open external files from unknown job applicants daily.</p>
            </div>

            <div style="background: rgba(15, 23, 42, 0.95); border-left: 4px solid #3b82f6; padding: 14px; border-radius: 8px;">
              <strong style="color: #60a5fa; font-size: 14px;">💻 IT Help Desk & System Administrators</strong>
              <p style="margin-top: 4px; margin-bottom: 0; font-size: 12px; color: #cbd5e1;">Targeted for high-privilege credentials (Domain Admin, Cloud Infrastructure Lead) via vishing call impersonation and AitM proxy attacks to gain full network access.</p>
            </div>

            <div style="background: rgba(15, 23, 42, 0.95); border-left: 4px solid #a855f7; padding: 14px; border-radius: 8px;">
              <strong style="color: #c084fc; font-size: 14px;">👔 Executive Assistants & Office Managers</strong>
              <p style="margin-top: 4px; margin-bottom: 0; font-size: 12px; color: #cbd5e1;">Targeted to gain indirect access to C-level executive calendars, travel itineraries, confidential M&A communications, and internal approval signatures.</p>
            </div>
          </div>
        `,
        questions: [
          {
            id: 'q4-1',
            question: 'Why are HR personnel frequently targeted by spear phishing attachments?',
            options: [
              'Because they regularly open external email attachments and resumes from unknown job applicants',
              'Because HR computers do not have antivirus software',
              'Because HR only communicates via postal mail',
              'Because job applications are sent via instant messaging'
            ],
            correct_index: 0,
            explanation: 'HR staff must routinely open external job applications, making them prime targets for malicious attachments.'
          },
          {
            id: 'q4-2',
            question: 'Which threat actor group specializes in gaining initial network access via phishing to sell to ransomware gangs?',
            options: [
              'Initial Access Brokers (IABs)',
              'Independent IT contractors',
              'Software Beta Testers',
              'Domain Name Registrars'
            ],
            correct_index: 0,
            explanation: 'Initial Access Brokers (IABs) specialize in selling compromised enterprise access to ransomware syndicates.'
          }
        ]
      },
      {
        id: 'sec-5',
        title: '5. How to Spot Red Flags & Detect Domain Spoofing',
        subtitle: 'The Master 6-Point Inspection Checklist & Subdomain Analysis',
        content: `
          <h3>The Master 6-Point Email Inspection Protocol</h3>
          <p>Before clicking links, opening attachments, or acting on requests, train your eye to analyze every email using this structured 6-point inspection protocol.</p>

          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(59, 130, 246, 0.35); padding: 18px; border-radius: 14px; margin: 16px 0;">
            <h4 style="color: #60a5fa; margin-top: 0; font-size: 15px;">🔍 The 6-Point Technical Inspection Protocol</h4>
            <ol style="margin-bottom: 0; padding-left: 20px; line-height: 1.8;">
              <li><b>1. Check the Envelope Sender Address:</b> Never rely solely on the display name ("IT Help Desk"). Look at the actual email address inside angle brackets: <code>IT Support &lt;support@external-domain-xyz.net&gt;</code>.</li>
              <li><b>2. Hover Before Clicking (URL Inspection):</b> Position your mouse cursor over any link without clicking. Read the destination URL in your browser status bar from right to left to identify the true root domain.</li>
              <li><b>3. Analyze Subdomain Trickery vs Root Domain:</b>
                <br />Example: <code>http://microsoft.com.account-verify-login.ru/sso</code>
                <br /><i>The real root domain is <b>account-verify-login.ru</b>, NOT microsoft.com!</i>
              </li>
              <li><b>4. Detect Typosquatting Character Swaps:</b> Look for <code>rn</code> instead of <code>m</code>, <code>0</code> instead of <code>O</code>, <code>1</code> instead of <code>l</code>, or added hyphens (<code>paypal-security-update.com</code>).</li>
              <li><b>5. Evaluate Artificial Urgency & Emotional Manipulation:</b> Be suspicious of threats of account suspension, legal action, or forced 24-hour deadlines.</li>
              <li><b>6. Inspect File Attachments for Double Extensions:</b> Beware of <code>.pdf.exe</code>, <code>.docm</code>, <code>.iso</code>, <code>.img</code>, or password-protected <code>.zip</code> archives.</li>
            </ol>
          </div>
        `,
        questions: [
          {
            id: 'q5-1',
            question: "What is 'Typosquatting' in phishing domain registration?",
            options: [
              "Registering domain names with slight typos (e.g. 'rnicrosoft.com') to trick victims into believing it is official",
              'Making typos in your internal documentation',
              'Using uppercase letters in passwords',
              'Sending emails with spelling errors'
            ],
            correct_index: 0,
            explanation: "Typosquatting replaces characters (like 'm' with 'rn') to spoof legitimate domain names."
          },
          {
            id: 'q5-2',
            question: 'When inspecting a suspicious email, what is the most reliable check to verify the sender identity?',
            options: [
              'Inspect the actual domain address after the @ symbol rather than relying on the display name',
              'Check if the email has colorful fonts',
              'Trust the email if it includes a company logo',
              'Check if the email was sent on a weekday'
            ],
            correct_index: 0,
            explanation: 'Attackers can spoof display names easily, so inspecting the true sender domain is essential.'
          }
        ]
      },
      {
        id: 'sec-6',
        title: '6. Prevention Controls, Technical Safeguards & Emergency Escalation',
        subtitle: 'Passkeys, FIDO2 YubiKeys, Out-of-Band Protocols & Emergency Incident Checklist',
        content: `
          <h3>Enterprise Technical Defense & Emergency Escalation Protocols</h3>
          <p>Defending an enterprise against phishing requires combining phishing-resistant technical controls with strict operational verification policies and rapid human reporting.</p>

          <h4>1. Phishing-Resistant Authentication: Passkeys & FIDO2 Hardware Keys</h4>
          <p>Legacy MFA (SMS text messages, phone calls, and basic TOTP codes) can be intercepted by AitM reverse proxies. <b>FIDO2 WebAuthn Passkeys</b> and hardware security keys (e.g., YubiKeys) use public-key cryptography bound strictly to the authentic domain origin URL. Even if a user enters their passkey on a fake <i>'paypa1.com'</i> site, the web browser cryptographically refuses to perform authentication because the domain origin does not match!</p>

          <h4>2. Mandatory Out-of-Band Verification (OOBV) Policy</h4>
          <p>Whenever you receive an email requesting a wire transfer, vendor bank account change, direct deposit update, or sensitive password reset: <b>Never reply to the email!</b> Perform out-of-band verification by calling the requester on a known internal phone number or speaking to them in person.</p>

          <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); padding: 18px; border-radius: 14px; margin-top: 16px;">
            <h4 style="color: #ef4444; margin-top: 0; font-size: 15px;">🚨 Emergency Checklist: What To Do If You Clicked a Phishing Link</h4>
            <ol style="margin-bottom: 0; padding-left: 20px; line-height: 1.8;">
              <li><b>Step 1: Isolate Your Machine Immediately!</b> Disconnect the ethernet cable and disable Wi-Fi to stop Command & Control (C2) traffic and prevent lateral network movement.</li>
              <li><b>Step 2: Alert IT Security SOC within 5 Minutes:</b> Contact your IT Help Desk or Security Operations Center immediately so analysts can revoke active SSO refresh tokens.</li>
              <li><b>Step 3: Revoke Active Cloud Sessions:</b> Log out of all active sessions from your identity provider (Azure AD / Okta).</li>
              <li><b>Step 4: Rotate Passwords from a Clean Device:</b> Change your credentials using a known uncompromised machine.</li>
              <li><b>Step 5: Click the PhishGuard Report Button:</b> Submitting suspicious emails flags them across the platform to automatically purge the email from all employee inboxes.</li>
            </ol>
          </div>
        `,
        questions: [
          {
            id: 'q6-1',
            question: 'What is the mandatory protocol when an email requests an urgent change to vendor bank account details?',
            options: [
              'Perform out-of-band phone verification using a trusted internal phone number before making changes',
              'Reply directly to the email asking if it is real',
              'Process the bank transfer immediately',
              'Forward to a personal Gmail account'
            ],
            correct_index: 0,
            explanation: 'Always verify bank changes out-of-band using an independently verified phone number.'
          },
          {
            id: 'q6-2',
            question: 'What should you do immediately if you suspect you clicked a phishing link on your corporate computer?',
            options: [
              'Disconnect from the network immediately and report the incident to IT Security SOC',
              'Shut off the computer and hide it under your desk',
              'Attempt to delete system audit logs manually',
              'Wait until the end of the week to notify anyone'
            ],
            correct_index: 0,
            explanation: 'Disconnecting from the network isolates the workstation to stop lateral spread while notifying security teams enables fast containment.'
          }
        ]
      }
    ];
  }

  const defaultBaseSections: ModuleSection[] = [
    {
      id: 'sec-1',
      title: `1. Understanding ${category}: Core Concepts & Impact`,
      subtitle: 'Fundamentals, Threat Vectors & Attack Scenarios',
      content: `
        <h3>Comprehensive Guide to ${title}</h3>
        <p><b>${title}</b> represents a vital area of enterprise cybersecurity. As organizations adopt cloud infrastructure and remote work environments, threat actors continuously evolve their tactics to compromise corporate data and identity.</p>

        <p>${lesson.summary || 'This module provides an in-depth analysis of attack vectors, technical mechanisms, real-world case studies, and operational mitigation strategies.'}</p>

        <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(59, 130, 246, 0.3); padding: 16px; border-radius: 12px; margin: 14px 0;">
          <h4 style="color: #60a5fa; margin-top: 0;">🔑 Key Security Directives & Core Takeaways</h4>
          <ul style="margin-bottom: 0; padding-left: 20px;">
            <li><b>Zero Trust Philosophy:</b> Never trust, always verify every incoming request, link, or access attempt regardless of origin.</li>
            <li><b>Least Privilege Access:</b> Ensure credentials and cloud permissions are restricted strictly to what is necessary for your role.</li>
            <li><b>Proactive Reporting:</b> Reporting suspicious anomalies within 15 minutes allows Security Operations Teams to isolate threats before data exfiltration occurs.</li>
          </ul>
        </div>

        <div style="background: #020617; border: 1px solid #1e293b; padding: 14px; border-radius: 10px; font-size: 13px; margin: 12px 0;">
          <strong style="color: #38bdf8;">📘 Module Briefing Overview:</strong>
          <p style="margin-top: 6px; margin-bottom: 0; color: #cbd5e1;">${lesson.content || 'Review the threat mechanics, attack variants, detection protocols, and emergency escalation workflows detailed in the following sections.'}</p>
        </div>
      `,
      questions: [
        {
          id: 'q1-1',
          question: `What is the primary defensive objective regarding ${title}?`,
          options: [
            'Maintain vigilance, adhere to zero-trust controls, and report anomalies to IT Security immediately',
            'Disable system logs and ignore security alerts',
            'Share administrative passwords with unverified external callers',
            'Turn off security automatic updates'
          ],
          correct_index: 0,
          explanation: 'Proactive security hygiene and swift incident escalation prevent minor security risks from escalating into enterprise breaches.'
        }
      ]
    },
    {
      id: 'sec-2',
      title: '2. Primary Threat Mechanics & Exploitation Methods',
      subtitle: 'Real-World Attack Vectors & Vulnerability Scenarios',
      content: `
        <h3>How Threat Actors Conduct Exploitation</h3>
        <p>Cybercrime syndicates and state-sponsored threat groups employ automated tools and targeted social engineering to exploit corporate vulnerabilities.</p>

        <div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin: 14px 0;">
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 14px; border-radius: 10px;">
            <h4 style="color: #ef4444; margin-top: 0;">⚠️ Common Attack Vector 1: Credential Theft & Spraying</h4>
            <p style="margin-bottom: 0;">Attackers use automated scripts to test leaked password databases against corporate single sign-on (SSO) portals. Reusing personal passwords on work accounts poses a critical risk.</p>
          </div>
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.8); padding: 14px; border-radius: 10px;">
            <h4 style="color: #f59e0b; margin-top: 0;">⚡ Common Attack Vector 2: Unpatched Systems & Zero-Days</h4>
            <p style="margin-bottom: 0;">Outdated software components, browser extensions, or unpatched VPN gateways give threat actors direct access to internal networks without requiring user interaction.</p>
          </div>
        </div>
      `,
      questions: [
        {
          id: 'q2-1',
          question: 'How do threat actors gain initial access in enterprise breaches?',
          options: [
            'By exploiting weak passwords, unpatched software vulnerabilities, or stolen authentication tokens',
            'By increasing monitor screen brightness',
            'By sending innocent postal birthday cards',
            'By upgrading RAM memory sticks'
          ],
          correct_index: 0,
          explanation: 'Unpatched software vulnerabilities and stolen authentication tokens are the leading initial access channels for attackers.'
        }
      ]
    },
    {
      id: 'sec-3',
      title: '3. Spotting Indicators of Compromise (IoCs) & Red Flags',
      subtitle: 'Early Detection, Header Checks & Behavioral Anomalies',
      content: `
        <h3>Recognizing Security Red Flags</h3>
        <p>Early detection is the difference between a contained event and a devastating data breach. Learn to spot these critical Indicators of Compromise (IoCs):</p>

        <ul style="padding-left: 20px;">
          <li><b>Unsolicited MFA Prompts:</b> Receiving Authenticator app push notifications or SMS codes when you are not actively logging in.</li>
          <li><b>Suspicious External Login Alerts:</b> Logins from unexpected geographical locations or unusual ISP providers.</li>
          <li><b>Unexpected Browser Extensions:</b> Unapproved AI summarizers or extensions requesting full web page read/write permissions.</li>
          <li><b>Unusual Disk Activity / File Extensions:</b> System slowdowns accompanied by strange file extensions (e.g., <code>.locked</code>, <code>.crypto</code>).</li>
        </ul>
      `,
      questions: [
        {
          id: 'q3-1',
          question: 'What is an immediate indicator of potential account or device compromise?',
          options: [
            'Receiving unexpected MFA push notifications or unprompted password reset emails',
            'A desktop background image change',
            'Faster file download speeds',
            'System clock displaying UTC time'
          ],
          correct_index: 0,
          explanation: 'Unsolicited MFA requests or password resets indicate that an attacker has compromised your primary credentials.'
        }
      ]
    },
    {
      id: 'sec-4',
      title: '4. Prevention Controls, Best Practices & Incident Escalation',
      subtitle: 'Step-by-Step Defense Protocol & Emergency Checklist',
      content: `
        <h3>Operational Defense & Incident Response Protocols</h3>
        <p>Enforce these recommended defensive controls to secure your workstation and enterprise environment:</p>

        <ol style="padding-left: 20px;">
          <li><b>1. Enforce Multi-Factor Authentication:</b> Always use Authenticator apps or hardware FIDO2 keys rather than SMS OTPs.</li>
          <li><b>2. Apply Security Updates Immediately:</b> Never delay OS or browser security patches.</li>
          <li><b>3. Practice Out-of-Band Verification:</b> Confirm financial or credential requests via a separate verified communication channel.</li>
        </ol>

        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 16px; border-radius: 12px; margin-top: 14px;">
          <h4 style="color: #ef4444; margin-top: 0;">🚨 Emergency Checklist: Immediate Escalation Steps</h4>
          <ol style="margin-bottom: 0; padding-left: 20px;">
            <li><b>Isolate Machine:</b> Disconnect Wi-Fi or pull the ethernet cable immediately if you suspect malware or phishing clicks.</li>
            <li><b>Contact IT Security SOC:</b> Report the incident to your internal Security Operations Team without delay.</li>
            <li><b>Reset Credentials:</b> Change compromised passwords from a clean, secure device.</li>
          </ol>
        </div>
      `,
      questions: [
        {
          id: 'q4-1',
          question: 'What should you do immediately if you suspect a security breach on your workstation?',
          options: [
            'Disconnect from the network and report the incident to IT Security immediately',
            'Turn off the computer and hide it in a drawer',
            'Attempt to delete system audit logs manually',
            'Wait a week before taking action'
          ],
          correct_index: 0,
          explanation: 'Isolating the device from the network stops lateral spread while notifying security teams enables fast incident response.'
        }
      ]
    }
  ];

  return defaultBaseSections.map(sec => ({
    ...sec,
    questions: shuffleQuestionOptions(sec.questions || [])
  }));
}

const FALLBACK_LESSONS: (LessonItem & { content: string; quiz: any })[] = [
  {
    id: 1,
    topic: 'phishing_attacks',
    title: 'Email Phishing & Quishing (QR Code) Masterclass',
    category: 'Phishing Attacks',
    difficulty: 'Beginner',
    summary: 'Learn how to spot deceptive email headers, malicious links, credential harvesting, and dangerous QR code scams (Quishing).',
    content: `
      <h3>Understanding Modern Phishing Vectors</h3>
      <p>Phishing remains the #1 initial access vector in cybersecurity breaches. Attackers spoof trusted brands, internal executives, and critical infrastructure providers to compromise credentials.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 1, questions: [] }
  },
  {
    id: 2,
    topic: 'phishing_attacks',
    title: 'Spear Phishing & Executive Whaling Scams',
    category: 'Phishing Attacks',
    difficulty: 'Intermediate',
    summary: 'Identify hyper-targeted phishing campaigns targeting department leads, HR personnel, and financial accountants.',
    content: `
      <h3>Targeted Phishing Tactics (Spear Phishing & Whaling)</h3>
      <p>Unlike broadcast phishing spam, spear phishing attacks involve deep open-source intelligence (OSINT) gathering against specific victims.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 2, questions: [] }
  },
  {
    id: 3,
    topic: 'malware_ransomware',
    title: 'Ransomware Prevention & Incident Response',
    category: 'Malware & Ransomware',
    difficulty: 'Intermediate',
    summary: 'Understand how ransomware encrypts enterprise storage, identifying keyloggers & trojans, and emergency incident containment.',
    content: `
      <h3>Ransomware Attack Lifecycles & Defense Strategies</h3>
      <p>Ransomware operators encrypt database servers, network shares, and local workstations before demanding cryptocurrency payouts.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 3, questions: [] }
  },
  {
    id: 4,
    topic: 'malware_ransomware',
    title: 'Keyloggers, Trojans & Supply Chain Malware',
    category: 'Malware & Ransomware',
    difficulty: 'Advanced',
    summary: 'Recognize trojanized installers, malicious browser extensions, keyloggers, and supply chain software compromise.',
    content: `
      <h3>Stealth Malware & Supply Chain Defense</h3>
      <p>Stealth malware operates quietly to capture keystrokes, extract session cookies, and steal active tokens without raising immediate alerts.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 4, questions: [] }
  },
  {
    id: 5,
    topic: 'password_security',
    title: 'Multi-Factor Authentication & Passkey Security',
    category: 'Password & Authentication Security',
    difficulty: 'Beginner',
    summary: 'Master strong passphrase creation, hardware security keys (FIDO2/WebAuthn), and stopping MFA fatigue attacks.',
    content: `
      <h3>Securing Identity in a Zero-Trust World</h3>
      <p>Passwords alone are insufficient. Attackers utilize credential stuffing, password spraying, and dictionary attacks to compromise accounts.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 5, questions: [] }
  },
  {
    id: 6,
    topic: 'social_engineering',
    title: 'Pretexting, Vishing & Executive Impersonation',
    category: 'Social Engineering',
    difficulty: 'Intermediate',
    summary: 'Identify psychological manipulation tactics, urgent wire transfer scams, and voice-cloning vishing techniques.',
    content: `
      <h3>Recognizing Psychological Manipulation Tactics</h3>
      <p>Social engineers exploit human trust, urgency, fear, and authority to bypass technical controls.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 6, questions: [] }
  },
  {
    id: 7,
    topic: 'network_security',
    title: 'Wi-Fi & Network Security (MitM Attacks & VPNs)',
    category: 'Network Security',
    difficulty: 'Beginner',
    summary: 'Protect enterprise data on public Wi-Fi networks, spot Rogue Access Points (Evil Twin APs), and enforce encrypted VPN tunnels.',
    content: `
      <h3>Securing Network Communications</h3>
      <p>Public Wi-Fi networks at airports, hotels, and cafes are unencrypted or easily impersonated by malicious hot-spots (Evil Twins).</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 7, questions: [] }
  },
  {
    id: 8,
    topic: 'cloud_security',
    title: 'Cloud Security & IAM Configuration Best Practices',
    category: 'Cloud Security',
    difficulty: 'Advanced',
    summary: 'Prevent cloud data leaks, public storage bucket misconfigurations, and hardcoded API key leaks.',
    content: `
      <h3>Cloud Infrastructure & Data Loss Prevention</h3>
      <p>Cloud environments require strict Identity and Access Management (IAM) controls and posture management to avoid exposed data buckets.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 8, questions: [] }
  },
  {
    id: 9,
    topic: 'ai_threats',
    title: 'AI Cyber Threats & Deepfake Voice/Video Defense',
    category: 'AI & Modern Cyber Threats',
    difficulty: 'Advanced',
    summary: 'Defend against AI-generated phishing emails, voice cloning scams, and deepfake executive video calls.',
    content: `
      <h3>Navigating Next-Gen AI Cyber Threats</h3>
      <p>Generative AI tools allow cybercriminals to craft error-free, hyper-personalized spear phishing emails and clone executive voices with 3 seconds of audio.</p>
    `,
    is_emerging_threat: true,
    cve_id: 'CVE-2026-AI-01',
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 9, questions: [] }
  },
  {
    id: 10,
    topic: 'mobile_security',
    title: 'Mobile Device Security & Smishing Defense',
    category: 'Mobile Security',
    difficulty: 'Beginner',
    summary: 'Spot malicious SMS links (Smishing), secure mobile banking apps, and manage Mobile Device Management (MDM) profiles.',
    content: `
      <h3>Protecting Smartphones & Tablets</h3>
      <p>Smishing (SMS Phishing) delivers fake package delivery notifications and bank fraud alerts straight to personal smartphones.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 10, questions: [] }
  },
  {
    id: 11,
    topic: 'workplace_security',
    title: 'Clean Desk, Shoulder Surfing & Physical Security',
    category: 'Workplace Security',
    difficulty: 'Beginner',
    summary: 'Prevent unauthorized building access (tailgating), protect printed documents, and lock screens when leaving work desks.',
    content: `
      <h3>Physical Security in Modern Office Environments</h3>
      <p>Physical security is the first barrier. Unlocked laptops and discarded printed reports expose sensitive customer records to unauthorized visitors.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 11, questions: [] }
  },
  {
    id: 12,
    topic: 'incident_response',
    title: 'Data Loss Prevention (DLP) & Incident Escalation',
    category: 'Workplace Security',
    difficulty: 'Intermediate',
    summary: 'Master emergency incident reporting procedures, data classification rules, and reporting lost enterprise devices.',
    content: `
      <h3>Reporting Cyber Incidents Swiftly</h3>
      <p>Speed is critical. Reporting a suspected phishing click or lost laptop within 15 minutes allows IT Security to revoke tokens and mitigate breaches.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: { id: 12, questions: [] }
  }
];

const getLocalProgressKey = (userId?: number | string) => `phishguard_progress_user_${userId || 'guest'}`;

const loadLocalSectionProgress = (userId?: number | string): Record<number, { completed_sections: number[]; current_section: number; completed?: boolean }> => {
  try {
    const raw = localStorage.getItem(getLocalProgressKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalSectionProgress = (userId: number | string | undefined, lessonId: number, completedSections: number[], currentSection: number, completed: boolean) => {
  try {
    const current = loadLocalSectionProgress(userId);
    current[lessonId] = {
      completed_sections: completedSections,
      current_section: currentSection,
      completed
    };
    localStorage.setItem(getLocalProgressKey(userId), JSON.stringify(current));
  } catch {
    // ignore
  }
};

export default function EmployeeLessons() {
  const { addToast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'modules' | 'threats' | 'admin'>('modules');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarView, setSidebarView] = useState<'categories' | 'courses'>('categories');

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(null);
  const [adaptiveProfile, setAdaptiveProfile] = useState<AdaptiveProfile | null>(null);
  const [emergingThreats, setEmergingThreats] = useState<EmergingThreat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Multi-Section Stepper State ──
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [activeSections, setActiveSections] = useState<ModuleSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [sectionAnswers, setSectionAnswers] = useState<Record<string, number>>({});
  const [sectionChecked, setSectionChecked] = useState<Record<number, boolean>>({});
  const [sectionPassed, setSectionPassed] = useState<Record<number, boolean>>({});

  // Auto-scroll to top of section when moving between sections
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [currentSectionIndex]);

  // Interactive Email Inspector State
  const [emailInspected, setEmailInspected] = useState(false);
  const [emailFlagged, setEmailFlagged] = useState<string | null>(null);

  // Interactive Password Tester State
  const [testPassword, setTestPassword] = useState('');
  
  // Admin Create Module State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Phishing Attacks');
  const [newDifficulty, setNewDifficulty] = useState('Beginner');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const isAdmin = user?.role === 'admin';

  const categories = [
    'All',
    'Phishing Attacks',
    'Malware & Ransomware',
    'Password & Authentication Security',
    'Social Engineering',
    'Network Security',
    'Cloud Security',
    'AI & Modern Cyber Threats',
    'Mobile Security',
    'Workplace Security'
  ];

  const resolveCategory = (l: any): string => {
    const cat = l.category;
    const topic = (l.topic || '').toLowerCase();
    const title = (l.title || '').toLowerCase();

    if (cat && typeof cat === 'string' && cat.trim() !== '' && cat !== 'All' && cat !== 'Phishing Attacks' && cat !== 'General Security') {
      if (categories.includes(cat)) return cat;
    }

    if (topic.includes('phish') || title.includes('phish') || title.includes('quish') || title.includes('spoof') || topic.includes('link')) return 'Phishing Attacks';
    if (topic.includes('malware') || topic.includes('ransomware') || title.includes('ransomware') || title.includes('trojan') || title.includes('keylogger')) return 'Malware & Ransomware';
    if (topic.includes('password') || topic.includes('mfa') || topic.includes('credential') || title.includes('password') || title.includes('authentication') || title.includes('passkey') || title.includes('2fa') || title.includes('hygiene')) return 'Password & Authentication Security';
    if (topic.includes('social') || topic.includes('pretext') || title.includes('vishing') || title.includes('impersonation') || title.includes('social engineering')) return 'Social Engineering';
    if (topic.includes('network') || topic.includes('wifi') || title.includes('wi-fi') || title.includes('vpn') || title.includes('hotspot')) return 'Network Security';
    if (topic.includes('cloud') || title.includes('cloud') || title.includes('iam') || title.includes('s3') || title.includes('saas')) return 'Cloud Security';
    if (topic.includes('ai') || title.includes('ai') || title.includes('deepfake') || title.includes('prompt')) return 'AI & Modern Cyber Threats';
    if (topic.includes('mobile') || title.includes('mobile') || title.includes('smishing') || title.includes('apk') || title.includes('sim')) return 'Mobile Security';
    if (topic.includes('workplace') || title.includes('clean desk') || title.includes('tailgating') || topic.includes('incident') || title.includes('dlp') || title.includes('usb')) return 'Workplace Security';

    const matchFallback = FALLBACK_LESSONS.find(f => f.id === l.id);
    if (matchFallback) return matchFallback.category;

    if (cat && categories.includes(cat)) return cat;

    return 'General Security';
  };

  const resolveDifficulty = (l: any): string => {
    const title = (l.title || '').toLowerCase();
    const topic = (l.topic || '').toLowerCase();
    const cat = (l.category || '').toLowerCase();

    if (title.includes('keylogger') || title.includes('supply chain') || title.includes('cloud') || cat.includes('cloud') || topic.includes('cloud') || title.includes('ai') || cat.includes('ai') || topic.includes('ai') || title.includes('deepfake') || title.includes('prompt') || title.includes('cve') || title.includes('zero-day') || title.includes('masterclass')) {
      return 'Advanced';
    }

    if (title.includes('spear') || title.includes('whaling') || title.includes('ransomware') || topic.includes('ransomware') || title.includes('pretext') || title.includes('vishing') || title.includes('impersonation') || title.includes('trojan') || title.includes('saas') || topic.includes('credential') || cat.includes('social') || cat.includes('malware') || topic.includes('malware') || topic.includes('mobile')) {
      return 'Intermediate';
    }

    const matchFallback = FALLBACK_LESSONS.find(f => (f.title || '').toLowerCase() === title);
    if (matchFallback && matchFallback.difficulty) return matchFallback.difficulty;

    if (l.difficulty && typeof l.difficulty === 'string' && ['Beginner', 'Intermediate', 'Advanced'].includes(l.difficulty.trim())) {
      return l.difficulty.trim();
    }

    return 'Beginner';
  };

  useEffect(() => {
    fetchLessons();
    fetchAdaptiveProfile();
    fetchEmergingThreats();
  }, []);

  const fetchLessons = async () => {
    setIsLoading(true);
    const localStore = loadLocalSectionProgress(user?.id);

    const mergeLocalProgress = (items: LessonItem[]) => {
      return items.map((item) => {
        const local = localStore[item.id];
        if (!local) return item;
        const completed_sections = Array.from(new Set([
          ...(item.completed_sections || []),
          ...(local.completed_sections || [])
        ]));
        const current_section = Math.max(item.current_section || 0, local.current_section || 0);
        const completed = item.completed || local.completed || false;
        return {
          ...item,
          completed_sections,
          current_section,
          completed
        };
      });
    };

    try {
      const url = '/training/lessons';
      const res = await apiFetch(url).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const formattedData = data.map((d: any) => ({
            ...d,
            category: resolveCategory(d),
            difficulty: resolveDifficulty(d)
          }));
          setLessons(mergeLocalProgress(formattedData));
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    try {
      const { data: supaLessons } = await supabase.from('lessons').select('*');
      if (supaLessons && supaLessons.length > 0) {
        const formatted: LessonItem[] = supaLessons.map((l: any) => ({
          id: l.id,
          topic: l.topic || 'general_security',
          title: l.title || 'Security Awareness Module',
          category: resolveCategory(l),
          difficulty: l.difficulty || 'Beginner',
          summary: l.summary || l.title,
          is_emerging_threat: Boolean(l.is_emerging_threat),
          cve_id: l.cve_id || null,
          assigned_at: new Date().toISOString(),
          completed_at: null,
          completed: false
        }));

        setLessons(mergeLocalProgress(formatted));
        setIsLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    setLessons(mergeLocalProgress(FALLBACK_LESSONS));
    setIsLoading(false);
  };

  const fetchAdaptiveProfile = async () => {
    try {
      const res = await apiFetch('/training/adaptive-profile').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setAdaptiveProfile(data);
        return;
      }
    } catch {
      // ignore
    }

    setAdaptiveProfile({
      knowledge_level: 'Intermediate Analyst',
      completion_percentage: 65,
      completed_count: 3,
      total_assigned: 5,
      streak_days: 4,
      category_stats: {
        'Phishing Attacks': { total: 2, completed: 1 },
        'Password & Authentication Security': { total: 1, completed: 1 },
        'Social Engineering': { total: 1, completed: 1 },
        'AI & Modern Cyber Threats': { total: 1, completed: 0 }
      },
      recommended_lessons: [
        { id: 1, title: 'Email Phishing & Quishing Masterclass', category: 'Phishing Attacks', difficulty: 'Beginner', summary: 'Learn how to spot deceptive email headers and QR code scams.' },
        { id: 5, title: 'AI Cyber Threats & Deepfake Defense', category: 'AI & Modern Cyber Threats', difficulty: 'Advanced', summary: 'Defend against AI-generated phishing emails and voice cloning.' }
      ]
    });
  };

  const fetchEmergingThreats = async () => {
    try {
      const res = await apiFetch('/training/emerging-threats').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setEmergingThreats(data);
        return;
      }
    } catch {
      // ignore
    }

    setEmergingThreats([
      {
        id: 101,
        cve_id: 'CVE-2026-9921',
        title: 'Deepfake AI Voice Cloning Wire Transfer Fraud',
        severity: 'CRITICAL',
        category: 'AI & Modern Cyber Threats',
        published_date: new Date().toISOString().split('T')[0],
        summary: 'Cybercriminals deploy 3-second generative voice cloning models to impersonate CEOs on WhatsApp and Microsoft Teams voice calls.',
        lesson_id: 5,
        mitigation: 'Implement verbal passphrase challenges and multi-person authorization for wire transfers exceeding $5,000.'
      },
      {
        id: 102,
        cve_id: 'CVE-2026-4412',
        title: 'QR Code Credential Harvesting (Quishing) Campaign',
        severity: 'HIGH',
        category: 'Phishing Attacks',
        published_date: new Date().toISOString().split('T')[0],
        summary: 'Malicious QR codes embedded inside PDF invoice attachments redirect victims to fake SSO login pages on mobile browsers.',
        lesson_id: 1,
        mitigation: 'Deploy QR-code image scanning on secure email gateways and enforce mobile WebAuthn authentication.'
      }
    ]);
  };

  const handleSelectLesson = async (lessonId: number) => {
    setSidebarView('courses');
    let detailData: LessonDetail | null = null;

    try {
      const res = await apiFetch(`/training/lessons/${lessonId}`).catch(() => null);
      if (res && res.ok) {
        detailData = await res.json();
      }
    } catch {
      // ignore
    }

    if (!detailData) {
      const foundFallback = FALLBACK_LESSONS.find(f => f.id === lessonId);
      if (foundFallback) {
        detailData = {
          id: foundFallback.id,
          topic: foundFallback.topic,
          title: foundFallback.title,
          category: foundFallback.category,
          difficulty: foundFallback.difficulty,
          summary: foundFallback.summary,
          content: foundFallback.content,
          completed: foundFallback.completed,
          quiz: foundFallback.quiz
        };
      }
    }

    if (detailData) {
      detailData = {
        ...detailData,
        category: resolveCategory(detailData),
        difficulty: resolveDifficulty(detailData)
      };

      const localStore = loadLocalSectionProgress(user?.id);
      const local = localStore[detailData.id];
      const structuredSecs = getStructuredSectionsForLesson(detailData);
      
      const prevCompletedSecs = Array.from(new Set([
        ...(detailData.completed_sections || []),
        ...(local?.completed_sections || []),
        ...(detailData.completed ? structuredSecs.map((_, i) => i) : [])
      ]));

      const savedSecIdx = Math.max(detailData.current_section || 0, local?.current_section || 0);
      const startSecIdx = Math.min(savedSecIdx, structuredSecs.length - 1);
      
      setSelectedLesson(detailData);
      setActiveSections(structuredSecs);
      setCompletedSections(prevCompletedSecs);
      setCurrentSectionIndex(startSecIdx >= 0 ? startSecIdx : 0);
      setSectionAnswers({});
      setSectionChecked({});
      
      const initialPassed: Record<number, boolean> = {};
      prevCompletedSecs.forEach((idx: number) => { initialPassed[idx] = true; });
      setSectionPassed(initialPassed);
    }
  };

  const handleCheckSectionAnswers = (secIdx: number) => {
    const sec = activeSections[secIdx];
    if (!sec || !sec.questions || sec.questions.length === 0) {
      setSectionChecked(prev => ({ ...prev, [secIdx]: true }));
      setSectionPassed(prev => ({ ...prev, [secIdx]: true }));
      saveSectionProgress(secIdx);
      return;
    }

    let allCorrect = true;
    sec.questions.forEach(q => {
      const chosen = sectionAnswers[q.id];
      if (chosen !== q.correct_index) {
        allCorrect = false;
      }
    });

    setSectionChecked(prev => ({ ...prev, [secIdx]: true }));
    setSectionPassed(prev => ({ ...prev, [secIdx]: allCorrect }));

    if (allCorrect) {
      if (!completedSections.includes(secIdx)) {
        setCompletedSections(prev => [...prev, secIdx]);
      }
      saveSectionProgress(secIdx);
      addToast({
        title: `Section ${secIdx + 1} Passed! 🎉`,
        description: secIdx < activeSections.length - 1 
          ? 'Checkpoint correct! Advancing to the next section...' 
          : 'Module completed successfully!',
        type: 'success'
      });

      // Automatically move to the next section after a brief pause
      setTimeout(() => {
        if (secIdx < activeSections.length - 1) {
          setCurrentSectionIndex(prev => prev + 1);
        } else {
          addToast({
            title: 'Module Briefing Completed! 🎓',
            description: `You have completed all ${activeSections.length} sections of "${selectedLesson?.title}".`,
            type: 'success'
          });
          setSelectedLesson(null);
        }
      }, 700);
    } else {
      addToast({
        title: 'Check Your Answers',
        description: 'Some answers were incorrect. Review the explanations below and try again.',
        type: 'error'
      });
    }
  };

  const saveSectionProgress = async (secIdx: number) => {
    if (!selectedLesson) return;
    const totalSecs = activeSections.length;
    const updatedCompleted = Array.from(new Set([...completedSections, secIdx]));
    const nextCurrentSec = Math.min(secIdx + 1, totalSecs - 1);
    const isModuleComplete = updatedCompleted.length >= totalSecs;

    // 1. Dual persistence: LocalStorage backup
    saveLocalSectionProgress(user?.id, selectedLesson.id, updatedCompleted, nextCurrentSec, isModuleComplete);

    // 2. Immediate React State update
    setLessons(prev => prev.map(l => l.id === selectedLesson.id ? { 
      ...l, 
      completed: isModuleComplete, 
      completed_sections: updatedCompleted, 
      current_section: nextCurrentSec 
    } : l));

    // 3. Database Persistence API
    try {
      await apiFetch(`/training/lessons/${selectedLesson.id}/section-progress`, {
        method: 'POST',
        body: JSON.stringify({
          section_index: secIdx,
          total_sections: totalSecs
        })
      });
    } catch {
      // ignore
    }

    if (isModuleComplete) {
      setSelectedLesson(prev => prev ? { ...prev, completed: true } : null);
      fetchAdaptiveProfile();
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < activeSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      addToast({
        title: 'Module Briefing Completed! 🎓',
        description: `You have completed all ${activeSections.length} sections of "${selectedLesson?.title}".`,
        type: 'success'
      });
      setSelectedLesson(null);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      addToast({ title: 'Missing Information', description: 'Please provide lesson title and content.', type: 'error' });
      return;
    }

    try {
      const res = await apiFetch('/training/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          topic: newCategory.toLowerCase().replace(/ /g, '_'),
          category: newCategory,
          difficulty: newDifficulty,
          summary: newSummary,
          content: newContent,
          is_public: isPublic
        })
      });

      if (res.ok) {
        addToast({ title: 'Module Published!', description: `Successfully created ${isPublic ? 'Public' : 'Organization Private'} security lesson "${newTitle}".`, type: 'success' });
        setNewTitle('');
        setNewSummary('');
        setNewContent('');
        fetchLessons();
        fetchAdaptiveProfile();
      }
    } catch {
      addToast({ title: 'Failed', description: 'Could not create security lesson.', type: 'error' });
    }
  };

  const filteredLessons = lessons.filter(l => {
    const matchesCategory = selectedCategory === 'All' || l.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || l.difficulty === selectedDifficulty;
    const matchesSearch = searchQuery === '' || 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Phishing Attacks': return <Shield size={16} className="text-blue-400" />;
      case 'Malware & Ransomware': return <AlertTriangle size={16} className="text-red-400" />;
      case 'Password & Authentication Security': return <KeyRound size={16} className="text-emerald-400" />;
      case 'Social Engineering': return <UserCheck size={16} className="text-purple-400" />;
      case 'Network Security': return <Wifi size={16} className="text-cyan-400" />;
      case 'Cloud Security': return <Cloud size={16} className="text-indigo-400" />;
      case 'AI & Modern Cyber Threats': return <Bot size={16} className="text-pink-400" />;
      case 'Mobile Security': return <Smartphone size={16} className="text-amber-400" />;
      default: return <BookOpen size={16} className="text-slate-400" />;
    }
  };

  const calculatePasswordScore = (pass: string) => {
    if (!pass) return { text: 'Enter password to test', score: 0, color: 'text-slate-500' };
    if (pass.length < 8) return { text: 'Weak (Crackable in seconds)', score: 20, color: 'text-red-400' };
    if (pass.length < 12) return { text: 'Moderate (Crackable in 3 days)', score: 55, color: 'text-amber-400' };
    if (pass.length >= 16 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) {
      return { text: 'Excellent (Passkey / Cryptographic Standard)', score: 100, color: 'text-emerald-400' };
    }
    return { text: 'Strong (Crackable in 400 years)', score: 85, color: 'text-blue-400' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">Adaptive Learning Platform</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Sparkles size={12} /> AI Powered
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Interactive multi-section modules with inline knowledge checkpoints and granular progress coverage.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'modules' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpenCheck size={14} /> Curriculum Modules
          </button>
          <button
            onClick={() => setActiveTab('threats')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'threats' ? 'bg-red-600 text-white shadow-md shadow-red-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle size={14} /> Latest Cyber Threats
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'admin' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus size={14} /> Manage Content
            </button>
          )}
        </div>
      </div>

      {/* ── Adaptive Profile Dashboard Bar ── */}
      {adaptiveProfile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Award size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Knowledge Level</p>
              <p className="text-lg font-black text-white">{adaptiveProfile.knowledge_level}</p>
            </div>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Learning Streak</p>
              <p className="text-lg font-black text-white">{adaptiveProfile.streak_days} Days Active 🔥</p>
            </div>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <BookOpenCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Modules</p>
              <p className="text-lg font-black text-white">
                {lessons.filter(l => l.completed).length || adaptiveProfile.completed_count} / {lessons.length || adaptiveProfile.total_assigned} ({Math.round(((lessons.filter(l => l.completed).length || adaptiveProfile.completed_count) / (lessons.length || adaptiveProfile.total_assigned || 1)) * 100)}%)
              </p>
            </div>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Level Tier</p>
              <p className="text-lg font-black text-white capitalize">{adaptiveProfile.suggested_next_difficulty || 'Intermediate'} Tier</p>
            </div>
          </Card>
        </div>
      )}

      {/* ── Adaptive Recommendation Banner ── */}
      {adaptiveProfile?.recommended_lessons && adaptiveProfile.recommended_lessons.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-slate-900/40 border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adaptive Learning Recommendation</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Based on your recent security checks, we recommend completing: <strong className="text-blue-300">{adaptiveProfile.recommended_lessons[0].title}</strong>
              </p>
            </div>
          </div>
          <Button 
            onClick={() => handleSelectLesson(adaptiveProfile.recommended_lessons[0].id)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 flex items-center gap-2 rounded-xl whitespace-nowrap shadow-md shadow-blue-500/20"
          >
            Start Recommended Lesson <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* ── Active Learning Module Reader View Modal Overlay (Interactive Multi-Section Stepper) ── */}
      {selectedLesson && activeSections.length > 0 && (
        <div data-active-modal="true" className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <Card className="w-full max-w-4xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md flex items-center gap-1.5">
                  {getCategoryIcon(selectedLesson.category)}
                  {selectedLesson.category}
                </span>
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-slate-300 rounded-md">
                  {selectedLesson.difficulty} Level
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() => setSelectedLesson(null)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                Close Briefing
              </Button>
            </div>

            {/* Stepper Progress Header */}
            <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white flex items-center gap-2">
                  <span>Section {currentSectionIndex + 1} of {activeSections.length}</span>
                  <span className="text-slate-400 font-normal truncate max-w-xs sm:max-w-md">• {activeSections[currentSectionIndex]?.title}</span>
                </span>
                <span className="font-bold text-blue-400 shrink-0">
                  {Math.round(((completedSections.length) / (activeSections.length || 1)) * 100)}% Module Covered
                </span>
              </div>

              {/* Coverage Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round(((completedSections.length) / (activeSections.length || 1)) * 100)}%` }}
                />
              </div>

              {/* Step Pills Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
                {activeSections.map((sec, idx) => {
                  const isCompleted = completedSections.includes(idx);
                  const isActive = idx === currentSectionIndex;
                  const isLocked = !isCompleted && idx > 0 && !completedSections.includes(idx - 1);

                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        if (!isLocked) setCurrentSectionIndex(idx);
                      }}
                      disabled={isLocked}
                      className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                          : isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer'
                          : isLocked
                          ? 'bg-slate-900/60 text-slate-600 border border-slate-800/80 opacity-60 cursor-not-allowed'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer'
                      }`}
                    >
                      {isCompleted ? <Check size={12} className="text-emerald-400" /> : isLocked ? <Lock size={10} /> : <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      <span>Sec {idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div ref={modalBodyRef} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 scroll-smooth">
              <div className="pb-4 border-b border-slate-800 flex justify-between items-start flex-wrap gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {activeSections[currentSectionIndex]?.title}
                  </h2>
                  {activeSections[currentSectionIndex]?.subtitle && (
                    <p className="text-xs font-semibold text-blue-400 mt-1">
                      {activeSections[currentSectionIndex].subtitle}
                    </p>
                  )}
                </div>

                {completedSections.includes(currentSectionIndex) && (
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 shadow-inner shrink-0">
                    <CheckCircle size={14} /> Section Completed
                  </span>
                )}
              </div>

              {/* Render Active Section HTML Content */}
              <div 
                className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80"
                dangerouslySetInnerHTML={{ __html: activeSections[currentSectionIndex]?.content || selectedLesson.content }}
              />

              {/* Interactive Exercises */}
              {selectedLesson.category === 'Phishing Attacks' && currentSectionIndex === 4 && (
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Eye size={16} /> INTERACTIVE EXERCISE: Spot The Red Flag
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <p><strong>From:</strong> security-update@paypa1-verify.com</p>
                    <p><strong>Subject:</strong> 🚨 Immediate Action Required: Account Suspended in 24 Hours</p>
                    <p className="text-slate-400">"Dear Customer, we detected unauthorized attempts. Click <span className="text-blue-400 underline cursor-pointer" onClick={() => setEmailFlagged("Domain Spoofing Detected: 'paypa1-verify.com' is an external fake domain!")}>http://paypa1-verify.com/login</span> to verify password."</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setEmailFlagged("Correct! The domain 'paypa1-verify.com' uses typosquatting to impersonate PayPal.")}
                      className="bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white px-3 py-1.5"
                    >
                      Flag Typosquatted Domain
                    </Button>
                  </div>
                  {emailFlagged && (
                    <p className="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{emailFlagged}</p>
                  )}
                </div>
              )}

              {selectedLesson.category === 'Password & Authentication Security' && currentSectionIndex === 0 && (
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <KeyRound size={16} /> INTERACTIVE EXERCISE: Real-Time Password Entropy Tester
                  </div>
                  <input
                    type="text"
                    placeholder="Type a sample password to test entropy..."
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {testPassword && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className={calculatePasswordScore(testPassword).color}>
                          {calculatePasswordScore(testPassword).text}
                        </span>
                        <span className="text-slate-400">{calculatePasswordScore(testPassword).score}% Score</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-2 transition-all duration-300" 
                          style={{ width: `${calculatePasswordScore(testPassword).score}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── IN-MODULE SECTION KNOWLEDGE CHECKPOINT ── */}
              {activeSections[currentSectionIndex]?.questions && activeSections[currentSectionIndex].questions.length > 0 && (
                <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-blue-500/30 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                        <HelpCircle size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                          Section {currentSectionIndex + 1} Knowledge Checkpoint
                        </h3>
                        <p className="text-xs text-slate-400">
                          Answer these {activeSections[currentSectionIndex].questions.length} quick checkpoint questions to verify your understanding before advancing.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      In-Module Checkpoint
                    </span>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-6">
                    {activeSections[currentSectionIndex].questions.map((q, qIdx) => {
                      const selectedOpt = sectionAnswers[q.id];
                      const isChecked = sectionChecked[currentSectionIndex];
                      const isCorrect = selectedOpt === q.correct_index;

                      return (
                        <div key={q.id} className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                          <p className="text-xs font-extrabold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                              {qIdx + 1}
                            </span>
                            {q.question}
                          </p>

                          <div className="grid grid-cols-1 gap-2 pl-7">
                            {q.options.map((opt, optIdx) => {
                              const isChosen = selectedOpt === optIdx;
                              const isCorrectOption = optIdx === q.correct_index;

                              let btnStyle = "bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700";
                              if (isChosen) {
                                btnStyle = "bg-blue-600/20 border-blue-500 text-white font-bold ring-1 ring-blue-500";
                              }
                              if (isChecked) {
                                if (isCorrectOption) {
                                  btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500";
                                } else if (isChosen && !isCorrect) {
                                  btnStyle = "bg-red-500/20 border-red-500 text-red-300 font-bold ring-1 ring-red-500";
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => {
                                    setSectionAnswers(prev => ({ ...prev, [q.id]: optIdx }));
                                    setSectionChecked(prev => ({ ...prev, [currentSectionIndex]: false }));
                                  }}
                                  className={`w-full text-left p-3 rounded-xl text-xs transition-all border flex items-center justify-between ${btnStyle}`}
                                >
                                  <span>{opt}</span>
                                  {isChecked && isCorrectOption && (
                                    <Check size={14} className="text-emerald-400 shrink-0" />
                                  )}
                                  {isChecked && isChosen && !isCorrect && (
                                    <X size={14} className="text-red-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation Callout */}
                          {isChecked && (
                            <div className={`mt-2 p-3 rounded-xl text-xs flex items-start gap-2 ${
                              isCorrect 
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                                : 'bg-red-500/10 border border-red-500/20 text-red-300'
                            }`}>
                              {isCorrect ? <CheckCircle size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
                              <div>
                                <strong>{isCorrect ? 'Correct!' : 'Incorrect:'}</strong> {q.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Checkpoint Action Bar */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="text-xs text-slate-400">
                      {sectionPassed[currentSectionIndex] ? (
                        <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                          <CheckCircle size={14} /> Section Checkpoint Verified! You can proceed.
                        </span>
                      ) : (
                        <span>Answer all questions above to verify section completion.</span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleCheckSectionAnswers(currentSectionIndex)}
                      disabled={activeSections[currentSectionIndex].questions.some(q => sectionAnswers[q.id] === undefined)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-5 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                      <Check size={14} /> Verify Section Answers
                    </Button>
                  </div>
                </div>
              )}

            </div>

            {/* Stepper Navigation Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                onClick={() => setCurrentSectionIndex(prev => Math.max(prev - 1, 0))}
                disabled={currentSectionIndex === 0}
                className="border-slate-800 text-slate-300 hover:text-white text-xs px-4 py-2 flex items-center gap-2"
              >
                <ArrowLeft size={14} /> Previous Section
              </Button>

              <Button
                onClick={() => handleNextSection()}
                disabled={!sectionPassed[currentSectionIndex] && !completedSections.includes(currentSectionIndex)}
                className={`text-xs font-extrabold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md ${
                  currentSectionIndex === activeSections.length - 1
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                }`}
              >
                <span>
                  {currentSectionIndex === activeSections.length - 1
                    ? 'Complete Module & Finish Briefing'
                    : `Proceed to Section ${currentSectionIndex + 2}`}
                </span>
                <ArrowRight size={14} />
              </Button>
            </div>

          </Card>
        </div>
      )}

      {/* ── TAB 1: CURRICULUM MODULES ── */}
      {activeTab === 'modules' && (
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── LEFT SIDEBAR: CATEGORY SELECTION SECTION (Divided Standalone Section) ── */}
          <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-6 flex flex-col space-y-3 border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-6 lg:pb-0 lg:pr-6">
            
            {/* Dedicated Section Header Badge */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Filter size={13} className="text-blue-400" /> Category Navigator
              </span>
              <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {categories.length - 1} Topics
              </span>
            </div>

            {/* Standalone Card Container */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col max-h-[calc(100vh-7rem)]">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-400" />
                  <p className="text-xs font-black text-white uppercase tracking-wider">Select Category</p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Filter Modules</span>
              </div>

              <div className="p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-9.5rem)] overscroll-contain">
                {categories.map((cat) => {
                  const count = cat === 'All' 
                    ? lessons.length 
                    : lessons.filter(l => l.category === cat).length;
                  const isSelected = selectedCategory === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/40 hover:bg-slate-800/80 border-slate-800/60 hover:border-slate-700 text-slate-300'
                      } group`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                        isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800/90 text-slate-400 group-hover:bg-blue-600/20 group-hover:text-blue-400'
                      }`}>
                        {cat !== 'All' ? getCategoryIcon(cat) : <BookOpen size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-extrabold text-white text-xs leading-snug">{cat}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{count} {count === 1 ? 'Module' : 'Modules'}</p>
                      </div>
                      <ChevronRight size={14} className={`transition-transform ${
                        isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT MAIN CONTENT AREA: MODULES GRID ── */}
          <div className="flex-1 min-w-0 space-y-6 w-full">
            
            {/* Top Controls Bar: Search & Difficulty Tier Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
              
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search courses or threat topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Difficulty Tier Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
                  <Filter size={14} /> Difficulty Tier:
                </span>
                {['All', 'Beginner', 'Intermediate', 'Advanced'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedDifficulty === diff
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

            </div>

            {/* Active Category Header & Count Sub-Header */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                {getCategoryIcon(selectedCategory)}
                <span>{selectedCategory === 'All' ? 'All Cybersecurity Categories' : selectedCategory}</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Showing {filteredLessons.length} {filteredLessons.length === 1 ? 'Learning Module' : 'Learning Modules'}
              </span>
            </div>

            {/* Learning Modules Cards Grid */}
            {filteredLessons.length === 0 ? (
              <div className="h-full min-h-[350px] border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-10 bg-slate-900/20">
                <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/30 mb-4">
                  <BookOpen size={36} className="text-slate-600" />
                </div>
                <p className="text-base font-bold text-slate-300">No Learning Modules Found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  No training modules match the selected category or search filter. Try selecting a different category from the left sidebar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLessons.map((lesson) => {
                  const totalSecs = 6;
                  const completedCount = lesson.completed 
                    ? totalSecs 
                    : (lesson.completed_sections?.length || 0);
                  const progressPct = Math.round((completedCount / totalSecs) * 100);

                  return (
                    <Card 
                      key={lesson.id} 
                      className={`border bg-slate-900/60 backdrop-blur-xl p-6 flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-all duration-200 group ${
                        lesson.completed ? 'border-emerald-500/30' : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-slate-950 text-blue-400 border border-blue-500/20 rounded-md flex items-center gap-1">
                            {getCategoryIcon(lesson.category)}
                            {lesson.category}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                              {lesson.difficulty}
                            </span>
                            {lesson.completed && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
                                <CheckCircle size={10} /> Certified
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Summary */}
                        <div>
                          <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors leading-snug line-clamp-2">
                            {lesson.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                            {lesson.summary || "Master threat detection techniques, red flags, and mitigation strategies."}
                          </p>
                        </div>
                      </div>

                      {/* Granular Module Coverage Progress Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400 flex items-center gap-1">
                            <CheckSquare size={12} className={lesson.completed ? "text-emerald-400" : "text-blue-400"} />
                            <span>Module Coverage</span>
                          </span>
                          <span className={lesson.completed ? "text-emerald-400 font-extrabold" : "text-blue-400"}>
                            {completedCount} of {totalSecs} Sections ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 transition-all duration-300 ${lesson.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer Action Button */}
                      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
                        <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <BookOpen size={13} /> Interactive Stepper
                        </span>

                        <Button
                          onClick={() => handleSelectLesson(lesson.id)}
                          className={`text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md ${
                            lesson.completed
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              : completedCount > 0
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                          }`}
                        >
                          <span>
                            {lesson.completed 
                              ? 'Review Briefing' 
                              : completedCount > 0 
                              ? `Continue Sec ${completedCount + 1}` 
                              : 'Start Briefing'}
                          </span>
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── TAB 2: LATEST CYBER THREATS ── */}
      {activeTab === 'threats' && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-wider">
                <AlertCircle size={16} /> Real-Time Threat Intelligence Feed
              </div>
              <h2 className="text-xl font-black text-white mt-1">Newly Discovered Cyber Threats & CVE Advisories</h2>
              <p className="text-xs text-slate-400 mt-1">
                Continuously updated attack vectors, zero-day vulnerabilities, and active ransomware campaigns.
              </p>
            </div>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-xl text-xs font-extrabold border border-red-500/20">
              Live Feed Active 🔴
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {emergingThreats.map((threat) => (
              <Card key={threat.id} className="border border-slate-800 bg-slate-900/40 p-6 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 tracking-wider">
                      {threat.severity}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{threat.cve_id}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-white leading-snug">{threat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{threat.summary}</p>
                </div>

                <div className="pt-4 border-t border-slate-850 space-y-3">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-emerald-400">Mitigation:</strong> {threat.mitigation}
                  </div>

                  {threat.lesson_id && (
                    <Button 
                      onClick={() => {
                        setActiveTab('modules');
                        handleSelectLesson(threat.lesson_id!);
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2"
                    >
                      Start Emergency Briefing <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: ADMIN CONTENT MANAGEMENT ── */}
      {activeTab === 'admin' && isAdmin && (
        <Card className="border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-xl font-black text-white">Create Custom Security Module</h2>
            <p className="text-xs text-slate-400 mt-1">Publish new cybersecurity lessons across all categories to employee accounts.</p>
          </div>

          <form onSubmit={handleCreateModule} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Lesson Title</label>
                <input
                  type="text"
                  placeholder="e.g. Quishing & Mobile QR Code Security"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                >
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Audience Visibility Scope</label>
              <div className="flex items-center gap-4">
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                  isPublic 
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="scope"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="hidden"
                  />
                  <span>🌐 Public (Visible to ALL employees across all organizations)</span>
                </label>

                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                  !isPublic 
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="scope"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="hidden"
                  />
                  <span>🔒 Private (Visible ONLY to your organization employees)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Difficulty Tier</label>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Short Summary</label>
                <input
                  type="text"
                  placeholder="Key takeaway preview..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">HTML Content</label>
              <textarea
                rows={6}
                placeholder="<h3>Overview</h3><p>Enter lesson HTML content here...</p>"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl flex items-center gap-2">
              <Plus size={16} /> Publish Security Module
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
