import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, CheckCircle, AlertTriangle, RefreshCw, Award, ChevronRight, 
  Search, Shield, Zap, BookOpen, Clock, Lock, Sparkles, Filter, Check, ArrowRight,
  KeyRound, UserCheck, Wifi, Cloud, Bot, Smartphone, Building2, ArrowLeft, Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { apiFetch } from '../lib/api';
import { useAuth } from '../AuthContext';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface QuizModule {
  id: number;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  summary: string;
  time_estimate: string;
  pass_score: number;
  questions: QuizQuestion[];
}

export const QUIZ_MODULES: QuizModule[] = [
  // ── 1. PHISHING ATTACKS ───────────────────────────────────────────────────
  {
    id: 101,
    title: 'Email Phishing & Header Analysis Checkup',
    category: 'Phishing Attacks',
    difficulty: 'Beginner',
    summary: 'Analyze SPF/DKIM flags, domain misspellings, hovered URL targets, and deceptive invoice links.',
    time_estimate: '5 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is the primary purpose of inspecting email headers when evaluating a suspicious message?",
        options: [
          "To check the authentic sending server IP and SPF/DKIM authentication status",
          "To format the text into HTML preview",
          "To download external image attachments automatically",
          "To measure network speed"
        ],
        correct_index: 0,
        explanation: "Email headers contain mandatory cryptographic signatures (SPF/DKIM/DMARC) that prove whether the sending server is authorized for that domain."
      },
      {
        id: 2,
        question: "Which indicator strongly suggests an email is a phishing attempt?",
        options: [
          "The sender domain reads 'supp0rt-paypa1.com' instead of 'paypal.com'",
          "The email contains zero clickable links",
          "The email comes from a known colleague with an internal company signature",
          "The email was sent during business hours"
        ],
        correct_index: 0,
        explanation: "Attackers use typosquatting domains (replacing letters with numbers like '0' or '1') to trick recipient eye check."
      },
      {
        id: 3,
        question: "What is 'Quishing' in modern cyber attacks?",
        options: [
          "Embedding malicious QR codes in PDF attachments or emails to bypass URL filters",
          "A fast network speed test protocol",
          "A hardware key authentication standard",
          "A wireless router encryption algorithm"
        ],
        correct_index: 0,
        explanation: "Quishing tricks users into scanning QR codes with personal mobile phones, bypassing gateway email link scanners."
      },
      {
        id: 4,
        question: "What is the safest action before clicking a hyperlink in an unexpected security alert email?",
        options: [
          "Hover over the link to verify the true destination URL matches the official corporate domain",
          "Click the link quickly before the account locks",
          "Forward the link to all team members",
          "Disable your browser firewall"
        ],
        correct_index: 0,
        explanation: "Hovering exposes the hidden hyperlink target URL. If the target differs from official domains, do not click!"
      }
    ]
  },
  {
    id: 102,
    title: 'Spear Phishing & Executive Whaling Defense',
    category: 'Phishing Attacks',
    difficulty: 'Intermediate',
    summary: 'Identify hyper-targeted campaigns targeting HR, Finance, and C-suite wire transfers.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What differentiates Spear Phishing from broadcast email phishing spam?",
        options: [
          "Spear phishing uses OSINT research to customize contextual details for specific high-value targets",
          "Spear phishing is sent to millions of random addresses simultaneously",
          "Spear phishing only contains audio attachments",
          "Spear phishing never requests credentials"
        ],
        correct_index: 0,
        explanation: "Spear phishers research target names, recent projects, and company structure to craft convincing customized lures."
      },
      {
        id: 2,
        question: "What is 'Whaling' in social engineering?",
        options: [
          "A targeted attack specifically directed at C-level executives and financial decision makers",
          "Hacking smart home fish tanks",
          "Deleting database backups",
          "Sending bulk newsletter spam"
        ],
        correct_index: 0,
        explanation: "Whaling targets top-tier executives (CEOs, CFOs) to execute high-dollar wire fraud or gain administrative control."
      },
      {
        id: 3,
        question: "An urgent email posing as your CEO requests an immediate $35,000 wire transfer for a secret acquisition. What is the required step?",
        options: [
          "Verify out-of-band using a known internal phone number or direct verbal confirmation",
          "Reply to the email asking if the CEO is sure",
          "Process the wire immediately to avoid disciplinary action",
          "Forward to your personal email account"
        ],
        correct_index: 0,
        explanation: "All financial routing or wire transfer changes require independent out-of-band phone or in-person verification."
      },
      {
        id: 4,
        question: "Which public platform is most heavily exploited by attackers for OSINT spear phishing research?",
        options: [
          "Professional networking sites (like LinkedIn) and public corporate team pages",
          "Online multiplayer video games",
          "Local weather forecasting sites",
          "Public library archives"
        ],
        correct_index: 0,
        explanation: "Attackers harvest employee roles, manager hierarchies, and tech stacks from public LinkedIn and corporate profiles."
      }
    ]
  },

  // ── 2. MALWARE & RANSOMWARE ───────────────────────────────────────────────
  {
    id: 201,
    title: 'Ransomware Prevention & Air-Gapped Backups',
    category: 'Malware & Ransomware',
    difficulty: 'Intermediate',
    summary: 'Recognize ransomware encryption vectors, shadow copy deletion, and emergency network isolation.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is the primary objective of ransomware malware?",
        options: [
          "To encrypt enterprise files and demand ransom payments for decryption keys",
          "To speed up computer boot times",
          "To clean temporary cache files",
          "To upgrade operating system drivers"
        ],
        correct_index: 0,
        explanation: "Ransomware locks local and network storage files using strong encryption before displaying extortion notes."
      },
      {
        id: 2,
        question: "What is 'Double Extortion' in modern ransomware attacks?",
        options: [
          "Stealing sensitive corporate data before encrypting systems, threatening public leakage if ransom is unpaid",
          "Asking for money twice on the same credit card",
          "Encrypting two different computers",
          "Sending two phishing emails in one day"
        ],
        correct_index: 0,
        explanation: "Attackers exfiltrate sensitive IP and client data prior to file encryption to pressure victims into paying."
      },
      {
        id: 3,
        question: "Which backup policy provides the highest resilience against ransomware wiping attacks?",
        options: [
          "Maintaining offline, air-gapped or immutable cloud backups",
          "Saving files on a local USB drive left plugged in 24/7",
          "Relying solely on live cloud sync without versioning",
          "Saving passwords in a local text file"
        ],
        correct_index: 0,
        explanation: "Air-gapped and immutable backups cannot be wiped or modified by malware traversing local network shares."
      },
      {
        id: 4,
        question: "If a ransom demand wallpaper appears on your workstation screen, what is your FIRST emergency step?",
        options: [
          "Disconnect ethernet/Wi-Fi immediately to stop malware spreading across LAN",
          "Pay the ransom using personal credit card",
          "Restart the computer 10 times",
          "Delete your email account"
        ],
        correct_index: 0,
        explanation: "Disconnecting network interfaces isolates the infected device and prevents lateral spread to enterprise servers."
      }
    ]
  },
  {
    id: 202,
    title: 'Infostealer Trojans, Keyloggers & Session Theft',
    category: 'Malware & Ransomware',
    difficulty: 'Advanced',
    summary: 'Master cookie theft prevention, trojanized software downloads, and endpoint privilege escalation.',
    time_estimate: '7 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "How do modern Infostealer Trojans bypass multi-factor authentication (MFA)?",
        options: [
          "By stealing active browser session cookies and saved tokens directly from browser storage",
          "By guessing your pet's name",
          "By calling your mobile carrier",
          "By unplugging the monitor"
        ],
        correct_index: 0,
        explanation: "Infostealers extract active session cookies, allowing attackers to clone authenticated sessions without needing MFA codes."
      },
      {
        id: 2,
        question: "What risk is created by downloading cracked software or unapproved utility tools?",
        options: [
          "Executables often bundle hidden trojans, keyloggers, or remote access backdoor payloads",
          "It improves computer performance",
          "It reduces network bandwidth usage",
          "It automatically encrypts your files"
        ],
        correct_index: 0,
        explanation: "Pirated software and unofficial download mirrors are primary distribution vectors for infostealer malware."
      },
      {
        id: 3,
        question: "Why are untrusted browser extensions dangerous for enterprise security?",
        options: [
          "Extensions possess permissions to read web page DOM text, passwords, and session cookies across all tabs",
          "Extensions slow down keyboard typing speed",
          "Extensions turn off monitor backlights",
          "Extensions delete operating system logs"
        ],
        correct_index: 0,
        explanation: "Browser extensions run inside the browser context and can intercept sensitive form inputs and session credentials."
      },
      {
        id: 4,
        question: "Which security model prevents standard users from executing unauthorized malware binaries?",
        options: [
          "Least Privilege Access & Application Whitelisting (AppLocker)",
          "Allowing all users full local Administrator privileges",
          "Disabling Windows updates",
          "Using short passwords"
        ],
        correct_index: 0,
        explanation: "Restricting administrative rights and enforcing application execution controls blocks unauthorized malware installation."
      }
    ]
  },

  // ── 3. PASSWORD & AUTHENTICATION ──────────────────────────────────────────
  {
    id: 301,
    title: 'Passkeys, FIDO2 & Hardware Tokens Master Check',
    category: 'Password & Authentication Security',
    difficulty: 'Beginner',
    summary: 'Understand WebAuthn cryptographically bound tokens, password hygiene, and credential stuffing.',
    time_estimate: '5 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "Why are FIDO2 / WebAuthn Hardware Passkeys considered immune to email phishing?",
        options: [
          "Credentials are cryptographically bound to the official origin domain name and cannot be submitted to fake sites",
          "They send 6-digit SMS text messages",
          "They store passwords on public websites",
          "They only work without internet connection"
        ],
        correct_index: 0,
        explanation: "FIDO2 protocols verify the origin domain matching. Even if a user is tricked by a phishing site, the passkey refuses to sign!"
      },
      {
        id: 2,
        question: "What is the primary vulnerability of SMS-based 2FA?",
        options: [
          "SIM-swapping attacks and mobile network interception",
          "SMS messages require too much disk space",
          "SMS codes never expire",
          "SMS requires Bluetooth enabled"
        ],
        correct_index: 0,
        explanation: "Cybercriminals can trick mobile carriers into transferring a target's phone number to an attacker-controlled SIM card."
      },
      {
        id: 3,
        question: "Which passphrase technique provides high security while remaining easy to remember?",
        options: [
          "Combining 4+ random dictionary words with hyphens (e.g., 'Purple-Elephant-Bikes-Fast!')",
          "Reusing 'P@ssword123' across all work accounts",
          "Using your birth date",
          "Writing your password on a sticky note on your monitor"
        ],
        correct_index: 0,
        explanation: "Long passphrases exponentially increase brute-force crack times while being memorable for humans."
      },
      {
        id: 4,
        question: "What is the primary function of an Enterprise Password Manager?",
        options: [
          "Generates, encrypts, and auto-fills unique 16+ character passwords for every application",
          "Shares your passwords with public search engines",
          "Deletes old emails after 30 days",
          "Sends automated slack messages"
        ],
        correct_index: 0,
        explanation: "Password managers eliminate password reuse and generate high-entropy unique credentials per site."
      }
    ]
  },
  {
    id: 302,
    title: 'Multi-Factor Authentication & Push Fatigue Defense',
    category: 'Password & Authentication Security',
    difficulty: 'Intermediate',
    summary: 'Spot MFA Fatigue push bombing, TOTP app security, and stopping credential spraying.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is an 'MFA Fatigue / Push Bombing' attack?",
        options: [
          "Attackers spam dozens of MFA push prompts repeatedly hoping the victim clicks 'Approve' to stop the noise",
          "Overloading a server with ICMP pings",
          "Deleting authenticator apps from mobile phones",
          "Sending physical mailers"
        ],
        correct_index: 0,
        explanation: "Attacker who compromised a password triggers non-stop MFA notifications until the victim inadvertently accepts."
      },
      {
        id: 2,
        question: "How should an employee respond if they receive unexpected MFA push prompts while sleeping?",
        options: [
          "Deny the request immediately and report potential credential compromise to IT Security",
          "Approve the push prompt to make the popups stop",
          "Turn off phone Wi-Fi and do nothing",
          "Wait 48 hours before acting"
        ],
        correct_index: 0,
        explanation: "An unexpected push notification means an attacker already knows your password! Deny and change credentials immediately."
      },
      {
        id: 3,
        question: "Which MFA push feature prevents accidental approval during MFA Fatigue attacks?",
        options: [
          "Number Matching (requiring the user to enter numbers shown on the login screen into the app)",
          "Simple single-tap 'Yes/No' buttons",
          "SMS text message codes",
          "Email verification links"
        ],
        correct_index: 0,
        explanation: "Number matching requires the user to see the login screen numbers, stopping blind approvals."
      },
      {
        id: 4,
        question: "What is Credential Stuffing?",
        options: [
          "Automated bot testing of stolen username/password lists from past breaches against hundreds of websites",
          "Stuffing physical hard drives into server racks",
          "Creating multiple email aliases",
          "Downloading large zip files"
        ],
        correct_index: 0,
        explanation: "Attackers exploit users who reuse passwords across personal and work services to gain access automatically."
      }
    ]
  },

  // ── 4. SOCIAL ENGINEERING ────────────────────────────────────────────────
  {
    id: 401,
    title: 'Pretexting & Physical Impersonation Assessment',
    category: 'Social Engineering',
    difficulty: 'Intermediate',
    summary: 'Detect badge tailgating, contractor pretexting, and phone support impersonations.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is 'Pretexting' in social engineering?",
        options: [
          "Creating a fabricated scenario or persona to trick a target into disclosing confidential data",
          "Texting friends before calling them",
          "Formatting text documents into PDF",
          "Sending SMS coupon codes"
        ],
        correct_index: 0,
        explanation: "Pretexters pose as auditors, IT support, or vendors to build artificial authority and extract data."
      },
      {
        id: 2,
        question: "An individual in a uniform claims to be an elevator maintenance technician needing server room access. What is the required protocol?",
        options: [
          "Require official badge check, verify with facilities management, and escort them at all times",
          "Hold the door open and let them wander freely",
          "Give them your master key card",
          "Leave for lunch while they work"
        ],
        correct_index: 0,
        explanation: "Physical visitors must be verified against authorization logs and escorted in secure areas."
      },
      {
        id: 3,
        question: "Which psychological trigger is most commonly exploited in urgent gift card / wire transfer scams?",
        options: [
          "Sense of extreme urgency and fear of disobeying authority figures",
          "Curiosity about space exploration",
          "Desire for sleep",
          "Technical interest in computer hardware"
        ],
        correct_index: 0,
        explanation: "Pretexters create high stress and artificial deadlines so victims skip standard verification procedures."
      },
      {
        id: 4,
        question: "What is 'Baiting' in cybersecurity?",
        options: [
          "Leaving infected USB drives in parking lots or lobbies hoping employees plug them into work PCs",
          "Fishing in corporate lakes",
          "Sending generic email newsletters",
          "Updating antivirus definitions"
        ],
        correct_index: 0,
        explanation: "Baiting relies on curiosity. When victims plug in found USB drives, autorun scripts execute malware."
      }
    ]
  },
  {
    id: 402,
    title: 'Authority & Urgency Manipulation Scams',
    category: 'Social Engineering',
    difficulty: 'Advanced',
    summary: 'Recognize executive impersonation, out-of-band verification steps, and vendor fraud.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "Why do social engineers frequently impersonate law enforcement, tax authorities, or internal legal counsel?",
        options: [
          "Targets tend to comply quickly without questioning authority out of fear of legal consequences",
          "Legal terms are easier to spell",
          "Law enforcement agencies use public Wi-Fi",
          "Legal emails are exempt from spam filters"
        ],
        correct_index: 0,
        explanation: "Impersonating authority figures induces panic, causing victims to bypass verification procedures."
      },
      {
        id: 2,
        question: "A caller claiming to be Helpdesk Support asks for your password to fix an active server outage. How should you respond?",
        options: [
          "Refuse immediately. Legitimate IT staff will NEVER ask for your password.",
          "Provide your password if they sound polite",
          "Give them half of your password",
          "Post your password on a public forum"
        ],
        correct_index: 0,
        explanation: "Legitimate IT administrators have administrative tools and never require an employee's raw password."
      },
      {
        id: 3,
        question: "What is 'Watering Hole' social engineering?",
        options: [
          "Compromising a legitimate website frequently visited by target employees to infect their devices",
          "Poisoning office drinking fountains",
          "Sending bulk SMS messages at lunch time",
          "Hacking smart refrigerators"
        ],
        correct_index: 0,
        explanation: "Instead of emailing targets directly, attackers compromise industry news or vendor portals that targets naturally visit."
      },
      {
        id: 4,
        question: "What out-of-band step is mandatory before updating vendor banking routing numbers?",
        options: [
          "Contact the vendor via a previously verified official phone number (NOT numbers inside the email)",
          "Reply to the email asking for confirmation",
          "Update the bank details immediately",
          "Forward the request to external personal email"
        ],
        correct_index: 0,
        explanation: "Always use trusted contact numbers from past contracts—never numbers printed in the suspicious email body!"
      }
    ]
  },

  // ── 5. NETWORK SECURITY ──────────────────────────────────────────────────
  {
    id: 501,
    title: 'Public Wi-Fi & Evil Twin Access Points',
    category: 'Network Security',
    difficulty: 'Beginner',
    summary: 'Identify rogue hotspots, unencrypted traffic sniffing, and public network hazards.',
    time_estimate: '5 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is an 'Evil Twin' Wi-Fi access point?",
        options: [
          "A rogue Wi-Fi hotspot set up by attackers using the exact same SSID name as a legitimate hotel/airport network",
          "A dual-band 5GHz router",
          "A fast fiber optic connection",
          "A network backup drive"
        ],
        correct_index: 0,
        explanation: "Evil Twins trick devices into auto-connecting, allowing attackers to sniff unencrypted data and session tokens."
      },
      {
        id: 2,
        question: "What risk exists when browsing on open, unencrypted public Wi-Fi without a VPN?",
        options: [
          "Attackers on the same network can intercept unencrypted HTTP traffic and perform Man-in-the-Middle attacks",
          "Your laptop battery will drain in 5 minutes",
          "Your screen resolution automatically drops",
          "Your keyboard keys get remapped"
        ],
        correct_index: 0,
        explanation: "Open Wi-Fi broadcasts packets over the air unencrypted, exposing cleartext data to nearby packet sniffers."
      },
      {
        id: 3,
        question: "Which tool MUST employees use when accessing company resources over public Wi-Fi?",
        options: [
          "Enterprise Virtual Private Network (VPN)",
          "Incognito Browser Mode",
          "Bluetooth File Transfer",
          "Ad Blocker extensions"
        ],
        correct_index: 0,
        explanation: "VPNs create an encrypted tunnel connecting the remote endpoint directly to secure corporate networks."
      },
      {
        id: 4,
        question: "What does HTTPS (TLS) encryption protect between your browser and a web server?",
        options: [
          "Encrypts all data in transit preventing eavesdropping or alteration by network intermediaries",
          "Guarantees the website content is 100% free of phishing claims",
          "Deletes malware from your hard drive",
          "Prevents computer physical theft"
        ],
        correct_index: 0,
        explanation: "HTTPS encrypts communications in transit. Note: Phishing sites can also use HTTPS, so domain inspection is still required!"
      }
    ]
  },
  {
    id: 502,
    title: 'VPN Tunnels & Encrypted Traffic Inspection',
    category: 'Network Security',
    difficulty: 'Intermediate',
    summary: 'Understand Man-in-the-Middle (MitM) attacks, TLS certificate errors, and DNS security.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What happens during a Man-in-the-Middle (MitM) network attack?",
        options: [
          "An attacker secretly intercepts and relays communications between two parties who believe they are talking directly",
          "An attacker steals physical computer monitors",
          "A server runs out of RAM memory",
          "A network cable gets unplugged"
        ],
        correct_index: 0,
        explanation: "MitM positions the attacker between victim and server to eavesdrop or alter data in transit."
      },
      {
        id: 2,
        question: "If your web browser displays 'Your connection is not private / Invalid Security Certificate', what should you do?",
        options: [
          "Do NOT proceed. Notify IT Security immediately as it may indicate an active MitM interception attempt.",
          "Click 'Bypass Warning' and enter your passwords",
          "Disable your antivirus software",
          "Restart the router 5 times"
        ],
        correct_index: 0,
        explanation: "Certificate warnings mean the server identity cannot be verified, often caused by rogue interception proxies."
      },
      {
        id: 3,
        question: "Why should employees disable 'Auto-Join Public Networks' on work laptops and mobile phones?",
        options: [
          "Prevents devices from automatically connecting to malicious Evil Twin hotspots broadcasting common SSIDs",
          "Saves mobile screen brightness",
          "Increases hard drive space",
          "Removes browser bookmarks"
        ],
        correct_index: 0,
        explanation: "Disabling auto-join ensures your device only connects to trusted, authenticated Wi-Fi networks explicitly."
      },
      {
        id: 4,
        question: "What is Split-Tunneling in VPN configurations?",
        options: [
          "Directing work traffic through the encrypted VPN while letting personal internet traffic bypass the corporate tunnel",
          "Splitting a fiber optic cable into two",
          "Using two monitors simultaneously",
          "Compressing zip files"
        ],
        correct_index: 0,
        explanation: "Split tunneling optimizes bandwidth by routing only corporate destinations through the enterprise tunnel."
      }
    ]
  },

  // ── 6. CLOUD SECURITY ─────────────────────────────────────────────────────
  {
    id: 601,
    title: 'Cloud Storage Misconfiguration & S3 Bucket Leaks',
    category: 'Cloud Security',
    difficulty: 'Advanced',
    summary: 'Identify public bucket leaks, storage permission flags, and hardcoded repository keys.',
    time_estimate: '7 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is the leading root cause of major cloud data exposure incidents?",
        options: [
          "Misconfigured public access permissions on cloud storage buckets (AWS S3, Azure Blobs)",
          "Physical theft of cloud data center racks",
          "Solar flares affecting satellite links",
          "Over-encrypting database tables"
        ],
        correct_index: 0,
        explanation: "Accidentally leaving storage buckets set to 'Public Read' exposes sensitive databases to automated internet crawlers."
      },
      {
        id: 2,
        question: "What is the 'Principle of Least Privilege' in Cloud IAM?",
        options: [
          "Granting users and services only the minimum permissions required to perform their specific tasks",
          "Giving every employee full Administrator rights",
          "Sharing cloud root passwords among team members",
          "Disabling audit logging"
        ],
        correct_index: 0,
        explanation: "Least privilege ensures that if an account is compromised, the blast radius is strictly contained."
      },
      {
        id: 3,
        question: "Why is committing hardcoded AWS Access Keys or API secrets into public GitHub repositories dangerous?",
        options: [
          "Automated secret scanners scrape public repositories within seconds to launch rogue crypto-miners or steal data",
          "It slows down git commit speeds",
          "It causes formatting errors in README files",
          "It deletes the git history"
        ],
        correct_index: 0,
        explanation: "Botnets continuously scan public code repositories 24/7 for exposed API keys and credentials."
      },
      {
        id: 4,
        question: "What security tool continuously scans cloud infrastructure for misconfigurations and compliance drift?",
        options: [
          "Cloud Security Posture Management (CSPM)",
          "Local Notepad Editor",
          "Browser Bookmark Manager",
          "PDF Viewer"
        ],
        correct_index: 0,
        explanation: "CSPM tools automatically audit cloud environments to catch open buckets, weak IAM rules, and unencrypted databases."
      }
    ]
  },
  {
    id: 602,
    title: 'Cloud IAM Roles & API Key Secret Leak Defense',
    category: 'Cloud Security',
    difficulty: 'Advanced',
    summary: 'Enforce secret vault management, identity federations, and blast radius reduction.',
    time_estimate: '7 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "Why should cloud root account access keys be deleted and root accounts secured with MFA?",
        options: [
          "Root accounts possess unrestricted access to all resources and billing; daily work should use scoped IAM roles",
          "Root accounts run slower than standard accounts",
          "Root accounts cannot store files",
          "Root accounts cost extra fees per hour"
        ],
        correct_index: 0,
        explanation: "Root accounts have ultimate control. Securing them with hardware MFA prevents total cloud takeover."
      },
      {
        id: 2,
        question: "Where should application database credentials and API secret keys be stored?",
        options: [
          "In encrypted Secrets Managers (like AWS Secrets Manager or HashiCorp Vault) injected at runtime",
          "Hardcoded directly in application source code files",
          "In public Google Docs",
          "On desktop sticky notes"
        ],
        correct_index: 0,
        explanation: "Dedicated secrets managers store keys securely with automated rotation and access audit logs."
      },
      {
        id: 3,
        question: "What immediate automated response should trigger if a cloud access key is detected in a code repository?",
        options: [
          "Automatically revoke/disable the key immediately and notify the security operations team",
          "Send a reminder email next week",
          "Ignore if the repository is private",
          "Increase the cloud server size"
        ],
        correct_index: 0,
        explanation: "Immediate key revocation stops malicious bots before they can deploy rogue workloads."
      },
      {
        id: 4,
        question: "What is Cloud Identity Federation (SSO)?",
        options: [
          "Allowing users to authenticate using their central corporate identity provider (Okta/Entra ID) rather than local credentials",
          "Using the same simple password everywhere",
          "Merging multiple cloud vendors into one server",
          "Downloading all files to local USB"
        ],
        correct_index: 0,
        explanation: "Federated SSO enforces centralized MFA, instant offboarding, and unified conditional access policies."
      }
    ]
  },

  // ── 7. AI & MODERN CYBER THREATS ──────────────────────────────────────────
  {
    id: 701,
    title: 'AI Deepfake Audio/Video & Prompt Injection Checkup',
    category: 'AI & Modern Cyber Threats',
    difficulty: 'Advanced',
    summary: 'Defend against AI voice cloning, deepfake video executive calls, and LLM prompt injection payloads.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "How do threat actors utilize 3-second generative voice cloning models in social engineering?",
        options: [
          "They clone an executive's voice from public speeches/videos to place convincing phone calls demanding urgent wire transfers",
          "They make computer speakers sound louder",
          "They translate emails into Latin",
          "They compress MP3 files"
        ],
        correct_index: 0,
        explanation: "AI voice cloning requires minimal sample audio to generate realistic fraudulent phone authorizations."
      },
      {
        id: 2,
        question: "What is an 'Indirect Prompt Injection' attack against browser AI assistant extensions?",
        options: [
          "Hiding malicious text instructions on a webpage that trick the AI assistant into reading and leaking private session data",
          "Overloading the AI server with CPU requests",
          "Typing fast into ChatGPT",
          "Installing a new graphics driver"
        ],
        correct_index: 0,
        explanation: "Invisible HTML prompt injection strings instruct AI summarizers to execute malicious actions on behalf of attackers."
      },
      {
        id: 3,
        question: "What countermeasure effectively stops AI voice-cloning authorization scams?",
        options: [
          "Pre-agreed out-of-band verbal passphrase challenges and dual-person authorization protocols",
          "Trusting caller ID name displays",
          "Hanging up and ignoring all calls",
          "Using speakerphone mode"
        ],
        correct_index: 0,
        explanation: "Pre-shared secret passphrases that AI models cannot guess provide reliable verification during suspicious calls."
      },
      {
        id: 4,
        question: "What visual artifacts often indicate a live deepfake video stream during a video conference?",
        options: [
          "Unnatural eye blinking patterns, lip-sync mismatch, and edge blur around facial boundaries during turns",
          "High definition 4K resolution",
          "Green background wallpaper",
          "Clear audio quality"
        ],
        correct_index: 0,
        explanation: "Real-time video deepfakes struggle with rapid head turns, lighting alignment, and natural eye micro-movements."
      }
    ]
  },
  {
    id: 702,
    title: 'Generative AI Phishing & LLM Data Leakage',
    category: 'AI & Modern Cyber Threats',
    difficulty: 'Intermediate',
    summary: 'Spot AI-generated hyper-personalized lures and prevent sensitive company code leaks to public LLMs.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "How has Generative AI (LLMs) changed the quality of phishing emails?",
        options: [
          "It enables cybercriminals to eliminate spelling errors and scale hyper-personalized emails in any language instantly",
          "It makes phishing emails contain obvious grammatical mistakes",
          "It stops attackers from using links",
          "It forces emails to be sent as text files"
        ],
        correct_index: 0,
        explanation: "LLMs allow attackers to write perfectly fluent, context-specific phishing emails without historical typos."
      },
      {
        id: 2,
        question: "What risk occurs when employees paste proprietary source code or confidential financial reports into public AI chatbots?",
        options: [
          "The sensitive data may be stored, analyzed, or included in future model training data accessible to third parties",
          "It automatically deletes the files from local hard drives",
          "It turns off the corporate firewall",
          "It slows down internet download speeds"
        ],
        correct_index: 0,
        explanation: "Public AI services store prompt inputs. Proprietary corporate data must only be used in enterprise-governed AI instances."
      },
      {
        id: 3,
        question: "What is 'Shadow AI' in corporate IT environments?",
        options: [
          "Employees using unapproved third-party consumer AI tools without IT security oversight or data policy checks",
          "Dark mode user interfaces in AI applications",
          "AI servers running at night",
          "Robotic vacuum cleaners in the office"
        ],
        correct_index: 0,
        explanation: "Shadow AI exposes company intellectual property to untrusted third-party vendors without governance."
      },
      {
        id: 4,
        question: "Which corporate rule applies when using AI assistants for business documents?",
        options: [
          "Only use company-sanctioned Enterprise AI tools with data privacy guarantees; never input PII or trade secrets into public tools",
          "Paste all company secrets into any free AI website",
          "Share AI logins with external friends",
          "Disable antivirus when using AI"
        ],
        correct_index: 0,
        explanation: "Enterprise AI instances enforce strict non-retention policies, safeguarding corporate data."
      }
    ]
  },

  // ── 8. MOBILE SECURITY ────────────────────────────────────────────────────
  {
    id: 801,
    title: 'Smishing SMS & Mobile App Sideloading Checkup',
    category: 'Mobile Security',
    difficulty: 'Beginner',
    summary: 'Recognize SMS phishing lures, unapproved APK sideloading, and mobile permission abuse.',
    time_estimate: '5 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is 'Smishing'?",
        options: [
          "Phishing attacks delivered via SMS text messages to mobile smartphones",
          "Encrypting mobile SD cards",
          "Connecting to Bluetooth headphones",
          "Taking screenshot photos"
        ],
        correct_index: 0,
        explanation: "Smishing sends fake parcel tracking, bank security alerts, or tax refund texts containing malicious links."
      },
      {
        id: 2,
        question: "What is 'Sideloading' an app on a mobile device?",
        options: [
          "Installing applications from unofficial third-party websites or APK files outside official app stores",
          "Moving apps between home screen pages",
          "Charging the battery wirelessly",
          "Deleting unused photo albums"
        ],
        correct_index: 0,
        explanation: "Sideloading bypasses app store security reviews, frequently leading to infostealer malware infection."
      },
      {
        id: 3,
        question: "Why should users be cautious of apps requesting accessibility or microphone permissions?",
        options: [
          "Malicious apps can misuse permissions to log keystrokes, capture OTP codes, or record conversations silently",
          "Permissions increase mobile battery charging speed",
          "Permissions delete your contacts",
          "Permissions change your ringtone"
        ],
        correct_index: 0,
        explanation: "Over-privileged mobile permissions allow malicious apps to spy on SMS OTPs and user activities in the background."
      },
      {
        id: 4,
        question: "What should you do if your work-managed mobile phone is misplaced or stolen?",
        options: [
          "Report it to IT Security immediately so they can trigger a remote wipe of corporate data",
          "Wait 1 week to see if someone returns it",
          "Buy a new phone and tell no one",
          "Cancel your home Wi-Fi contract"
        ],
        correct_index: 0,
        explanation: "Prompt reporting allows administrators to send remote wipe signals to protect corporate emails and tokens."
      }
    ]
  },
  {
    id: 802,
    title: 'Mobile Device Management (MDM) & Kiosk Defense',
    category: 'Mobile Security',
    difficulty: 'Intermediate',
    summary: 'Understand MDM containerization, BYOD isolation, and Juice Jacking threats.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is Mobile Device Management (MDM)?",
        options: [
          "Software that allows IT administrators to monitor, secure, and enforce policies on mobile devices used for work",
          "A mobile phone repair shop",
          "A mobile game application",
          "A wireless tower antenna"
        ],
        correct_index: 0,
        explanation: "MDM enforces encryption, passcode rules, remote wipe capabilities, and secure app distribution."
      },
      {
        id: 2,
        question: "What is 'Juice Jacking' at public USB charging kiosks?",
        options: [
          "Attackers modify public USB charging ports to steal data or install malware while your phone charges",
          "Drinking juice while using a smartphone",
          "Overcharging a mobile battery",
          "Dropping a phone into liquid"
        ],
        correct_index: 0,
        explanation: "USB cables transmit both power and data. Malicious USB ports can initiate automated data extraction."
      },
      {
        id: 3,
        question: "How can you protect your phone from Juice Jacking when charging in public places?",
        options: [
          "Use a USB 'Data Blocker' adapter (USB condom) or charge directly from an AC wall outlet",
          "Turn off your Bluetooth",
          "Use airplane mode",
          "Lower the screen volume"
        ],
        correct_index: 0,
        explanation: "Data blocker adapters physically disconnect the data pins, allowing only power wires to connect."
      },
      {
        id: 4,
        question: "Why is rooting or jailbreaking a work mobile device a severe security risk?",
        options: [
          "It disables operating system sandboxing controls, allowing any malicious app full root access to all data",
          "It increases cellular signal strength",
          "It changes the phone color",
          "It speeds up camera focus"
        ],
        correct_index: 0,
        explanation: "Jailbreaking breaks application isolation security boundaries, exposing enterprise tokens to malware."
      }
    ]
  },

  // ── 9. WORKPLACE SECURITY ─────────────────────────────────────────────────
  {
    id: 901,
    title: 'Clean Desk Policy & Tailgating Prevention',
    category: 'Workplace Security',
    difficulty: 'Beginner',
    summary: 'Enforce physical access badges, workstation locking shortcuts, and paper document destruction.',
    time_estimate: '5 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is 'Tailgating' or 'Piggybacking' in physical workplace security?",
        options: [
          "An unauthorized person following an authorized employee through a badge-protected door without swiping their own badge",
          "Parking cars close together in the parking lot",
          "Printing large documents",
          "Working late past 5:00 PM"
        ],
        correct_index: 0,
        explanation: "Tailgating bypasses physical badge security controls. Always require every individual to scan their own badge."
      },
      {
        id: 2,
        question: "What keyboard shortcut locks your Windows workstation instantly when leaving your desk?",
        options: [
          "Windows Key + L (or Ctrl + Cmd + Q on macOS)",
          "Alt + F4",
          "Ctrl + Alt + Delete twice",
          "Spacebar + Enter"
        ],
        correct_index: 0,
        explanation: "Locking your screen takes 1 second and prevents unauthorized physical access to active sessions."
      },
      {
        id: 3,
        question: "What is the primary requirement of a 'Clean Desk Policy'?",
        options: [
          "Locking away sensitive paper files, sticky notes with passwords, and external hard drives when leaving your desk",
          "Wiping dust off your keyboard with a cloth every morning",
          "Keeping no coffee cups near your monitor",
          "Throwing away all office pens"
        ],
        correct_index: 0,
        explanation: "Clean desk policies stop visitors or unauthorized staff from viewing confidential client records or written credentials."
      },
      {
        id: 4,
        question: "How should printed confidential customer records be disposed of?",
        options: [
          "Depositing them into designated locked cross-cut shredding bins",
          "Tossing them into open recycling trash cans",
          "Leaving them on top of the printer",
          "Folding them into paper airplanes"
        ],
        correct_index: 0,
        explanation: "Confidential paper records must be shredded to prevent 'dumpster diving' data theft."
      }
    ]
  },
  {
    id: 902,
    title: 'Data Loss Prevention (DLP) & Incident Escalation',
    category: 'Workplace Security',
    difficulty: 'Intermediate',
    summary: 'Master emergency incident reporting timelines, DLP policy rules, and reporting misplaced hardware.',
    time_estimate: '6 mins',
    pass_score: 75,
    questions: [
      {
        id: 1,
        question: "What is the primary function of a Data Loss Prevention (DLP) software system?",
        options: [
          "Detects and blocks unauthorized transmission of sensitive data (PII, credit cards, source code) outside the company",
          "Deletes old computer wallpapers",
          "Automates email replies",
          "Increases internet speed"
        ],
        correct_index: 0,
        explanation: "DLP monitors data transfers across email, USB drives, and cloud uploads to block sensitive data exfiltration."
      },
      {
        id: 2,
        question: "Why is reporting a suspected security incident within 15 minutes critical for IT Security?",
        options: [
          "Rapid reporting allows SOC analysts to revoke stolen session tokens and isolate affected systems before breach escalation",
          "It qualifies you for a free coffee voucher",
          "It resets your password automatically",
          "It clears browser cache"
        ],
        correct_index: 0,
        explanation: "Dwell time matters! Quick reporting minimizes potential breach damage and contains threat actors immediately."
      },
      {
        id: 3,
        question: "What should you do if an external client's email account appears hacked and sends you an unexpected password-protected zip file?",
        options: [
          "Do NOT open the attachment. Contact the client via phone to confirm if they sent it and alert IT Security.",
          "Open the file immediately",
          "Forward the file to your home email address",
          "Extract the zip file to your Desktop"
        ],
        correct_index: 0,
        explanation: "Compromised vendor/client accounts are frequently used to send malicious payloads under the guise of trust."
      },
      {
        id: 4,
        question: "What is the correct protocol if you discover an unlabelled USB flash drive lying on an office hallway floor?",
        options: [
          "Turn it into IT Security or Facilities immediately. NEVER plug it into any company computer!",
          "Plug it into your laptop to see who owns it",
          "Take it home and use it for personal photos",
          "Throw it out the window"
        ],
        correct_index: 0,
        explanation: "Plugging in unknown USB drives is a high-risk action that can trigger automated malware autorun scripts."
      }
    ]
  }
];

export default function EmployeeQuizzesPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom Backend Quizzes
  const [customQuizzes, setCustomQuizzes] = useState<QuizModule[]>([]);

  // Admin Quiz Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [quizTitle, setQuizTitle] = useState<string>('');
  const [quizCategory, setQuizCategory] = useState<string>('Phishing Attacks');
  const [quizDifficulty, setQuizDifficulty] = useState<string>('Beginner');
  const [quizSummary, setQuizSummary] = useState<string>('');
  const [quizTime, setQuizTime] = useState<string>('5 mins');
  const [quizPassScore, setQuizPassScore] = useState<number>(75);
  const [quizIsPublic, setQuizIsPublic] = useState<boolean>(true);

  // Active Quiz Runner State
  const [activeModule, setActiveModule] = useState<QuizModule | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [hasPassed, setHasPassed] = useState<boolean>(false);

  // User Completion History Tracking
  const [completedModuleIds, setCompletedModuleIds] = useState<number[]>([101, 301, 501]);

  const fetchQuizzes = async () => {
    try {
      const data = await apiFetch('/training/quizzes');
      if (Array.isArray(data)) {
        setCustomQuizzes(data);
      }
    } catch (err) {
      console.error("Failed to load quizzes", err);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle || !quizSummary) {
      addToast({ title: 'Missing Information', description: 'Please provide a title and summary for the quiz module.', type: 'error' });
      return;
    }

    try {
      const res = await apiFetch('/training/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: quizTitle,
          category: quizCategory,
          difficulty: quizDifficulty,
          summary: quizSummary,
          time_estimate: quizTime,
          pass_score: quizPassScore,
          is_public: quizIsPublic,
          questions: [
            {
              id: 1,
              question: `What is the primary key defense regarding ${quizTitle}?`,
              options: [
                "Always verify via multi-factor authentication and report suspicious anomalies to IT Security.",
                "Bypass security warnings and input credentials directly.",
                "Share login passwords with unverified third parties.",
                "Disable endpoint protection."
              ],
              correct_index: 0,
              explanation: "Multi-factor verification and prompt reporting prevent security breaches."
            },
            {
              id: 2,
              question: `Which indicator suggests a threat in ${quizCategory}?`,
              options: [
                "Urgent pressure tactics demanding immediate credential validation",
                "Verified company domain SSL certificate",
                "Official IT department signature",
                "Standard secondary channel verification"
              ],
              correct_index: 0,
              explanation: "Urgency and pressure tactics are common indicators of social engineering."
            }
          ]
        })
      });

      if (res.ok) {
        addToast({
          title: 'Quiz Published!',
          description: `Successfully published ${quizIsPublic ? 'Public' : 'Organization Private'} Quiz "${quizTitle}".`,
          type: 'success'
        });
        setShowCreateModal(false);
        setQuizTitle('');
        setQuizSummary('');
        fetchQuizzes();
      }
    } catch {
      addToast({ title: 'Error', description: 'Could not create quiz module.', type: 'error' });
    }
  };

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
      case 'Workplace Security': return <Building2 size={16} className="text-emerald-400" />;
      default: return <HelpCircle size={16} className="text-slate-400" />;
    }
  };

  const allModules = [...customQuizzes, ...QUIZ_MODULES.filter(m => !customQuizzes.some(cq => cq.id === m.id))];

  // Filter Modules
  const filteredModules = allModules.filter((module) => {
    const matchesCategory = selectedCategory === 'All' || module.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || module.difficulty === selectedDifficulty;
    const matchesSearch = 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const handleStartQuiz = (module: QuizModule) => {
    setActiveModule(module);
    setCurrentQuestionIdx(0);
    setUserAnswers(new Array(module.questions.length).fill(-1));
    setQuizSubmitted(false);
    setFinalScore(0);
    setHasPassed(false);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (quizSubmitted) return;
    const updated = [...userAnswers];
    updated[currentQuestionIdx] = optionIdx;
    setUserAnswers(updated);
  };

  const handleSubmitQuiz = async () => {
    if (!activeModule) return;
    if (userAnswers.includes(-1)) {
      addToast({
        title: 'Incomplete Checkup',
        description: 'Please answer all questions before submitting your checkup.',
        type: 'warning'
      });
      return;
    }

    let correctCount = 0;
    activeModule.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_index) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / activeModule.questions.length) * 100);
    const passed = score >= activeModule.pass_score;

    setFinalScore(score);
    setHasPassed(passed);
    setQuizSubmitted(true);

    if (passed) {
      if (!completedModuleIds.includes(activeModule.id)) {
        setCompletedModuleIds(prev => [...prev, activeModule.id]);
      }
      addToast({
        title: 'Passed Security Assessment! 🎉',
        description: `Score: ${score}%. Compliance threshold reached (${activeModule.pass_score}% required).`,
        type: 'success'
      });

      try {
        await apiFetch(`/training/quiz/${activeModule.id}/submit`, {
          method: 'POST',
          body: JSON.stringify({ answers: userAnswers, score, passed })
        }).catch(() => null);
      } catch {
        // ignore
      }
    } else {
      addToast({
        title: 'Score Below Threshold',
        description: `Score: ${score}%. Review the answer key explanations and retake to pass.`,
        type: 'warning'
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* ── Active Quiz Runner View Modal ── */}
      {activeModule && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <Card className="w-full max-w-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto">
            
            {/* Quiz Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                  {activeModule.category}
                </span>
                <h2 className="text-lg font-bold text-white mt-1 leading-tight">{activeModule.title}</h2>
              </div>

              <Button
                variant="outline"
                onClick={() => setActiveModule(null)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                Close Checkup
              </Button>
            </div>

            {/* Results View */}
            {quizSubmitted ? (
              <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="text-center space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center border-2 border-slate-800 bg-slate-950">
                    {hasPassed ? (
                      <CheckCircle size={36} className="text-emerald-400" />
                    ) : (
                      <AlertTriangle size={36} className="text-amber-400" />
                    )}
                  </div>
                  <h3 className="text-3xl font-black text-white">{finalScore}% Score</h3>
                  <p className={`text-xs font-bold uppercase tracking-wider ${hasPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {hasPassed ? `Passed Compliance Threshold (${activeModule.pass_score}%)` : `Did Not Meet Pass Requirement (${activeModule.pass_score}%)`}
                  </p>
                </div>

                {/* Answer Key Explanations */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-400" /> Answer Key &amp; Defense Explanations
                  </h4>

                  {activeModule.questions.map((q, idx) => {
                    const isUserCorrect = userAnswers[idx] === q.correct_index;
                    return (
                      <div key={q.id} className={`p-4 rounded-xl border text-xs space-y-2 ${
                        isUserCorrect 
                          ? 'border-emerald-500/30 bg-emerald-500/5' 
                          : 'border-amber-500/30 bg-amber-500/5'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-white text-sm">
                            <span className="text-slate-400 mr-1.5">Q{idx + 1}.</span> {q.question}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isUserCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {isUserCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-300">
                          <p><strong>Your Answer:</strong> {userAnswers[idx] >= 0 ? q.options[userAnswers[idx]] : 'Unanswered'}</p>
                          {!isUserCorrect && (
                            <p className="text-emerald-400"><strong>Correct Answer:</strong> {q.options[q.correct_index]}</p>
                          )}
                        </div>

                        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 text-slate-300 leading-relaxed">
                          <strong className="text-emerald-400">Why this matters:</strong> {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                  <Button
                    onClick={() => handleStartQuiz(activeModule)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2.5 flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Retake Checkup
                  </Button>

                  {hasPassed && (
                    <Link to="/certificates">
                      <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 flex items-center gap-2">
                        <Award size={16} /> View Certificates
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* Question Taking View */
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Question Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>Question {currentQuestionIdx + 1} of {activeModule.questions.length}</span>
                    <span>{Math.round(((currentQuestionIdx + 1) / activeModule.questions.length) * 100)}% Completed</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIdx + 1) / activeModule.questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Card */}
                {activeModule.questions[currentQuestionIdx] && (
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-white leading-relaxed">
                      {activeModule.questions[currentQuestionIdx].question}
                    </h3>

                    <div className="space-y-2.5">
                      {activeModule.questions[currentQuestionIdx].options.map((opt, oIdx) => {
                        const isSelected = userAnswers[currentQuestionIdx] === oIdx;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectOption(oIdx)}
                            className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-md shadow-emerald-500/10 font-bold'
                                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                            }`}
                          >
                            <span className="leading-snug">{opt}</span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                              isSelected ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Navigation Buttons */}
                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                    variant="outline"
                    className="border-slate-800 text-slate-400 hover:text-white text-xs px-4 py-2"
                  >
                    Previous
                  </Button>

                  {currentQuestionIdx < activeModule.questions.length - 1 ? (
                    <Button
                      disabled={userAnswers[currentQuestionIdx] === -1}
                      onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2 flex items-center gap-1.5"
                    >
                      Next Question <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button
                      disabled={userAnswers.includes(-1)}
                      onClick={handleSubmitQuiz}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      Submit Checkup <CheckCircle size={16} />
                    </Button>
                  )}
                </div>

              </div>
            )}

          </Card>
        </div>
      )}

      {/* ── Top Header Banner ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
            <HelpCircle size={16} />
            <span>EXPERT KNOWLEDGE ASSESSMENTS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Security Quiz Center</h1>
          <p className="mt-1 text-sm text-slate-400">
            Test your threat detection muscle memory with specialized quiz modules across all 9 cybersecurity categories.
          </p>
        </div>

        {/* Global Progress Cards & Admin Create Button */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {isAdmin && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Plus size={16} /> Create Quiz Module
            </Button>
          )}

          <div className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Award size={20} />
            </div>
            <div>
              <div className="text-lg font-black text-white">{completedModuleIds.length} / {allModules.length}</div>
              <div className="text-[10px] text-slate-400 font-medium">Modules Mastered</div>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Shield size={20} />
            </div>
            <div>
              <div className="text-lg font-black text-white">75% Target</div>
              <div className="text-[10px] text-slate-400 font-medium">Pass Threshold</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin Create Quiz Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white">Create Custom Quiz Module</h2>
                <p className="text-xs text-slate-400 mt-1">Publish assessment quizzes for employees.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-slate-800 text-slate-400 hover:text-white text-xs px-3 py-1.5"
              >
                Cancel
              </Button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Quiz Title</label>
                <input
                  type="text"
                  placeholder="e.g. Quishing & QR Code Security Verification"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300">Category</label>
                  <select
                    value={quizCategory}
                    onChange={(e) => setQuizCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300">Difficulty Tier</label>
                  <select
                    value={quizDifficulty}
                    onChange={(e) => setQuizDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              {/* Visibility Scope */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Audience Visibility Scope</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    quizIsPublic 
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="quizScope"
                      checked={quizIsPublic}
                      onChange={() => setQuizIsPublic(true)}
                      className="hidden"
                    />
                    <span>🌐 Public (Visible to ALL employees across all organizations)</span>
                  </label>

                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    !quizIsPublic 
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="quizScope"
                      checked={!quizIsPublic}
                      onChange={() => setQuizIsPublic(false)}
                      className="hidden"
                    />
                    <span>🔒 Private (Visible ONLY to your organization employees)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Summary & Objectives</label>
                <textarea
                  rows={3}
                  placeholder="Summary of assessment topics covered..."
                  value={quizSummary}
                  onChange={(e) => setQuizSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white mt-1 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-emerald-600/20"
              >
                Publish Quiz Module
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── DUAL-COLUMN LAYOUT: CATEGORY SIDEBAR ON LEFT + QUIZ MODULES ON RIGHT ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* ── LEFT SIDEBAR: CATEGORY SELECTION MENU (Just like Learning Section) ── */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4 lg:sticky lg:top-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
            
            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-emerald-400" />
                <p className="text-xs font-black text-white uppercase tracking-wider">Quiz Categories</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {categories.length - 1} Topics
              </span>
            </div>

            {/* Category Navigation Items */}
            <div className="p-2 space-y-1 max-h-[620px] overflow-y-auto">
              {categories.map((cat) => {
                const count = cat === 'All'
                  ? QUIZ_MODULES.length
                  : QUIZ_MODULES.filter(m => m.category === cat).length;
                
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 border ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-white shadow-md'
                        : 'bg-slate-900/40 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    } group`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/90 text-slate-400 group-hover:bg-emerald-600/20 group-hover:text-emerald-400'
                    }`}>
                      {cat !== 'All' ? getCategoryIcon(cat) : <HelpCircle size={16} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate font-extrabold text-white text-xs leading-snug">{cat}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{count} {count === 1 ? 'Quiz Module' : 'Quiz Modules'}</p>
                    </div>

                    <ChevronRight size={14} className={`transition-transform ${
                      isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT MAIN CONTENT AREA ── */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          
          {/* Top Controls Bar: Search & Difficulty Tier Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search quiz modules or question keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

          </div>

          {/* Active Category Title & Count Sub-Header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              {getCategoryIcon(selectedCategory)}
              <span>{selectedCategory === 'All' ? 'All Cybersecurity Categories' : selectedCategory}</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredModules.length} {filteredModules.length === 1 ? 'Quiz Module' : 'Quiz Modules'}
            </span>
          </div>

          {/* Quiz Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredModules.map((module) => {
              const isCompleted = completedModuleIds.includes(module.id);
              return (
                <Card 
                  key={module.id} 
                  className={`border bg-slate-900/60 backdrop-blur-xl p-6 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all duration-200 group ${
                    isCompleted ? 'border-emerald-500/30' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Module Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-slate-950 text-emerald-400 border border-emerald-500/20 rounded-md">
                        {module.category}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          {module.difficulty}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded flex items-center gap-1">
                            <Check size={10} strokeWidth={3} /> Mastered
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Summary */}
                    <div>
                      <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                        {module.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {module.summary}
                      </p>
                    </div>
                  </div>

                  {/* Module Metadata & Launch Button */}
                  <div className="pt-4 border-t border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <HelpCircle size={14} className="text-emerald-400" /> {module.questions.length} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-blue-400" /> {module.time_estimate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield size={14} className="text-purple-400" /> {module.pass_score}% Pass
                      </span>
                    </div>

                    <Button
                      onClick={() => handleStartQuiz(module)}
                      className={`w-full font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        isCompleted 
                          ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      }`}
                    >
                      {isCompleted ? 'Retake Quiz Module' : 'Start Quiz Module'}
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredModules.length === 0 && (
            <Card className="border border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
              <HelpCircle size={40} className="mx-auto text-slate-600" />
              <h3 className="text-lg font-bold text-white">No Quiz Modules Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No quiz modules match your search query "{searchQuery}". Try selecting "All" categories on the left menu.
              </p>
              <Button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedDifficulty('All');
                  setSearchQuery('');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Reset Filters
              </Button>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
}
