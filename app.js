import { supabase } from "./supabaseClient.js";

/* Manic Musings of Chaos – Frontend logic (offline, localStorage)
   - Autosave one entry per date (local)
   - Optional cloud sync (Supabase) when logged in
   - Populate dropdowns consistently (Mood / Era / Singleness Level)
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

  // ---------- Supabase Auth (OTP) ----------
  const showAuth = (show) => {
    const ov = $("authOverlay");
    if (!ov) return;
    ov.classList.toggle("show", !!show);
    ov.setAttribute("aria-hidden", show ? "false" : "true");
  };

  const setAuthMsg = (txt) => {
    const el = $("authMsg");
    if (el) el.textContent = txt || "";
  };

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  };

  const ensureLoggedIn = async () => {
    const user = await getUser();
    if (user) {
      showAuth(false);
      return user;
    }
    showAuth(true);
    return null;
  };

  const wireOtpAuth = () => {
    const emailEl = $("authEmail");
    const codeRow = $("authCodeRow");
    const codeEl = $("authCode");
    const sendBtn = $("authSendCodeBtn");
    const verifyBtn = $("authVerifyBtn");

    if (!emailEl || !sendBtn || !verifyBtn || !codeRow || !codeEl) return;

    sendBtn.addEventListener("click", async () => {
      const email = (emailEl.value || "").trim();
      if (!email) return setAuthMsg("Enter your email.");

      setAuthMsg("Sending code…");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });

      if (error) {
        setAuthMsg(error.message || "Could not send code.");
        return;
      }

      codeRow.style.display = "";
      codeEl.focus();
      setAuthMsg("Check your email for the 6-digit code.");
    });

    verifyBtn.addEventListener("click", async () => {
      const email = (emailEl.value || "").trim();
      const token = (codeEl.value || "").trim();
      if (!email) return setAuthMsg("Enter your email.");
      if (!token) return setAuthMsg("Enter the code.");

      setAuthMsg("Unlocking…");

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email"
      });

      if (error) {
        setAuthMsg(error.message || "Code incorrect.");
        return;
      }

      setAuthMsg("");
      showAuth(false);
    });
  };

  // ---------- Local storage helpers ----------
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
      if (el.type === "file") return;
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = !!state[id];
      } else {
        el.value =
          typeof state[id] === "string" || typeof state[id] === "number" ? String(state[id]) : "";
      }
    });
  };

  // ---------- Dropdown options ----------
  const ensureOptions = () => {
    // Mood
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
        .map((v, i) => (i === 0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`))
        .join("");
    }

    // Era
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
        .map((v, i) => (i === 0 ? `<option value="">${v}</option>` : `<option value="${v}">${v}</option>`))
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
        .map((v, i) => (i === 0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`))
        .join("");
    }

    // Day (if select)
    const day = $("day");
    if (day && day.tagName === "SELECT") {
      const days = ["Select…", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      day.innerHTML = days
        .map((v, i) => (i === 0 ? `<option value="">Select…</option>` : `<option value="${v}">${v}</option>`))
        .join("");
    }

    // Time selects (Roid Boy)
    const timeSelects = ["arriveTime", "timeSpent", "timeAtGym", "gymArrive", "gymDuration"];
    const timeOptions = [{ v: "", t: "Select…" }];
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

    // Weight + bodyfat selects
    ["weight", "gymWeight"].forEach((id) => {
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

  // ---------- Cloud sync (safe: only when logged in) ----------
  const cloudUpsert = async (entry) => {
    const user = await getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      entry_date: entry.date,
      title: entry.title || "",
      day: entry.day || "",
      mood: entry.mood || "",
      era: entry.era || "",
      relationship_status: entry.relationshipStatus || "",
      data: entry.data || {},
      updated_at: new Date().toISOString(),
    };

    await supabase.from("entries").upsert(payload, { onConflict: "user_id,entry_date" });
  };

  const cloudGetByDate = async (dateISO) => {
    const user = await getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("entries")
      .select("data")
      .eq("user_id", user.id)
      .eq("entry_date", dateISO)
      .maybeSingle();

    return data || null;
  };

  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const dateEl = $("date");
      if (!dateEl) return;
      if (!dateEl.value) dateEl.value = todayISO();

      const entry = {
        date: dateEl.value,
        title: $("title")?.value ? $("title").value.trim() : "",
        day: $("day")?.value ? $("day").value : "",
        mood: $("mood")?.value ? $("mood").value : "",
        era: $("era")?.value ? $("era").value : "",
        relationshipStatus: $("relationshipStatus")?.value ? $("relationshipStatus").value : "",
        updatedAt: Date.now(),
        data: getFormState(),
      };

      upsertEntry(entry);          // local (instant)
      cloudUpsert(entry);          // cloud (if logged in)

      const status = $("saveStatus");
      if (status) {
        status.textContent = "Saved ✓";
        status.style.opacity = "1";
        setTimeout(() => {
          status.style.opacity = "0.65";
        }, 900);
      }
    }, 450);
  };

  const loadFromQueryOrStorage = async () => {
    const params = new URLSearchParams(location.search);
    const dateFromQuery = params.get("date");
    const dateEl = $("date");
    if (dateEl) dateEl.value = dateFromQuery || dateEl.value || todayISO();

    // load from cloud first (if logged in), otherwise local
    const cloud = await cloudGetByDate(dateEl ? dateEl.value : todayISO());
    if (cloud?.data) applyFormState(cloud.data);
    else {
      const entry = getEntryByDate(dateEl ? dateEl.value : todayISO());
      if (entry?.data) applyFormState(entry.data);
    }

    setDateDefaults();
  };

  const wireAutosave = () => {
    const root = document.querySelector("body");
    if (!root) return;
    root.addEventListener("input", scheduleSave, { passive: true });
    root.addEventListener("change", scheduleSave, { passive: true });

    const resetBtn = $("resetTodayBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const dateEl = $("date");
        if (dateEl) dateEl.value = todayISO();

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

  const init = async () => {
    if (!document.body) return;

    wireOtpAuth();

    // show login overlay if not logged in
    await ensureLoggedIn();

    ensureOptions();
    await loadFromQueryOrStorage();
    wireAutosave();

    // initial save so day appears in library even if user only taps around
    scheduleSave();
  };

  document.addEventListener("DOMContentLoaded", init);
})();