/* Manic Musings of Chaos – Frontend logic (offline, localStorage)
   - Autosave one entry per date
   - Populate dropdowns consistently (Mood / Era / Singleness Level)
   - Library uses same storage key and can delete entries
   - NO save button required (autosave only)
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
    const ix = entries.findIndex((e) => e && e.date === entry.date);
    if (ix >= 0) entries[ix] = entry;
    else entries.unshift(entry);
    // newest first
    entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    writeEntries(entries);
  };

  const getEntryByDate = (dateISO) => readEntries().find((e) => e && e.date === dateISO);

  const getFormState = () => {
    const root = document.querySelector("body");
    const state = {};
    const fields = root.querySelectorAll("input, select, textarea");
    fields.forEach((el) => {
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
        el.value =
          typeof state[id] === "string" || typeof state[id] === "number" ? String(state[id]) : "";
      }
    });
  };

  const ensureOptions = () => {
    // Mood (LOCKED – dark/cold/horny v3)
    const mood = $("mood");
    if (mood) {
      const moods = [
        "Select…",
        "Horny for Peace",
        "Feral & Focused",
        "Violently Calm",
        "Sexually Frustrated but Contained",

        "Plotting With a Semi",
        "Muscle Memory and Trauma",
        "Built Like a Threat",
        "Calm Like a Loaded Weapon",
        "Hard Body, Closed Heart",

        "Wanting Touch, Refusing Attachment",
        "Desire Without Permission",
        "Attracted but Unavailable",
        "Crushing Quietly",
        "Sexually Awake, Emotionally Armed",

        "Detached for My Own Safety",
        "Heart Locked, Body Open",
        "Missing Someone I Shouldn’t",
        "Grief With Good Posture",
        "Sad, Not Weak",

        "Petty but Correct",
        "Annoyed by Everyone",
        "Do Not Test Me",
        "Observing Before Engaging",
        "Silence Is Strategic",

        "Hyperfocused and Unreachable",
        "Overstimulated but Managing",
        "Brain on Fire",
        "Mask On, Emotions Offline",
        "Unmasked and Exposed",

        "Indifferent and Relieved",
        "Regulated Enough",
        "Resting in My Body",
        "Safe for Now",
        "Still Standing",
      ];

      mood.innerHTML = moods
        .map((v, i) =>
          i === 0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`
        )
        .join("");
    }

    // Era (LOCKED)
    const era = $("era");
    if (era) {
      const eras = [
        "(optional)",

        "Villain Era",
        "Whore4More",
        "Horny for Peace",

        "Muscle Memory and Trauma",
        "Plotting Season",
        "Built, Not Broken",
        "Hard Body, Harder Boundaries",
        "Flesh and Willpower",

        "Dangerous Crush Season",
        "Attachment Without Illusions",
        "Wanting Without Chasing",
        "Letting Someone Matter (Carefully)",

        "Post-Heartbreak Control Phase",
        "Emotional Scar Tissue",
        "Grief Without Collapse",
        "Detachment Training",

        "Gym God Ascension",
        "Strength Without Apology",
        "Discipline Over Desire",
        "Power Stabilization",

        "Hyperfocus Arc",
        "Manic Clarity Window",
        "Burnout Containment",
        "Re-Regulation Protocol",

        "Silence as Strategy",
        "No Negotiation Period",
        "Energy Preservation Mode",

        "Nothing to Prove",
        "Knowing Exactly Who I Am",
      ];

      era.innerHTML = eras
        .map((v, i) =>
          i === 0 ? `<option value="">${v}</option>` : `<option value="${v}">${v}</option>`
        )
        .join("");
    }

    // Singleness Level (id="relationshipStatus")
    const rel = $("relationshipStatus");
    if (rel) {
      const rels = [
        "Select…",

        "Single and Self-Controlled",
        "Single, Not Looking",
        "Single but Curious",

        "Crushing Quietly",
        "Mutual Tension, No Labels",
        "Attracted but Guarded",

        "Emotionally Involved",
        "Physically Attached, Emotionally Cautious",
        "Letting Someone In (Slowly)",

        "Complicated on Purpose",
        "Unavailable by Design",
        "Attached Against My Will",

        "Heart Closed for Maintenance",
        "Recovering From Someone",
        "Detaching With Intent",

        "Indifferent and Relieved",
        "Choosing Myself",
      ];

      rel.innerHTML = rels
        .map((v, i) =>
          i === 0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`
        )
        .join("");
    }

    // Day (if it's a select)
    const day = $("day");
    if (day && day.tagName === "SELECT") {
      const days = ["Select…", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      day.innerHTML = days
        .map((v, i) => (i === 0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`))
        .join("");
    }

    // Any "timeSpent" / "arriveTime" selects (Roid Boy Chronicles)
    const timeSelects = ["arriveTime", "timeSpent", "timeAtGym", "gymArrive", "gymDuration"];
    const timeOptions = [];
    timeOptions.push({ v: "", t: "Select…" });
    // 5-min increments (24 hours)
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const label = `${(h % 12) || 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
        timeOptions.push({ v: `${hh}:${mm}`, t: label });
      }
    }
    timeSelects.forEach((id) => {
      const el = $(id);
      if (el && el.tagName === "SELECT") {
        el.innerHTML = timeOptions.map((o) => `<option value="${o.v}">${o.t}</option>`).join("");
      }
    });

    // Body stats selects
    const weightSelects = ["weight", "gymWeight"];
    weightSelects.forEach((id) => {
      const el = $(id);
      if (el && el.tagName === "SELECT") {
        const opts = [`<option value="">Select…</option>`];
        for (let w = 80; w <= 350; w++) opts.push(`<option value="${w}">${w} lb</option>`);
        el.innerHTML = opts.join("");
      }
    });

    const bf = $("bodyfat") || $("bodyFat") || $("bfPercent") || $("gymBodyfat");
    if (bf && bf.tagName === "SELECT") {
      const opts = [`<option value="">Select…</option>`];
      for (let p = 3; p <= 40; p += 0.5) opts.push(`<option value="${p}">${p}%</option>`);
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
        era: ($("era") && $("era").value) ? $("era").value : "",
        relationshipStatus: ($("relationshipStatus") && $("relationshipStatus").value) ? $("relationshipStatus").value : "",
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

    // reset today
    const resetBtn = $("resetTodayBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const dateEl = $("date");
        if (dateEl) dateEl.value = todayISO();
        // clear fields (except date)
        const fields = document.querySelectorAll("input, select, textarea");
        fields.forEach((el) => {
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
    if (!document.body) return;
    ensureOptions();
    loadFromQueryOrStorage();
    wireAutosave();
    scheduleSave(); // initial save so day appears in library
  };

  document.addEventListener("DOMContentLoaded", init);
})();