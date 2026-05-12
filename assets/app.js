const STORAGE_KEY = "agentic-sdlc-gemini-cli-lab:v1";
const COURSE_MARKDOWN = window.COURSE_MARKDOWN || "";

const dom = {
  contentRoot: document.querySelector("#contentRoot"),
  partNav: document.querySelector("#partNav"),
  progressText: document.querySelector("#progressText"),
  progressDetail: document.querySelector("#progressDetail"),
  progressBar: document.querySelector("#progressBar"),
  uuidText: document.querySelector("#uuidText"),
  themeToggle: document.querySelector("#themeToggle"),
  themeLabel: document.querySelector("#themeLabel"),
  resetButton: document.querySelector("#resetButton"),
  certificateGate: document.querySelector("#certificateGate"),
  certificatePanel: document.querySelector("#certificatePanel"),
  certificateName: document.querySelector("#certificateName"),
  certificateButton: document.querySelector("#certificateButton"),
  certificateDisplayName: document.querySelector("#certificateDisplayName"),
  certificateUuid: document.querySelector("#certificateUuid"),
  certificateDate: document.querySelector("#certificateDate"),
  printCertificate: document.querySelector("#printCertificate"),
  partTemplate: document.querySelector("#partTemplate"),
  itemTemplate: document.querySelector("#itemTemplate"),
};

const course = parseCourse(COURSE_MARKDOWN);
const allItems = course.groups.flatMap((group) => group.items);
const itemIds = new Set(allItems.map((item) => item.id));
let state = normalizeState(loadState());

init();

function init() {
  if (!COURSE_MARKDOWN.trim()) {
    dom.contentRoot.innerHTML = renderError("ไม่พบเนื้อหา markdown สำหรับสร้างแบบฝึกหัด");
    return;
  }

  applyTheme(state.theme);
  renderCourse();
  bindControls();
  updateProgressUI();
  refreshIcons();
}

function bindControls() {
  dom.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    applyTheme(state.theme);
  });

  dom.resetButton.addEventListener("click", () => {
    const confirmed = window.confirm("Reset progress และสร้าง UUID ใหม่?");
    if (!confirmed) return;
    state = createInitialState();
    saveState();
    dom.certificateName.value = "";
    document.querySelectorAll(".item-card").forEach((card) => card.classList.remove("is-complete"));
    document.querySelectorAll(".complete-button").forEach((button) => setButtonState(button, false));
    document.querySelectorAll(".part-toggle-button").forEach((button) => {
      button.classList.remove("is-part-complete");
      button.innerHTML = '<i data-lucide="check-square" class="h-4 w-4"></i><span>Complete all</span>';
    });
    updateProgressUI();
    refreshIcons();
  });

  dom.certificateName.addEventListener("input", () => {
    state.certificateName = dom.certificateName.value;
    saveState();
    updateCertificateUI();
  });

  dom.certificateButton.addEventListener("click", () => {
    const name = dom.certificateName.value.trim();
    if (!name) {
      dom.certificateName.focus();
      return;
    }
    state.certificateName = name;
    state.issuedAt = state.issuedAt || new Date().toISOString();
    saveState();
    updateCertificateUI(true);
  });

  dom.printCertificate.addEventListener("click", () => window.print());
}

function renderCourse() {
  dom.partNav.innerHTML = "";
  dom.contentRoot.innerHTML = "";

  course.groups.forEach((group, groupIndex) => {
    const navLink = document.createElement("a");
    navLink.href = `#${group.id}`;
    navLink.className = "part-nav-link text-sm font-semibold text-slate-700 dark:text-slate-200";
    navLink.dataset.groupId = group.id;
    navLink.innerHTML = `
      <span class="truncate">${escapeHtml(group.navTitle)}</span>
      <span class="nav-percent bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">0%</span>
    `;
    dom.partNav.appendChild(navLink);

    const partNode = dom.partTemplate.content.firstElementChild.cloneNode(true);
    partNode.id = group.id;
    partNode.dataset.groupId = group.id;
    partNode.querySelector(".part-kicker").textContent = group.kicker;
    partNode.querySelector(".part-title").textContent = group.title;
    partNode.querySelector(".part-count").textContent = `${group.items.length} หัวข้อย่อย`;

    const partToggleButton = partNode.querySelector(".part-toggle-button");
    partToggleButton.dataset.groupId = group.id;
    partToggleButton.addEventListener("click", () => togglePartComplete(group.id));

    const itemsRoot = partNode.querySelector(".part-items");
    if (group.introMarkdown.trim()) {
      const intro = document.createElement("div");
      intro.className = "markdown-body border-b border-violet-100 p-4 dark:border-violet-900/20 sm:p-5";
      intro.innerHTML = renderMarkdown(group.introMarkdown);
      itemsRoot.appendChild(intro);
    }

    group.items.forEach((item, itemIndex) => {
      const itemNode = dom.itemTemplate.content.firstElementChild.cloneNode(true);
      itemNode.id = item.id;
      itemNode.dataset.itemId = item.id;
      itemNode.dataset.groupId = group.id;
      itemNode.querySelector(".item-meta").textContent = item.meta || `หัวข้อที่ ${itemIndex + 1}`;
      itemNode.querySelector(".item-title").textContent = item.title;
      itemNode.querySelector(".markdown-body").innerHTML = renderMarkdown(item.markdown);

      const completeButton = itemNode.querySelector(".complete-button");
      completeButton.dataset.itemId = item.id;
      completeButton.addEventListener("click", () => toggleComplete(item.id));
      setButtonState(completeButton, state.completed.includes(item.id));

      if (state.completed.includes(item.id)) {
        itemNode.classList.add("is-complete");
      }

      itemsRoot.appendChild(itemNode);
    });

    dom.contentRoot.appendChild(partNode);

    if (groupIndex === 0) {
      navLink.setAttribute("aria-current", "true");
    }
  });

  dom.certificateName.value = state.certificateName || "";
}

function toggleComplete(itemId) {
  if (state.completed.includes(itemId)) {
    state.completed = state.completed.filter((id) => id !== itemId);
  } else {
    state.completed = [...state.completed, itemId];
  }

  if (state.completed.length !== allItems.length) {
    state.issuedAt = "";
  }

  saveState();
  updateProgressUI();
}

function togglePartComplete(groupId) {
  const group = course.groups.find((g) => g.id === groupId);
  if (!group) return;

  const groupItemIds = group.items.map((item) => item.id);
  const allDone = groupItemIds.every((id) => state.completed.includes(id));

  if (allDone) {
    state.completed = state.completed.filter((id) => !groupItemIds.includes(id));
  } else {
    const newCompleted = new Set(state.completed);
    groupItemIds.forEach((id) => newCompleted.add(id));
    state.completed = [...newCompleted];
  }

  if (state.completed.length !== allItems.length) {
    state.issuedAt = "";
  }

  saveState();
  updateProgressUI();
}

function updateProgressUI() {
  const completedCount = state.completed.length;
  const totalCount = allItems.length;
  const percent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  dom.progressText.textContent = `${percent}%`;
  dom.progressDetail.textContent = `${completedCount} of ${totalCount} completed`;
  dom.progressBar.style.width = `${percent}%`;
  dom.uuidText.textContent = state.uuid;

  allItems.forEach((item) => {
    const isComplete = state.completed.includes(item.id);
    const card = document.querySelector(`[data-item-id="${cssEscape(item.id)}"].item-card`);
    const button = document.querySelector(`.complete-button[data-item-id="${cssEscape(item.id)}"]`);
    if (card) card.classList.toggle("is-complete", isComplete);
    if (button) setButtonState(button, isComplete);
  });

  course.groups.forEach((group) => {
    const groupCompleted = group.items.filter((item) => state.completed.includes(item.id)).length;
    const groupPercent = group.items.length ? Math.round((groupCompleted / group.items.length) * 100) : 0;
    const navLink = document.querySelector(`.part-nav-link[data-group-id="${cssEscape(group.id)}"]`);
    const partCount = document.querySelector(`#${cssEscape(group.id)} .part-count`);

    if (navLink) {
      const badge = navLink.querySelector(".nav-percent");
      badge.textContent = `${groupPercent}%`;
      badge.className = [
        "nav-percent",
        groupPercent === 100
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
          : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
      ].join(" ");
    }

    if (partCount) {
      partCount.textContent = `${groupCompleted}/${group.items.length} หัวข้อย่อยเสร็จแล้ว`;
    }

    const partToggleButton = document.querySelector(`.part-toggle-button[data-group-id="${cssEscape(group.id)}"]`);
    if (partToggleButton) {
      const allDone = group.items.length > 0 && groupCompleted === group.items.length;
      partToggleButton.classList.toggle("is-part-complete", allDone);
      partToggleButton.innerHTML = allDone
        ? '<i data-lucide="check-check" class="h-4 w-4"></i><span>Completed</span>'
        : '<i data-lucide="check-square" class="h-4 w-4"></i><span>Complete all</span>';
    }
  });

  const isCompleteAll = totalCount > 0 && completedCount === totalCount;
  dom.certificateGate.classList.toggle("hidden", !isCompleteAll);
  if (!isCompleteAll) {
    dom.certificatePanel.classList.add("hidden");
  }

  updateCertificateUI();
  refreshIcons();
}

function updateCertificateUI(forceOpen = false) {
  const hasName = Boolean((state.certificateName || "").trim());
  const completeAll = state.completed.length === allItems.length && allItems.length > 0;
  const shouldShow = completeAll && hasName && (forceOpen || Boolean(state.issuedAt));

  dom.certificateDisplayName.textContent = state.certificateName || "";
  dom.certificateUuid.textContent = state.uuid;
  dom.certificateDate.textContent = state.issuedAt
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(state.issuedAt))
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date());
  dom.certificatePanel.classList.toggle("hidden", !shouldShow);
}

function setButtonState(button, isComplete) {
  button.setAttribute("aria-pressed", String(isComplete));
  button.innerHTML = isComplete
    ? '<i data-lucide="check-circle-2" class="h-4 w-4"></i><span>Completed</span>'
    : '<i data-lucide="circle" class="h-4 w-4"></i><span>Mark complete</span>';
}

function applyTheme(theme) {
  const resolved = theme || preferredTheme();
  document.documentElement.classList.toggle("dark", resolved === "dark");
  dom.themeLabel.textContent = resolved === "dark" ? "Light" : "Dark";
  dom.themeToggle.innerHTML =
    resolved === "dark"
      ? '<i data-lucide="sun" class="h-4 w-4"></i><span id="themeLabel">Light</span>'
      : '<i data-lucide="moon" class="h-4 w-4"></i><span id="themeLabel">Dark</span>';
  dom.themeLabel = document.querySelector("#themeLabel");
  refreshIcons();
}

function preferredTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : createInitialState();
  } catch {
    return createInitialState();
  }
}

function normalizeState(value) {
  const next = {
    ...createInitialState(),
    ...(value && typeof value === "object" ? value : {}),
  };
  next.uuid = typeof next.uuid === "string" && next.uuid ? next.uuid : createUuid();
  next.completed = Array.isArray(next.completed) ? next.completed.filter((id) => itemIds.has(id)) : [];
  next.theme = next.theme === "dark" || next.theme === "light" ? next.theme : preferredTheme();
  next.certificateName = typeof next.certificateName === "string" ? next.certificateName : "";
  next.issuedAt = typeof next.issuedAt === "string" ? next.issuedAt : "";
  saveState(next);
  return next;
}

function createInitialState() {
  return {
    uuid: createUuid(),
    completed: [],
    theme: preferredTheme(),
    certificateName: "",
    issuedAt: "",
  };
}

function saveState(nextState = state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function createUuid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (Number(char) ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(char) / 4)))).toString(16),
  );
}

function parseCourse(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headings = collectHeadings(lines);
  const firstTitle = headings.find((heading) => heading.level === 1)?.text || "Agentic SDLC Gemini CLI Lab";
  const firstPartIndex = headings.findIndex((heading) => heading.level === 1 && /^Part\s+[A-Z]:/.test(heading.text));
  const firstPartLine = firstPartIndex >= 0 ? headings[firstPartIndex].line : lines.length;
  const groups = [];

  const introHeadings = headings.filter((heading) => heading.level === 2 && heading.line < firstPartLine);
  const firstIntroItemLine = introHeadings[0]?.line ?? firstPartLine;
  groups.push({
    id: "part-intro",
    title: firstTitle,
    navTitle: "Intro",
    kicker: "Intro",
    introMarkdown: sliceLines(lines, 1, firstIntroItemLine),
    items: introHeadings.map((heading, index) => {
      const end = introHeadings[index + 1]?.line ?? firstPartLine;
      return createItem("part-intro", index, heading.text, "Overview", sliceLines(lines, heading.line + 1, end));
    }),
  });

  const partHeadings = headings.filter((heading) => heading.level === 1 && /^Part\s+[A-Z]:/.test(heading.text));
  const summaryHeading = headings.find((heading) => heading.level === 1 && heading.text.trim() === "สรุป");

  partHeadings.forEach((partHeading, partIndex) => {
    const nextPart = partHeadings[partIndex + 1];
    const endLine = nextPart?.line ?? summaryHeading?.line ?? lines.length;
    const groupId = `part-${partHeading.text.match(/^Part\s+([A-Z])/)?.[1]?.toLowerCase() || partIndex}`;
    const isPartE = /^Part\s+E:/.test(partHeading.text);
    const itemHeadings = headings.filter((heading) => {
      if (heading.line <= partHeading.line || heading.line >= endLine) return false;
      return isPartE ? heading.level === 1 && /^Phase\s+\d+/.test(heading.text) : heading.level === 2;
    });

    const firstItemLine = itemHeadings[0]?.line ?? endLine;
    const items = itemHeadings.length
      ? itemHeadings.map((heading, index) => {
          const end = itemHeadings[index + 1]?.line ?? endLine;
          const meta = isPartE ? "SDLC Phase" : partHeading.text.split(":")[0];
          return createItem(groupId, index, heading.text, meta, sliceLines(lines, heading.line + 1, end));
        })
      : [createItem(groupId, 0, partHeading.text, "Part", sliceLines(lines, partHeading.line + 1, endLine))];

    groups.push({
      id: groupId,
      title: partHeading.text,
      navTitle: partHeading.text.replace(/^Part\s+/, ""),
      kicker: partHeading.text.split(":")[0],
      introMarkdown: sliceLines(lines, partHeading.line + 1, firstItemLine),
      items,
    });
  });

  if (summaryHeading) {
    groups.push({
      id: "part-summary",
      title: "สรุป",
      navTitle: "สรุป",
      kicker: "Final",
      introMarkdown: "",
      items: [createItem("part-summary", 0, "สรุปแบบฝึกหัด", "Final", sliceLines(lines, summaryHeading.line + 1, lines.length))],
    });
  }

  return { groups };
}

function collectHeadings(lines) {
  const headings = [];
  let inFence = false;
  let heredocDelimiter = "";

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!inFence && trimmed.startsWith("```")) {
      inFence = true;
      return;
    }

    if (inFence) {
      if (heredocDelimiter) {
        if (trimmed === heredocDelimiter) {
          heredocDelimiter = "";
        }
        return;
      }

      const nextDelimiter = detectHeredocDelimiter(line);
      if (nextDelimiter) {
        heredocDelimiter = nextDelimiter;
        return;
      }

      if (trimmed.startsWith("```")) {
        inFence = false;
      }
      return;
    }

    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return;

    headings.push({
      line: index,
      level: match[1].length,
      text: match[2].trim(),
    });
  });

  return headings;
}

function detectHeredocDelimiter(line) {
  const match = /<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/.exec(line);
  return match ? match[1] : "";
}

function createItem(groupId, index, title, meta, markdown) {
  return {
    id: `${groupId}-item-${index + 1}`,
    title,
    meta,
    markdown,
  };
}

function sliceLines(lines, start, end) {
  return lines.slice(start, end).join("\n").trim();
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines = [];
      let heredocDelimiter = "";
      index += 1;

      while (index < lines.length) {
        const currentLine = lines[index];
        const currentTrimmed = currentLine.trim();

        if (heredocDelimiter) {
          codeLines.push(currentLine);
          if (currentTrimmed === heredocDelimiter) {
            heredocDelimiter = "";
          }
          index += 1;
          continue;
        }

        const nextDelimiter = detectHeredocDelimiter(currentLine);
        if (nextDelimiter) {
          heredocDelimiter = nextDelimiter;
          codeLines.push(currentLine);
          index += 1;
          continue;
        }

        if (currentTrimmed.startsWith("```")) {
          break;
        }

        codeLines.push(currentLine);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }
      html.push(`<pre><code data-language="${escapeHtml(language)}">${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      const level = Math.min(match[1].length + 1, 4);
      html.push(`<h${level}>${renderInline(match[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return html.join("");
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  const trimmed = line.trim();
  return (
    trimmed.startsWith("```") ||
    /^#{1,6}\s+/.test(line) ||
    /^---+$/.test(trimmed) ||
    isTableStart(lines, index) ||
    trimmed.startsWith(">") ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line)
  );
}

function isTableStart(lines, index) {
  const line = lines[index] || "";
  const next = lines[index + 1] || "";
  return line.includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(next);
}

function renderTable(tableLines) {
  const header = splitTableRow(tableLines[0]);
  const body = tableLines.slice(2).map(splitTableRow);
  return `
    <table>
      <thead><tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>
      <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(text) {
  return text
    .split(/(`[^`]*`)/g)
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      return formatInlineText(escapeHtml(part));
    })
    .join("");
}

function formatInlineText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function renderError(message) {
  return `<div class="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-800">${escapeHtml(message)}</div>`;
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

window.addEventListener("load", refreshIcons);
