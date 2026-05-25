// ─── DATA LAYER ─────────────────────────────────────────────────────────────
// All data is stored in localStorage under 'solstice_*' keys.
// Each day's log is keyed by ISO date string (YYYY-MM-DD).

const DB = {
  PREFIX: 'solstice_',

  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(this.PREFIX + key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) { console.warn('Storage error:', e); }
  },

  // Get today's log object
  getDay(dateStr) {
    return this.get('day_' + dateStr, {
      scored: {},
      binary: {},
      mood: 0,
      water: 0,
      sleep: 7,
      movement: [],
      protein: [],
      skin: [],
      moodNote: '',
      weeklyReview: {},
    });
  },

  setDay(dateStr, data) {
    this.set('day_' + dateStr, data);
  },

  // Study log: array of { date, tag, subject, hours, note }
  getStudyLog() { return this.get('study_log', []); },
  addStudyEntry(entry) {
    const log = this.getStudyLog();
    log.unshift(entry);
    this.set('study_log', log.slice(0, 200)); // keep last 200
  },

  // Settings
  getStartDate() { return this.get('start_date', null); },
  setStartDate(d) { this.set('start_date', d); },
  getIntention() { return this.get('intention', ''); },
  setIntention(t) { this.set('intention', t); },

  // Export everything
  exportAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
    const data = {};
    keys.forEach(k => {
      try { data[k.replace(this.PREFIX, '')] = JSON.parse(localStorage.getItem(k)); }
      catch { data[k.replace(this.PREFIX, '')] = localStorage.getItem(k); }
    });
    return data;
  },

  resetAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }
};

// ─── HABIT DEFINITIONS ────────────────────────────────────────────────────────
const HABITS_SCORED = [
  { id: 'study',    label: 'Study Block',   icon: '📚', tag: 'core',    max: 3, unit: 'hrs' },
  { id: 'move',     label: 'Movement',      icon: '🏸', tag: 'core',    max: 3, unit: 'pts' },
  { id: 'water',    label: 'Hydration',     icon: '💧', tag: 'core',    max: 3, unit: 'L'   },
  { id: 'sleep',    label: 'Sleep Quality', icon: '🌙', tag: 'core',    max: 3, unit: 'quality' },
];

const HABITS_BINARY = [
  { id: 'nophone',  label: 'No Phone First Hour', icon: '📵', tag: 'mental'   },
  { id: 'protein',  label: 'Protein Goal Met',    icon: '🥤', tag: 'wellness' },
  { id: 'skin',     label: 'Skincare Done',       icon: '✨', tag: 'selfcare' },
  { id: 'journal',  label: 'Journal / Reflect',   icon: '📓', tag: 'mental'   },
  { id: 'read',     label: 'Reading (30 min)',     icon: '📖', tag: 'stretch'  },
  { id: 'noscroll', label: 'Doomscroll Limit',    icon: '🚫', tag: 'mental'   },
];

const ALL_HABITS = [...HABITS_SCORED, ...HABITS_BINARY];

const TOTAL_POSSIBLE = HABITS_SCORED.reduce((a, h) => a + h.max, 0) + HABITS_BINARY.length;

// ─── MILESTONES ───────────────────────────────────────────────────────────────
const MILESTONES = [
  { day: 7,  label: 'First Week',       icon: '🌱', reward: 'One guilt-free leisure day — full Netflix, baking, whatever you want.' },
  { day: 14, label: 'Two Weeks',        icon: '🌿', reward: 'Buy one thing for your workspace or self-care shelf.' },
  { day: 30, label: 'One Month',        icon: '🌳', reward: 'Full day off + something you've been wanting (book, skincare, food).' },
  { day: 50, label: 'Fifty Days',       icon: '🏆', reward: 'Major reward — plan something meaningful: outing, experience, treat.' },
  { day: 75, label: 'Challenge Complete', icon: '👑', reward: 'Your call entirely. This is YOUR victory lap. Make it memorable.' },
];

// ─── STUDY TAGS ───────────────────────────────────────────────────────────────
const STUDY_TAGS = [
  { id: 'iimb',  label: 'IIMB',       color: '#6b3f22' },
  { id: 'bit',   label: 'BIT Mesra',  color: '#3a4f6b' },
  { id: 'cat',   label: 'CAT 2027',   color: '#4f3a6b' },
  { id: 'other', label: 'Other',      color: '#4a5568' },
];

// ─── SCORING ──────────────────────────────────────────────────────────────────
function calcDayScore(dayData) {
  let earned = 0;
  HABITS_SCORED.forEach(h => { earned += (dayData.scored[h.id] || 0); });
  HABITS_BINARY.forEach(h => { if (dayData.binary[h.id]) earned += 1; });
  return { earned, total: TOTAL_POSSIBLE, pct: Math.round((earned / TOTAL_POSSIBLE) * 100) };
}

function scoreLabel(pct) {
  if (pct >= 85) return 'Excellent';
  if (pct >= 60) return 'Good';
  if (pct >= 35) return 'Min. Viable';
  return 'Rest Day';
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function toISO(date) {
  return date.toISOString().split('T')[0];
}

function getDayNumber() {
  const start = DB.getStartDate();
  if (!start) return null;
  const startDate = new Date(start + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - startDate) / 86400000);
  return Math.min(Math.max(diff + 1, 1), 75);
}

function getCATCountdown() {
  // CAT 2027 — typically last Sunday of November; use Nov 28, 2027 as estimate
  const cat = new Date('2027-11-28T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.max(0, Math.ceil((cat - today) / 86400000));
}

function getWeekDates() {
  const dates = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toISO(d));
  }
  return dates;
}

function getStreak() {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 75; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toISO(d);
    const dayData = DB.getDay(iso);
    const { pct } = calcDayScore(dayData);
    if (pct >= 35) { streak++; }
    else if (i > 0) { break; } // allow today to be in progress
    else { break; }
  }
  return streak;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
