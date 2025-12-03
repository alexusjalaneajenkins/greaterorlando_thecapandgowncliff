import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  Backpack,
  Balance,
  BatteryCharging,
  BookOpen,
  BrainCircuit,
  Car,
  CheckCircle,
  ChevronRight,
  CloudLightning,
  Fence,
  GraduationCap,
  HeartCrack,
  HeartHandshake,
  Home,
  MapPin,
  Mountain,
  PiggyBank,
  ScrollText,
  Send,
  ShieldOff,
  Shield,
  Sofa,
  Sparkles,
  Sparkle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// --- Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const apiKey = '';

// --- Gemini API Helper ---
async function callGemini(prompt: string): Promise<string> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate analysis at this time.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'Service temporarily unavailable. Please try again later.';
  }
}

// --- Data Structure ---
type IllustrationType =
  | 'balance'
  | 'diploma_dust'
  | 'cliff'
  | 'breakdown'
  | 'house_choice'
  | 'wall'
  | 'battery'
  | 'storm'
  | 'torn_net'
  | 'backpack'
  | 'hurdle'
  | 'heavy_heart'
  | 'couch'
  | 'piggy_bank'
  | 'wand';

type Question = {
  id: string;
  text: string;
  placeholder: string;
  illustration: IllustrationType;
};

type Path = 'graduate' | 'dropout' | 'student' | 'caretaker';

type IllustrationMeta = {
  icon: LucideIcon;
  label: string;
  accent: string;
  backdrop: string;
};

const ILLUSTRATIONS: Record<IllustrationType, IllustrationMeta> = {
  balance: {
    icon: Balance,
    label: 'Wages vs. rent',
    accent: 'text-[#005b99]',
    backdrop: 'from-[#EBF5FF] via-white to-[#DCEBFF]',
  },
  diploma_dust: {
    icon: ScrollText,
    label: 'Degree payoff',
    accent: 'text-[#7C3AED]',
    backdrop: 'from-[#F3E8FF] via-white to-[#E9D5FF]',
  },
  cliff: {
    icon: Mountain,
    label: 'Support cliff',
    accent: 'text-[#E85D04]',
    backdrop: 'from-[#FFF3E0] via-white to-[#FFE0B2]',
  },
  breakdown: {
    icon: Car,
    label: 'Unexpected bill',
    accent: 'text-[#B91C1C]',
    backdrop: 'from-[#FEF2F2] via-white to-[#FEE2E2]',
  },
  house_choice: {
    icon: Home,
    label: 'Housing tradeoff',
    accent: 'text-[#0F766E]',
    backdrop: 'from-[#ECFDF3] via-white to-[#D1FAE5]',
  },
  wall: {
    icon: Shield,
    label: 'Institutional barriers',
    accent: 'text-[#334155]',
    backdrop: 'from-[#F8FAFC] via-white to-[#E2E8F0]',
  },
  battery: {
    icon: BatteryCharging,
    label: 'Energy drain',
    accent: 'text-[#2563EB]',
    backdrop: 'from-[#E0ECFF] via-white to-[#C7D9FF]',
  },
  storm: {
    icon: CloudLightning,
    label: 'Job market anxiety',
    accent: 'text-[#0EA5E9]',
    backdrop: 'from-[#E0F7FF] via-white to-[#BAE6FD]',
  },
  torn_net: {
    icon: ShieldOff,
    label: 'No safety net',
    accent: 'text-[#C026D3]',
    backdrop: 'from-[#F5E1FF] via-white to-[#E9D5FF]',
  },
  backpack: {
    icon: Backpack,
    label: 'Family load',
    accent: 'text-[#065F46]',
    backdrop: 'from-[#ECFDF3] via-white to-[#D1FAE5]',
  },
  hurdle: {
    icon: Fence,
    label: 'Accommodations blocked',
    accent: 'text-[#EA580C]',
    backdrop: 'from-[#FFF7ED] via-white to-[#FFEAD5]',
  },
  heavy_heart: {
    icon: HeartCrack,
    label: 'Guilt + duty',
    accent: 'text-[#BE123C]',
    backdrop: 'from-[#FEF2F2] via-white to-[#FFE4E6]',
  },
  couch: {
    icon: Sofa,
    label: 'Shared housing',
    accent: 'text-[#1E40AF]',
    backdrop: 'from-[#E0ECFF] via-white to-[#DBEAFE]',
  },
  piggy_bank: {
    icon: PiggyBank,
    label: 'Emergency cash',
    accent: 'text-[#15803D]',
    backdrop: 'from-[#ECFDF3] via-white to-[#DCFCE7]',
  },
  wand: {
    icon: Sparkle,
    label: 'System change',
    accent: 'text-[#7C3AED]',
    backdrop: 'from-[#F3E8FF] via-white to-[#EDE9FE]',
  },
};

const PATHS: Record<Path, { title: string; icon: LucideIcon; questions: Question[] }> = {
  graduate: {
    title: 'The Graduate',
    icon: GraduationCap,
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
    icon: AlertCircle,
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
        placeholder: 'e.g., Professors didn\'t care that I worked...',
        illustration: 'wall',
      },
    ],
  },
  student: {
    title: 'The Working Student',
    icon: BookOpen,
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
    icon: HeartHandshake,
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

const UNIVERSAL_QUESTIONS: Question[] = [
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

const Illustration = ({ type }: { type: IllustrationType }) => {
  const meta = ILLUSTRATIONS[type];

  if (!meta) return null;

  const Icon = meta.icon;

  return (
    <div
      className={`relative w-full h-full rounded-2xl bg-gradient-to-br ${meta.backdrop} flex items-center justify-center overflow-hidden border border-white/60 shadow-inner`}
    >
      <div className="absolute inset-0 opacity-30 blur-3xl bg-white" aria-hidden />
      <div className="relative flex flex-col items-center justify-center gap-2 text-center px-2">
        <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center border border-gray-200">
          <Icon className={`w-6 h-6 ${meta.accent}`} aria-hidden />
        </div>
        <span className="text-[11px] font-semibold text-gray-600 tracking-wide uppercase leading-tight">{meta.label}</span>
      </div>
    </div>
  );
};

export default function SurveyApp() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<'intro' | 'screener' | 'questions' | 'universal' | 'submitting' | 'done'>('intro');
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInAnonymously(auth);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error('Auth failed', e);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const handleStart = () => setStep('screener');

  const handlePathSelect = (path: Path) => {
    setSelectedPath(path);
    setStep('questions');
    window.scrollTo(0, 0);
  };

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handlePathSubmit = () => {
    setStep('universal');
    window.scrollTo(0, 0);
  };

  const handleFinalSubmit = async () => {
    if (!user || !selectedPath) return;
    setStep('submitting');

    try {
      const payload = {
        userId: user.uid,
        path: selectedPath,
        responses: answers,
        timestamp: serverTimestamp(),
        appId: appId,
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'survey_responses'), payload);
      setStep('done');
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('There was an error submitting your responses. Please try again.');
      setStep('universal');
    }
  };

  const generateNarrative = async () => {
    setIsGenerating(true);
    const userStory = Object.entries(answers)
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
    setAiNarrative(result);
    setIsGenerating(false);
  };

  const generateSystemicCheck = async () => {
    setIsGenerating(true);
    const userStory = Object.entries(answers)
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
    setAiAnalysis(result);
    setIsGenerating(false);
  };

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 px-4 animate-fade-in">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-2 shadow-sm border border-blue-100">
        <MapPin className="w-12 h-12 text-[#006DB0]" />
      </div>

      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">The Cap and Gown Cliff</h1>
        <div className="inline-flex items-center bg-gray-100 px-4 py-1.5 rounded-full text-sm font-semibold text-gray-700 uppercase tracking-wide">
          <span className="w-2 h-2 rounded-full bg-[#006DB0] mr-2"></span> Orlando Case Study
        </div>
        <h2 className="text-xl md:text-2xl font-medium text-gray-700 mt-4">
          Defining the Structural Failure Leading from <br className="hidden md:block" />Higher Education to Homelessness.
        </h2>
      </div>

      <p className="text-lg text-gray-600 max-w-2xl leading-relaxed text-left md:text-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        For many, graduation marks not a beginning, but a precipice. We are documenting the <strong>"Support Cliff"</strong> in Central Florida—where rising rents, low wages, and the sudden loss of university support create a direct path to housing instability.
        <br />
        <br />
        This is not about individual failure. It is about a <strong>structural breakdown</strong>. We need your story to prove it.
      </p>

      <button
        onClick={handleStart}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-[#006DB0] rounded-full hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-1"
      >
        Share Your Experience
        <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
      <p className="text-xs text-gray-400 uppercase tracking-widest mt-4">Anonymous • Research Data Only</p>
    </div>
  );

  const renderScreener = () => (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Which path best describes your reality?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            id: 'graduate',
            title: 'The Graduate',
            desc: "I have the degree, but I'm facing the 'cliff' of underemployment or housing instability.",
            icon: GraduationCap,
          },
          { id: 'dropout', title: 'The Non-Completer', desc: 'I had to pause/stop college to focus on work, survival, or health.', icon: AlertCircle },
          {
            id: 'student',
            title: 'The Overworked Student',
            desc: "I'm currently in school, but I work nearly full-time to survive Orlando's costs.",
            icon: BookOpen,
          },
          {
            id: 'caretaker',
            title: 'The Caretaker / Barrier',
            desc: 'My family obligations or systemic barriers define my educational journey.',
            icon: HeartHandshake,
          },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => handlePathSelect(option.id as Path)}
            className="flex flex-col items-start p-6 bg-white border-2 border-gray-100 rounded-xl hover:border-[#006DB0] hover:shadow-md transition-all text-left group"
          >
            <div className="bg-blue-50 p-3 rounded-lg mb-4 group-hover:bg-blue-100 transition-colors">
              <option.icon className="w-6 h-6 text-[#006DB0]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{option.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{option.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const QuestionCard = ({ q, isLast }: { q: Question; isLast: boolean }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex flex-col md:flex-row">
      <div className="w-full md:w-36 h-36 md:h-auto flex-shrink-0 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-100">
        <div className="w-full h-full">
          <Illustration type={q.illustration} />
        </div>
      </div>

      <div className="p-6 flex-1">
        <label className="block text-lg font-medium text-gray-900 mb-4">{q.text}</label>
        <textarea
          value={answers[q.id] || ''}
          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
          placeholder={q.placeholder}
          className="w-full h-32 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#006DB0] focus:border-[#006DB0] transition-all resize-none text-gray-700 placeholder-gray-400"
        />
        {!isLast && <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent" aria-hidden />}
      </div>
    </div>
  );

  const renderQuestions = () => {
    if (!selectedPath) return null;
    const pathData = PATHS[selectedPath];

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <div className="flex items-center mb-8 text-gray-500 text-sm">
          <button onClick={() => setStep('screener')} className="hover:text-[#006DB0] flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <span className="mx-2">/</span>
          <span className="text-[#006DB0] font-medium">{pathData.title}</span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Mapping Your Journey</h2>
          <p className="text-gray-600">Be specific. Your details help define the system failure.</p>
        </div>

        {pathData.questions.map((q, idx) => (
          <QuestionCard key={q.id} q={q} isLast={idx === pathData.questions.length - 1} />
        ))}

        <button
          onClick={handlePathSubmit}
          disabled={pathData.questions.some((q) => !answers[q.id])}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            pathData.questions.some((q) => !answers[q.id])
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#006DB0] text-white hover:bg-blue-800 shadow-lg'
          }`}
        >
          Next Section
        </button>
        {pathData.questions.some((q) => !answers[q.id]) && (
          <p className="text-center text-sm text-gray-400 mt-2">Please fill out all fields to continue</p>
        )}
      </div>
    );
  };

  const renderUniversal = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center mb-8 text-gray-500 text-sm">
        <button onClick={() => setStep('questions')} className="hover:text-[#006DB0] flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <span className="mx-2">/</span>
        <span className="text-[#006DB0] font-medium">Systemic Impact</span>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">The Structural Gap</h2>
        <p className="text-gray-600">These final questions identify where the safety net broke.</p>
      </div>

      {UNIVERSAL_QUESTIONS.map((q, idx) => (
        <QuestionCard key={q.id} q={q} isLast={idx === UNIVERSAL_QUESTIONS.length - 1} />
      ))}

      <button
        onClick={handleFinalSubmit}
        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg flex items-center justify-center"
      >
        Submit Response <Send className="ml-2 w-5 h-5" />
      </button>
    </div>
  );

  const renderDone = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in max-w-2xl mx-auto pb-12">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Response Recorded.</h2>
      <p className="text-xl text-gray-600 mb-8">
        Your data has been added to the study. Thank you for helping us make the invisible visible.
      </p>

      <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 text-left space-y-6">
        <div className="flex items-center space-x-2 text-indigo-700 font-bold uppercase tracking-wider text-xs">
          <Sparkles className="w-4 h-4" />
          <span>Powered by Gemini AI</span>
        </div>

        <h3 className="text-xl font-bold text-gray-900">Analyze Your Impact</h3>
        <p className="text-gray-600 text-sm">
          Use AI to instantly see how your personal story connects to the broader structural failure in Orlando.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={generateNarrative}
            disabled={isGenerating}
            className="flex flex-col items-start p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all"
          >
            <span className="font-bold text-indigo-900 mb-1 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" /> The Narrative Mirror
            </span>
            <span className="text-xs text-indigo-700 text-left">Synthesize my answers into a cohesive, anonymous user story.</span>
          </button>

          <button
            onClick={generateSystemicCheck}
            disabled={isGenerating}
            className="flex flex-col items-start p-4 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl transition-all"
          >
            <span className="font-bold text-purple-900 mb-1 flex items-center">
              <BrainCircuit className="w-4 h-4 mr-2" /> Systemic Reality Check
            </span>
            <span className="text-xs text-purple-700 text-left">Validate my struggle against Orlando economic data.</span>
          </button>
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center py-8 text-gray-500 animate-pulse">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-500" /> Generating insight...
          </div>
        )}

        {aiNarrative && !isGenerating && (
          <div className="mt-4 p-6 bg-gray-50 rounded-xl border-l-4 border-indigo-500 animate-fade-in">
            <h4 className="text-sm font-bold text-indigo-900 mb-2 uppercase">Your Anonymous Narrative</h4>
            <p className="italic text-gray-700 leading-relaxed">"{aiNarrative}"</p>
          </div>
        )}

        {aiAnalysis && !isGenerating && (
          <div className="mt-4 p-6 bg-gray-50 rounded-xl border-l-4 border-purple-500 animate-fade-in">
            <h4 className="text-sm font-bold text-purple-900 mb-2 uppercase">Systemic Analysis</h4>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{aiAnalysis}</div>
          </div>
        )}
      </div>

      <button onClick={() => window.location.reload()} className="mt-8 text-[#006DB0] font-medium hover:underline text-sm">
        Start a new response
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#006DB0] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">UX</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-gray-900 text-sm md:text-base">The Cap and Gown Cliff</span>
              <span className="text-xs text-[#006DB0] font-medium">Orlando Case Study</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Anonymous Mode</div>
        </div>
      </header>

      <main className="py-8">
        {step === 'intro' && renderIntro()}
        {step === 'screener' && renderScreener()}
        {step === 'questions' && renderQuestions()}
        {step === 'universal' && renderUniversal()}
        {step === 'submitting' && (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006DB0] mb-4"></div>
            <p className="text-gray-500">Saving anonymous data...</p>
          </div>
        )}
        {step === 'done' && renderDone()}
      </main>
    </div>
  );
}
