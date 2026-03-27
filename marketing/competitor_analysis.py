import httpx
import json

async def get_competitor_analysis(news_data):
    OPENAI_API_KEY = "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"
    
    news_summary = "\n".join([f"- {n['title']} ({n['source']}, {n['date']})" for n in news_data[:5]])
    
    prompt = f"""Based on these water treatment industry news articles:

{news_summary}

Generate a competitor analysis table with exactly 5 real water treatment companies in JSON format:
{{
  "competitors": [
    {{
      "name": "Company Name",
      "activities": "Recent activities",
      "technology": "Technology innovations",
      "campaign": "Current campaign summary",
      "website": "https://real-company-website.com",
      "ad_platform": "Google Ads / LinkedIn / Facebook"
    }}
  ]
}}

Use real company websites. For ad_platform, specify which platform they likely advertise on. Return ONLY valid JSON, no other text."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1500,
                    "temperature": 0.7
                }
            )
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return json.dumps({"competitors": []})
