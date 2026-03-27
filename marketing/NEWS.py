from flask import Flask, render_template
import requests

app = Flask(__name__)

API_KEY = "2ceaee911fc192bd2b4efa0cca03221d"

@app.route("/")
def dashboard():

    # Fixed query (important)
    query = "water+treatment+plant+OR+desalination+OR+wastewater+treatment"

    url = f"https://gnews.io/api/v4/search?q={query}&lang=en&max=10&apikey={API_KEY}"

    response = requests.get(url)
    data = response.json()

    articles = data.get("articles", [])

    news = []

    for article in articles:

        title = article.get("title")
        source = article.get("source", {}).get("name")
        date = article.get("publishedAt")
        link = article.get("url")

        news.append({
            "country": "Global",
            "title": title,
            "source": source,
            "date": date,
            "link": link
        })

    return render_template("dashboard.html", news=news)


if __name__ == "__main__":
    app.run(debug=True)