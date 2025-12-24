/* Manic Musings of Chaos – Frontend logic (offline, localStorage)
   - Autosave one entry per date
   - Populate dropdowns consistently (fixes "options missing" issues)
   - Library uses same storage key and can delete entries
*/
(() => {
  const STORAGE_KEY = "mmoc_entries_v3";

  const $ = (id) => document.getElementById(id);

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatHumanDate = (iso) => {
    try {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso || "";
    }
  };

  const readEntries = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const writeEntries = (arr) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  };

  const upsertEntry = (entry) => {
    const entries = readEntries();
    const ix = entries.findIndex(e => e && e.date === entry.date);
    if (ix >= 0) entries[ix] = entry;
    else entries.unshift(entry);
    // newest first
    entries.sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    writeEntries(entries);
  };

  const getEntryByDate = (dateISO) => readEntries().find(e => e && e.date === dateISO);

  const getFormState = () => {
    const root = document.querySelector("body");
    const state = {};
    const fields = root.querySelectorAll("input, select, textarea");
    fields.forEach(el => {
      if (!el.id) return;
      if (el.type === "file") {
        // Don’t attempt to store files (browser security). Store selection count for UI only.
        state[el.id] = { fileCount: el.files ? el.files.length : 0 };
      } else if (el.type === "checkbox" || el.type === "radio") {
        state[el.id] = !!el.checked;
      } else {
        state[el.id] = el.value ?? "";
      }
    });
    return state;
  };

  const applyFormState = (state) => {
    if (!state) return;
    Object.keys(state).forEach((id) => {
      const el = $(id);
      if (!el) return;
      if (el.type === "file") return; // can’t restore files
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = !!state[id];
      } else {
        el.value = (typeof state[id] === "string" || typeof state[id] === "number") ? String(state[id]) : "";
      }
    });
  };

  const ensureOptions = () => {
    // Chakra
    const chakra = $("chakra");
    if (chakra) {
      chakra.innerHTML = [
        `<option value="">Select…</option>`,
        "Root",
        "Sacral",
        "Solar Plexus",
        "Heart",
        "Throat",
        "Third Eye",
        "Crown"
      ].map(v => v === "Select…" ? v : `<option value="${v}">${v}</option>`).join("");
    }

    // Mood
    const mood = $("mood");
    if (mood) {
      const moods = ["Select…","Peaceful","Anxious","Excited","Sad","Angry","Inspired","Tired","Grateful","Spicy"];
      mood.innerHTML = moods.map((v,i) => i===0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`).join("");
    }

    // Day (if it's a select)
    const day = $("day");
    if (day && day.tagName === "SELECT") {
      const days = ["Select…","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
      day.innerHTML = days.map((v,i)=> i===0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`).join("");
    }

    // Any "timeSpent" / "arriveTime" selects (Roid Boy Chronicles)
    const timeSelects = ["arriveTime","timeSpent","timeAtGym","gymArrive","gymDuration"];
    const timeOptions = [];
    timeOptions.push({v:"", t:"Select…"});
    // 5-min increments
    for (let h=0; h<24; h++){
      for (let m=0; m<60; m+=5){
        const hh = String(h).padStart(2,"0");
        const mm = String(m).padStart(2,"0");
        const label = `${(h%12)||12}:${mm} ${h<12?"AM":"PM"}`;
        timeOptions.push({v:`${hh}:${mm}`, t:label});
      }
    }
    timeSelects.forEach(id=>{
      const el=$(id);
      if (el && el.tagName==="SELECT") {
        el.innerHTML = timeOptions.map(o=> `<option value="${o.v}">${o.t}</option>`).join("");
      }
    });

    // Body stats selects
    const statSelects = ["weight","bodyfat","bodyFat","bfPercent"];
    statSelects.forEach(id=>{
      const el=$(id);
      if (el && el.tagName==="SELECT") {
        const opts = [`<option value="">Select…</option>`];
        // weight 80-350
        for (let w=80; w<=350; w++) opts.push(`<option value="${w}">${w} lb</option>`);
        el.innerHTML = opts.join("");
      }
    });
    const bf = $("bodyfat") || $("bodyFat") || $("bfPercent");
    if (bf && bf.tagName==="SELECT") {
      const opts = [`<option value="">Select…</option>`];
      for (let p=3; p<=40; p+=0.5) opts.push(`<option value="${p}">${p}%</option>`);
      bf.innerHTML = opts.join("");
    }
  };

  const setDateDefaults = () => {
    const dateEl = $("date");
    if (dateEl && !dateEl.value) dateEl.value = todayISO();
    const dateDisplay = $("dateDisplay");
    if (dateDisplay) dateDisplay.textContent = formatHumanDate(dateEl ? dateEl.value : todayISO());
  };

  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const dateEl = $("date");
      if (!dateEl) return;
      if (!dateEl.value) dateEl.value = todayISO();

      const entry = {
        date: dateEl.value,
        title: ($("title") && $("title").value) ? $("title").value.trim() : "",
        day: ($("day") && $("day").value) ? $("day").value : "",
        mood: ($("mood") && $("mood").value) ? $("mood").value : "",
        chakra: ($("chakra") && $("chakra").value) ? $("chakra").value : "",
        updatedAt: Date.now(),
        data: getFormState()
      };

      upsertEntry(entry);

      const status = $("saveStatus");
      if (status) {
        status.textContent = "Saved ✓";
        status.style.opacity = "1";
        setTimeout(() => { status.style.opacity = "0.65"; }, 900);
      }
    }, 450);
  };

  const loadFromQueryOrStorage = () => {
    const params = new URLSearchParams(location.search);
    const dateFromQuery = params.get("date");
    const dateEl = $("date");
    if (dateEl) dateEl.value = dateFromQuery || dateEl.value || todayISO();

    const entry = getEntryByDate(dateEl ? dateEl.value : todayISO());
    if (entry && entry.data) applyFormState(entry.data);

    setDateDefaults();
  };

  const wireAutosave = () => {
    const root = document.querySelector("body");
    if (!root) return;
    root.addEventListener("input", scheduleSave, { passive: true });
    root.addEventListener("change", scheduleSave, { passive: true });

    // if an old "Save Entry" button exists, keep it working but not required
    const saveBtn = $("saveBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        scheduleSave();
      });
    }

    // reset today
    const resetBtn = $("resetTodayBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const dateEl = $("date");
        if (dateEl) dateEl.value = todayISO();
        // clear fields (except date)
        const fields = document.querySelectorAll("input, select, textarea");
        fields.forEach(el => {
          if (!el.id) return;
          if (el.id === "date") return;
          if (el.type === "file") return;
          if (el.type === "checkbox" || el.type === "radio") el.checked = false;
          else el.value = "";
        });
        setDateDefaults();
        scheduleSave();
      });
    }
  };

  const init = () => {
    // Only run on app page
    if (!document.body) return;
    ensureOptions();
    loadFromQueryOrStorage();
    wireAutosave();
    // initial save so day appears in library even if user only taps around
    scheduleSave();
  };

  document.addEventListener("DOMContentLoaded", init);
})();