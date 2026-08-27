/* HF Blog Editor demo — shared interactions (no backend, nothing is published) */

// ── Saved-status ticker: simulates autosave recency
let savedSeconds = 4;
const savedEls = document.querySelectorAll("[data-saved-label]");
const fmtSaved = s =>
	s < 8 ? "Saved just now" : s < 60 ? `Saved ${s}s ago` : `Saved ${Math.floor(s / 60)} min ago`;
function renderSaved() { savedEls.forEach(el => (el.textContent = fmtSaved(savedSeconds))); }
if (savedEls.length) {
	renderSaved();
	setInterval(() => { savedSeconds += 4; renderSaved(); }, 4000);
	// Any click inside the editor "resets" the autosave clock, like typing would
	document.querySelectorAll("[data-editor]").forEach(ed =>
		ed.addEventListener("click", () => { savedSeconds = 0; renderSaved(); })
	);
}

// ── Publish modal
const publishModal = document.getElementById("publish-modal");
function openPublish() {
	if (publishModal) publishModal.classList.add("open");
}
function closePublish() {
	if (publishModal) publishModal.classList.remove("open");
}
document.querySelectorAll("[data-publish-open]").forEach(b => b.addEventListener("click", openPublish));
document.querySelectorAll("[data-publish-close]").forEach(b => b.addEventListener("click", closePublish));
if (publishModal) {
	publishModal.addEventListener("click", e => { if (e.target === publishModal) closePublish(); });
}
document.addEventListener("keydown", e => {
	if (e.key === "Escape") { closePublish(); closeSettings(); }
});
document.querySelectorAll("[data-publish-confirm]").forEach(b =>
	b.addEventListener("click", () => {
		closePublish();
		showToast("Demo only — nothing was published 🤗");
	})
);

// ── Toast
let toastTimer;
function showToast(msg) {
	const t = document.getElementById("toast");
	if (!t) return;
	t.querySelector("span").textContent = msg;
	t.classList.add("open");
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => t.classList.remove("open"), 3200);
}

// ── Edit / Preview toggle (chip on the editor) — pane ids depend on the active draft
let currentDraft = "huggy";
const PANES = {
	huggy: { src: "md-source", prev: "md-preview" },
	test:  { src: "md-source-test", prev: "md-preview-test" },
	new:   { src: "md-source-new", prev: "md-preview-new" },
};
const activePaneIds = () => PANES[currentDraft] || PANES.huggy;
document.querySelectorAll("[data-preview-toggle]").forEach(btn =>
	btn.addEventListener("click", () => {
		const ids = activePaneIds();
		const src = document.getElementById(ids.src);
		const prev = document.getElementById(ids.prev);
		const showingPreview = !prev.classList.contains("hidden");
		if (showingPreview) {
			prev.classList.add("hidden");
			src.classList.remove("hidden");
			btn.dataset.state = "edit";
		} else {
			src.classList.add("hidden");
			prev.classList.remove("hidden");
			btn.dataset.state = "preview";
		}
		document.querySelectorAll("[data-preview-toggle] .lbl").forEach(l =>
			l.textContent = showingPreview ? "Preview" : "Edit"
		);
	})
);

// ── Option 1: collapse the metadata panel (iOS-style handle zone).
// Desktop: in-flow rail, open by default. Below lg: right drawer, collapsed by default.
const metaPanel = document.getElementById("meta-panel");
const collapseBtn = document.getElementById("collapse-handle");
if (metaPanel && collapseBtn) {
	const smallScreen = window.matchMedia("(max-width: 1023.5px)");
	// the gear only shows while the panel is collapsed (it advertises what's behind the handle)
	const gearIcon = collapseBtn.querySelector(".zone-gear");
	const syncGear = () => {
		if (gearIcon) gearIcon.style.display = metaPanel.classList.contains("hidden") ? "" : "none";
	};
	const togglePanel = () => {
		const closed = metaPanel.classList.toggle("hidden");
		collapseBtn.title = closed ? "Show article settings" : "Hide article settings";
		syncGear();
	};
	collapseBtn.addEventListener("click", togglePanel);
	const panelClose = document.getElementById("panel-close");
	if (panelClose) panelClose.addEventListener("click", togglePanel);
	// sensible default per breakpoint, re-applied only when the viewport crosses lg
	// (resize fallback because emulated viewports don't always fire matchMedia change)
	const applyDefault = () => {
		metaPanel.classList.toggle("hidden", smallScreen.matches);
		syncGear();
	};
	applyDefault();
	let wasSmall = smallScreen.matches;
	const syncBreakpoint = () => {
		if (smallScreen.matches !== wasSmall) {
			wasSmall = smallScreen.matches;
			applyDefault();
		}
	};
	smallScreen.addEventListener("change", syncBreakpoint);
	window.addEventListener("resize", syncBreakpoint);
}

// ── Footer popovers (Option 2 settings · Option 1 draft selector)
const settingsPop = document.getElementById("settings-popover");
const draftPop = document.getElementById("draft-popover");
const syntaxPop = document.getElementById("syntax-popover");
function closeSettings() {
	if (settingsPop) settingsPop.classList.remove("open");
	if (draftPop) draftPop.classList.remove("open");
	if (syntaxPop) syntaxPop.classList.remove("open");
}
function wirePopover(btnId, pop) {
	const btn = document.getElementById(btnId);
	if (!btn || !pop) return;
	btn.addEventListener("click", e => {
		e.stopPropagation();
		const wasOpen = pop.classList.contains("open");
		closeSettings();
		if (!wasOpen) pop.classList.add("open");
	});
	pop.addEventListener("click", e => e.stopPropagation());
}
wirePopover("settings-btn", settingsPop);
wirePopover("draft-btn", draftPop);
wirePopover("syntax-btn", syntaxPop);
if (settingsPop || draftPop || syntaxPop) {
	document.addEventListener("click", () => closeSettings());
}

// the empty draft's inline assist links straight to the full syntax guide
const scaffoldGuideLink = document.getElementById("scaffold-guide-link");
if (scaffoldGuideLink && syntaxPop) {
	scaffoldGuideLink.addEventListener("click", e => {
		e.stopPropagation();
		closeSettings();
		syntaxPop.classList.add("open");
	});
}

// ── Option 1: draft switching — unsaved new draft ⇄ saved "Test" draft
const ROW_CURRENT = "mb-px flex w-full items-center justify-between gap-1.5 truncate rounded-lg bg-black px-1.5 py-0.5 text-left text-gray-200";
const ROW_PLAIN = "mb-px flex w-full items-center justify-between gap-1.5 truncate rounded-lg px-1.5 py-0.5 text-left text-gray-500 hover:text-gray-900";
const CHIP_ON_DARK = "rounded bg-white/30 px-1.5 py-px text-[11px] font-medium text-white";
const CHIP_ON_LIGHT = "rounded bg-gray-200 px-1.5 py-px text-[11px] font-medium text-gray-600";
const DRAFT_TITLES = {
	huggy: "Designing Huggy: Behind Hugging Face’s…",
	test:  "Testing the community blog editor end to end",
	new:   "Untitled",
};
const DRAFT_SLUGS = { huggy: "designing-huggy", test: "testing-the-community-blog-editor", new: "" };
function setThumbFilled(filled) {
	document.querySelectorAll("[data-thumb-filled]").forEach(el => el.classList.toggle("hidden", !filled));
	document.querySelectorAll("[data-thumb-empty]").forEach(el => el.classList.toggle("hidden", filled));
}
function selectDraft(id) {
	const rows = {
		huggy: document.getElementById("row-huggy"),
		test:  document.getElementById("row-test"),
		new:   document.getElementById("row-new"),
	};
	if (!rows.huggy || !rows.test) return;
	currentDraft = id;
	// swap editor panes; always come back in edit mode
	Object.entries(PANES).forEach(([key, pane]) => {
		const src = document.getElementById(pane.src);
		const prev = document.getElementById(pane.prev);
		if (src) src.classList.toggle("hidden", key !== id);
		if (prev) prev.classList.add("hidden");
	});
	document.querySelectorAll("[data-preview-toggle] .lbl").forEach(l => (l.textContent = "Preview"));
	// footer draft selector chip
	document.getElementById("draft-chip-label").textContent = DRAFT_TITLES[id];
	document.getElementById("draft-chip-unsaved").style.display = id === "huggy" ? "" : "none";
	// popover rows
	Object.entries(rows).forEach(([key, row]) => {
		if (row) row.className = key === id ? ROW_CURRENT : ROW_PLAIN;
	});
	document.getElementById("row-huggy-unsaved").className = id === "huggy" ? CHIP_ON_DARK : CHIP_ON_LIGHT;
	// save-state cluster: never-typed → nothing to save; unsaved → no history/no delete;
	// saved → status + History + "Update draft" (like the real editor's draft state)
	document.getElementById("status-unsaved").style.display = id === "huggy" ? "flex" : "none";
	const statusEmpty = document.getElementById("status-empty");
	if (statusEmpty) statusEmpty.style.display = id === "new" ? "flex" : "none";
	document.getElementById("status-saved").style.display = id === "test" ? "inline" : "none";
	const savedDot = document.getElementById("saved-dot");
	if (savedDot) savedDot.style.display = id === "test" ? "inline" : "none";
	document.getElementById("history-btn").style.display = id === "test" ? "inline-block" : "none";
	document.getElementById("btn-delete").style.display = id === "test" ? "inline-block" : "none";
	const saveBtn = document.getElementById("btn-save");
	saveBtn.textContent = id === "test" ? "Update draft" : "Save as draft";
	// an untouched article has no slug, no cover and nobody on the byline yet
	const slug = document.getElementById("slug-input");
	if (slug) slug.value = DRAFT_SLUGS[id];
	setThumbFilled(id !== "new");
	["coauthor-chunte", "coauthor-julien"].forEach(rowId => {
		const row = document.getElementById(rowId);
		if (row) row.style.display = id === "new" ? "none" : "flex";
	});
	if (id === "test") { savedSeconds = 120; renderSaved(); }
	closeSettings();
}
document.querySelectorAll("#draft-popover [data-draft]").forEach(row =>
	row.addEventListener("click", () => selectDraft(row.dataset.draft))
);
if (document.getElementById("row-test")) selectDraft("huggy");

// ── Option 2: Article settings expand the footer upward (not a popover)
const settingsPanel = document.getElementById("settings-panel");
if (settingsPanel) {
	const settingsToggle = document.getElementById("settings-btn");
	settingsToggle.addEventListener("click", () => {
		const open = !settingsPanel.classList.toggle("hidden");
		settingsToggle.classList.toggle("tag-active", open);
	});
}

// ── Option 2: drafts sidebar switching + save lifecycle.
// "Designing Huggy" starts never-saved (amber status, plain "Save as draft");
// "Test" is the saved example (green status, split Update draft + history).
const o2RowHuggy = document.getElementById("o2-row-huggy");
const o2RowTest = document.getElementById("o2-row-test");
if (o2RowHuggy && o2RowTest) {
	const O2_CUR = "mb-px flex w-full items-center justify-between gap-1.5 truncate rounded-lg bg-black px-1.5 py-0.5 text-left text-gray-200";
	const O2_PLAIN = "mb-px flex w-full items-center justify-between gap-1.5 truncate rounded-lg px-1.5 py-0.5 text-left text-gray-500 hover:text-gray-900";
	const o2Saved = { huggy: false, test: true };
	const o2SavedAtMs = { huggy: 0, test: Date.now() - 120000 };
	const saveB = document.getElementById("btn-save");
	const historySeg = document.getElementById("btn-history");
	const chip = document.getElementById("sidebar-unsaved-chip");
	function renderO2() {
		const isTest = currentDraft === "test";
		// editor panes — always come back in edit mode
		document.getElementById("md-source").classList.toggle("hidden", isTest);
		document.getElementById("md-source-test").classList.toggle("hidden", !isTest);
		document.getElementById("md-preview").classList.add("hidden");
		document.getElementById("md-preview-test").classList.add("hidden");
		document.querySelectorAll("[data-preview-toggle] .lbl").forEach(l => (l.textContent = "Preview"));
		// sidebar rows (unsaved chip travels with the huggy row, dark on current)
		o2RowHuggy.className = isTest ? O2_PLAIN : O2_CUR;
		o2RowTest.className = isTest ? O2_CUR : O2_PLAIN;
		chip.className = isTest ? CHIP_ON_LIGHT : CHIP_ON_DARK;
		chip.style.display = o2Saved.huggy ? "none" : "";
		// footer save state for the active draft
		const isSaved = o2Saved[currentDraft];
		document.getElementById("status-unsaved").style.display = isSaved ? "none" : "flex";
		document.getElementById("status-saved").style.display = isSaved ? "flex" : "none";
		saveB.textContent = isSaved ? "Update draft" : "Save as draft";
		historySeg.style.display = isSaved ? "flex" : "none";
		if (isSaved) {
			savedSeconds = Math.max(0, Math.round((Date.now() - o2SavedAtMs[currentDraft]) / 1000));
			renderSaved();
		}
	}
	o2RowHuggy.addEventListener("click", () => { currentDraft = "huggy"; renderO2(); });
	o2RowTest.addEventListener("click", () => { currentDraft = "test"; renderO2(); });
	saveB.addEventListener("click", () => {
		const first = !o2Saved[currentDraft];
		o2Saved[currentDraft] = true;
		o2SavedAtMs[currentDraft] = Date.now();
		renderO2();
		showToast(first ? "Draft saved — demo only 🤗" : "Draft updated — demo only 🤗");
	});
	historySeg.addEventListener("click", () => showToast("Version history would open here — demo only"));
	renderO2();
}

// ── Thumbnail replace (always-on translucent button)
document.querySelectorAll("[data-thumb-replace]").forEach(btn =>
	btn.addEventListener("click", () => showToast("Demo only — a file picker would open here"))
);

// ── Thumbnail remove / restore (both options)
document.querySelectorAll("[data-thumb-remove]").forEach(btn =>
	btn.addEventListener("click", () => {
		document.querySelectorAll("[data-thumb-filled]").forEach(el => el.classList.add("hidden"));
		document.querySelectorAll("[data-thumb-empty]").forEach(el => el.classList.remove("hidden"));
	})
);
document.querySelectorAll("[data-thumb-add]").forEach(btn =>
	btn.addEventListener("click", () => {
		document.querySelectorAll("[data-thumb-filled]").forEach(el => el.classList.remove("hidden"));
		document.querySelectorAll("[data-thumb-empty]").forEach(el => el.classList.add("hidden"));
	})
);

// ── Namespace picker: keep the visible label in sync with the native select
(function namespacePicker() {
	const sel = document.getElementById("ns-select");
	const label = document.getElementById("ns-label");
	if (!sel || !label) return;
	sel.addEventListener("change", () => { label.textContent = sel.value; });
})();
