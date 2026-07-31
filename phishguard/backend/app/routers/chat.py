import httpx
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Chatbot"])

class ChatMessage(BaseModel):
    sender: str  # "user" or "ai"
    text: str

class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or input message")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Previous chat message history")

class ChatResponse(BaseModel):
    reply: str
    provider: str
    status: str = "success"

CHAT_SYSTEM_INSTRUCTION = """You are PhishGuard AI, an elite cybersecurity, email threat analysis, and phishing defense assistant powered by Google Gemini.
Your job is to provide accurate, helpful, clear, and actionable advice to employees and security admins.

Key Guidance Areas:
1. Identifying phishing emails, spoofed sender domains, urgencies, and malicious links.
2. Emergency checklist if an employee clicks a suspicious link or leaks credentials.
3. Best security practices: Passkeys, MFA (Authenticator apps/hardware keys), strong passphrases, zero-trust.
4. Explaining threats like Ransomware, Zero-Day CVEs, Spear Phishing, AI Deepfakes, and Quishing.

Formatting Rules:
- Output clean GitHub-Flavored Markdown.
- Use bold text, headers (`### `), bullet points (`- `), or numbered lists for readability.
- Maintain a friendly, professional, and reassuring security expert tone.
"""

def generate_fallback_response(query: str) -> str:
    q = query.lower()
    if 'ransomware' in q:
        return (
            "### ☣️ What is Ransomware?\n"
            "Ransomware is malicious software that encrypts files and systems until a ransom is demanded.\n\n"
            "**Key Facts & Prevention:**\n"
            "- **Infection Vectors:** Phishing emails with `.zip`/`.iso` attachments, compromised VPN credentials, and malicious links.\n"
            "- **Action Plan:** Do not pay ransoms. Immediately disconnect affected systems from Wi-Fi/LAN and alert IT Security.\n\n"
            "💡 *Tip:* Check out the **Ransomware Prevention** training module in PhishGuard!"
        )
    if any(k in q for k in ['zero-day', 'zero day', 'cve']):
        return (
            "### 🚨 What is a Zero-Day Vulnerability?\n"
            "A **Zero-Day** (CVE) is a software vulnerability that is exploited by attackers before the vendor releases a patch.\n\n"
            "**Protection Steps:**\n"
            "1. **Automatic Updates:** Enable auto-patching for operating systems and browsers.\n"
            "2. **Endpoint Defense (EDR):** Use behavioral monitoring to catch unusual exploit patterns.\n"
            "3. **Threat Intel:** Review the **Latest Cyber Threats** tab in PhishGuard for recent advisories."
        )
    if any(k in q for k in ['ai', 'deepfake', 'prompt injection']):
        return (
            "### 🤖 AI Threats & Deepfake Defense:\n"
            "Generative AI enables hyper-targeted phishing emails with perfect grammar and cloned voice/video assets.\n\n"
            "- **Deepfake Audio:** Voice cloning used to trick staff into urgent wire transfers.\n"
            "- **Prompt Injection:** Malicious instructions hidden in documents to trick browser AI summarizers.\n\n"
            "💡 *Tip:* Always verify out-of-band requests via phone call with the sender!"
        )
    if any(k in q for k in ['mfa', '2fa', 'passkey', 'authenticator']):
        return (
            "### 🔑 MFA & Passkey Security:\n"
            "Multi-Factor Authentication stops up to 99% of bulk automated credential attacks.\n\n"
            "1. **Passkeys & FIDO2 (Best):** Phishing-resistant cryptographically bound hardware security.\n"
            "2. **Authenticator Apps (TOTP):** Generates 6-digit codes on your phone.\n"
            "3. **SMS OTP (Avoid):** Vulnerable to SIM swap attacks.\n"
        )
    if any(k in q for k in ['spot', 'identify', 'detect', 'phish']):
        return (
            "### 🔍 How to Spot Phishing Emails:\n"
            "1. **Check Sender Address:** Look closely at the domain after `@` (e.g. `support@paypa1-verify.com`).\n"
            "2. **Urgency/Fear:** Messages insisting on 'Immediate Action Required within 2 Hours'.\n"
            "3. **Hover Before Clicking:** Check the destination link URL before clicking.\n"
            "4. **Generic Salutations:** 'Dear Customer' instead of your official name.\n"
            "5. **PhishGuard Report Button:** Click the PhishGuard extension button to submit suspicious emails!"
        )
    if any(k in q for k in ['clicked', 'link', 'hacked', 'compromised']):
        return (
            "### 🚨 Emergency Action Checklist:\n"
            "1. **Disconnect Network:** Unplug ethernet or disable Wi-Fi immediately.\n"
            "2. **Report Incident:** Alert your IT/SOC team right away.\n"
            "3. **Change Passwords:** Update credentials from a verified uncompromised device.\n"
            "4. **Enable MFA:** Ensure Multi-Factor Authentication is active on all accounts.\n"
            "5. **Run Security Scan:** Execute a complete antivirus scan on your system."
        )

    return (
        f"### 🤖 PhishGuard Security Assistant\n"
        f"Regarding your query **\"{query}\"**:\n\n"
        "1. **Verify Sender Details:** Always check email header domains and signatures.\n"
        "2. **Protect Credentials:** Never share passwords or 2FA codes with anyone.\n"
        "3. **Report Anomalies:** Use the PhishGuard tool to report suspicious messages.\n\n"
        "*To enable real-time Gemini AI live generation, add your `GEMINI_API_KEY` in the `phishguard/backend/.env` file.*"
    )

@router.post("/chat", response_model=ChatResponse)
async def chat_with_gemini(req: ChatRequest):
    api_key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL or "gemini-2.0-flash"

    # If Gemini API Key is missing, return smart fallback answer
    if not api_key:
        logger.info("GEMINI_API_KEY is not configured. Returning local intelligence fallback.")
        reply_text = generate_fallback_response(req.message)
        return ChatResponse(
            reply=reply_text,
            provider="fallback (GEMINI_API_KEY missing)",
            status="success"
        )

    # Prepare Gemini API request contents with systemInstruction and conversation turns
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    contents = []

    # Map previous conversation history
    for msg in (req.history or [])[-6:]:  # include up to last 6 turns for context
        role = "user" if msg.sender == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.text}]
        })

    # Append current message
    contents.append({
        "role": "user",
        "parts": [{"text": req.message}]
    })

    payload = {
        "systemInstruction": {
            "parts": [{"text": CHAT_SYSTEM_INSTRUCTION}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.95,
            "maxOutputTokens": 1024
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload)
            
            if res.status_code != 200:
                logger.error(f"Gemini API error ({res.status_code}): {res.text}")
                reply_text = generate_fallback_response(req.message)
                return ChatResponse(
                    reply=f"{reply_text}\n\n*(Note: Gemini API returned status {res.status_code})*",
                    provider="fallback",
                    status="partial_error"
                )
            
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    ai_text = parts[0]["text"]
                    return ChatResponse(
                        reply=ai_text,
                        provider=f"google-gemini ({model})",
                        status="success"
                    )

            # If candidates empty
            reply_text = generate_fallback_response(req.message)
            return ChatResponse(reply=reply_text, provider="fallback", status="success")

    except Exception as e:
        logger.error(f"Exception calling Gemini API: {e}")
        reply_text = generate_fallback_response(req.message)
        return ChatResponse(
            reply=reply_text,
            provider="fallback",
            status="error"
        )
