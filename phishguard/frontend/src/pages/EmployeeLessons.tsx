import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  BookOpen, CheckCircle, ArrowRight, ArrowLeft, ChevronRight, BookOpenCheck, HelpCircle, Shield, 
  Sparkles, Flame, Award, AlertTriangle, Search, Plus, Edit3, Trash2, 
  Zap, Lock, Smartphone, Wifi, Cloud, Bot, Eye, KeyRound, AlertCircle, Play, UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';

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
}

interface LessonDetail {
  id: number;
  topic: string;
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  content: string;
  completed: boolean;
  quiz: {
    id: number | null;
    questions: any[];
  };
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
      <h4>Key Phishing Variants</h4>
      <ul>
        <li><b>Email Phishing:</b> Mass distribution of fake invoices, account verification links, or security alerts.</li>
        <li><b>Spear Phishing & Whaling:</b> Highly targeted attacks customized to specific individuals or C-level executives.</li>
        <li><b>Quishing (QR Code Scams):</b> Embedding malicious QR codes in PDF invoices or physical flyers to bypass email gateway link filters.</li>
        <li><b>Smishing & Vishing:</b> SMS text phishing and voice call impersonation (vishing) requesting immediate wire transfers or MFA codes.</li>
      </ul>
      <h4>Email Header Verification Protocol</h4>
      <p>Always inspect the full sender address, SPF/DKIM validation flags, and hovering target URL before taking any action.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 1,
      questions: [
        {
          question: "What is 'Quishing' in modern cyber attacks?",
          options: [
            "A technique to bypass email filters using malicious QR codes directing victims to phishing sites",
            "A fast wireless network speed test protocol",
            "A hardware key authentication standard",
            "A method for encrypting email attachments"
          ],
          correct_index: 0
        },
        {
          question: "Which indicator strongly suggests an email is a spear phishing attempt?",
          options: [
            "Generic greeting like 'Dear Customer'",
            "Contextual details referencing your recent project, boss's name, or internal vendor names",
            "Sent from an @company.com domain with zero links",
            "A newsletter with an unsubscribe link"
          ],
          correct_index: 1
        }
      ]
    }
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
      <h4>Common Attack Scenarios</h4>
      <ul>
        <li><b>Payroll Direct Deposit Fraud:</b> Fake emails sent to HR posing as employees requesting an urgent bank account update before pay day.</li>
        <li><b>Supplier Invoice Fraud:</b> Fraudulent notices claiming a vendor changed bank account routing details.</li>
      </ul>
      <h4>Mandatory Control</h4>
      <p>Always execute out-of-band phone calls or secondary authorization for financial routing alterations.</p>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 2,
      questions: [
        {
          question: "What is the primary characteristic of Whaling attacks?",
          options: [
            "Targeting high-profile executive targets like CEOs, CFOs, and Board Members",
            "Sending millions of generic emails to random addresses",
            "Hacking IoT smart home appliances",
            "Encrypting local hard drives"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Key Defensive Controls</h4>
      <ul>
        <li><b>Air-Gapped Backups:</b> Maintain offline, immutable backups that malware cannot reach or wipe.</li>
        <li><b>Endpoint Detection (EDR):</b> Deploy behavioral heuristic monitoring to detect double-extension files and unauthorized volume shadow copy deletions.</li>
        <li><b>Least Privilege Access:</b> Ensure domain user accounts do not possess local administrative rights.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 3,
      questions: [
        {
          question: "What is the most effective backup policy against double-extortion ransomware?",
          options: [
            "Maintaining offline, air-gapped or immutable cloud backups",
            "Saving files on a local USB drive left plugged in",
            "Relying solely on continuous cloud sync without version history",
            "Keeping passwords in a text file"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Defensive Guidelines</h4>
      <ul>
        <li>Never install unauthorized browser extensions or untrusted open-source executables.</li>
        <li>Validate cryptographic hashes (SHA-256) of downloaded software packages against vendor release notes.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 4,
      questions: [
        {
          question: "How do infostealer trojans bypass traditional password security?",
          options: [
            "By stealing active session browser cookies and saved credentials from browser storage",
            "By guessing your mother's maiden name",
            "By overloading the router with ICMP ping requests",
            "By deleting the Windows Registry"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Best Practices</h4>
      <ul>
        <li>Use long, unique passphrases (16+ characters) stored in an enterprise password manager.</li>
        <li>Enable Hardware FIDO2/WebAuthn keys or Authenticator App push notifications with number matching.</li>
        <li>Never approve unsolicited MFA push notifications (MFA Bombing / Fatigue Attacks).</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 5,
      questions: [
        {
          question: "How should an employee respond to an unexpected series of MFA push notifications?",
          options: [
            "Deny the request immediately and report a potential credential compromise to IT Security",
            "Approve the push notification to make the popups stop",
            "Turn off the phone",
            "Wait 24 hours before taking action"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Common Pretexting Scenarios</h4>
      <ul>
        <li><b>CEO Wire Transfer Urgent Request:</b> Fake emails or WhatsApp calls from C-level executives demanding immediate gift card or bank transfers.</li>
        <li><b>Help Desk Impersonation:</b> Fraudsters posing as IT support asking for remote access passwords during a 'scheduled system upgrade'.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 6,
      questions: [
        {
          question: "What is the mandatory verification step when an urgent wire transfer request is received via email?",
          options: [
            "Verify out-of-band using a known internal phone number or in-person confirmation",
            "Reply directly to the email asking if it is real",
            "Process the wire immediately to avoid disciplinary action",
            "Forward to external personal email"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Essential Protection Steps</h4>
      <ul>
        <li>Always connect to company Enterprise VPN before accessing internal systems over public networks.</li>
        <li>Verify HTTPS TLS padlock certificates on sensitive web portals.</li>
        <li>Disable auto-join for open Wi-Fi networks on mobile devices.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 7,
      questions: [
        {
          question: "What risk does an 'Evil Twin' Wi-Fi access point pose to users?",
          options: [
            "It intercepts unencrypted traffic, session cookies, and login credentials by posing as a legitimate network",
            "It slows down battery charging rate",
            "It deletes files on your local hard drive",
            "It upgrades your browser without permission"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Security Checklist</h4>
      <ul>
        <li>Ensure S3 buckets and Azure blob storage containers are private by default.</li>
        <li>Never commit cloud service credentials or API keys into public git repositories.</li>
        <li>Enforce least-privilege IAM roles and enable CloudTrail auditing logs.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 8,
      questions: [
        {
          question: "What is the primary cause of major cloud data breaches?",
          options: [
            "Misconfigured public access permissions on cloud storage buckets or exposed API keys",
            "Physical theft of cloud server racks",
            "Solar flares affecting satellite links",
            "Over-encrypted database fields"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Defensive Guidelines</h4>
      <ul>
        <li>Establish pre-shared passphrase challenges for high-value financial actions.</li>
        <li>Be suspicious of audio/video streams with artificial micro-delays or unusual facial artifacts.</li>
      </ul>
    `,
    is_emerging_threat: true,
    cve_id: 'CVE-2026-AI-01',
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 9,
      questions: [
        {
          question: "What is a recommended countermeasure against AI voice-cloning authorization scams?",
          options: [
            "Pre-agreed verbal passphrase challenges for sensitive authorization requests",
            "Relying on caller ID display",
            "Disabling all phone communications",
            "Hanging up and accepting the loss"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Best Practices</h4>
      <ul>
        <li>Only download applications from official app stores (Google Play Store, Apple App Store).</li>
        <li>Keep device operating systems updated with the latest security patches.</li>
        <li>Never tap links in SMS messages from unknown shortcodes.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 10,
      questions: [
        {
          question: "What is 'Smishing'?",
          options: [
            "Phishing attacks delivered via SMS text messages to mobile devices",
            "Encrypting mobile SD cards",
            "Connecting to Bluetooth speakers",
            "Taking screenshot photos"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Workplace Controls</h4>
      <ul>
        <li>Lock your computer workstation (Win + L / Ctrl + Cmd + Q) whenever walking away.</li>
        <li>Never allow strangers to 'tailgate' through secure badge doors behind you.</li>
        <li>Shred sensitive paper documents in designated security bins.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 11,
      questions: [
        {
          question: "What is 'Tailgating' in physical security?",
          options: [
            "An unauthorized person following an authorized employee through a badge-protected door",
            "Parking cars close together",
            "Printing large PDF files",
            "Sending emails after business hours"
          ],
          correct_index: 0
        }
      ]
    }
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
      <h4>Escalation Steps</h4>
      <ul>
        <li>Click the PhishGuard 'Report Phish' button on suspicious emails immediately.</li>
        <li>Notify IT Security Help Desk if a company laptop or phone is misplaced.</li>
        <li>Never attempt to privately negotiate or delete malware files yourself.</li>
      </ul>
    `,
    is_emerging_threat: false,
    cve_id: null,
    assigned_at: new Date().toISOString(),
    completed_at: null,
    completed: false,
    quiz: {
      id: 12,
      questions: [
        {
          question: "What should you do immediately if you accidentally clicked a suspicious link and typed your credentials?",
          options: [
            "Immediately report the incident to IT Security so they can reset session tokens and enforce MFA",
            "Turn off your computer and pretend it didn't happen",
            "Delete your email inbox",
            "Wait 3 days to see if anything breaks"
          ],
          correct_index: 0
        }
      ]
    }
  }
];

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
    if (cat && typeof cat === 'string' && cat.trim() !== '' && cat !== 'All') {
      if (categories.includes(cat)) {
        return cat;
      }
    }

    const topic = (l.topic || '').toLowerCase();
    const title = (l.title || '').toLowerCase();

    if (topic.includes('phish') || title.includes('phish') || title.includes('quish')) return 'Phishing Attacks';
    if (topic.includes('malware') || topic.includes('ransomware') || title.includes('ransomware') || title.includes('trojan')) return 'Malware & Ransomware';
    if (topic.includes('password') || topic.includes('mfa') || title.includes('password') || title.includes('authentication')) return 'Password & Authentication Security';
    if (topic.includes('social') || topic.includes('pretext') || title.includes('vishing') || title.includes('impersonation')) return 'Social Engineering';
    if (topic.includes('network') || topic.includes('wifi') || title.includes('wi-fi') || title.includes('vpn')) return 'Network Security';
    if (topic.includes('cloud') || title.includes('cloud') || title.includes('iam') || title.includes('s3')) return 'Cloud Security';
    if (topic.includes('ai') || title.includes('ai') || title.includes('deepfake')) return 'AI & Modern Cyber Threats';
    if (topic.includes('mobile') || title.includes('mobile') || title.includes('smishing')) return 'Mobile Security';
    if (topic.includes('workplace') || title.includes('clean desk') || title.includes('tailgating') || topic.includes('incident') || title.includes('dlp')) return 'Workplace Security';

    const matchFallback = FALLBACK_LESSONS.find(f => f.id === l.id);
    if (matchFallback) return matchFallback.category;

    return 'Phishing Attacks';
  };

  useEffect(() => {
    fetchLessons();
    fetchAdaptiveProfile();
    fetchEmergingThreats();
  }, [selectedCategory, selectedDifficulty]);

  const fetchLessons = async () => {
    setIsLoading(true);

    // 1. Try API first
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedDifficulty && selectedDifficulty !== 'All') params.append('difficulty', selectedDifficulty);

      const queryString = params.toString();
      const url = `/training/lessons${queryString ? `?${queryString}` : ''}`;

      const res = await apiFetch(url).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const formattedData = data.map((d: any) => ({
            ...d,
            category: resolveCategory(d)
          }));
          setLessons(formattedData);
          if (!selectedLesson || !formattedData.some((d: any) => d.id === selectedLesson.id)) {
            handleSelectLesson(formattedData[0].id, formattedData[0]);
          }
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    // 2. Try Supabase fallback
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

        let filtered = formatted;
        if (selectedCategory && selectedCategory !== 'All') {
          filtered = filtered.filter(l => l.category === selectedCategory);
        }
        if (selectedDifficulty && selectedDifficulty !== 'All') {
          filtered = filtered.filter(l => l.difficulty === selectedDifficulty);
        }

        if (filtered.length > 0) {
          setLessons(filtered);
          const first = filtered[0];
          const detailed = supaLessons.find((sl: any) => sl.id === first.id);
          setSelectedLesson({
            id: first.id,
            topic: first.topic,
            title: first.title,
            category: first.category,
            difficulty: first.difficulty,
            summary: first.summary,
            content: detailed?.content || '<p>Security awareness training module content.</p>',
            completed: false,
            quiz: {
              id: first.id,
              questions: detailed?.quiz || [
                {
                  question: `What is the key security control for ${first.title}?`,
                  options: ["Verify out-of-band and report suspicious activity", "Ignore alerts", "Share passwords", "Disable antivirus"],
                  correct_index: 0
                }
              ]
            }
          });
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    // 3. Built-in Fallback Curriculum (Guarantees courses for ALL categories!)
    let filteredFallback = FALLBACK_LESSONS;
    if (selectedCategory && selectedCategory !== 'All') {
      filteredFallback = filteredFallback.filter(l => l.category === selectedCategory);
    }
    if (selectedDifficulty && selectedDifficulty !== 'All') {
      filteredFallback = filteredFallback.filter(l => l.difficulty === selectedDifficulty);
    }

    setLessons(filteredFallback);
    if (filteredFallback.length > 0) {
      const first = filteredFallback[0];
      setSelectedLesson({
        id: first.id,
        topic: first.topic,
        title: first.title,
        category: first.category,
        difficulty: first.difficulty,
        summary: first.summary,
        content: first.content,
        completed: first.completed,
        quiz: first.quiz
      });
    }
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
    // Fallback adaptive profile
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
    // Fallback emerging threats
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
    try {
      const res = await apiFetch(`/training/lessons/${lessonId}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setSelectedLesson(data);
        return;
      }
    } catch {
      // ignore
    }

    const foundFallback = FALLBACK_LESSONS.find(f => f.id === lessonId);
    if (foundFallback) {
      setSelectedLesson({
        id: foundFallback.id,
        topic: foundFallback.topic,
        title: foundFallback.title,
        category: foundFallback.category,
        difficulty: foundFallback.difficulty,
        summary: foundFallback.summary,
        content: foundFallback.content,
        completed: foundFallback.completed,
        quiz: foundFallback.quiz
      });
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
          quiz: [
            {
              question: `What is the primary key defense regarding ${newTitle}?`,
              options: [
                "Always verify via secondary channel and report anomalies to IT Security",
                "Ignore warnings and click links directly",
                "Share credentials with unverified external contacts",
                "Disable all antivirus software"
              ],
              correct_index: 0
            }
          ]
        })
      });

      if (res.ok) {
        addToast({ title: 'Module Published!', description: `Successfully created security lesson "${newTitle}".`, type: 'success' });
        setNewTitle('');
        setNewSummary('');
        setNewContent('');
        fetchLessons();
        fetchAdaptiveProfile();
      }
    } catch (e) {
      addToast({ title: 'Failed', description: 'Could not create security lesson.', type: 'error' });
    }
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Dynamic cybersecurity education, interactive threat simulations, and real-time intelligence feeds.
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
              <p className="text-lg font-black text-white">{adaptiveProfile.completed_count} / {adaptiveProfile.total_assigned} ({adaptiveProfile.completion_percentage}%)</p>
            </div>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Level Tier</p>
              <p className="text-lg font-black text-white capitalize">{adaptiveProfile.suggested_next_difficulty} Tier</p>
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

      {/* ── TAB 1: CURRICULUM MODULES ── */}
      {activeTab === 'modules' && (
        <div className="flex gap-6 items-start">

          {/* ── LEFT SIDEBAR: Category Nav OR Courses List ── */}
          <div className="w-72 flex-shrink-0 space-y-3 sticky top-4">

            {sidebarView === 'categories' ? (
              /* ── VIEW 1: CATEGORIES SELECTION ── */
              <div className="space-y-3">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-400" />
                      <p className="text-xs font-black text-white uppercase tracking-wider">Select Category</p>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      {categories.length - 1} Topics
                    </span>
                  </div>

                  <div className="p-2 space-y-1 max-h-[580px] overflow-y-auto">
                    {categories.map(cat => {
                      const count = cat === 'All' 
                        ? lessons.length 
                        : lessons.filter(l => l.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setSidebarView('courses');
                          }}
                          className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                            selectedCategory === cat && cat !== 'All'
                              ? 'bg-blue-600/20 border-blue-500/50 text-white shadow-md'
                              : 'bg-slate-900/40 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700 text-slate-300'
                          } group`}
                        >
                          <div className="p-2 rounded-lg bg-slate-800/90 group-hover:bg-blue-600/30 text-blue-400 shrink-0 transition-colors">
                            {cat !== 'All' ? getCategoryIcon(cat) : <BookOpen size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-extrabold text-white text-xs leading-snug">{cat}</p>
                            <p className="text-[10px] text-slate-500 font-semibold">{count} {count === 1 ? 'Course' : 'Courses'}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* ── VIEW 2: AVAILABLE COURSES IN SELECTED CATEGORY ── */
              <div className="space-y-3">
                {/* 1. Search Bar */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                {/* 2. Difficulty Selector */}
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 shadow-sm"
                >
                  <option value="All">All Difficulty Tiers</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>

                {/* 3. Integrated Selected Category Header with Back Action */}
                <button
                  onClick={() => setSidebarView('categories')}
                  title="Click to view all categories"
                  className="w-full px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-xl flex items-center justify-between shadow-sm transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <ArrowLeft size={14} className="text-blue-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    {getCategoryIcon(selectedCategory)}
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                      {selectedCategory}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 group-hover:bg-blue-500/20 transition-colors">
                    {filteredLessons.length} Available
                  </span>
                </button>

                {/* Available Courses List */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
                  {isLoading ? (
                    <p className="text-xs text-slate-500 px-2 py-4">Loading courses...</p>
                  ) : filteredLessons.length === 0 ? (
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-center">
                      <p className="text-xs text-slate-400">No courses match search filter.</p>
                    </div>
                  ) : (
                    filteredLessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
                          selectedLesson?.id === lesson.id
                            ? 'border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                            : 'border-slate-800/80 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          {lesson.completed ? (
                            <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <CheckCircle size={10} /> Done
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {lesson.difficulty}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 text-slate-500">
                            {getCategoryIcon(lesson.category)}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-white leading-snug line-clamp-2">{lesson.title}</h3>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: Lesson Reader ── */}
          <div className="flex-1 min-w-0">
            {(filteredLessons.length === 0 || !selectedLesson) ? (
              <div className="h-full min-h-[480px] border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-10 bg-slate-900/20">
                <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-700/30 mb-5">
                  <BookOpen size={40} className="text-slate-600" />
                </div>
                {filteredLessons.length === 0 ? (
                  <>
                    <p className="text-base font-bold text-slate-300">No Modules Found</p>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                      No cybersecurity modules match the selected category or search query. Try selecting a different category from the sidebar.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-bold text-slate-300">Select a Cybersecurity Module</p>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                      Choose any training course from the curriculum on the left to read content and complete knowledge checks.
                    </p>
                  </>
                )}
              </div>
            ) : selectedLesson ? (
                <Card className="border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
                  {/* Header */}
                  <div className="pb-4 border-b border-slate-800 flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          {getCategoryIcon(selectedLesson.category)}
                          {selectedLesson.category}
                        </span>
                        <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-bold">
                          {selectedLesson.difficulty} Level
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 leading-tight">{selectedLesson.title}</h2>
                    </div>

                    {selectedLesson.completed && (
                      <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 px-3.5 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 shadow-inner">
                        <CheckCircle size={16} /> Certified Complete
                      </span>
                    )}
                  </div>

                  {/* Render Lesson HTML Content */}
                  <div 
                    className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none space-y-4"
                    dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                  />

                  {/* ── Interactive Practical Exercise Widgets ── */}
                  {selectedLesson.category === 'Phishing Attacks' && (
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

                  {selectedLesson.category === 'Password & Authentication Security' && (
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

                  {/* Quiz Check Section */}
                  {selectedLesson.quiz.id ? (
                    <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <HelpCircle size={16} className="text-emerald-400" />
                        <span>Interactive Knowledge Check • Pass threshold: <strong>70%+</strong></span>
                      </div>
                      <Link to={`/quiz/${selectedLesson.quiz.id}`}>
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                          <Play size={16} /> Take Knowledge Quiz
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-4">No quiz currently configured for this module.</p>
                  )}
                </Card>
            ) : null}
          </div>
        </div>
      )}


      {/* ── TAB 2: LATEST CYBER THREATS (EMERGING INTELLIGENCE) ── */}
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
            <p className="text-xs text-slate-400 mt-1">Publish new cybersecurity lessons across all 9 categories to employee accounts.</p>
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
