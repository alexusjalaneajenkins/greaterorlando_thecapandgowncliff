# The Cap and Gown Cliff Survey

A single-page web experience that captures stories for the Orlando “Support Cliff” study. The page is fully static (HTML/CSS/JS) and ships with:

- Path-based screener, journey mapping questions, and universal systemic questions.
- Gradient Lucide illustration tiles beside every question for quick visual anchors.
- Anonymous Firebase authentication and Firestore persistence for responses (when configured).
- Optional Gemini-powered narrative and systemic analysis after submission.

## Files
- `index.html` – page shell that wires fonts, icons, and mounts the app.
- `styles.css` – shared styling for the layout, tiles, and buttons.
- `main.js` – all survey logic, Firebase wiring, and AI helpers.

## Running locally

Open `index.html` in a browser that can reach your Firebase project and Gemini API key. The page looks for the following runtime globals:

- `__firebase_config` – JSON stringified Firebase config. If omitted, the UI still loads but submissions are disabled and a warning banner appears.
- `__app_id` – optional Firestore app namespace (defaults to `default-app-id`).
- `__initial_auth_token` – optional existing auth token; if omitted, anonymous auth is attempted.
- `__gemini_api_key` – optional Gemini API key for post-submit analysis.

If you need a quick server, from this folder run:

```sh
python -m http.server 8080
```

Then visit <http://localhost:8080>.
