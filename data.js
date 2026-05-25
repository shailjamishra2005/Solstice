// ─── DATA LAYER ──────────────────────────────────────────────────────────────
const DB = {
  PREFIX: 'solstice_',

  get: function(key, fallback) {
    if (fallback === undefined) fallback = null;
    try {
      var val = localStorage.getItem(this.PREFIX + key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch(e) { return fallback; }
  },

  set: function(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch(e) { console.warn('Storage error:', e); return false; }
  },

  getDay: function(dateStr) {
    var saved = this.get('day_' + dateStr, null);
    if (saved) return saved;
    return {
      scored: {},
      binary: {},
      mood: 0,
      water: 0,
      sleep: 7,
      movement: [],
      protein: [],
      skin: [],
      moodNote: ''
    };
  },

  setDay: function(dateStr, data) {
    return this.set('day_' + dateStr, data);
  },

  getStudyLog: function() { return this.get('study_log', []); },

  addStudyEntry: function(entry) {
    var log = this.getStudyLog();
    log.unshift(entry);
    this.set('study_log', log.slice(0, 300));
  },

  getStartDate: function() { return this.get('start_date', null); },
  setStartDate: function(d) { return this.set('start_date', d); },
  getIntention: function() { return this.get('intention', ''); },
  setIntention: function(t) { return this.set('intention', t); },

  exportAll: function() {
    var keys = Object.keys(localStorage).filter(function(k) {
      return k.indexOf('solstice_') === 0;
    });
    var data = {};
    keys.forEach(function(k) {
      try { data[k.replace('solstice_', '')] = JSON.parse(localStorage.getItem(k)); }
      catch(e) { data[k.replace('solstice_', '')] = localStorage.getItem(k); }
    });
    return data;
  },

  resetAll: function() {
    var keys = Object.keys(localStorage).filter(function(k) {
      return k.indexOf('solstice_') === 0;
    });
    keys.forEach(function(k) { localStorage.removeItem(k); });
  }
};

// ─── HABIT DEFINITIONS ───────────────────────────────────────────────────────
var HABITS_SCORED = [
  { id: 'study', label: 'Study Block',   icon: '📚', tag: 'core', max: 3 },
  { id: 'move',  label: 'Movement',      icon: '🏸', tag: 'core', max: 3 },
  { id: 'water', label: 'Hydration',     icon: '💧', tag: 'core', max: 3 },
  { id: 'sleep', label: 'Sleep Quality', icon: '🌙', tag: 'core', max: 3 }
];

var HABITS_BINARY = [
  { id: 'nophone',  label: 'No Phone First Hour', icon: '📵', tag: 'mental'   },
  { id: 'protein',  label: 'Protein Goal Met',    icon: '🥤', tag: 'wellness' },
  { id: 'skin',     label: 'Skincare Done',        icon: '✨', tag: 'selfcare' },
  { id: 'journal',  label: 'Journal / Reflect',    icon: '📓', tag: 'mental'   },
  { id: 'read',     label: 'Reading (30 min)',      icon: '📖', tag: 'stretch'  },
  { id: 'noscroll', label: 'Doomscroll Limit',     icon: '🚫', tag: 'mental'   }
];

var ALL_HABITS = HABITS_SCORED.concat(HABITS_BINARY);

var TOTAL_POSSIBLE = HABITS_SCORED.reduce(function(a, h) { return a + h.max; }, 0) + HABITS_BINARY.length;

// ─── MILESTONES ──────────────────────────────────────────────────────────────
var MILESTONES = [
  { day: 7,  label: 'First Week',         icon: '🌱', reward: 'One guilt-free leisure day — full Netflix, baking, whatever you want.' },
  { day: 14, label: 'Two Weeks',          icon: '🌿', reward: 'Buy one thing for your workspace or self-care shelf.' },
  { day: 30, label: 'One Month',          icon: '🌳', reward: "Full day off + something you've been wanting (book, skincare, food)." },
  { day: 50, label: 'Fifty Days',         icon: '🏆', reward: 'Major reward — plan something meaningful: outing, experience, treat.' },
  { day: 75, label: 'Challenge Complete', icon: '👑', reward: 'Your call entirely. This is YOUR victory lap. Make it memorable.' }
];

// ─── STUDY TAGS ──────────────────────────────────────────────────────────────
var STUDY_TAGS = [
  { id: 'iimb',  label: 'IIMB'      },
  { id: 'bit',   label: 'BIT Mesra' },
  { id: 'cat',   label: 'CAT 2027'  },
  { id: 'other', label: 'Other'     }
];

// ─── SCORING ─────────────────────────────────────────────────────────────────
function calcDayScore(dayData) {
  var earned = 0;
  HABITS_SCORED.forEach(function(h) { earned += (dayData.scored[h.id] || 0); });
  HABITS_BINARY.forEach(function(h) { if (dayData.binary[h.id]) earned += 1; });
  return { earned: earned, total: TOTAL_POSSIBLE, pct: Math.round((earned / TOTAL_POSSIBLE) * 100) };
}

function scoreLabel(pct) {
  if (pct >= 85) return 'Excellent';
  if (pct >= 60) return 'Good';
  if (pct >= 35) return 'Min. Viable';
  return 'Rest Day';
}

// ─── DATE HELPERS ────────────────────────────────────────────────────────────
// CRITICAL: use local date, not UTC, so IST midnight doesn't flip to yesterday
function toISO(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function getDayNumber() {
  var start = DB.getStartDate();
  if (!start) return 1;
  var parts = start.split('-');
  var startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  var diff = Math.floor((today - startDate) / 86400000);
  return Math.min(Math.max(diff + 1, 1), 75);
}

function getCATCountdown() {
  var cat = new Date(2027, 10, 28); // Nov 28 2027
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  cat.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((cat - today) / 86400000));
}

function getWeekDates() {
  var dates = [];
  var today = new Date();
  for (var i = 6; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toISO(d));
  }
  return dates;
}

function getStreak() {
  var streak = 0;
  var today = new Date();
  // Check yesterday first; if yesterday has data, count back from there
  // Today is "in progress" — don't break streak if today is still 0
  for (var i = 0; i < 75; i++) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    var iso = toISO(d);
    var dayData = DB.getDay(iso);
    var pct = calcDayScore(dayData).pct;
    if (i === 0) {
      // Today: count it if it has any data, don't break if 0 (day in progress)
      if (pct >= 35) streak++;
      // Either way, continue to check yesterday
    } else {
      if (pct >= 35) {
        streak++;
      } else {
        break;
      }
    }
  }
  return streak;
}

function formatDate(dateStr) {
  var parts = dateStr.split('-');
  var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
