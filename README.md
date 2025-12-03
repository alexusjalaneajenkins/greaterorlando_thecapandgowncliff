# The Cap and Gown Cliff Survey

A single-page web experience that captures stories for the Orlando “Support Cliff” study. The page is fully static (HTML/CSS/JS) and ships with:

- Path-based screener, journey mapping questions, and universal systemic questions.
- Gradient Lucide illustration tiles beside every question for quick visual anchors.
- Anonymous Firebase authentication and Firestore persistence for responses.
- Optional Gemini-powered narrative and systemic analysis after submission.

## Running locally

Open `index.html` in a browser that can reach your Firebase project and Gemini API key (the page expects runtime globals `__firebase_config`, `__initial_auth_token`, and `__app_id`).

If you need a quick server, from this folder run:

```sh
python -m http.server 8080
```

Then visit <http://localhost:8080>.
