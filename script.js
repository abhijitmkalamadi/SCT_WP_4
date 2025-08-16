/* =========================
   SELECTORS
========================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const themeToggle = $("#themeToggle");
const body = document.body;

const titleInput = $("#taskTitle");
const descInput = $("#taskDesc");
const dateInput = $("#taskDateTime");
const addBtn = $("#addTaskBtn");

const runningList = $("#runningTasks");
const completedList = $("#completedTasks");

/* =========================
   STORAGE (only theme kept)
========================= */
const THEME_KEY = "theme";

// tasks will live only in memory
let tasks = [];

/* Task shape:
{
  id: string,
  title: string,
  desc: string,
  dateTime: string (ISO or empty),
  completed: boolean,
  createdAt: number,
  completedAt?: number
}
*/

/* =========================
   THEME
========================= */
function applyTheme(mode) {
  body.classList.toggle("dark-mode", mode === "dark");
  body.classList.toggle("light-mode", mode === "light");
  themeToggle.checked = mode === "dark";
  localStorage.setItem(THEME_KEY, mode);
}

(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    applyTheme(body.classList.contains("dark-mode") ? "dark" : "light");
  }
})();

themeToggle.addEventListener("change", () => {
  applyTheme(themeToggle.checked ? "dark" : "light");
});

/* =========================
   UTILITIES
========================= */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

/* Sort */
function sortTasks() {
  const running = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  running.sort((a, b) => {
    const aHas = !!a.dateTime, bHas = !!b.dateTime;
    if (aHas && bHas) return new Date(a.dateTime) - new Date(b.dateTime) || a.createdAt - b.createdAt;
    if (aHas) return -1;
    if (bHas) return 1;
    return a.createdAt - b.createdAt;
  });

  done.sort((a, b) => {
    const aC = a.completedAt || 0, bC = b.completedAt || 0;
    if (bC !== aC) return bC - aC;
    return b.createdAt - a.createdAt;
  });

  return { running, done };
}

/* =========================
   RENDER
========================= */
function taskItemHTML(t) {
  const dateStr = formatDateTime(t.dateTime);
  return `
    <div class="task-details">
      <h3>${escapeHTML(t.title)}</h3>
      ${t.desc ? `<p>${escapeHTML(t.desc)}</p>` : ``}
      ${dateStr ? `<span class="task-date">${dateStr}</span>` : ``}
    </div>
    <div class="task-actions">
      <button class="btn-complete" title="${t.completed ? "Mark as Running" : "Mark as Completed"}" aria-label="toggle complete">
        ${t.completed ? "↩️" : "✅"}
      </button>
      <button class="btn-edit" title="Edit Task" aria-label="edit">✏️</button>
      <button class="btn-delete" title="Delete Task" aria-label="delete">🗑️</button>
    </div>
  `;
}

function render() {
  const { running, done } = sortTasks();
  runningList.innerHTML = "";
  completedList.innerHTML = "";

  for (const t of running) {
    const li = document.createElement("li");
    li.className = "task";
    li.dataset.id = t.id;
    li.innerHTML = taskItemHTML(t);
    runningList.appendChild(li);
  }

  for (const t of done) {
    const li = document.createElement("li");
    li.className = "task completed-task";
    li.dataset.id = t.id;
    li.innerHTML = taskItemHTML(t);
    completedList.appendChild(li);
  }
}

/* =========================
   SANITIZE
========================= */
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   ADD TASK
========================= */
function addTask() {
  const title = titleInput.value.trim();
  const desc = descInput.value.trim();
  const dateTime = dateInput.value;

  if (!title) {
    titleInput.focus();
    titleInput.select?.();
    return;
  }

  tasks.push({
    id: uid(),
    title,
    desc,
    dateTime,
    completed: false,
    createdAt: Date.now()
  });

  render();
  titleInput.value = "";
  descInput.value = "";
  dateInput.value = "";
  titleInput.focus();
}

addBtn.addEventListener("click", addTask);
titleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTask();
  }
});
descInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    addTask();
  }
});
dateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTask();
  }
});

/* =========================
   ACTION HANDLERS
========================= */
function findTask(id) {
  return tasks.find(t => t.id === id);
}

function toggleComplete(id) {
  const t = findTask(id);
  if (!t) return;
  t.completed = !t.completed;
  t.completedAt = t.completed ? Date.now() : undefined;
  render();
}

function deleteTask(id) {
  const i = tasks.findIndex(t => t.id === id);
  if (i === -1) return;
  if (!confirm("Delete this task?")) return;
  tasks.splice(i, 1);
  render();
}

function startEdit(id, li) {
  const t = findTask(id);
  if (!t) return;

  li.innerHTML = `
    <form class="edit-form" autocomplete="off">
      <div class="task-details">
        <input type="text" name="title" value="${escapeHTML(t.title)}" class="edit-title" required />
        <textarea name="desc" class="edit-desc" placeholder="Description (optional)">${escapeHTML(t.desc || "")}</textarea>
        <input type="datetime-local" name="dateTime" class="edit-datetime" value="${t.dateTime || ""}" />
      </div>
      <div class="task-actions">
        <button type="submit" class="btn-save" title="Save">💾</button>
        <button type="button" class="btn-cancel" title="Cancel">✖️</button>
      </div>
    </form>
  `;

  const form = $(".edit-form", li);
  const titleEl = $(".edit-title", form);
  const descEl = $(".edit-desc", form);
  const dateEl = $(".edit-datetime", form);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const newTitle = titleEl.value.trim();
    const newDesc = descEl.value.trim();
    const newDate = dateEl.value;

    if (!newTitle) {
      titleEl.focus();
      return;
    }

    t.title = newTitle;
    t.desc = newDesc;
    t.dateTime = newDate;
    render();
  });

  $(".btn-cancel", form).addEventListener("click", () => {
    render();
  });

  form.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      render();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  titleEl.focus();
  titleEl.select?.();
}

function onListClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  const li = e.target.closest(".task");
  if (!li) return;
  const id = li.dataset.id;

  if (btn.classList.contains("btn-complete")) {
    toggleComplete(id);
  } else if (btn.classList.contains("btn-delete")) {
    deleteTask(id);
  } else if (btn.classList.contains("btn-edit")) {
    startEdit(id, li);
  }
}

runningList.addEventListener("click", onListClick);
completedList.addEventListener("click", onListClick);

/* =========================
   INITIAL RENDER
========================= */
render();
