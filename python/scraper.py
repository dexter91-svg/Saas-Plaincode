import sys
import json

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    # If dependencies are missing, return a clear error message on stderr
    sys.stderr.write(
        "Missing dependencies. Please install with: pip install requests beautifulsoup4\n"
    )
    sys.exit(1)


def scrape(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; EcommerceSupportBot/1.0; +https://example.com)"
    }
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    title = soup.title.string.strip() if soup.title and soup.title.string else ""

    description = ""
    desc_tag = soup.find("meta", attrs={"name": "description"})
    if desc_tag and desc_tag.get("content"):
        description = desc_tag["content"].strip()

    texts = []
    products = []

    # headings
    for tag_name in ["h1", "h2", "h3", "h4"]:
        for tag in soup.find_all(tag_name):
            text = tag.get_text(separator=" ", strip=True)
            if text:
                texts.append(f"{tag_name.upper()}: {text}")

    # paragraphs
    for p in soup.find_all("p"):
        text = p.get_text(separator=" ", strip=True)
        if text:
            texts.append(text)

    # list items (often contain feature / service bullets)
    for li in soup.find_all("li"):
        text = li.get_text(separator=" ", strip=True)
        if text:
            texts.append(f"• {text}")

    # table cells (sometimes used for specs / pricing)
    for cell in soup.find_all(["td", "th"]):
        text = cell.get_text(separator=" ", strip=True)
        if text:
            texts.append(text)

    # very simple product extraction heuristics for demo purposes
    # try common patterns: schema.org Product, product title classes, data attributes
    candidate_texts = set()

    # schema.org Product names
    for el in soup.select('[itemtype*="Product"] [itemprop="name"]'):
        t = el.get_text(separator=" ", strip=True)
        if t:
            candidate_texts.add(t)

    # common ecommerce classes
    for cls in [".product-title", ".product-name", ".product-card__title"]:
        for el in soup.select(cls):
            t = el.get_text(separator=" ", strip=True)
            if t:
                candidate_texts.add(t)

    # fall back to h3/h4 headings if nothing else
    if not candidate_texts:
        for tag_name in ["h3", "h4"]:
            for tag in soup.find_all(tag_name):
                t = tag.get_text(separator=" ", strip=True)
                if t:
                    candidate_texts.add(t)

    for name in list(candidate_texts)[:10]:
        products.append({"name": name})

    content = "\n\n".join(texts)

    return {
        "title": title,
        "description": description,
        "content": content,
        "products": products,
    }


def main():
    if len(sys.argv) < 2:
        # Write UTF-8 bytes explicitly so Windows console encoding never breaks
        sys.stdout.buffer.write(
            json.dumps({"title": "", "description": "", "content": ""}, ensure_ascii=False).encode(
                "utf-8"
            )
        )
        sys.stdout.buffer.flush()
        return

    url = sys.argv[1]
    try:
        data = scrape(url)
        # Some sites contain emoji / characters not supported by the default Windows
        # code page. Always emit UTF-8 bytes directly to avoid charmap errors.
        sys.stdout.buffer.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
        sys.stdout.buffer.flush()
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"Scraper exception: {exc}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()

