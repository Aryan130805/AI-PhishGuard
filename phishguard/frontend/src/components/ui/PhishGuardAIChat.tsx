import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, Bot, User, Trash2, Shield, Zap, Check, Copy, RefreshCw, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { apiFetch } from '../../lib/api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export default function PhishGuardAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOrQuizActive, setIsModalOrQuizActive] = useState(false);
  
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkState = () => {
      const modalElement = document.querySelector('[data-active-modal="true"]');
      const isQuizPath = window.location.pathname.startsWith('/quiz');
      setIsModalOrQuizActive(!!modalElement || isQuizPath);
    };

    checkState();
    const observer = new MutationObserver(checkState);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    // Also check on interval to capture SPA navigation transitions
    const interval = setInterval(checkState, 300);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello ${user?.email?.split('@')[0] || 'there'}! I'm **PhishGuard AI**, your cybersecurity & threat response assistant powered by Gemini. How can I assist you with email safety, risk management, or phishing detection today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const quickPrompts = [
    "🔍 How to spot a phishing email?",
    "🚨 I clicked a suspicious link. What now?",
    "💡 Best practices for strong passwords",
    "🛡️ What is Spear Phishing?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isTyping]);

  const generateGeminiResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('ransomware')) {
      return `### ☣️ What is Ransomware?
Ransomware is malicious software that encrypts an organization's files or locks systems until a ransom is paid.

**Key Facts & Prevention:**
- **Infection Vectors:** Phishing attachments (.iso, .zip), unpatched remote desktop/VPN services, and malicious links.
- **Double Extortion:** Attackers steal sensitive data before encrypting it, threatening to leak it publicly.
- **Action Plan:** Never pay ransoms. Disconnect affected machines from Wi-Fi/LAN immediately and notify the IT Security team.

💡 *Recommended Module:* Check out **Ransomware Prevention & Incident Response** in the Learning Center!`;
    }

    if (q.includes('zero-day') || q.includes('zero day') || q.includes('cve')) {
      return `### 🚨 What is a Zero-Day Vulnerability?
A **Zero-Day** is a software flaw unknown to the vendor, leaving 0 days for a patch before threat actors begin exploiting it.

**How to Stay Protected:**
1. **Enable Automatic Updates:** Install vendor security patches immediately upon release.
2. **Endpoint Protection (EDR):** Behavioral monitoring catches zero-day exploit activity before damage occurs.
3. **Check Threat Intelligence:** Visit the **Latest Cyber Threats** tab in PhishGuard to monitor active CVE advisories.`;
    }

    if (q.includes('ai') || q.includes('deepfake') || q.includes('prompt injection')) {
      return `### 🤖 AI Threats & Deepfake Voice/Video Scams:
Generative AI allows cybercriminals to scale hyper-realistic attacks with zero spelling errors and cloned executive voices.

**Key AI Threat Vectors:**
- **Deepfake Audio:** Cloned 3-second voice samples used to authorize emergency wire transfers.
- **Prompt Injection:** Hiding instructions inside web pages/documents to trick browser AI summarizer extensions.
- **Synthetic Profiles:** Fake AI-generated avatars used for corporate social engineering.

💡 *Recommended Module:* Check out **AI Phishing, Deepfakes & Prompt Injection** in the Learning Center!`;
    }

    if (q.includes('mfa') || q.includes('2fa') || q.includes('passkey') || q.includes('authenticator')) {
      return `### 🔑 How MFA & Passkeys Protect Your Account:
Multi-Factor Authentication adds an extra layer of defense beyond passwords. Even if an attacker steals your password, they cannot gain access without your secondary factor.

**Best Authentication Ranking:**
1. **Passkeys & FIDO2 YubiKeys (Best):** Cryptographically bound to domain origins — immune to phishing!
2. **Authenticator Apps (TOTP):** Generates 6-digit codes locally on your device.
3. **SMS OTP (Avoid if possible):** Vulnerable to SIM-swapping attacks.

💡 *Recommended Module:* Check out **Passkeys, MFA & Credential Stuffing Defense**!`;
    }

    if (q.includes('latest') || q.includes('emerging') || q.includes('threats')) {
      return `### 📢 Latest Cyber Threats (Live Intelligence):
1. **CVE-2026-8910 (Critical):** Browser AI extension prompt injection vulnerability leaking session cookies.
2. **Deepfake CFO Voice Scams (High):** AI voice cloning targeting corporate wire transfer approvals.
3. **Quishing Wave (High):** Malicious QR codes embedded in fake PDF invoices.

Navigate to **Latest Cyber Threats** in the Adaptive Learning Hub to view full advisories and mitigations!`;
    }

    if (q.includes('spot') || q.includes('identify') || q.includes('detect') || q.includes('look like')) {
      return `### 🔍 How to Identify Phishing Emails:
1. **Unusual Sender Address**: Check for subtle domain misspellings (e.g. \`supp0rt@paypa1.com\`).
2. **Urgent or Threatening Tone**: Phrases like *"Immediate Action Required"* or *"Account Suspended in 24 Hours"*.
3. **Suspicious Attachments or Links**: Hover over links before clicking to check the destination URL.
4. **Generic Greetings**: E.g., *"Dear Customer"* instead of your actual name.
5. **Requests for Sensitive Info**: Legitimate organizations never request passwords or PINs over email.`;
    }

    if (q.includes('clicked') || q.includes('link') || q.includes('hacked') || q.includes('compromised') || q.includes('what now')) {
      return `### 🚨 Emergency Response Checklist:
1. **Disconnect IMMEDIATELY**: Turn off Wi-Fi or unplug your ethernet cable to prevent malware spreading.
2. **Report to IT/Security**: Forward the suspicious email to your Security Operations team.
3. **Change Credentials**: Immediately change passwords for affected accounts from a clean device.
4. **Enable 2FA / MFA**: Ensure Multi-Factor Authentication is enabled on all vital accounts.
5. **Run Endpoint Security Scan**: Perform a full anti-virus & malware scan on your machine.`;
    }

    if (q.includes('password') || q.includes('passphrase') || q.includes('credential')) {
      return `### 💡 Password & Authentication Best Practices:
- **Use Passphrases**: Combine 4+ random words (e.g. \`Purple-Elephant-Bikes-Fast!\`).
- **Never Reuse Passwords**: Unique passwords for every single service.
- **Use a Password Manager**: Store complex 16+ character passwords securely.
- **Enable Multi-Factor Authentication (MFA)**: App-based TOTP or hardware security keys (FIDO2) are best.`;
    }

    if (q.includes('spear') || q.includes('whaling') || q.includes('social engineering')) {
      return `### 🛡️ What is Spear Phishing?
Spear Phishing is a **highly targeted attack** where cybercriminals research specific individuals or roles within an organization.
- **Attacker Tactics**: They use personal information from LinkedIn, company websites, or public records to craft convincing messages.
- **Whaling**: A subset of spear phishing targeting C-level executives for wire fraud or credential theft.
- **Defense**: Always verify out-of-band request changes (e.g. wire transfers or vendor bank updates) via phone call.`;
    }

    if (q.includes('phishguard') || q.includes('score') || q.includes('risk') || q.includes('training')) {
      return `### 🛡️ PhishGuard Platform Overview:
- **Risk Score**: Calculated based on your phishing test click rates, quiz completions, and report times.
- **Simulations**: Periodic safe phishing tests designed to build muscle memory against real-world threats.
- **AI Coach**: Automated adaptive learning tailored to your security profile.
- **Reporting**: Always click the PhishGuard Report button when you notice suspicious emails in your inbox!`;
    }

    return `### 🤖 PhishGuard AI (Gemini Security Intelligence)
Thank you for your question regarding **"${query}"**.

Here are essential recommendations:
1. **Verify Sender Origin**: Always examine full email headers and domain names carefully.
2. **Never Reveal Credentials**: Legitimate IT personnel will never request your master password or OTP code.
3. **Report Threats Promptly**: Use the PhishGuard plugin or notify your internal Security Team immediately upon detecting anomalies.

*Would you like to analyze a specific email header, review password policies, or run a simulated quiz?*`;
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    try {
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text.trim(),
          history: historyPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.reply || generateGeminiResponse(text),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const fallbackText = generateGeminiResponse(text);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Chat API request error:', err);
      const fallbackText = generateGeminiResponse(text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'ai',
        text: `Chat reset. How can **PhishGuard AI** assist your security workflow now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  if (isModalOrQuizActive) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none border border-blue-400/30 group"
          title="PhishGuard AI Assistant"
        >
          {isOpen ? (
            <X size={24} className="transition-transform duration-200 rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sparkles size={26} className="fill-blue-200/20 stroke-white group-hover:rotate-12 transition-transform duration-200" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] sm:w-[400px] h-[520px] max-h-[82vh] rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-3">
              <div className="relative p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
                <Sparkles size={18} className="fill-blue-200/20" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight">
                  PhishGuard AI
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 uppercase tracking-wider">
                    Gemini
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Cybersecurity Assistant • Online</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Clear Chat History"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20 mt-0.5">
                    <Sparkles size={14} />
                  </div>
                )}

                <div className={`group relative max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none font-medium shadow-md shadow-blue-500/10'
                    : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700/60'
                }`}>
                  <div className="whitespace-pre-wrap">
                    {msg.text.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={idx} className="font-bold text-sm text-blue-400 mt-1 mb-1">{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('- ') || line.match(/^\d+\./)) {
                        return <div key={idx} className="ml-1 my-0.5 text-slate-300">{line}</div>;
                      }
                      return <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>;
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1.5 text-[9px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 hover:text-blue-400 transition-opacity"
                        title="Copy Response"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
                  <Sparkles size={14} />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (visible when few messages) */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 text-[10px] font-medium border border-slate-700 transition-colors shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask PhishGuard AI anything about security..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all focus:outline-none shrink-0"
                title="Send Message"
              >
                <Send size={15} />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500 px-1">
              <span>PhishGuard AI v2.4 • Gemini Security Model</span>
              <span>Press Enter ↵</span>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
