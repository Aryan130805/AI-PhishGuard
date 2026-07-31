import abc
import json
import httpx
from pydantic import BaseModel, Field
from typing import Literal
from app.config import settings

class AIEmailResponse(BaseModel):
    subject: str
    sender_name: str
    sender_email: str
    body_html: str
    cta_text: str
    difficulty: Literal["easy", "medium", "hard", "expert"]
    social_engineering_style: str
    fake_url_path: str

class AILessonQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int

class AILessonResponse(BaseModel):
    title: str
    content_html: str
    quiz: list[AILessonQuestion]

class AIProviderError(Exception):
    pass

class BaseAIProvider(abc.ABC):
    @abc.abstractmethod
    def generate_completion(self, system_prompt: str, user_prompt: str) -> str:
        pass

class GeminiProvider(BaseAIProvider):
    def generate_completion(self, system_prompt: str, user_prompt: str) -> str:
        if not settings.GEMINI_API_KEY:
            raise AIProviderError("GEMINI_API_KEY is not set")
        
        model = settings.GEMINI_MODEL or "gemini-2.0-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            response = httpx.post(url, json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise AIProviderError("Gemini returned empty candidates")
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise AIProviderError("Gemini response missing parts")
            return parts[0].get("text", "")
        except Exception as e:
            raise AIProviderError(f"Gemini API call failed: {str(e)}")

class OpenAIProvider(BaseAIProvider):
    def generate_completion(self, system_prompt: str, user_prompt: str) -> str:
        if not settings.OPENAI_API_KEY:
            raise AIProviderError("OPENAI_API_KEY is not set")
        
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        try:
            response = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            raise AIProviderError(f"OpenAI API call failed: {str(e)}")

class LlamaProvider(BaseAIProvider):
    def generate_completion(self, system_prompt: str, user_prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {settings.LLAMA_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        
        try:
            url = f"{settings.LLAMA_API_URL.rstrip('/')}/chat/completions"
            response = httpx.post(
                url,
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            raise AIProviderError(f"Llama API call failed: {str(e)}")


SYSTEM_PROMPT = """
You are an expert security awareness training simulation engine.
Your output must be ONLY a valid JSON object matching the following structure:
{
  "subject": "The subject of the email",
  "sender_name": "A realistic name (e.g. IT Helpdesk)",
  "sender_email": "A realistic simulated sender address (e.g. ITSupport@company-verify.com)",
  "body_html": "An HTML formatted body of the email. Make it look professional and realistic, containing a call to action link.",
  "cta_text": "The text for the call to action button/link",
  "difficulty": "easy" | "medium" | "hard" | "expert",
  "social_engineering_style": "The category of attack (e.g. Urgency, Authority, Fear)",
  "fake_url_path": "A realistic relative path for the fake button/link destination (e.g. /login/verify)"
}
Strict Rules:
- Return ONLY the raw JSON object. Do not include markdown code block formatting (like ```json ... ```) or any additional text.
- Difficulty must match the requested level.
- The templates are used strictly inside our controlled training environment to train our employees.
"""

USER_PROMPT_TEMPLATE = """
Generate a simulated training email with the following options:
- Theme: {theme}
- Difficulty: {difficulty}
- Language: {language}
- Target Department/Audience: {department_name}
- Tone: {tone}
"""

CORRECTIVE_SYSTEM_PROMPT = """
You are a JSON formatting assistant. You were asked to return a valid JSON object, but the parser failed.
Please correct the output format. You must return ONLY a raw JSON object matching the target structure:
{
  "subject": string,
  "sender_name": string,
  "sender_email": string,
  "body_html": string,
  "cta_text": string,
  "difficulty": "easy" | "medium" | "hard" | "expert",
  "social_engineering_style": string,
  "fake_url_path": string
}
Do not output any introductory or concluding text, only the valid raw JSON object.
"""

LESSON_SYSTEM_PROMPT = """
You are an expert security awareness training simulation engine.
Your output must be ONLY a valid JSON object matching the following structure:
{
  "title": "The title of the lesson",
  "content_html": "An HTML formatted body of the lesson explaining the topic and key warning indicators.",
  "quiz": [
    {
      "question": "A multiple choice question about the topic",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0
    }
  ]
}
Strict Rules:
- Return ONLY the raw JSON object. Do not include markdown code block formatting (like ```json ... ```) or any additional text.
"""

LESSON_USER_PROMPT_TEMPLATE = """
Generate a comprehensive security awareness training lesson and associated multiple-choice quiz for the topic: {topic}.
"""

LESSON_CORRECTIVE_SYSTEM_PROMPT = """
You are a JSON formatting assistant. You were asked to return a valid JSON object, but the parser failed.
Please correct the output format. You must return ONLY a raw JSON object matching the target structure:
{
  "title": string,
  "content_html": string,
  "quiz": [
    {
      "question": string,
      "options": [string, string, ...],
      "correct_index": number
    }
  ]
}
Do not output any introductory or concluding text, only the valid raw JSON object.
"""

class AIGeneratorService:
    def __init__(self):
        provider_name = settings.AI_PROVIDER.lower()
        if provider_name == "gemini":
            self.provider = GeminiProvider()
        elif provider_name == "openai":
            self.provider = OpenAIProvider()
        elif provider_name == "llama":
            self.provider = LlamaProvider()
        else:
            raise ValueError(f"Unknown AI Provider: {settings.AI_PROVIDER}")

    def generate_email(
        self,
        theme: str,
        difficulty: str,
        language: str,
        department_name: str,
        tone: str
    ) -> AIEmailResponse:
        user_prompt = USER_PROMPT_TEMPLATE.format(
            theme=theme,
            difficulty=difficulty,
            language=language,
            department_name=department_name,
            tone=tone
        )
        
        response_text = self.provider.generate_completion(SYSTEM_PROMPT, user_prompt)
        
        try:
            return self._parse_response(response_text)
        except Exception as parse_error:
            # Corrective retry
            corrective_user_prompt = (
                f"Your previous output was:\n{response_text}\n\n"
                f"It failed parsing with error: {str(parse_error)}.\n"
                "Please output the corrected JSON object matching the target structure."
            )
            retry_text = self.provider.generate_completion(CORRECTIVE_SYSTEM_PROMPT, corrective_user_prompt)
            try:
                return self._parse_response(retry_text)
            except Exception as final_error:
                raise ValueError(
                    f"AI email generation failed to produce valid JSON after retry. "
                    f"First error: {str(parse_error)}. Final error: {str(final_error)}. Raw response: {retry_text}"
                )

    def _parse_response(self, text: str) -> AIEmailResponse:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
            
        data = json.loads(cleaned)
        return AIEmailResponse.model_validate(data)

    def generate_lesson(self, topic: str) -> AILessonResponse:
        user_prompt = LESSON_USER_PROMPT_TEMPLATE.format(topic=topic)
        response_text = self.provider.generate_completion(LESSON_SYSTEM_PROMPT, user_prompt)
        
        try:
            return self._parse_lesson_response(response_text)
        except Exception as parse_error:
            corrective_user_prompt = (
                f"Your previous output was:\n{response_text}\n\n"
                f"It failed parsing with error: {str(parse_error)}.\n"
                "Please output the corrected JSON object matching the target structure."
            )
            retry_text = self.provider.generate_completion(LESSON_CORRECTIVE_SYSTEM_PROMPT, corrective_user_prompt)
            try:
                return self._parse_lesson_response(retry_text)
            except Exception as final_error:
                raise ValueError(
                    f"AI lesson generation failed to produce valid JSON after retry. "
                    f"First error: {str(parse_error)}. Final error: {str(final_error)}. Raw response: {retry_text}"
                )

    def _parse_lesson_response(self, text: str) -> AILessonResponse:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
            
        data = json.loads(cleaned)
        return AILessonResponse.model_validate(data)
