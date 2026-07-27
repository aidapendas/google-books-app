# Google Books Search

A simple, accessible web app for searching books using the [Google Books
API](https://developers.google.com/books). No installation, build step,
or backend required.

## Features

- Search any book title, author, or topic
- Results shown 10 at a time, with easy pagination
- Click any result to expand and read its description
- At-a-glance search summary: total results, most common author, earliest
  and most recent publication dates, and API response time
- Built with accessibility in mind: keyboard-friendly, screen-reader
  labels, and visible focus states throughout

## Getting Started

### 1. Clone the repository

```
git clone https://github.com/aidapendas/google-books-app.git
cd google-books-app
```

### 2. Add your API key (optional)

The app works out of the box without any setup — it makes unauthenticated
requests to the Google Books API. If you'd like a higher request quota:

1. Get a free API key from the [Google Cloud
   Console](https://console.cloud.google.com/) (enable the "Books API"
   for your project, then create an API key under Credentials).
2. Open `config.js` and paste your key in:
   ```js
   const API_KEY = "your-key-here";
   ```
3. For safety, restrict the key in Google Cloud Console to the specific
   website(s) you're running this from (Application restrictions →
   Websites).

### 3. Run it

The simplest option — just open `index.html` directly in your browser.

Or, to serve it locally (recommended if you're also developing/testing
it):

```
npx serve .
```

Then open the URL it prints (usually `http://localhost:3000`).

## Project Structure

```
google-books-app/
├── index.html          # App markup
├── style.css            # Styling
├── app.js                # Search logic, API calls, rendering
├── config.js             # Your API key goes here
└── README.md
```

## How It Works

Searches are sent directly to the Google Books API from your browser (no
server needed, since the API supports cross-origin requests). Results are
fetched in batches and displayed 10 per page. The summary panel at the
top aggregates stats across the results fetched so far in your current
search.

## Known Limitations

- The Google Books API is occasionally slow or briefly unavailable
  (a known upstream quirk, not specific to this app). The app
  automatically retries a failed request a couple of times before
  showing an error — if you do see an error, simply searching again
  usually resolves it.
- Aggregate stats (most common author, date range) reflect the results
  fetched so far for a search, not every possible match, since very
  broad searches can return thousands of results.

## License

Feel free to use, modify, or build on this project.

## References

Documentation used while building and verifying this project:

- [Google Books API — Using the API](https://developers.google.com/books/docs/v1/using) — query parameters (`q`, `startIndex`, `maxResults`, `key`) and general usage.
- [Google Books API — Volume resource reference](https://developers.google.com/books/docs/v1/reference/volumes) — the exact response schema this app relies on (`volumeInfo.title`, `.authors`, `.publishedDate`, `.description`, and confirmation that descriptions may contain simple HTML formatting).
- [MDN — Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) — the core mechanism used for all API calls.
- [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) — why this app can call the API directly from the browser with no backend.
- [MDN — ARIA: aria-expanded](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded) — used for the expandable result pattern.
- [DOMPurify](https://github.com/cure53/DOMPurify) — sanitises book descriptions before rendering as HTML, since the API docs confirm descriptions may contain formatting tags, and any content from an external API should be treated as untrusted before insertion into the DOM.
