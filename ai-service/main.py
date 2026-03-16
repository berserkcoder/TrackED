from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="LearnVault AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")


# ---------- Request Models ----------

class TopicExtractionRequest(BaseModel):
    text: str
    containerId: str = ""


class TestGenerationRequest(BaseModel):
    text: str
    topic: str | None = None
    numQuestions: int = 10


# ---------- Helper: Parse JSON safely ----------

def extract_json(text: str):
    """Try to extract JSON array from a possibly markdown-wrapped response."""
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Strip markdown code fences
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # Try to find raw JSON array or object
    match = re.search(r"(\[[\s\S]*\]|\{[\s\S]*\})", text)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    return None


# ---------- Endpoints ----------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract-topics")
async def extract_topics(req: TopicExtractionRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")

    prompt = f"""You are an expert educator. Analyze the following study material and extract a clean list of key topics.

Rules:
- Return ONLY a JSON array of topic title strings.
- Each topic should be concise (2-6 words).
- Extract 5 to 15 topics maximum.
- No explanations, no markdown, just the JSON array.

Example output: ["Introduction to Neural Networks", "Supervised Learning", "Gradient Descent"]

Study material:
\"\"\"
{req.text[:12000]}
\"\"\"
"""

    response = model.generate_content(prompt)
    result = extract_json(response.text)

    if not isinstance(result, list):
        raise HTTPException(status_code=502, detail="AI returned invalid format for topics")

    return {"topics": [str(t) for t in result if t]}


@app.post("/generate-test")
async def generate_test(req: TestGenerationRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")

    topic_clause = f'Focus specifically on the topic: "{req.topic}".' if req.topic else "Cover a broad range of topics from the material."
    num = min(max(req.numQuestions, 3), 20)  # clamp between 3 and 20

    prompt = f"""You are an expert quiz creator. Generate exactly {num} multiple-choice questions based on the study material below.

{topic_clause}

Rules:
- Return ONLY a valid JSON array.
- Each element must have:
  - "questionText": the question string
  - "options": array of exactly 4 string options
  - "correctAnswer": integer index (0-3) of the correct option
  - "explanation": brief explanation of why the answer is correct
- No markdown, no code fences, just the raw JSON array.

Study material:
\"\"\"
{req.text[:15000]}
\"\"\"
"""

    response = model.generate_content(prompt)
    result = extract_json(response.text)

    if not isinstance(result, list):
        raise HTTPException(status_code=502, detail="AI returned invalid format for questions")

    # Validate and clean each question
    valid_questions = []
    for q in result:
        if (
            isinstance(q, dict)
            and q.get("questionText")
            and isinstance(q.get("options"), list)
            and len(q["options"]) == 4
            and isinstance(q.get("correctAnswer"), int)
            and 0 <= q["correctAnswer"] <= 3
        ):
            valid_questions.append({
                "questionText": q["questionText"],
                "options": [str(o) for o in q["options"]],
                "correctAnswer": q["correctAnswer"],
                "explanation": q.get("explanation", ""),
            })

    if not valid_questions:
        raise HTTPException(status_code=502, detail="No valid questions generated")

    return {"questions": valid_questions}
