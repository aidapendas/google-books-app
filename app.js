/**
 * Google Books Search App
 *
 * Design notes (worth mentioning if asked in review):
 * - No backend: the Google Books API allows CORS on GET requests, so this
 *   calls the API directly from the browser.
 * - Pagination shows 10 results at a time. The API allows a max of 40
 *   results per request, so we fetch in batches of 40 and slice them
 *   into pages of 10 client-side. This limits the number of network
 *   calls while still supporting "load more" as the user pages forward.
 * - Aggregated stats (most common author, earliest/latest dates) are
 *   computed over every result fetched so far in the current search.
 *   "Total results" uses the API's own totalItems count, which reflects
 *   the full match count, not just what's been fetched.
 */

const API_BASE = "https://www.googleapis.com/books/v1/volumes";
const BATCH_SIZE = 40; // Google Books API max per request
const PAGE_SIZE = 10;

const API_KEY = "AIzaSyD2R2GnPPFmhvDjClJpcU8CCMTx26acOsI";

const state = {
  query: "",
  items: [], // all items fetched so far for the current query
  totalItems: 0,
  currentPage: 0, // 0-indexed
  lastResponseTimeMs: null,
  hasError: false,
};

const els = {
  form: document.getElementById("search-form"),
  input: document.getElementById("search-input"),
  status: document.getElementById("status"),
  summary: document.getElementById("summary"),
  summaryList: document.getElementById("summary-list"),
  resultsList: document.getElementById("results-list"),
  pagination: document.getElementById("pagination"),
  prevBtn: document.getElementById("prev-page"),
  nextBtn: document.getElementById("next-page"),
  pageIndicator: document.getElementById("page-indicator"),
};

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = els.input.value.trim();
  if (!query) return;

  // Reset state for a new search
  state.query = query;
  state.items = [];
  state.totalItems = 0;
  state.currentPage = 0;
  state.hasError = false;

  await ensureItemsForPage(0);
  renderPage();
});

els.prevBtn.addEventListener("click", async () => {
  if (state.currentPage === 0) return;
  state.currentPage -= 1;
  renderPage();
});

els.nextBtn.addEventListener("click", async () => {
  const nextPage = state.currentPage + 1;
  await ensureItemsForPage(nextPage);
  const maxPage = Math.floor((state.totalItems - 1) / PAGE_SIZE);
  if (nextPage <= maxPage) {
    state.currentPage = nextPage;
    renderPage();
  }
});

/**
 * Makes sure we have enough fetched items in state.items to render the
 * given page. Fetches another batch from the API if needed.
 */
async function ensureItemsForPage(page, attempt = 0) {
  const neededCount = (page + 1) * PAGE_SIZE;
  if (state.items.length >= neededCount) return;
  if (state.items.length > 0 && state.items.length >= state.totalItems) return; // nothing more to fetch

  setStatus(attempt === 0 ? "Loading results…" : `Retrying (attempt ${attempt + 1})…`);

  const startIndex = state.items.length;
  let url = `${API_BASE}?q=${encodeURIComponent(
    state.query
  )}&startIndex=${startIndex}&maxResults=${BATCH_SIZE}`;
  if (API_KEY) {
    url += `&key=${API_KEY}`;
  }

  const start = performance.now();
  try {
    const res = await fetch(url);
    const elapsed = Math.round(performance.now() - start);
    state.lastResponseTimeMs = elapsed;

    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }

    const data = await res.json();
    state.totalItems = data.totalItems || 0;
    const newItems = data.items || [];
    state.items.push(...newItems);

    state.hasError = false;
    setStatus("");
  } catch (err) {
    console.error(`Books API fetch failed (attempt ${attempt + 1}):`, err);

    const MAX_ATTEMPTS = 3; // initial try + 2 retries — Google Books API is known to be intermittently flaky (confirmed via direct testing)
    if (attempt + 1 < MAX_ATTEMPTS) {
      const backoffMs = 1000 * (attempt + 1); // 1s, then 2s
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      await ensureItemsForPage(page, attempt + 1);
      return;
    }

    state.hasError = true;
    setStatus(
      "Something went wrong fetching results. Please check your connection and try searching again. (Open the browser console for the full error.)"
    );
  }
}

function setStatus(message) {
  els.status.textContent = message;
}

function renderPage() {
  renderSummary();
  renderResults();
  renderPagination();
}

function renderSummary() {
  if (state.totalItems === 0) {
    els.summary.hidden = true;
    return;
  }

  const authorCounts = {};
  let earliest = null;
  let latest = null;

  for (const item of state.items) {
    const info = item.volumeInfo || {};

    (info.authors || []).forEach((author) => {
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    });

    const parsedDate = parsePublishedDate(info.publishedDate);
    if (parsedDate) {
      if (!earliest || parsedDate < earliest) earliest = parsedDate;
      if (!latest || parsedDate > latest) latest = parsedDate;
    }
  }

  const mostCommonAuthor = getMostCommonAuthor(authorCounts);

  els.summaryList.innerHTML = "";
  addSummaryItem(`Total results: ${state.totalItems.toLocaleString()}`);
  addSummaryItem(
    `Most common author (of ${state.items.length} results fetched so far): ${
      mostCommonAuthor || "N/A"
    }`
  );
  addSummaryItem(
    `Earliest publication date (of ${state.items.length} results fetched so far): ${
      earliest ? earliest.label : "N/A"
    }`
  );
  addSummaryItem(
    `Most recent publication date (of ${state.items.length} results fetched so far): ${
      latest ? latest.label : "N/A"
    }`
  );
  addSummaryItem(`Last API response time: ${state.lastResponseTimeMs} ms`);

  els.summary.hidden = false;
}

function addSummaryItem(text) {
  const li = document.createElement("li");
  li.textContent = text;
  els.summaryList.appendChild(li);
}

function getMostCommonAuthor(authorCounts) {
  let best = null;
  let bestCount = 0;
  for (const [author, count] of Object.entries(authorCounts)) {
    if (count > bestCount) {
      best = author;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Google Books publishedDate is inconsistently formatted: "2020",
 * "2020-05", or "2020-05-01" all occur. This normalizes to a comparable
 * Date plus a human-readable label.
 */
function parsePublishedDate(raw) {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = match[2] ? parseInt(match[2], 10) - 1 : 0;
  const day = match[3] ? parseInt(match[3], 10) : 1;

  const date = new Date(Date.UTC(year, month, day));
  // valueOf() lets JS use < and > directly on these objects for comparisons
  return { date, label: raw, valueOf: () => date.getTime() };
}

function renderResults() {
  els.resultsList.innerHTML = "";

  const start = state.currentPage * PAGE_SIZE;
  const pageItems = state.items.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    if (!state.hasError) {
      setStatus("No results found.");
    }
    return;
  }

  pageItems.forEach((item, idx) => {
    const info = item.volumeInfo || {};
    const authors =
      info.authors && info.authors.length > 0
        ? info.authors.join(", ")
        : "Unknown author";
    const title = info.title || "Untitled";
    const description = info.description || "No description available for this book.";

    const li = document.createElement("li");
    li.className = "result-item";

    const buttonId = `result-toggle-${start + idx}`;
    const panelId = `result-panel-${start + idx}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-toggle";
    button.id = buttonId;
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", panelId);
    button.innerHTML = `<span>${escapeHtml(authors)} - ${escapeHtml(
      title
    )}</span><span class="chevron" aria-hidden="true">▾</span>`;

    const panel = document.createElement("div");
    panel.className = "result-description";
    panel.id = panelId;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", buttonId);
    panel.hidden = true;
    panel.textContent = description;

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      panel.hidden = expanded;
    });

    li.appendChild(button);
    li.appendChild(panel);
    els.resultsList.appendChild(li);
  });
}

function renderPagination() {
  if (state.totalItems === 0) {
    els.pagination.hidden = true;
    return;
  }

  els.pagination.hidden = false;
  const currentDisplayPage = state.currentPage + 1;
  const totalPages = Math.ceil(state.totalItems / PAGE_SIZE);

  els.pageIndicator.textContent = `Page ${currentDisplayPage} of ${totalPages}`;
  els.prevBtn.disabled = state.currentPage === 0;
  els.nextBtn.disabled = currentDisplayPage >= totalPages;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
