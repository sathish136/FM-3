import httpx
import json

async def get_country_news(country):
    OPENAI_API_KEY = "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"
    
    prompt = f"""Generate 8-10 realistic water treatment industry news articles for {country} in JSON format:
{{
  "articles": [
    {{
      "title": "News headline about water treatment in {country}",
      "source": "News source name",
      "date": "2024-01-15",
      "link": "#"
    }}
  ]
}}

Focus on: desalination plants, wastewater treatment, water purification technology, government policies, environmental regulations, industrial water treatment, municipal water systems. Use realistic dates from the last 3 months. Set all links to "#". Return ONLY valid JSON."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.8
                }
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as e:
        return {"articles": []}

async def get_competitor_analysis(country):
    OPENAI_API_KEY = "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"
    
    prompt = f"""Generate competitor analysis for water treatment companies operating in {country} in JSON format:
{{
  "competitors": [
    {{
      "name": "Real Company Name",
      "activities": "Recent business activities and projects",
      "technology": "Water treatment technologies they use",
      "campaign": "Marketing campaigns or business strategies",
      "website": "https://real-company-website.com",
      "ad_platform": "Primary advertising platform"
    }}
  ]
}}

Include 5-6 real water treatment companies that operate in {country}. Focus on major players like Veolia, Suez, Xylem, Evoqua, or local companies. Use real websites. Return ONLY valid JSON."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.7
                }
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as e:
        return {"competitors": []}

async def get_state_news(state, country="India"):
    OPENAI_API_KEY = "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"
    
    prompt = f"""Generate 6-8 realistic water treatment industry news articles for {state} state in {country} in JSON format:
{{
  "articles": [
    {{
      "title": "News headline about water treatment in {state}",
      "source": "Local/Regional news source",
      "date": "2024-01-15",
      "link": "#"
    }}
  ]
}}

Focus on: state government water policies, local water treatment projects, industrial water treatment in {state}, municipal water systems, environmental regulations specific to {state}. Use realistic dates from the last 2 months. Set all links to "#". Return ONLY valid JSON."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1500,
                    "temperature": 0.8
                }
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as e:
        return {"articles": []}

async def get_state_competitors(state, country="India"):
    OPENAI_API_KEY = "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"
    
    prompt = f"""Generate competitor analysis for water treatment companies operating in {state} state, {country} in JSON format:
{{
  "competitors": [
    {{
      "name": "Company Name",
      "activities": "Recent activities in {state}",
      "technology": "Water treatment technologies",
      "campaign": "Local marketing strategies",
      "website": "https://company-website.com",
      "ad_platform": "Primary advertising platform"
    }}
  ]
}}

Include 4-5 companies that operate in {state} - mix of national companies (like Veolia, Suez, Ion Exchange) and local/regional players. Focus on their activities in {state}. Return ONLY valid JSON."""

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
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as e:
        return {"competitors": []}