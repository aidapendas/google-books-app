# Google Books Search App

A plain HTML/CSS/JavaScript app (no build step, no backend) that searches
the Google Books API.

## Running it

No install needed. Just open `index.html` directly in a browser, or serve
the folder locally, e.g.:

```
npx serve .
```

then visit the printed localhost URL.

(No backend is needed because the Google Books API allows CORS on GET
requests, so the browser can call it directly.)

## API key setup (recommended, keeps your key out of the public repo)

1. Copy `config.example.js` to a new file named `config.js` (same folder).
2. Open `config.js` and paste your key between the quotes: `const API_KEY = "your-key-here";`
3. `config.js` is listed in `.gitignore`, so it will never be committed —
   your key stays local, even though the app itself is public on GitHub.
4. Leaving `API_KEY` empty in `config.js` still works fine — the app just
   uses unauthenticated requests with a lower quota.

Note: this only keeps the key out of your *repository*. Once the app is
live and someone opens the browser's dev tools, the key is still visible
in the loaded JavaScript — that's unavoidable for a pure frontend app
without a backend proxy. The Google Cloud Console's key restrictions
(Application restrictions -> Websites, or None if you've chosen that)
control what the key can be *used for* if someone does copy it; keeping
it out of the repo controls who's likely to *find* it in the first
place. Both together are a reasonable balance for a demo app like this.

## Design decisions worth knowing

- **Pagination**: results are displayed 10 at a time. The Google Books API
  allows a maximum of 40 results per request, so the app fetches in
  batches of 40 and slices them into pages of 10 on the client. This
  keeps network calls low while still supporting "next page" as the user
  pages forward.
- **Most common author / earliest & latest publication dates**: these are
  computed across every result fetched *so far* in the current search
  (not the full total, which could be thousands of books) — the summary
  panel notes how many results the stats are based on. This is a
  deliberate tradeoff between accuracy and not hammering the API with
  dozens of requests per search.
- **Total results**: uses the API's own `totalItems` field, which
  reflects the full match count regardless of how many have been
  fetched.
- **Missing descriptions**: shown as "No description available for this
  book." instead of leaving a blank space.
- **Missing authors**: shown as "Unknown author" so the format string
  never breaks.
- **Response time**: measured client-side around the fetch call, shown
  in milliseconds, and updates to reflect the most recent API call.
- **Retry handling**: the Google Books API is intermittently flaky and
  occasionally returns `503 Service Unavailable` even on a valid,
  well-formed request (confirmed by testing the raw API URL directly,
  outside this app, and seeing the same intermittent failures). To
  handle this gracefully, the app retries a failed request up to twice
  more with a short backoff (1s, then 2s) before showing an error to
  the user. This is a deliberate resilience measure for a known
  upstream reliability issue, not a workaround for a bug in this app.

## Accessibility notes

- Expandable results use real `<button>` elements with `aria-expanded`
  and `aria-controls`, so they work with keyboard and screen readers,
  not just mouse clicks.
- The results summary and status messages use `aria-live="polite"` so
  screen reader users are notified of updates without needing to
  re-navigate.
- Focus states are visible (not just default browser outline removed).
- The search input has an associated `<label>`.

## Possible follow-ups if you have extra time

- Debounce/loading spinner during fetch.
- Cache previous search results so paging backward doesn't need a
  re-fetch (already true here — only forward paging beyond a fetched
  batch triggers a new request).
- Unit tests for `parsePublishedDate` and `getMostCommonAuthor`, since
  those are the most logic-heavy, easiest-to-get-wrong pieces.
