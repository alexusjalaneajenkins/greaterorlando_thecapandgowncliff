// Version 2.2 - Handle Gemini host validation + stable model alias
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js';
import { addDoc, collection, getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';

const firebaseConfigStr = typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : null;
let firebaseConfig = null;
let firebaseReady = false;
try {
  firebaseConfig = firebaseConfigStr ? JSON.parse(firebaseConfigStr) : null;
  firebaseReady = !!firebaseConfig;
} catch (err) {
  console.error('Failed to parse firebase config', err);
  firebaseConfig = null;
  firebaseReady = false;
}

const app = firebaseReady ? initializeApp(firebaseConfig) : null;
const auth = firebaseReady ? getAuth(app) : null;
const db = firebaseReady ? getFirestore(app) : null;
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
const apiKey = typeof window.__gemini_api_key !== 'undefined' ? window.__gemini_api_key : '';
const MODEL_NAME = 'gemini-1.5-flash-latest';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
const GEMINI_HEADERS = {
  'Content-Type': 'application/json',
  'x-goog-api-key': apiKey,
};

const ILLUSTRATIONS = {
  balance: { icon: 'scale', label: 'Wages vs. rent', accent: '#005b99', backdrop: 'linear-gradient(135deg,#ebf5ff, #ffffff 40%, #dcebff)' },
  diploma_dust: { icon: 'scroll-text', label: 'Degree payoff', accent: '#7c3aed', backdrop: 'linear-gradient(135deg,#f3e8ff, #ffffff 40%, #e9d5ff)' },
  cliff: { icon: 'mountain', label: 'Support cliff', accent: '#e85d04', backdrop: 'linear-gradient(135deg,#fff3e0, #ffffff 40%, #ffe0b2)' },
  breakdown: { icon: 'car', label: 'Unexpected bill', accent: '#b91c1c', backdrop: 'linear-gradient(135deg,#fef2f2, #ffffff 40%, #fee2e2)' },
  house_choice: { icon: 'home', label: 'Housing tradeoff', accent: '#0f766e', backdrop: 'linear-gradient(135deg,#ecfdf3, #ffffff 40%, #d1fae5)' },
  wall: { icon: 'shield', label: 'Institutional barriers', accent: '#334155', backdrop: 'linear-gradient(135deg,#f8fafc, #ffffff 40%, #e2e8f0)' },
  battery: { icon: 'battery-charging', label: 'Energy drain', accent: '#2563eb', backdrop: 'linear-gradient(135deg,#e0ecff, #ffffff 40%, #c7d9ff)' },
  storm: { icon: 'cloud-lightning', label: 'Job market anxiety', accent: '#0ea5e9', backdrop: 'linear-gradient(135deg,#e0f7ff, #ffffff 40%, #bae6fd)' },
  torn_net: { icon: 'shield-off', label: 'No safety net', accent: '#c026d3', backdrop: 'linear-gradient(135deg,#f5e1ff, #ffffff 40%, #e9d5ff)' },
  backpack: { icon: 'backpack', label: 'Family load', accent: '#065f46', backdrop: 'linear-gradient(135deg,#ecfdf3, #ffffff 40%, #d1fae5)' },
  hurdle: { icon: 'fence', label: 'Access blocked', accent: '#ea580c', backdrop: 'linear-gradient(135deg,#fff7ed, #ffffff 40%, #ffead5)' },
  heavy_heart: { icon: 'heart-crack', label: 'Guilt + duty', accent: '#be123c', backdrop: 'linear-gradient(135deg,#fef2f2, #ffffff 40%, #ffe4e6)' },
  couch: { icon: 'sofa', label: 'Shared housing', accent: '#1e40af', backdrop: 'linear-gradient(135deg,#e0ecff, #ffffff 40%, #dbeafe)' },
  piggy_bank: { icon: 'piggy-bank', label: 'Emergency cash', accent: '#15803d', backdrop: 'linear-gradient(135deg,#ecfdf3, #ffffff 40%, #dcfce7)' },
  wand: { icon: 'sparkle', label: 'System change', accent: '#7c3aed', backdrop: 'linear-gradient(135deg,#f3e8ff, #ffffff 40%, #ede9fe)' },
};

const PATHS = {
  graduate: {
    title: 'The Graduate',
    icon: 'graduation-cap',
    questions: [
      {
        id: 'paycheck_vs_living',
        text: 'You put in the work to get the degree. How does your current paycheck compare to the cost of living (rent/food) in Orlando?',
        placeholder: 'e.g., I spend 60% of my income on rent...',
        illustration: 'balance',
      },
      {
        id: 'degree_utility',
        text: "Do you feel your degree is helping you right now, or does it feel like a 'sunk cost'? Why?",
        placeholder: "e.g., I'm not even using my major...",
        illustration: 'diploma_dust',
      },
      {
        id: 'support_cliff',
        text: 'When you graduated, did your support system (financial aid, housing, campus resources) cut off before you landed on your feet? What happened?',
        placeholder: 'e.g., My dorm closed and I had nowhere to go...',
        illustration: 'cliff',
      },
    ],
  },
  dropout: {
    title: 'The Non-Completer',
    icon: 'alert-circle',
    questions: [
      {
        id: 'breaking_point',
        text: "Was there a specific moment or bill that made you realize, 'I can't do school right now'?",
        placeholder: 'e.g., My car broke down and I had to choose work...',
        illustration: 'breakdown',
      },
      {
        id: 'trade_off',
        text: 'If you had received free housing or a guaranteed stipend while in school, would you have been able to stay?',
        placeholder: 'e.g., Yes, housing was the main issue...',
        illustration: 'house_choice',
      },
      {
        id: 'system_understanding',
        text: 'Do you feel the university system understands what it’s like to deal with your situation, or did you feel punished?',
        placeholder: "e.g., Professors didn't care that I worked...",
        illustration: 'wall',
      },
    ],
  },
  student: {
    title: 'The Working Student',
    icon: 'book-open',
    questions: [
      {
        id: 'sacrifice',
        text: 'You are working while studying. What is the biggest thing you are sacrificing right now to make that work?',
        placeholder: 'e.g., Sleep, grades, mental health...',
        illustration: 'battery',
      },
      {
        id: 'market_fear',
        text: 'Looking at the job market right now, are you confident that graduating will solve your financial stress?',
        placeholder: "e.g., I'm worried I'll still be broke...",
        illustration: 'storm',
      },
      {
        id: 'safety_net',
        text: 'If you lost your job tomorrow, would you be able to stay in school? Who would you call for help?',
        placeholder: "e.g., I'd have to drop out...",
        illustration: 'torn_net',
      },
    ],
  },
  caretaker: {
    title: 'The Caretaker / Barrier',
    icon: 'hand-heart',
    questions: [
      {
        id: 'bandwidth',
        text: "How much of your 'bandwidth' (money or time) goes to helping your family instead of focusing on your own career?",
        placeholder: "e.g., I pay my mom's rent...",
        illustration: 'backpack',
      },
      {
        id: 'hidden_barrier',
        text: "Has a job or school ever rejected you or made things harder because they didn't want to accommodate your needs?",
        placeholder: "e.g., I couldn't make the schedule work...",
        illustration: 'hurdle',
      },
      {
        id: 'guilt',
        text: 'Do you feel guilty focusing on your own education when your family is struggling?',
        placeholder: 'e.g., I feel selfish sometimes...',
        illustration: 'heavy_heart',
      },
    ],
  },
};

const UNIVERSAL_QUESTIONS = [
  {
    id: 'housing_security',
    text: "Do you currently have a lease in your own name, or are you 'doubling up' / staying with others to make rent?",
    placeholder: "e.g., Sleeping on a friend's couch...",
    illustration: 'couch',
  },
  {
    id: 'emergency_gap',
    text: 'If you had an emergency expense of $500 today, how would you pay for it?',
    placeholder: "e.g., Credit card, or I couldn't...",
    illustration: 'piggy_bank',
  },
  {
    id: 'magic_wand',
    text: 'If the system could change one thing to help people like us—not a scholarship, but actual life support—what would it be?',
    placeholder: 'e.g., Guaranteed housing for 6 months post-grad...',
    illustration: 'wand',
  },
];

const state = {
  step: 'intro',
  selectedPath: null,
  answers: {},
  user: null,
  aiNarrative: null,
  aiAnalysis: null,
  isGenerating: false,
};

const appRoot = document.getElementById('app');
const warningRoot = document.getElementById('banner');

const signIn = async () => {
  if (!firebaseReady) return;
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.error('Auth failed', e);
  }
};

if (firebaseReady) {
  onAuthStateChanged(auth, (user) => {
    state.user = user;
  });
  signIn();
} else if (warningRoot) {
  warningRoot.innerHTML = `
    <div class="banner">
      <i data-lucide="alert-triangle"></i>
      Firebase configuration is missing. The UI will load, but submissions are disabled.
    </div>
  `;
  lucide.createIcons();
}

const tileHtml = (meta) => `
  <div class="tile-illustration" style="background:${meta.backdrop}">
    <div class="icon-plate" aria-hidden>
      <i data-lucide="${meta.icon}" style="width:26px;height:26px;color:${meta.accent}"></i>
    </div>
    <div class="tile-caption">${meta.label}</div>
  </div>
`;

const questionCard = (q) => {
  const meta = ILLUSTRATIONS[q.illustration];
  const value = state.answers[q.id] || '';
  return `
    <div class="tile">
      ${tileHtml(meta)}
      <div class="tile-body">
        <label for="${q.id}">${q.text}</label>
        <textarea id="${q.id}" name="${q.id}" placeholder="${q.placeholder}">${value}</textarea>
      </div>
    </div>
  `;
};

const renderIntro = () => {
  appRoot.innerHTML = `
    <div class="center">
            <div style="width:96px;height:96px;border-radius:999px;background:#e5f2fb;border:1px solid #d5e7f5;display:grid;place-items:center;margin:0 auto 12px;">
              <i data-lucide="graduation-cap" style="width:46px;height:46px;color:var(--blue);"></i>
            </div>
      <h1>The Cap and Gown Cliff</h1>
      <div class="badge-line"><span style="width:10px;height:10px;border-radius:999px;background:var(--blue);"></span> Orlando Case Study</div>
      <h2 style="color: var(--gray-700); margin-top: 12px;">Defining the Structural Failure Leading from Higher Education to Homelessness.</h2>
      <div class="intro-card">
        For many, graduation marks not a beginning, but a precipice. We are documenting the <strong>"Support Cliff"</strong> in Central Florida—where rising rents, low wages, and the sudden loss of university support create a direct path to housing instability.
        <br /><br />
        This is not about individual failure. It is about a <strong>structural breakdown</strong>. We need your story to prove it.
      </div>
      <div style="margin-top: 22px;">
        <button class="primary" id="start-btn">Share Your Experience <i data-lucide="chevron-right" style="width:18px;height:18px;"></i></button>
        <div style="margin-top:8px;color:var(--gray-400);font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Anonymous • Research Data Only</div>
      </div>
    </div>
  `;
  document.getElementById('start-btn')?.addEventListener('click', () => {
    state.step = 'screener';
    render();
  });
  lucide.createIcons();
};

const renderScreener = () => {
  const options = [
    { id: 'graduate', title: 'The Graduate', desc: "I have the degree, but I'm facing the 'cliff' of underemployment or housing instability.", icon: 'graduation-cap' },
    { id: 'dropout', title: 'The Non-Completer', desc: 'I had to pause/stop college to focus on work, survival, or health.', icon: 'alert-circle' },
    { id: 'student', title: 'The Overworked Student', desc: "I'm currently in school, but I work nearly full-time to survive Orlando's costs.", icon: 'book-open' },
    { id: 'caretaker', title: 'The Caretaker / Barrier', desc: 'My family obligations or systemic barriers define my educational journey.', icon: 'hand-heart' },
  ];

  appRoot.innerHTML = `
    <div>
      <button class="link" id="back-intro"><i data-lucide="arrow-left" style="width:16px;height:16px;"></i> Back</button>
      <h2 class="center" style="margin-top:8px;">Which path best describes your reality?</h2>
      <div class="grid two" style="margin-top:18px;">
        ${options
                .map(
                  (o) => `
                    <button class="card option option-card" data-path="${o.id}" style="text-align:left;">
                      <div class="option-icon"><i data-lucide="${o.icon}" style="width:22px;height:22px;"></i></div>
                      <div>
                        <div style="font-weight:800;color:var(--gray-900);font-size:17px;">${o.title}</div>
                        <div style="color:var(--gray-600);font-size:15px;">${o.desc}</div>
                      </div>
                    </button>`
                )
          .join('')}
      </div>
    </div>
  `;

  document.getElementById('back-intro')?.addEventListener('click', () => {
    state.step = 'intro';
    render();
  });

  document.querySelectorAll('[data-path]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const path = btn.getAttribute('data-path');
      state.selectedPath = path;
      state.step = 'questions';
      window.scrollTo(0, 0);
      render();
    });
  });

  lucide.createIcons();
};

const renderQuestions = () => {
  if (!state.selectedPath) return renderScreener();
  const path = PATHS[state.selectedPath];
  const cards = path.questions.map((q) => questionCard(q)).join('');

  appRoot.innerHTML = `
    <div>
      <div style="display:flex;align-items:center;gap:8px;color:var(--gray-500);font-size:14px;">
        <button class="link" id="back-screener"><i data-lucide="arrow-left" style="width:16px;height:16px;"></i> Back</button>
        <span>/</span>
        <span style="color:var(--blue);font-weight:700;">${path.title}</span>
      </div>
      <div style="margin:18px 0 14px;">
        <h2>Mapping Your Journey</h2>
        <p class="lead">Be specific. Your details help define the system failure.</p>
      </div>
      <div class="grid" style="gap:18px;">${cards}</div>
      <div class="actions">
        <button class="full primary" id="next-universal">Next Section</button>
        <div class="note" data-note="path" style="display:${path.questions.some((q) => !state.answers[q.id]) ? 'block' : 'none'};">Please fill out all fields to continue</div>
      </div>
    </div>
  `;

  const btn = document.getElementById('next-universal');
  const note = document.querySelector('[data-note="path"]');

  const updateButtonState = () => {
    const missing = path.questions.some((q) => !state.answers[q.id]);
    if (btn) btn.disabled = missing;
    if (note) note.style.display = missing ? 'block' : 'none';
  };

  path.questions.forEach((q) => {
    document.getElementById(q.id)?.addEventListener('input', (e) => {
      state.answers[q.id] = e.target.value;
      updateButtonState();
    });
  });

  document.getElementById('back-screener')?.addEventListener('click', () => {
    state.step = 'screener';
    render();
  });

  if (btn) {
    updateButtonState();
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.step = 'universal';
      window.scrollTo(0, 0);
      render();
    });
  }

  lucide.createIcons();
};

const renderUniversal = () => {
  const cards = UNIVERSAL_QUESTIONS.map((q) => questionCard(q)).join('');
  appRoot.innerHTML = `
    <div>
      <div style="display:flex;align-items:center;gap:8px;color:var(--gray-500);font-size:14px;">
        <button class="link" id="back-questions"><i data-lucide="arrow-left" style="width:16px;height:16px;"></i> Back</button>
        <span>/</span>
        <span style="color:var(--blue);font-weight:700;">Systemic Impact</span>
      </div>
      <div style="margin:18px 0 14px;">
        <h2>The Structural Gap</h2>
        <p class="lead">These final questions identify where the safety net broke.</p>
      </div>
      <div class="grid" style="gap:18px;">${cards}</div>
      <div class="actions">
        <button class="full primary" id="submit-final">Submit Response <i data-lucide="send" style="width:18px;height:18px;"></i></button>
      </div>
      ${!firebaseReady ? '<div class="note">Submissions are disabled because Firebase configuration is missing.</div>' : ''}
    </div>
  `;

  UNIVERSAL_QUESTIONS.forEach((q) => {
    document.getElementById(q.id)?.addEventListener('input', (e) => {
      state.answers[q.id] = e.target.value;
    });
  });

  document.getElementById('back-questions')?.addEventListener('click', () => {
    state.step = 'questions';
    render();
  });

  document.getElementById('submit-final')?.addEventListener('click', submitFinal);

  lucide.createIcons();
};

const renderSubmitting = () => {
  appRoot.innerHTML = `
    <div class="center">
      <div class="spinner"></div>
      <p style="color:var(--gray-500);">Saving anonymous data...</p>
    </div>
  `;
};

const renderDone = () => {
  appRoot.innerHTML = `
    <div class="center thank-you" style="max-width:760px;margin:0 auto;">
      <div class="success-icon">
        <i data-lucide="check-circle"></i>
      </div>
      <h2>Response Recorded.</h2>
      <p class="lead">Your data has been added to the study. Thank you for helping us make the invisible visible.</p>

      <div class="done-card impact-card">
        <div class="impact-header">
          <div class="impact-label">
            <i data-lucide="sparkles"></i>
            <span>Analyze Your Impact</span>
          </div>
          <p class="impact-subtitle">See how your personal story connects to the broader structural failure in Orlando.</p>
        </div>

        <div class="analysis-grid">
          <button class="analysis-card" id="btn-narrative">
            <div class="analysis-icon narrative">
              <i data-lucide="book-open"></i>
            </div>
            <div class="analysis-copy">
              <div class="analysis-title">The Narrative Mirror</div>
              <p class="analysis-desc">Synthesize my answers into a cohesive, anonymous user story.</p>
            </div>
          </button>

          <button class="analysis-card" id="btn-systemic">
            <div class="analysis-icon systemic">
              <i data-lucide="brain"></i>
            </div>
            <div class="analysis-copy">
              <div class="analysis-title">Systemic Reality Check</div>
              <p class="analysis-desc">Validate my struggle against Orlando economic data.</p>
            </div>
          </button>
        </div>

        ${state.isGenerating ? '<div class="center" style="color:var(--gray-500);"><div class="spinner"></div><div>Generating insight...</div></div>' : ''}
        ${state.aiNarrative && !state.isGenerating ? `<div class="ai-pane" style="border-color:#6366f1;">
          <strong style="color:#3730a3;text-transform:uppercase;letter-spacing:0.08em;font-size:12px;">Your Anonymous Narrative</strong>
          <p style="font-style:italic;">"${state.aiNarrative}"</p>
        </div>` : ''}
        ${state.aiAnalysis && !state.isGenerating ? `<div class="ai-pane" style="border-color:#a855f7;">
          <strong style="color:#7e22ce;text-transform:uppercase;letter-spacing:0.08em;font-size:12px;">Systemic Analysis</strong>
          <div style="white-space:pre-wrap;">${state.aiAnalysis}</div>
        </div>` : ''}
      </div>

      <button class="primary restart-button" id="restart"><i data-lucide="refresh-cw"></i> Start a new response</button>
    </div>
  `;

  document.getElementById('btn-narrative')?.addEventListener('click', () => {
    if (state.isGenerating) return;
    generateNarrative();
  });
  document.getElementById('btn-systemic')?.addEventListener('click', () => {
    if (state.isGenerating) return;
    generateSystemicCheck();
  });
  document.getElementById('restart')?.addEventListener('click', () => window.location.reload());

  lucide.createIcons();
};

async function submitFinal() {
  if (!state.selectedPath) return;
  if (!firebaseReady || !state.user) {
    alert('Firebase is not configured; submission is disabled.');
    return;
  }

  state.step = 'submitting';
  render();

  try {
    const payload = {
      userId: state.user.uid,
      path: state.selectedPath,
      responses: state.answers,
      timestamp: serverTimestamp(),
      appId: appId,
    };

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'survey_responses'), payload);
    state.step = 'done';
  } catch (error) {
    console.error('Error submitting survey:', error);
    alert('There was an error submitting your responses. Please try again.');
    state.step = 'universal';
  }
  render();
}

const formatGeminiError = (error) => {
  const message = error?.message || '';
  if (message.includes('host is not supported') || message.includes('not in whitelist')) {
    return 'The API key is restricted to a different domain. Add this site to the key\'s allowed HTTP referrers.';
  }
  if (message.includes('model') && message.includes('not found')) {
    return 'The selected Gemini model is not available for this API version. Try the latest stable alias.';
  }
  return null;
};

async function callGemini(prompt, { timeoutMs = 15000 } = {}) {
  if (!apiKey) {
    console.error('Gemini API Error: Missing API key');
    return 'Gemini service is not configured.';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const endpointWithKey = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const requestBody = { contents: [{ parts: [{ text: prompt }] }] };

  try {
    const response = await fetch(endpointWithKey, {
      method: 'POST',
      headers: GEMINI_HEADERS,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (parseErr) {
      console.error('Gemini API Error: Failed to parse response JSON', parseErr, rawText);
    }

    if (!response.ok) {
      const message = data?.error?.message || response.statusText || 'Unknown error';
      throw new Error(`${response.status}: ${message}`);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate analysis at this time.';
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    const formatted = formatGeminiError(error);
    console.error('Gemini API Error:', isAbort ? 'Request timed out' : error);
    if (!isAbort && error?.message?.includes('404')) {
      console.error('Gemini endpoint returned 404. Verify API enablement, correct model name, and that the key allows the Generative Language API');
    }
    return formatted || 'Service temporarily unavailable. Please try again later.';
  } finally {
    clearTimeout(timer);
  }
}

async function generateNarrative() {
  state.isGenerating = true;
  render();
  const userStory = Object.entries(state.answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const prompt = `
Role: Empathetic UX Researcher / Journalist.
Task: Synthesize the following survey responses from a student in Orlando into a powerful, anonymous first-person testimonial (approx 3-4 sentences).
Context: The "Cap and Gown Cliff" - the systemic failure of higher ed support systems.
Goal: Make the user feel heard and validate that their struggle is systemic, not personal.
User Data:
${userStory}

Output: A quoted testimonial.
`;
  const result = await callGemini(prompt);
  state.aiNarrative = result;
  state.isGenerating = false;
  render();
}

async function generateSystemicCheck() {
  state.isGenerating = true;
  render();
  const userStory = Object.entries(state.answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const prompt = `
Role: Social Scientist / Data Analyst.
Task: Analyze this user's specific situation against the context of the Orlando Housing Crisis and the "Student Support Cliff".
Goal: Provide 2-3 specific insights that validate their experience with systemic context (e.g., mention rising rents, lack of safety nets).
Tone: Professional, validating, educational.
User Data:
${userStory}
`;
  const result = await callGemini(prompt);
  state.aiAnalysis = result;
  state.isGenerating = false;
  render();
}

function render() {
  switch (state.step) {
    case 'intro':
      renderIntro();
      break;
    case 'screener':
      renderScreener();
      break;
    case 'questions':
      renderQuestions();
      break;
    case 'universal':
      renderUniversal();
      break;
    case 'submitting':
      renderSubmitting();
      break;
    case 'done':
      renderDone();
      break;
    default:
      renderIntro();
  }
}

render();
