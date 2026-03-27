from flask import Flask, render_template_string
import requests

app = Flask(__name__)

API_KEY = "2ceaee911fc192bd2b4efa0cca03221d"


def extract_company(title):

    words = title.split()

    for word in words:
        if word.istitle() and len(word) > 3:
            return word

    return "Unknown"


def get_competitor_news():

    url = f"https://gnews.io/api/v4/search?q=water treatment OR desalination OR wastewater OR water technology&lang=en&max=15&apikey={API_KEY}"

    response = requests.get(url)
    data = response.json()

    results = []

    if "articles" in data:

        for article in data["articles"]:

            title = article["title"]
            source = article["source"]["name"]

            # DATE ONLY (remove time)
            date = article["publishedAt"].split("T")[0]

            link = article["url"]

            competitor = extract_company(title)

            results.append({
                "competitor": competitor,
                "activity": title,
                "source": source,
                "date": date,
                "link": link
            })

    return results


@app.route("/")
def dashboard():

    news = get_competitor_news()

    html = """

    <html>

    <head>

    <title>Global Water Industry Competitor Dashboard</title>

    <style>

    body{
    font-family:Arial;
    background:#f4f6f9;
    padding:40px;
    }

    h2{
    text-align:center;
    }

    table{
    width:100%;
    border-collapse:collapse;
    background:white;
    }

    th,td{
    padding:12px;
    border:1px solid #ddd;
    }

    th{
    background:#1f4e79;
    color:white;
    }

    tr:hover{
    background:#f2f2f2;
    }

    a{
    color:#1f4e79;
    text-decoration:none;
    }

    </style>

    </head>

    <body>

    <h2>🌍 Global Water Treatment Competitor Activity</h2>

    <table>

    <tr>

    <th>Competitor</th>
    <th>Activity</th>
    <th>Source</th>
    <th>Date</th>
    <th>Link</th>

    </tr>

    {% for n in news %}

    <tr>

    <td>{{n.competitor}}</td>
    <td>{{n.activity}}</td>
    <td>{{n.source}}</td>
    <td>{{n.date}}</td>
    <td><a href="{{n.link}}" target="_blank">View</a></td>

    </tr>

    {% endfor %}

    </table>

    </body>

    </html>

    """

    return render_template_string(html, news=news)


if __name__ == "__main__":
    app.run(debug=True)