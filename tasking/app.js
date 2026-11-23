/* Trang TASKING, song ngữ VI/EN.
   - Nội dung hai ngôn ngữ nằm trong content.js (CONTENT.vi, CONTENT.en); file này chỉ chứa logic.
   - Ngôn ngữ do script nhỏ trong <head> chọn (?lang=, rồi localStorage 'byherk-lang' dùng chung với trang danh mục, rồi
     ngôn ngữ trình duyệt) và ghi vào html lang. File này đọc lại từ đó.
   - Bản Instructions nằm ở TASKING.vi.md (VI) và TASKING.en.md (EN), nạp bằng fetch theo ngôn ngữ đang chọn. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const term = k => `<span class="term" data-term="${esc(k)}">${esc(k)}</span>`;

const LANG_KEY = "byherk-lang";
const CANONICAL = "https://byherk.github.io/projects/tasking/";
let lang = CONTENT[document.documentElement.lang] ? document.documentElement.lang : "vi";
const C = () => CONTENT[lang];
const U = () => CONTENT[lang].ui;
const val = el => el.value.trim();

/* ----- Ô Thử ngay: trạng thái ----- */
let typeId = "meeting", manualType = false, full = false, exIdx = 0, exampleOn = true;
const f = { raw: $("#b-raw"), target: $("#b-target"), art: $("#b-art"), lim: $("#b-lim"), int: $("#b-int") };
const typeOf = id => C().types.find(x => x.id === id);

function detect(text) {
  for (const id of C().detectOrder) { if (typeOf(id).kw.test(text)) return id; }
  return "other";
}

/* Ghép prompt: dùng chung cho ô Thử ngay, ví dụ "Sau" và các mẫu, để mọi prompt cùng một cấu trúc:
   lời mở (vai trò), Việc cần làm, các mục có nhãn cố định, Quy tắc trả lời, rồi Nội dung ở cuối. */
function compose(x) {
  const P = C().prompt, L = P.labels;
  const block = (label, v) => Array.isArray(v) ? [`${label}:`, ...v.map(s => `- ${s}`)] : [`${label}: ${v}`];
  const out = [P.role, "", ...block(L.task, x.task), "", ...block(L.target, x.target), "", ...block(L.art, x.art), ""];
  out.push(`${L.std}:`, ...x.std.map(s => `- ${s}`), `- ${P.selfCheck}`, "", ...block(L.lim, x.lim), "");
  const extra = [];
  if (x.int) extra.push(`${L.int}: ${x.int}`);
  if (x.names) extra.push(`${L.names}: ${x.names}`);
  if (x.plan) extra.push(`${L.plan}: ${x.plan === "outlineFirst" ? P.outlineFirst : x.plan}`);
  if (extra.length) out.push(...extra, "");
  out.push(`${L.rules}:`, ...P.rules.map(r => `- ${r}`));
  if (x.mat) out.push("", `${L.mat}: ${x.mat}`);
  return out.join("\n");
}

const sentence = s => s.replace(/\.+$/, "") + ".";

function buildPrompt() {
  const P = C().prompt, t = typeOf(typeId);
  const deadline = val(f.int) ? sentence(val(f.int)) : "";
  return compose({
    task: val(f.raw) || P.rawFallback,
    target: val(f.target) || t.target,
    art: val(f.art) || t.art,
    std: t.std,
    lim: val(f.lim) || t.lim,
    int: full ? `${deadline || P.noDeadline} ${P.maxRounds}` : deadline,
    names: full ? P.names : "",
    plan: full ? P.plan : "",
    mat: t.mat,
  });
}

function renderBuilder() {
  /* Chỉ tự gợi ý loại việc khi người dùng chưa tự chọn; tự chọn rồi thì giữ nguyên đến khi xóa hoặc đổi ví dụ. */
  if (!manualType && val(f.raw)) typeId = detect(val(f.raw));
  const t = typeOf(typeId);
  $$(".type").forEach(b => b.setAttribute("aria-pressed", b.dataset.id === typeId ? "true" : "false"));
  f.target.placeholder = t.target; f.art.placeholder = t.art; f.lim.placeholder = t.lim;
  f.int.placeholder = full ? U().intPlaceholderFull : U().intPlaceholderQuick;
  $("#m-quick").setAttribute("aria-pressed", full ? "false" : "true");
  $("#m-full").setAttribute("aria-pressed", full ? "true" : "false");
  $("#b-out").textContent = buildPrompt();
}
function setExample(on) { exampleOn = on; $("#ex-flag").hidden = !on; }
function loadExample(i) {
  const e = C().examples[i]; f.raw.value = e.raw; f.target.value = e.target; f.art.value = e.art; f.lim.value = e.lim; f.int.value = e.int;
  manualType = false; setExample(true); renderBuilder();
}
Object.values(f).forEach(el => el.addEventListener("input", () => { setExample(false); renderBuilder(); }));
$("#types").addEventListener("click", e => {
  const b = e.target.closest(".type");
  if (b) { typeId = b.dataset.id; manualType = true; renderBuilder(); }
});
$("#m-quick").addEventListener("click", () => { full = false; renderBuilder(); });
$("#m-full").addEventListener("click", () => { full = true; renderBuilder(); });
$("#b-example").addEventListener("click", () => { exIdx = (exIdx + 1) % C().examples.length; loadExample(exIdx); });
$("#b-clear").addEventListener("click", () => {
  Object.values(f).forEach(el => el.value = ""); manualType = false; typeId = "other"; setExample(false); renderBuilder(); f.raw.focus();
});

/* ----- Mẫu prompt: nhóm + tab ----- */
let gIdx = 0, tIdx = 0;
$("#groups").addEventListener("click", e => {
  const b = e.target.closest(".group");
  if (b) { gIdx = +b.dataset.i; tIdx = 0; drawTabs(); }
});
$("#tabs").addEventListener("click", e => {
  const b = e.target.closest(".tab");
  if (b) { tIdx = +b.dataset.i; showTpl(); }
});
function drawGroups() {
  $("#groups").innerHTML = C().groups.map((g, i) => `<button type="button" class="group" data-i="${i}" aria-pressed="false">${esc(g.name)}</button>`).join("");
}
function drawTabs() {
  $$(".group").forEach((b, i) => b.setAttribute("aria-pressed", i === gIdx ? "true" : "false"));
  $("#tabs").innerHTML = C().groups[gIdx].items.map((t, i) => `<button class="tab" type="button" role="tab" data-i="${i}" aria-selected="false">${esc(t.short)}</button>`).join("");
  showTpl();
}
function currentTplText() {
  const t = C().groups[gIdx].items[tIdx];
  return t.text ?? compose(t.f);
}
function showTpl() {
  const t = C().groups[gIdx].items[tIdx];
  $("#tpl-title").textContent = t.title;
  $("#tpl-use").textContent = t.use;
  $("#tpl-body").textContent = currentTplText();
  $$(".tab").forEach((b, k) => b.setAttribute("aria-selected", k === tIdx ? "true" : "false"));
}

/* ----- Sao chép ----- */
const toast = $("#toast");
let tt;
function say(msg, ms = 2400) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("show"), ms); }
function selectText(el) {
  const r = document.createRange(); r.selectNodeContents(el);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}
/* Khi trình duyệt chặn sao chép: bôi đen sẵn khung chữ tương ứng để người dùng tự sao chép. */
async function copyText(text, btn, sourceEl) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.left = "0"; ta.style.top = "0";
      document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove();
    } catch (e2) { ok = false; }
  }
  if (ok) {
    say(U().copied);
    if (btn) { btn.textContent = U().copiedBtn; btn.classList.add("ok"); setTimeout(() => { btn.textContent = U()[btn.dataset.i18n]; btn.classList.remove("ok"); }, 2000); }
  } else if (sourceEl) {
    const d = sourceEl.closest("details"); if (d) d.open = true;
    selectText(sourceEl);
    say(U().copyFailed, 5000);
  }
}

/* Bản Instructions: nạp file theo ngôn ngữ. Tải lỗi thì báo ở khối Xem nội dung và vô hiệu nút Sao chép. */
let FULL = "", fullToken = 0;
function loadInstructions() {
  const token = ++fullToken;
  FULL = "";
  $("#full-copy").disabled = false;
  $("#full-pre").textContent = "";
  fetch(lang === "en" ? "TASKING.en.md" : "TASKING.vi.md")
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    .then(t => { if (token === fullToken) { FULL = t.trim(); $("#full-pre").textContent = FULL; } })
    .catch(() => { if (token === fullToken) { $("#full-pre").textContent = U().loadError; $("#full-copy").disabled = true; } });
}
$("#full-copy").addEventListener("click", e => { if (FULL) copyText(FULL, e.currentTarget, $("#full-pre")); });
$("#tpl-copy").addEventListener("click", e => copyText(currentTplText(), e.currentTarget, $("#tpl-body")));
$("#b-copy").addEventListener("click", e => copyText(buildPrompt(), e.currentTarget, $("#b-out")));

/* ----- Mục lục tự sinh ----- */
const secs = $$("section[data-nav]");
function drawToc() {
  $("#toc").innerHTML = secs.map(s => `<a href="#${s.id}">${esc(U().nav[s.dataset.nav])}</a>`).join("");
}
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) $$("#toc a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id)); });
  }, { rootMargin: "-40% 0px -55% 0px" });
  secs.forEach(s => io.observe(s));
}

/* ----- Ngôn ngữ ----- */
function applyGloss(root = document) {
  $$(".term", root).forEach(el => { const g = C().gloss[el.dataset.term]; if (g) { el.dataset.tip = g; el.tabIndex = 0; } });
}

function drawStatic() {
  const u = U();
  document.documentElement.lang = lang;
  document.title = u.pageTitle;
  $('meta[name="description"]').setAttribute("content", u.metaDescription);
  $('link[rel="canonical"]').setAttribute("href", lang === "en" ? CANONICAL + "?lang=en" : CANONICAL);
  $$("[data-i18n]").forEach(el => { el.textContent = u[el.dataset.i18n]; });
  $$("[data-i18n-html]").forEach(el => { el.innerHTML = u[el.dataset.i18nHtml]; });
  for (const attr of ["aria-label", "title"]) {
    $$(`[data-i18n-${attr}]`).forEach(el => el.setAttribute(attr, u[el.getAttribute(`data-i18n-${attr}`)]));
  }
  $("#b-raw").placeholder = u.rawPlaceholder;
  $("#stack").innerHTML = C().letters.map(x => `
  <div class="lrow"><div class="L" aria-hidden="true">${x.L}</div>
  <div class="R"><div class="w"><strong>${esc(x.name)}</strong>${x.term ? `<span class="en">${term(x.term)}</span>` : ""}</div><div class="q">${esc(x.q)}</div></div></div>`).join("");
  $("#after-body").textContent = compose({ ...C().afterExample, int: C().prompt.maxRounds, names: C().prompt.names, plan: C().prompt.plan });
  drawToc();
  const next = lang === "vi" ? "en" : "vi";
  const btn = $(".lang-toggle");
  btn.textContent = next.toUpperCase();
  btn.lang = next;
  btn.setAttribute("aria-label", CONTENT[next].ui.langName);
  btn.title = CONTENT[next].ui.langName;
}

function drawAll() {
  drawStatic();
  $("#types").innerHTML = C().types.map(t => `<button type="button" class="type" data-id="${t.id}" aria-pressed="false">${esc(t.label)}</button>`).join("");
  drawGroups();
  drawTabs();
  /* Đang hiện ví dụ thì đổi sang ví dụ cùng thứ tự của ngôn ngữ mới; chữ người dùng tự gõ thì giữ nguyên. */
  if (exampleOn) loadExample(exIdx); else renderBuilder();
  applyGloss();
  loadInstructions();
}

/* Đổi ngôn ngữ không tải lại trang; ghi lại vào localStorage và ?lang= trên URL (giữ tham số khác và #hash). */
function setLang(next) {
  if (!CONTENT[next]) return;
  lang = next;
  try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* trình duyệt chặn lưu trữ: vẫn đổi được trong phiên này */ }
  const url = new URL(location.href);
  url.searchParams.set("lang", next);
  history.replaceState(history.state, "", url);
  drawAll();
}
$(".lang-toggle").addEventListener("click", () => setLang(lang === "vi" ? "en" : "vi"));

drawAll();
