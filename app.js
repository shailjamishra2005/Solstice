// ─── STATE ───────────────────────────────────────────────────────────────────
var TODAY = toISO(new Date());
var currentStudyTag = 'iimb';
var currentStudyHours = 1;
var todayData = DB.getDay(TODAY);

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
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

// ─── SAVE TODAY ──────────────────────────────────────────────────────────────
function saveToday() {
  var ok = DB.setDay(TODAY, todayData);
  return ok;
}

// ─── CLOCK ───────────────────────────────────────────────────────────────────
function startClock() {
  function tick() {
    var now = new Date();
    var h = now.getHours();
    var greeting = h >= 5 && h < 12 ? 'Good morning'
                 : h >= 12 && h < 17 ? 'Good afternoon'
                 : 'Good evening';
    document.getElementById('greeting').textContent = greeting + ', Shailja.';
    document.getElementById('live-date').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('live-time').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    var dateShort = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    ['dash','habits','study','wellness','weekly'].forEach(function(p) {
      var el = document.getElementById(p + '-date');
      if (el) el.textContent = dateShort;
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  document.getElementById('page-' + id).classList.add('active');
  document.querySelector('[data-page="' + id + '"]').classList.add('active');
  // Refresh data-heavy pages when navigated to
  if (id === 'habits') renderHabits();
  if (id === 'wellness') renderWellness();
  if (id === 'weekly') renderWeekly();
  if (id === 'milestones') renderMilestones();
  if (id === 'study') { renderStudyStats(); renderStudyLog(); }
}

// ─── TOPBAR ──────────────────────────────────────────────────────────────────
function renderTopbar() {
  var dayNum = getDayNumber();
  var pct = Math.round((dayNum / 75) * 100);
  document.getElementById('day-label').textContent = 'Day ' + dayNum + ' of 75';
  document.getElementById('pct-label').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';

  var markers = document.getElementById('milestone-markers');
  markers.innerHTML = '';
  MILESTONES.forEach(function(m) {
    var div = document.createElement('div');
    div.className = 'm-marker';
    div.style.left = ((m.day / 75) * 100) + '%';
    div.title = 'Day ' + m.day + ': ' + m.label;
    markers.appendChild(div);
  });

  document.getElementById('streak-num').textContent = getStreak();
  renderMoodStars();
}

function renderMoodStars() {
  var container = document.getElementById('mood-stars');
  container.innerHTML = '';
  var mood = todayData.mood || 0;
  for (var i = 1; i <= 5; i++) {
    var btn = document.createElement('button');
    btn.className = 'mood-star' + (i <= mood ? ' active' : '');
    btn.textContent = i;
    btn.setAttribute('data-val', i);
    btn.onclick = function() {
      todayData.mood = parseInt(this.getAttribute('data-val'));
      saveToday();
      renderMoodStars();
      renderDashboard();
    };
    container.appendChild(btn);
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function renderDashboard() {
  var score = calcDayScore(todayData);
  var pct = score.pct;
  var earned = score.earned;
  var total = score.total;

  // Score ring
  var circumference = 314;
  var offset = circumference - (pct / 100) * circumference;
  var ring = document.getElementById('ring-fill');
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = pct >= 85 ? '#7ca87c' : pct >= 60 ? '#c4a056' : pct >= 35 ? '#b87a52' : '#c06060';
  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-label-inner').textContent = scoreLabel(pct);
  document.getElementById('score-breakdown').innerHTML = earned + ' / ' + total + ' pts<br><em style="font-size:10px">' + scoreLabel(pct) + '</em>';

  // Stats
  var dayNum = getDayNumber();
  var streak = getStreak();
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
  var ql = document.getElementById('quick-habits-list');
  ql.innerHTML = '';
  ALL_HABITS.forEach(function(h) {
    var done = h.max ? (todayData.scored[h.id] || 0) > 0 : !!todayData.binary[h.id];
    var scoreText = h.max ? ' <span class="qh-score">' + (todayData.scored[h.id] || 0) + '/' + h.max + '</span>' : '';
    var row = document.createElement('div');
    row.className = 'quick-habit-row';
    row.innerHTML =
      '<button class="qh-check' + (done ? ' done' : '') + '" data-id="' + h.id + '" data-type="' + (h.max ? 'scored' : 'binary') + '">' + (done ? '✓' : '') + '</button>' +
      '<span class="qh-label' + (done ? ' done' : '') + '">' + h.icon + ' ' + h.label + '</span>' + scoreText;
    ql.appendChild(row);
  });
  // Attach events after render
  ql.querySelectorAll('.qh-check').forEach(function(btn) {
    btn.onclick = function() {
      quickToggle(this.getAttribute('data-id'), this.getAttribute('data-type'));
    };
  });
}

function quickToggle(id, type) {
  if (type === 'scored') {
    var cur = todayData.scored[id] || 0;
    var h = null;
    for (var i = 0; i < HABITS_SCORED.length; i++) { if (HABITS_SCORED[i].id === id) { h = HABITS_SCORED[i]; break; } }
    todayData.scored[id] = cur < h.max ? cur + 1 : 0;
  } else {
    todayData.binary[id] = !todayData.binary[id];
  }
  saveToday();
  renderDashboard();
  renderHabitsIfVisible();
  renderTopbar();
}

function renderHabitsIfVisible() {
  if (document.getElementById('page-habits').classList.contains('active')) {
    renderHabits();
  }
}

function renderWeekBars() {
  var container = document.getElementById('week-bars');
  container.innerHTML = '';
  var weekDates = getWeekDates();
  var total = 0;
  weekDates.forEach(function(iso) {
    var d = DB.getDay(iso);
    var pct = calcDayScore(d).pct;
    total += pct;
    var dayName = new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    var isToday = iso === TODAY;
    var wrap = document.createElement('div');
    wrap.className = 'week-bar-wrap';
    wrap.innerHTML =
      '<div class="week-bar-outer"><div class="week-bar-inner" style="height:' + pct + '%"></div></div>' +
      '<div class="week-bar-day" style="' + (isToday ? 'color:var(--terracotta);font-weight:700' : '') + '">' + dayName + '</div>';
    container.appendChild(wrap);
  });
  document.getElementById('week-avg-val').textContent = Math.round(total / weekDates.length) + '%';
}

function renderMoodHistory() {
  var mh = document.getElementById('mood-history');
  mh.innerHTML = '';
  getWeekDates().forEach(function(iso) {
    var d = DB.getDay(iso);
    var chip = document.createElement('div');
    chip.className = 'mood-day-chip';
    var dayName = new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    chip.innerHTML = '<span class="mood-chip-day">' + dayName + '</span><span class="mood-chip-val">' + (d.mood || '—') + '</span>';
    mh.appendChild(chip);
  });
}

// ─── HABITS PAGE ─────────────────────────────────────────────────────────────
function renderHabits() {
  renderScoredHabits();
  renderBinaryHabits();
  renderHabitCalendars();
}

function renderScoredHabits() {
  var sl = document.getElementById('scored-habits-list');
  sl.innerHTML = '';
  HABITS_SCORED.forEach(function(h) {
    var cur = todayData.scored[h.id] || 0;
    var row = document.createElement('div');
    row.className = 'scored-row';
    // Score bar
    var barPct = Math.round((cur / h.max) * 100);
    var barColor = cur === h.max ? '#7ca87c' : cur > 0 ? '#c4a056' : '#e0d5c5';
    var btnsHtml = '';
    for (var v = 1; v <= h.max; v++) {
      btnsHtml += '<button class="s-btn' + (cur >= v ? ' active' : '') + '" data-id="' + h.id + '" data-val="' + v + '">' + v + '</button>';
    }
    // Add a clear button
    btnsHtml += '<button class="s-btn s-btn-clear" data-id="' + h.id + '" data-val="0" title="Clear">✕</button>';
    row.innerHTML =
      '<span class="scored-icon">' + h.icon + '</span>' +
      '<div class="scored-info">' +
        '<span class="scored-name">' + h.label + '</span>' +
        '<div class="scored-bar"><div class="scored-bar-fill" style="width:' + barPct + '%;background:' + barColor + '"></div></div>' +
      '</div>' +
      '<span class="scored-tag">' + h.tag + '</span>' +
      '<div class="scored-btns">' + btnsHtml + '</div>';
    sl.appendChild(row);
  });
  // Attach events
  sl.querySelectorAll('.s-btn').forEach(function(btn) {
    btn.onclick = function() {
      var id = this.getAttribute('data-id');
      var val = parseInt(this.getAttribute('data-val'));
      setScored(id, val);
    };
  });
}

function setScored(id, val) {
  todayData.scored[id] = val;
  saveToday();
  renderScoredHabits();
  renderDashboard();
  renderTopbar();
  toast('Saved ✓');
}

function renderBinaryHabits() {
  var bl = document.getElementById('binary-habits-list');
  bl.innerHTML = '';
  HABITS_BINARY.forEach(function(h) {
    var on = !!todayData.binary[h.id];
    var row = document.createElement('div');
    row.className = 'binary-row';
    row.innerHTML =
      '<button class="bin-toggle' + (on ? ' on' : '') + '" data-id="' + h.id + '"></button>' +
      '<span class="bin-icon">' + h.icon + '</span>' +
      '<span class="bin-name">' + h.label + '</span>' +
      '<span class="bin-cat">' + h.tag + '</span>' +
      '<span class="bin-status">' + (on ? '✓ Done' : 'Not yet') + '</span>';
    bl.appendChild(row);
  });
  bl.querySelectorAll('.bin-toggle').forEach(function(btn) {
    btn.onclick = function() {
      toggleBinary(this.getAttribute('data-id'));
    };
  });
}

function toggleBinary(id) {
  todayData.binary[id] = !todayData.binary[id];
  saveToday();
  renderBinaryHabits();
  renderDashboard();
  renderTopbar();
  toast(todayData.binary[id] ? 'Done ✓' : 'Unmarked');
}

function renderHabitCalendars() {
  var container = document.getElementById('habit-calendars');
  container.innerHTML = '';
  var start = DB.getStartDate();
  if (!start) {
    container.innerHTML = '<p style="color:var(--ink-muted);font-size:13px;padding:8px 0">Set your start date in Settings to see the 75-day calendar.</p>';
    return;
  }
  var startParts = start.split('-');
  ALL_HABITS.forEach(function(h) {
    var row = document.createElement('div');
    row.className = 'hcal-row';
    var nameDiv = document.createElement('div');
    nameDiv.className = 'hcal-name';
    nameDiv.innerHTML = h.icon + ' ' + h.label;
    var dots = document.createElement('div');
    dots.className = 'hcal-dots';
    var nowDate = new Date();
    nowDate.setHours(0,0,0,0);
    for (var i = 0; i < 75; i++) {
      var d = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
      d.setDate(d.getDate() + i);
      d.setHours(0,0,0,0);
      var iso = toISO(d);
      var isToday = iso === TODAY;
      var isFuture = d > nowDate;
      var dayData = DB.getDay(iso);
      var cls = 'hcal-dot';
      if (isToday) cls += ' today';
      else if (isFuture) cls += ' future';
      else {
        if (h.max) {
          var v = dayData.scored[h.id] || 0;
          if (v >= h.max) cls += ' done-full';
          else if (v > 0) cls += ' done-partial';
        } else {
          if (dayData.binary[h.id]) cls += ' done-full';
        }
      }
      var dot = document.createElement('div');
      dot.className = cls;
      dot.title = 'Day ' + (i + 1) + ' — ' + iso;
      dots.appendChild(dot);
    }
    row.appendChild(nameDiv);
    row.appendChild(dots);
    container.appendChild(row);
  });
}

// ─── STUDY PAGE ──────────────────────────────────────────────────────────────
function renderStudy() {
  var form = document.getElementById('study-form');
  form.innerHTML = '';

  // Category tags
  var tagDiv = document.createElement('div');
  tagDiv.innerHTML = '<div class="study-field-label">Category</div>';
  var tagRow = document.createElement('div');
  tagRow.className = 'study-tags';
  STUDY_TAGS.forEach(function(t) {
    var btn = document.createElement('button');
    btn.className = 'study-tag' + (currentStudyTag === t.id ? ' active' : '');
    btn.textContent = t.label;
    btn.setAttribute('data-tag', t.id);
    btn.onclick = function() {
      currentStudyTag = this.getAttribute('data-tag');
      form.querySelectorAll('.study-tag').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
    };
    tagRow.appendChild(btn);
  });
  tagDiv.appendChild(tagRow);
  form.appendChild(tagDiv);

  // Subject input
  var subDiv = document.createElement('div');
  subDiv.innerHTML = '<div class="study-field-label">Subject / Topic</div><input class="study-input" id="study-subject" placeholder="e.g. Statistics — CLT, Confidence Intervals" />';
  form.appendChild(subDiv);

  // Hours
  var hrDiv = document.createElement('div');
  hrDiv.innerHTML = '<div class="study-field-label">Hours Studied</div>';
  var hrRow = document.createElement('div');
  hrRow.className = 'hour-btns';
  [0.5, 1, 1.5, 2, 2.5, 3, 4].forEach(function(h) {
    var btn = document.createElement('button');
    btn.className = 'h-btn' + (currentStudyHours === h ? ' active' : '');
    btn.textContent = h + 'h';
    btn.setAttribute('data-hrs', h);
    btn.onclick = function() {
      currentStudyHours = parseFloat(this.getAttribute('data-hrs'));
      hrRow.querySelectorAll('.h-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
    };
    hrRow.appendChild(btn);
  });
  hrDiv.appendChild(hrRow);
  form.appendChild(hrDiv);

  // Notes
  var noteDiv = document.createElement('div');
  noteDiv.innerHTML = '<div class="study-field-label">Notes (optional)</div><input class="study-input" id="study-note" placeholder="What did you cover? Any blockers?" />';
  form.appendChild(noteDiv);

  var saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = 'Log Session';
  saveBtn.onclick = logStudySession;
  form.appendChild(saveBtn);

  renderStudyStats();
  renderStudyLog();
}

function logStudySession() {
  var subj = document.getElementById('study-subject').value.trim();
  if (!subj) { toast('Add a subject first'); return; }
  var note = document.getElementById('study-note').value.trim();
  DB.addStudyEntry({ date: TODAY, tag: currentStudyTag, subject: subj, hours: currentStudyHours, note: note });
  document.getElementById('study-subject').value = '';
  document.getElementById('study-note').value = '';
  renderStudyStats();
  renderStudyLog();
  toast('Logged ' + currentStudyHours + 'h ✓');
}

function renderStudyStats() {
  var log = DB.getStudyLog();
  var stats = document.getElementById('study-stats');
  var weekDates = getWeekDates();
  var todayHrs = log.filter(function(e) { return e.date === TODAY; }).reduce(function(a, e) { return a + e.hours; }, 0);
  var weekHrs  = log.filter(function(e) { return weekDates.indexOf(e.date) > -1; }).reduce(function(a, e) { return a + e.hours; }, 0);
  var totalHrs = log.reduce(function(a, e) { return a + e.hours; }, 0);
  var html = '<div class="study-stat-row"><span class="ss-label">Today</span><span class="ss-val">' + todayHrs + 'h</span></div>' +
    '<div class="study-stat-row"><span class="ss-label">This Week</span><span class="ss-val">' + weekHrs + 'h</span></div>' +
    '<div class="study-stat-row"><span class="ss-label">Total Logged</span><span class="ss-val">' + totalHrs + 'h</span></div>';
  STUDY_TAGS.forEach(function(t) {
    var hrs = log.filter(function(e) { return e.tag === t.id; }).reduce(function(a, e) { return a + e.hours; }, 0);
    html += '<div class="study-stat-row"><span class="ss-label">' + t.label + '</span><span class="ss-val">' + hrs + 'h</span></div>';
  });
  stats.innerHTML = html;
}

function renderStudyLog() {
  var log = DB.getStudyLog();
  var container = document.getElementById('study-log-list');
  if (log.length === 0) {
    container.innerHTML = '<p style="color:var(--ink-muted);font-size:12px;padding:8px 0">No sessions logged yet.</p>';
    return;
  }
  container.innerHTML = log.slice(0, 20).map(function(e) {
    var tagLabel = '';
    for (var i = 0; i < STUDY_TAGS.length; i++) { if (STUDY_TAGS[i].id === e.tag) { tagLabel = STUDY_TAGS[i].label; break; } }
    return '<div class="study-log-item">' +
      '<span class="sl-date">' + formatDate(e.date) + '</span>' +
      '<span class="sl-tag">' + tagLabel + '</span>' +
      '<span class="sl-subject">' + e.subject + (e.note ? ' — ' + e.note : '') + '</span>' +
      '<span class="sl-hours">' + e.hours + 'h</span></div>';
  }).join('');
}

// ─── WELLNESS PAGE ───────────────────────────────────────────────────────────
function renderWellness() {
  renderWater();
  renderSleep();
  renderProtein();
  renderMovement();
  renderSkin();
  renderMoodJournal();
}

function renderWater() {
  var filled = todayData.water || 0;
  var container = document.getElementById('water-tracker');
  var html = '<div class="water-cups">';
  for (var i = 0; i < 8; i++) {
    html += '<div class="water-cup' + (i < filled ? ' filled' : '') + '" data-cup="' + i + '"><div class="fill-inner" style="height:' + (i < filled ? '100%' : '0%') + '"></div></div>';
  }
  html += '</div><div class="water-label">' + (filled * 0.25).toFixed(2) + 'L / 2L target</div>';
  container.innerHTML = html;
  container.querySelectorAll('.water-cup').forEach(function(cup) {
    cup.onclick = function() {
      var idx = parseInt(this.getAttribute('data-cup'));
      todayData.water = (todayData.water === idx + 1) ? idx : idx + 1;
      saveToday(); renderWater(); renderDashboard();
    };
  });
}

function renderSleep() {
  var val = todayData.sleep || 7;
  var quality = val >= 7.5 ? '✦ Well rested' : val >= 6 ? '△ Adequate' : '⚠ Needs attention';
  document.getElementById('sleep-log').innerHTML =
    '<div class="sleep-row">' +
      '<label>Hours slept</label>' +
      '<input type="range" min="3" max="12" step="0.5" value="' + val + '" id="sleep-range" />' +
      '<span class="sleep-val" id="sleep-val">' + val + 'h</span>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--ink-muted);margin-top:8px" id="sleep-quality">' + quality + '</div>';
  document.getElementById('sleep-range').oninput = function() {
    var v = parseFloat(this.value);
    document.getElementById('sleep-val').textContent = v + 'h';
    document.getElementById('sleep-quality').textContent = v >= 7.5 ? '✦ Well rested' : v >= 6 ? '△ Adequate' : '⚠ Needs attention';
    todayData.sleep = v;
    saveToday();
  };
}

function renderProtein() {
  var items = ['Morning smoothie', 'Protein with lunch', 'Protein with dinner', 'Extra snack'];
  var checked = todayData.protein || [];
  var container = document.getElementById('protein-log');
  var html = '<div class="protein-check">';
  items.forEach(function(item, i) {
    html += '<div class="pc-row"><button class="pc-check' + (checked.indexOf(i) > -1 ? ' on' : '') + '" data-idx="' + i + '">' + (checked.indexOf(i) > -1 ? '✓' : '') + '</button><span class="pc-label">' + item + '</span></div>';
  });
  html += '</div>';
  container.innerHTML = html;
  container.querySelectorAll('.pc-check').forEach(function(btn) {
    btn.onclick = function() {
      var idx = parseInt(this.getAttribute('data-idx'));
      var arr = todayData.protein || [];
      var pos = arr.indexOf(idx);
      if (pos > -1) arr.splice(pos, 1); else arr.push(idx);
      todayData.protein = arr;
      saveToday(); renderProtein();
    };
  });
}

function renderMovement() {
  var opts = ['Swimming 🏊', 'Badminton 🏸', 'Walk 🚶', 'Yoga 🧘', 'Gym 💪', 'Rest day'];
  var sel = todayData.movement || [];
  var container = document.getElementById('movement-log');
  var html = '<div class="movement-opts">';
  opts.forEach(function(o, i) {
    html += '<button class="move-opt' + (sel.indexOf(i) > -1 ? ' active' : '') + '" data-idx="' + i + '">' + o + '</button>';
  });
  html += '</div>';
  container.innerHTML = html;
  container.querySelectorAll('.move-opt').forEach(function(btn) {
    btn.onclick = function() {
      var idx = parseInt(this.getAttribute('data-idx'));
      var arr = todayData.movement || [];
      var pos = arr.indexOf(idx);
      if (pos > -1) arr.splice(pos, 1); else arr.push(idx);
      todayData.movement = arr;
      saveToday(); renderMovement();
    };
  });
}

function renderSkin() {
  var items = ['Morning cleanse', 'Sunscreen', 'Evening routine', 'Hair care', 'Nails / grooming'];
  var checked = todayData.skin || [];
  var container = document.getElementById('skin-log');
  var html = '<div class="skin-checks">';
  items.forEach(function(item, i) {
    html += '<div class="pc-row"><button class="pc-check' + (checked.indexOf(i) > -1 ? ' on' : '') + '" data-idx="' + i + '">' + (checked.indexOf(i) > -1 ? '✓' : '') + '</button><span class="pc-label">' + item + '</span></div>';
  });
  html += '</div>';
  container.innerHTML = html;
  container.querySelectorAll('.pc-check').forEach(function(btn) {
    btn.onclick = function() {
      var idx = parseInt(this.getAttribute('data-idx'));
      var arr = todayData.skin || [];
      var pos = arr.indexOf(idx);
      if (pos > -1) arr.splice(pos, 1); else arr.push(idx);
      todayData.skin = arr;
      saveToday(); renderSkin();
    };
  });
}

function renderMoodJournal() {
  var mood = todayData.mood || 0;
  var note = todayData.moodNote || '';
  var labels = ['', 'Rough 😞', 'Low 😐', 'Okay 🙂', 'Good 😊', 'Great 🌟'];
  var container = document.getElementById('mood-journal');
  var starsHtml = '<div class="mood-big-stars">';
  for (var i = 1; i <= 5; i++) {
    starsHtml += '<button class="mood-big-star' + (i <= mood ? ' active' : '') + '" data-val="' + i + '" title="' + labels[i] + '">' + i + '</button>';
  }
  starsHtml += '</div>';
  container.innerHTML = starsHtml +
    '<textarea class="mood-note" id="mood-note-ta" placeholder="How are you actually feeling today?">' + note + '</textarea>' +
    '<button class="save-btn" id="mood-save-btn" style="margin-top:8px">Save Note</button>';
  container.querySelectorAll('.mood-big-star').forEach(function(btn) {
    btn.onclick = function() {
      todayData.mood = parseInt(this.getAttribute('data-val'));
      saveToday(); renderMoodJournal(); renderMoodStars(); renderDashboard();
    };
  });
  document.getElementById('mood-save-btn').onclick = function() {
    todayData.moodNote = document.getElementById('mood-note-ta').value;
    saveToday(); toast('Mood note saved ✓');
  };
}

// ─── WEEKLY REVIEW ───────────────────────────────────────────────────────────
var REVIEW_QUESTIONS = [
  'What was my highest-energy day this week? What made it work?',
  'What habit slipped most — and what was actually going on underneath that?',
  'Did I experience any emotional spiral this week? What triggered it?',
  'On a scale of 1–10: how disciplined did I feel? How kind was I to myself?',
  'What is one thing I want to do differently next week?',
  'What am I genuinely proud of from this week — even if it was small?'
];

function getWeekStart() {
  var d = new Date();
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toISO(d);
}

function renderWeekly() {
  var rq = document.getElementById('review-questions');
  rq.innerHTML = '';
  var weekKey = 'week_' + getWeekStart();
  var saved = DB.get(weekKey, {});
  REVIEW_QUESTIONS.forEach(function(q, i) {
    var div = document.createElement('div');
    div.className = 'review-q';
    div.innerHTML =
      '<div class="review-q-num">Q' + (i + 1) + '</div>' +
      '<div class="review-q-text">' + q + '</div>' +
      '<textarea class="review-textarea" id="rq-' + i + '" placeholder="Your reflection...">' + (saved['q' + i] || '') + '</textarea>';
    rq.appendChild(div);
  });
  var saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = 'Save Reflections';
  saveBtn.style.marginTop = '12px';
  saveBtn.onclick = saveWeeklyReview;
  rq.appendChild(saveBtn);

  renderWeekGlance();
  document.getElementById('day1-intention').value = DB.getIntention();
}

function saveWeeklyReview() {
  var weekKey = 'week_' + getWeekStart();
  var data = {};
  REVIEW_QUESTIONS.forEach(function(_, i) {
    var el = document.getElementById('rq-' + i);
    data['q' + i] = el ? el.value : '';
  });
  DB.set(weekKey, data);
  toast('Reflections saved ✓');
}

function renderWeekGlance() {
  var container = document.getElementById('week-at-glance');
  container.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'day-glance';
  getWeekDates().forEach(function(iso) {
    var d = DB.getDay(iso);
    var pct = calcDayScore(d).pct;
    var dayName = new Date(iso + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
    var isToday = iso === TODAY;
    var row = document.createElement('div');
    row.className = 'dg-row';
    row.innerHTML =
      '<span class="dg-day"' + (isToday ? ' style="color:var(--terracotta);font-weight:600"' : '') + '>' + dayName + '</span>' +
      '<div class="dg-bar-outer"><div class="dg-bar-inner" style="width:' + pct + '%"></div></div>' +
      '<span class="dg-pct">' + pct + '%</span>' +
      '<span class="dg-label">' + scoreLabel(pct) + '</span>';
    wrap.appendChild(row);
  });
  container.appendChild(wrap);
}

function saveIntention() {
  var val = document.getElementById('day1-intention').value;
  DB.setIntention(val);
  toast('Intention saved ✓');
}

// ─── MILESTONES ──────────────────────────────────────────────────────────────
function renderMilestones() {
  var container = document.getElementById('milestones-list');
  container.innerHTML = '';
  var dayNum = getDayNumber();
  var nextUp = null;
  for (var j = 0; j < MILESTONES.length; j++) {
    if (MILESTONES[j].day >= dayNum) { nextUp = MILESTONES[j]; break; }
  }
  MILESTONES.forEach(function(m) {
    var reached = dayNum > m.day || (dayNum === m.day);
    var isNext = nextUp && nextUp.day === m.day && !reached;
    // Actually: reached means dayNum >= m.day
    reached = dayNum >= m.day;
    isNext = nextUp && nextUp.day === m.day && !reached;
    var daysLeft = m.day - dayNum;
    var card = document.createElement('div');
    card.className = 'milestone-card' + (reached ? ' reached' : isNext ? ' next' : '');
    card.innerHTML =
      '<div class="ms-icon">' + (reached ? '✓' : m.icon) + '</div>' +
      '<div class="ms-body">' +
        '<div class="ms-day">DAY ' + m.day + ' — ' + (reached ? 'REACHED' : isNext ? 'NEXT UP' : 'LOCKED') + '</div>' +
        '<div class="ms-title">' + m.label + '</div>' +
        '<div class="ms-reward">🎁 ' + m.reward + '</div>' +
      '</div>' +
      (isNext ? '<div class="ms-badge"><div class="ms-badge-num">' + Math.max(0, daysLeft) + '</div><div class="ms-badge-label">days left</div></div>' : '') +
      (reached ? '<div class="ms-badge" style="background:var(--terracotta)"><div class="ms-badge-num">✓</div><div class="ms-badge-label" style="color:rgba(255,255,255,0.6)">earned</div></div>' : '');
    container.appendChild(card);
  });
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function renderSettings() {
  var startDate = DB.getStartDate();
  var input = document.getElementById('start-date-input');
  var note = document.getElementById('current-start-note');
  if (startDate) {
    input.value = startDate;
    note.textContent = 'Challenge started: ' + formatDate(startDate);
  } else {
    note.textContent = 'No start date set yet. Pick a date and click Save.';
  }
}

function saveStartDate() {
  var val = document.getElementById('start-date-input').value;
  if (!val) { toast('Pick a date first'); return; }
  var ok = DB.setStartDate(val);
  if (ok) {
    document.getElementById('current-start-note').textContent = 'Challenge started: ' + formatDate(val);
    renderTopbar();
    renderMilestones();
    renderDashboard();
    renderHabitCalendars();
    toast('Start date saved ✓');
  } else {
    toast('Could not save — check browser storage settings');
  }
}

function exportData() {
  var data = DB.exportAll();
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
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

// ─── TOAST ───────────────────────────────────────────────────────────────────
function toast(msg) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 2600);
}
