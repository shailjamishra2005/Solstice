// ─── STATE ────────────────────────────────────────────────────────────────────
const TODAY = toISO(new Date());
let currentStudyTag = 'iimb';
let currentStudyHours = 1;
let todayData = DB.getDay(TODAY);

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  renderTopbar();
  renderDashboard();
  renderHabits();
  renderStudy();
  renderWellness();
  renderWeekly();
  renderMilestones();
  renderSettings();
});

// ─── CLOCK ────────────────────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const h = now.getHours();
    let greeting;
    if (h >= 5 && h < 12) greeting = 'Good morning';
    else if (h >= 12 && h < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    document.getElementById('greeting').textContent = greeting + ', Shailja.';
    document.getElementById('live-date').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('live-time').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const dateShort = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    ['dash','habits','study','wellness','weekly'].forEach(p => {
      const el = document.getElementById(p + '-date');
      if (el) el.textContent = dateShort;
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ─── PAGE NAVIGATION ──────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelector('[data-page="' + id + '"]').classList.add('active');
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function renderTopbar() {
  const dayNum = getDayNumber() || 1;
  const pct = Math.round((dayNum / 75) * 100);
  document.getElementById('day-label').textContent = 'Day ' + dayNum + ' of 75';
  document.getElementById('pct-label').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';

  const markers = document.getElementById('milestone-markers');
  markers.innerHTML = '';
  MILESTONES.forEach(function(m) {
    const div = document.createElement('div');
    div.className = 'm-marker';
    div.style.left = ((m.day / 75) * 100) + '%';
    div.title = 'Day ' + m.day + ': ' + m.label;
    markers.appendChild(div);
  });

  const streak = getStreak();
  document.getElementById('streak-num').textContent = streak;

  renderMoodStars();
}

function renderMoodStars() {
  const container = document.getElementById('mood-stars');
  container.innerHTML = '';
  const mood = todayData.mood || 0;
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className = 'mood-star' + (i <= mood ? ' active' : '');
    btn.textContent = i;
    btn.onclick = (function(val) {
      return function() {
        todayData.mood = val;
        saveToday();
        renderMoodStars();
        renderDashboard();
      };
    })(i);
    container.appendChild(btn);
  }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const score = calcDayScore(todayData);
  const pct = score.pct;
  const earned = score.earned;
  const total = score.total;

  const circumference = 314;
  const offset = circumference - (pct / 100) * circumference;
  const ring = document.getElementById('ring-fill');
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = pct >= 85 ? '#7ca87c' : pct >= 60 ? '#c4a056' : pct >= 35 ? '#b87a52' : '#c06060';
  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-label-inner').textContent = scoreLabel(pct);
  document.getElementById('score-breakdown').innerHTML = earned + ' / ' + total + ' pts<br><em style="font-size:10px">' + scoreLabel(pct) + '</em>';

  const dayNum = getDayNumber() || 1;
  const streak = getStreak();
  document.getElementById('streak-big').textContent = streak + (streak === 1 ? ' day' : ' days');
  document.getElementById('streak-sub').textContent = streak >= 7 ? 'Incredible consistency.' : streak >= 3 ? 'Building momentum.' : 'Keep going.';
  document.getElementById('cat-countdown').textContent = getCATCountdown().toLocaleString();
  document.getElementById('challenge-day').textContent = 'Day ' + dayNum;
  document.getElementById('days-left-label').textContent = (75 - dayNum) + ' days remaining';

  renderQuickChecklist();
  renderWeekBars();
  renderMoodHistory();
}

function renderQuickChecklist() {
  const ql = document.getElementById('quick-habits-list');
  ql.innerHTML = '';
  ALL_HABITS.forEach(function(h) {
    const done = h.max ? (todayData.scored[h.id] || 0) > 0 : !!todayData.binary[h.id];
    const row = document.createElement('div');
    row.className = 'quick-habit-row';
    row.innerHTML =
      '<button class="qh-check ' + (done ? 'done' : '') + '" onclick="quickToggle(\'' + h.id + '\',\'' + (h.max ? 'scored' : 'binary') + '\')">' + (done ? '✓' : '') + '</button>' +
      '<span class="qh-label ' + (done ? 'done' : '') + '">' + h.icon + ' ' + h.label + '</span>' +
      (h.max ? '<span class="qh-score">' + (todayData.scored[h.id] || 0) + '/' + h.max + '</span>' : '');
    ql.appendChild(row);
  });
}

function quickToggle(id, type) {
  if (type === 'scored') {
    const cur = todayData.scored[id] || 0;
    const h = HABITS_SCORED.find(function(h) { return h.id === id; });
    todayData.scored[id] = cur < h.max ? cur + 1 : 0;
  } else {
    todayData.binary[id] = !todayData.binary[id];
  }
  saveToday();
  renderDashboard();
  renderHabits();
  renderTopbar();
}

function renderWeekBars() {
  const container = document.getElementById('week-bars');
  container.innerHTML = '';
  const weekDates = getWeekDates();
  let total = 0;
  weekDates.forEach(function(iso) {
    const d = DB.getDay(iso);
    const pct = calcDayScore(d).pct;
    total += pct;
    const dayName = new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    const isToday = iso === TODAY;
    const wrap = document.createElement('div');
    wrap.className = 'week-bar-wrap';
    wrap.innerHTML =
      '<div class="week-bar-outer"><div class="week-bar-inner" style="height:' + pct + '%;' + (isToday ? 'opacity:0.7' : '') + '"></div></div>' +
      '<div class="week-bar-day" style="' + (isToday ? 'color:var(--terracotta);font-weight:600' : '') + '">' + dayName + '</div>';
    container.appendChild(wrap);
  });
  const avg = Math.round(total / weekDates.length);
  document.getElementById('week-avg-val').textContent = avg + '%';
}

function renderMoodHistory() {
  const mh = document.getElementById('mood-history');
  mh.innerHTML = '';
  getWeekDates().forEach(function(iso) {
    const d = DB.getDay(iso);
    const chip = document.createElement('div');
    chip.className = 'mood-day-chip';
    const dayName = new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    chip.innerHTML = '<span class="mood-chip-day">' + dayName + '</span><span class="mood-chip-val">' + (d.mood || '—') + '</span>';
    mh.appendChild(chip);
  });
}

// ─── HABITS PAGE ──────────────────────────────────────────────────────────────
function renderHabits() {
  // Scored
  const sl = document.getElementById('scored-habits-list');
  sl.innerHTML = '';
  HABITS_SCORED.forEach(function(h) {
    const cur = todayData.scored[h.id] || 0;
    const row = document.createElement('div');
    row.className = 'scored-row';
    let btns = '';
    for (let v = 0; v <= h.max; v++) {
      btns += '<button class="s-btn ' + (cur === v && v > 0 ? 'active' : '') + '" onclick="setScored(\'' + h.id + '\',' + v + ')">' + v + '</button>';
    }
    row.innerHTML =
      '<span class="scored-icon">' + h.icon + '</span>' +
      '<span class="scored-name">' + h.label + '</span>' +
      '<span class="scored-tag">' + h.tag + '</span>' +
      '<div class="scored-btns">' + btns + '</div>';
    sl.appendChild(row);
  });

  // Binary
  const bl = document.getElementById('binary-habits-list');
  bl.innerHTML = '';
  HABITS_BINARY.forEach(function(h) {
    const on = !!todayData.binary[h.id];
    const row = document.createElement('div');
    row.className = 'binary-row';
    row.innerHTML =
      '<button class="bin-toggle ' + (on ? 'on' : '') + '" onclick="toggleBinary(\'' + h.id + '\')"></button>' +
      '<span class="bin-icon">' + h.icon + '</span>' +
      '<span class="bin-name">' + h.label + '</span>' +
      '<span class="bin-cat">' + h.tag + '</span>';
    bl.appendChild(row);
  });

  renderHabitCalendars();
}

function setScored(id, val) {
  todayData.scored[id] = val;
  saveToday();
  renderHabits();
  renderDashboard();
  renderTopbar();
  toast('Saved ✓');
}

function toggleBinary(id) {
  todayData.binary[id] = !todayData.binary[id];
  saveToday();
  renderHabits();
  renderDashboard();
  renderTopbar();
  toast('Saved ✓');
}

function renderHabitCalendars() {
  const container = document.getElementById('habit-calendars');
  container.innerHTML = '';
  const start = DB.getStartDate();
  if (!start) {
    container.innerHTML = '<p style="color:var(--ink-muted);font-size:12px">Set your start date in Settings first.</p>';
    return;
  }

  ALL_HABITS.forEach(function(h) {
    const row = document.createElement('div');
    row.className = 'hcal-row';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'hcal-name';
    nameDiv.innerHTML = h.icon + ' ' + h.label;
    const dots = document.createElement('div');
    dots.className = 'hcal-dots';

    for (let i = 0; i < 75; i++) {
      const d = new Date(start + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const iso = toISO(d);
      const isToday = iso === TODAY;
      const isFuture = d > new Date();
      const dayData = DB.getDay(iso);
      let cls = 'hcal-dot';
      if (isToday) cls += ' today';
      else if (isFuture) cls += ' future';
      else {
        if (h.max) {
          const v = dayData.scored[h.id] || 0;
          if (v === h.max) cls += ' done-full';
          else if (v > 0) cls += ' done-partial';
        } else {
          if (dayData.binary[h.id]) cls += ' done-full';
        }
      }
      const dot = document.createElement('div');
      dot.className = cls;
      dot.title = 'Day ' + (i + 1) + ': ' + iso;
      dots.appendChild(dot);
    }
    row.appendChild(nameDiv);
    row.appendChild(dots);
    container.appendChild(row);
  });
}

// ─── STUDY PAGE ───────────────────────────────────────────────────────────────
function renderStudy() {
  const form = document.getElementById('study-form');
  form.innerHTML = '';

  // Tags
  const tagDiv = document.createElement('div');
  tagDiv.innerHTML = '<div class="study-field-label">Category</div>';
  const tagRow = document.createElement('div');
  tagRow.className = 'study-tags';
  STUDY_TAGS.forEach(function(t) {
    const btn = document.createElement('button');
    btn.className = 'study-tag ' + (currentStudyTag === t.id ? 'active' : '');
    btn.textContent = t.label;
    btn.onclick = function() { currentStudyTag = t.id; renderStudy(); };
    tagRow.appendChild(btn);
  });
  tagDiv.appendChild(tagRow);
  form.appendChild(tagDiv);

  // Subject
  const subDiv = document.createElement('div');
  subDiv.innerHTML = '<div class="study-field-label">Subject / Topic</div><input class="study-input" id="study-subject" placeholder="e.g. Statistics — CLT, Confidence Intervals" />';
  form.appendChild(subDiv);

  // Hours
  const hrDiv = document.createElement('div');
  hrDiv.innerHTML = '<div class="study-field-label">Hours Studied</div>';
  const hrRow = document.createElement('div');
  hrRow.className = 'hour-btns';
  [0.5, 1, 1.5, 2, 2.5, 3, 4].forEach(function(h) {
    const btn = document.createElement('button');
    btn.className = 'h-btn ' + (currentStudyHours === h ? 'active' : '');
    btn.textContent = h + 'h';
    btn.onclick = function() { currentStudyHours = h; renderStudy(); };
    hrRow.appendChild(btn);
  });
  hrDiv.appendChild(hrRow);
  form.appendChild(hrDiv);

  // Note
  const noteDiv = document.createElement('div');
  noteDiv.innerHTML = '<div class="study-field-label">Notes (optional)</div><input class="study-input" id="study-note" placeholder="What did you cover? Any blockers?" />';
  form.appendChild(noteDiv);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = 'Log Session';
  saveBtn.onclick = logStudySession;
  form.appendChild(saveBtn);

  renderStudyStats();
  renderStudyLog();
}

function logStudySession() {
  const subj = document.getElementById('study-subject').value.trim();
  const note = document.getElementById('study-note').value.trim();
  if (!subj) { toast('Add a subject first'); return; }
  DB.addStudyEntry({ date: TODAY, tag: currentStudyTag, subject: subj, hours: currentStudyHours, note: note });
  document.getElementById('study-subject').value = '';
  document.getElementById('study-note').value = '';
  renderStudyStats();
  renderStudyLog();
  toast('Study session logged ✓');
}

function renderStudyStats() {
  const log = DB.getStudyLog();
  const stats = document.getElementById('study-stats');
  const todayHrs = log.filter(function(e) { return e.date === TODAY; }).reduce(function(a, e) { return a + e.hours; }, 0);
  const weekDates = getWeekDates();
  const weekHrs = log.filter(function(e) { return weekDates.includes(e.date); }).reduce(function(a, e) { return a + e.hours; }, 0);
  const totalHrs = log.reduce(function(a, e) { return a + e.hours; }, 0);

  let html = '<div class="study-stat-row"><span class="ss-label">Today</span><span class="ss-val">' + todayHrs + 'h</span></div>';
  html += '<div class="study-stat-row"><span class="ss-label">This Week</span><span class="ss-val">' + weekHrs + 'h</span></div>';
  html += '<div class="study-stat-row"><span class="ss-label">Total Logged</span><span class="ss-val">' + totalHrs + 'h</span></div>';
  STUDY_TAGS.forEach(function(t) {
    const hrs = log.filter(function(e) { return e.tag === t.id; }).reduce(function(a, e) { return a + e.hours; }, 0);
    html += '<div class="study-stat-row"><span class="ss-label">' + t.label + '</span><span class="ss-val" style="font-size:14px">' + hrs + 'h</span></div>';
  });
  stats.innerHTML = html;
}

function renderStudyLog() {
  const log = DB.getStudyLog();
  const container = document.getElementById('study-log-list');
  if (log.length === 0) {
    container.innerHTML = '<p style="color:var(--ink-muted);font-size:12px">No sessions logged yet.</p>';
    return;
  }
  container.innerHTML = log.slice(0, 20).map(function(e) {
    const tagLabel = (STUDY_TAGS.find(function(t) { return t.id === e.tag; }) || {}).label || e.tag;
    return '<div class="study-log-item">' +
      '<span class="sl-date">' + formatDate(e.date) + '</span>' +
      '<span class="sl-tag">' + tagLabel + '</span>' +
      '<span class="sl-subject">' + e.subject + (e.note ? ' — ' + e.note : '') + '</span>' +
      '<span class="sl-hours">' + e.hours + 'h</span>' +
      '</div>';
  }).join('');
}

// ─── WELLNESS PAGE ────────────────────────────────────────────────────────────
function renderWellness() {
  renderWater();
  renderSleep();
  renderProtein();
  renderMovement();
  renderSkin();
  renderMoodJournal();
}

function renderWater() {
  const cups = 8;
  const filled = todayData.water || 0;
  const container = document.getElementById('water-tracker');
  container.innerHTML = '<div class="water-cups" id="water-cups"></div><div class="water-label">' + (filled * 0.25).toFixed(2) + 'L / 2L target</div>';
  const cupsEl = document.getElementById('water-cups');
  for (let i = 0; i < cups; i++) {
    const cup = document.createElement('div');
    cup.className = 'water-cup ' + (i < filled ? 'filled' : '');
    const inner = document.createElement('div');
    inner.className = 'fill-inner';
    inner.style.height = i < filled ? '100%' : '0%';
    cup.appendChild(inner);
    cup.onclick = (function(idx) {
      return function() {
        todayData.water = (todayData.water === idx + 1) ? idx : idx + 1;
        saveToday(); renderWellness(); renderDashboard();
      };
    })(i);
    cupsEl.appendChild(cup);
  }
}

function renderSleep() {
  const container = document.getElementById('sleep-log');
  const val = todayData.sleep || 7;
  container.innerHTML =
    '<div class="sleep-row">' +
    '<label>Hours slept</label>' +
    '<input type="range" min="3" max="12" step="0.5" value="' + val + '" id="sleep-range" oninput="updateSleep(this.value)" />' +
    '<span class="sleep-val" id="sleep-val">' + val + 'h</span>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--ink-muted);margin-top:8px">' + (val >= 7.5 ? '✦ Well rested' : val >= 6 ? '△ Adequate' : '⚠ Needs attention') + '</div>';
}

function updateSleep(val) {
  document.getElementById('sleep-val').textContent = val + 'h';
  todayData.sleep = parseFloat(val);
  saveToday();
}

function renderProtein() {
  const items = ['Morning smoothie', 'Protein with lunch', 'Protein with dinner', 'Extra snack'];
  const checked = todayData.protein || [];
  document.getElementById('protein-log').innerHTML = '<div class="protein-check">' +
    items.map(function(item, i) {
      return '<div class="pc-row">' +
        '<button class="pc-check ' + (checked.includes(i) ? 'on' : '') + '" onclick="toggleProtein(' + i + ')">' + (checked.includes(i) ? '✓' : '') + '</button>' +
        '<span class="pc-label">' + item + '</span></div>';
    }).join('') + '</div>';
}

function toggleProtein(i) {
  const arr = todayData.protein || [];
  const idx = arr.indexOf(i);
  if (idx > -1) arr.splice(idx, 1); else arr.push(i);
  todayData.protein = arr;
  saveToday(); renderProtein();
}

function renderMovement() {
  const opts = ['Swimming 🏊', 'Badminton 🏸', 'Walk 🚶', 'Yoga 🧘', 'Gym 💪', 'Rest day'];
  const sel = todayData.movement || [];
  document.getElementById('movement-log').innerHTML = '<div class="movement-opts">' +
    opts.map(function(o, i) {
      return '<button class="move-opt ' + (sel.includes(i) ? 'active' : '') + '" onclick="toggleMovement(' + i + ')">' + o + '</button>';
    }).join('') + '</div>';
}

function toggleMovement(i) {
  const arr = todayData.movement || [];
  const idx = arr.indexOf(i);
  if (idx > -1) arr.splice(idx, 1); else arr.push(i);
  todayData.movement = arr;
  saveToday(); renderMovement();
}

function renderSkin() {
  const items = ['Morning cleanse', 'Sunscreen', 'Evening routine', 'Hair care', 'Nails / grooming'];
  const checked = todayData.skin || [];
  document.getElementById('skin-log').innerHTML = '<div class="skin-checks">' +
    items.map(function(item, i) {
      return '<div class="pc-row">' +
        '<button class="pc-check ' + (checked.includes(i) ? 'on' : '') + '" onclick="toggleSkin(' + i + ')">' + (checked.includes(i) ? '✓' : '') + '</button>' +
        '<span class="pc-label">' + item + '</span></div>';
    }).join('') + '</div>';
}

function toggleSkin(i) {
  const arr = todayData.skin || [];
  const idx = arr.indexOf(i);
  if (idx > -1) arr.splice(idx, 1); else arr.push(i);
  todayData.skin = arr;
  saveToday(); renderSkin();
}

function renderMoodJournal() {
  const container = document.getElementById('mood-journal');
  const mood = todayData.mood || 0;
  const note = todayData.moodNote || '';
  container.innerHTML = '<div class="mood-big-stars" id="mood-big-stars"></div>' +
    '<textarea class="mood-note" placeholder="How are you actually feeling today?" id="mood-note-ta">' + note + '</textarea>' +
    '<button class="save-btn" onclick="saveMoodNote()" style="margin-top:8px">Save</button>';
  const stars = document.getElementById('mood-big-stars');
  const labels = ['', 'Rough 😞', 'Low 😐', 'Okay 🙂', 'Good 😊', 'Great 🌟'];
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.className = 'mood-big-star ' + (i <= mood ? 'active' : '');
    btn.textContent = i;
    btn.title = labels[i];
    btn.onclick = (function(val) {
      return function() { todayData.mood = val; saveToday(); renderMoodJournal(); renderMoodStars(); renderDashboard(); };
    })(i);
    stars.appendChild(btn);
  }
}

function saveMoodNote() {
  todayData.moodNote = document.getElementById('mood-note-ta').value;
  saveToday(); toast('Mood note saved ✓');
}

// ─── WEEKLY REVIEW PAGE ───────────────────────────────────────────────────────
const REVIEW_QUESTIONS = [
  'What was my highest-energy day this week? What made it work?',
  'What habit slipped most — and what was actually going on underneath that?',
  'Did I experience any emotional spiral this week? What triggered it?',
  'On a scale of 1–10: how disciplined did I feel? How kind was I to myself?',
  'What is one thing I want to do differently next week?',
  'What am I genuinely proud of from this week — even if it was small?',
];

function renderWeekly() {
  const rq = document.getElementById('review-questions');
  rq.innerHTML = '';
  const weekKey = 'week_' + getWeekStart();
  const saved = DB.get(weekKey, {});
  REVIEW_QUESTIONS.forEach(function(q, i) {
    const div = document.createElement('div');
    div.className = 'review-q';
    div.innerHTML =
      '<div class="review-q-num">Q' + (i + 1) + '</div>' +
      '<div class="review-q-text">' + q + '</div>' +
      '<textarea class="review-textarea" id="rq-' + i + '" placeholder="Your reflection...">' + (saved['q' + i] || '') + '</textarea>';
    rq.appendChild(div);
  });
  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = 'Save Reflections';
  saveBtn.style.marginTop = '12px';
  saveBtn.onclick = saveWeeklyReview;
  rq.appendChild(saveBtn);

  renderWeekGlance();
  document.getElementById('day1-intention').value = DB.getIntention();
}

function saveWeeklyReview() {
  const weekKey = 'week_' + getWeekStart();
  const data = {};
  REVIEW_QUESTIONS.forEach(function(_, i) {
    const el = document.getElementById('rq-' + i);
    data['q' + i] = el ? el.value : '';
  });
  DB.set(weekKey, data);
  toast('Reflections saved ✓');
}

function renderWeekGlance() {
  const container = document.getElementById('week-at-glance');
  container.innerHTML = '';
  const days = document.createElement('div');
  days.className = 'day-glance';
  getWeekDates().forEach(function(iso) {
    const d = DB.getDay(iso);
    const pct = calcDayScore(d).pct;
    const dayName = new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    const isToday = iso === TODAY;
    const row = document.createElement('div');
    row.className = 'dg-row';
    row.innerHTML =
      '<span class="dg-day" style="' + (isToday ? 'color:var(--terracotta)' : '') + '">' + dayName + '</span>' +
      '<div class="dg-bar-outer"><div class="dg-bar-inner" style="width:' + pct + '%"></div></div>' +
      '<span class="dg-pct">' + pct + '%</span>' +
      '<span class="dg-label">' + scoreLabel(pct) + '</span>';
    days.appendChild(row);
  });
  container.appendChild(days);
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toISO(d);
}

function saveIntention() {
  const val = document.getElementById('day1-intention').value;
  DB.setIntention(val);
  toast('Intention saved ✓');
}

// ─── MILESTONES PAGE ──────────────────────────────────────────────────────────
function renderMilestones() {
  const container = document.getElementById('milestones-list');
  container.innerHTML = '';
  const dayNum = getDayNumber() || 1;

  MILESTONES.forEach(function(m) {
    const reached = dayNum >= m.day;
    const nextUp = MILESTONES.find(function(x) { return x.day >= dayNum; });
    const isNext = nextUp && nextUp.day === m.day && !reached;
    const daysLeft = m.day - dayNum;

    const card = document.createElement('div');
    card.className = 'milestone-card ' + (reached ? 'reached' : isNext ? 'next' : '');
    card.innerHTML =
      '<div class="ms-icon">' + (reached ? '✓' : m.icon) + '</div>' +
      '<div class="ms-body">' +
        '<div class="ms-day">DAY ' + m.day + ' — ' + (reached ? 'REACHED' : isNext ? 'NEXT UP' : 'LOCKED') + '</div>' +
        '<div class="ms-title">' + m.label + '</div>' +
        '<div class="ms-reward">🎁 ' + m.reward + '</div>' +
      '</div>' +
      (isNext ? '<div class="ms-badge"><div class="ms-badge-num">' + daysLeft + '</div><div class="ms-badge-label">days left</div></div>' : '') +
      (reached ? '<div class="ms-badge" style="background:var(--terracotta)"><div class="ms-badge-num">✓</div><div class="ms-badge-label" style="color:rgba(255,255,255,0.6)">earned</div></div>' : '');
    container.appendChild(card);
  });
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function renderSettings() {
  const startDate = DB.getStartDate();
  const input = document.getElementById('start-date-input');
  const note = document.getElementById('current-start-note');
  if (startDate) {
    input.value = startDate;
    note.textContent = 'Challenge started: ' + formatDate(startDate);
  } else {
    note.textContent = 'No start date set yet. Pick one below.';
  }
}

function saveStartDate() {
  const val = document.getElementById('start-date-input').value;
  if (!val) { toast('Pick a date first'); return; }
  DB.setStartDate(val);
  document.getElementById('current-start-note').textContent = 'Challenge started: ' + formatDate(val);
  renderTopbar();
  renderMilestones();
  renderDashboard();
  renderHabitCalendars();
  toast('Start date saved ✓');
}

function exportData() {
  const data = DB.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'solstice-backup-' + TODAY + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Data exported ✓');
}

function confirmReset() {
  if (confirm('This will delete ALL your data permanently. Are you sure?')) {
    DB.resetAll();
    location.reload();
  }
}

// ─── SAVE ─────────────────────────────────────────────────────────────────────
function saveToday() {
  DB.setDay(TODAY, todayData);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 2600);
}
