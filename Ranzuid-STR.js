// ====== PENGATURAN ======
const WA_NUMBER = "6283126512056"; // 083126512056 dalam format internasional
const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8SYam1iUxZub3IFA2L";
const ADMIN_PIN = "041522"; // hanya dipakai jika mode online belum diisi

// --- MODE ONLINE (Firebase). Isi 3 baris ini sesuai panduan ---
const FIREBASE_DB  = "ISI_DATABASE_URL";   // contoh: https://ranzuid-str-default-rtdb.asia-southeast1.firebasedatabase.app
const FIREBASE_KEY = "ISI_API_KEY";        // contoh: AIzaSy...
const ADMIN_EMAIL  = "admin@ranzuid.com";  // email akun admin di Firebase (password = PIN panel)

const STORE_KEY = "jualid.items.v1";
const DEFAULT = [
  { id: "18999299992", harga: "35K" },
  { id: "18994999999", harga: "45K" },
  { id: "18813111112", harga: "20K" },
  { id: "18813111111", harga: "25K" },
  { id: "18866666667", harga: "30K" },
  { id: "16881666661", harga: "20K" },
  { id: "17013111131", harga: "10K" }
];
// ========================

const ONLINE = !/^ISI_/.test(FIREBASE_DB) && !/^ISI_/.test(FIREBASE_KEY);
const clone = (a) => a.map((x) => ({ ...x }));
const $ = (s) => document.querySelector(s);
let items = loadCache();
let token = null;

function loadCache() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a; }
  } catch (e) {}
  return clone(DEFAULT);
}
function saveCache() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch (e) {}
}
async function fetchRemote() {
  const r = await fetch(`${FIREBASE_DB}/store.json`, { cache: "no-store" });
  if (!r.ok) throw new Error("fetch");
  const d = await r.json();
  if (d === null) return clone(DEFAULT);
  const l = d.list ? (Array.isArray(d.list) ? d.list : Object.values(d.list)) : [];
  return l.filter(Boolean);
}
async function refresh() {
  if (!ONLINE || dlg.open) return;
  try { items = await fetchRemote(); saveCache(); render(); } catch (e) {}
}
async function signIn(pin) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: pin, returnSecureToken: true })
  });
  if (!r.ok) return false;
  token = (await r.json()).idToken;
  return true;
}
// simpan ke server (online) atau ke browser (offline)
async function persist() {
  saveCache();
  if (!ONLINE) return true;
  try {
    const r = await fetch(`${FIREBASE_DB}/store.json?auth=${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ v: 1, list: items })
    });
    return r.ok;
  } catch (e) { return false; }
}

function waLink(it) {
  const t = `Assalamu'alaikum bang, saya mau membeli ID ${it.id} dengan harga ${it.harga.toLowerCase()}`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t)}`;
}
function toK(str) {
  let n = parseFloat(String(str).replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(n) || n <= 0) return null;
  if (/jt|juta/i.test(str)) n *= 1000;
  else if (!/k/i.test(str) && n >= 1000) n /= 1000;
  return `${Math.round(n * 100) / 100}K`;
}
const num = (h) => parseFloat(h) || 0;

function render() {
  const q = $("#search").value.trim();
  const list = $("#list");
  list.textContent = "";
  const shown = items.filter((i) => i.id.includes(q));
  shown.forEach((it) => {
    const c = document.createElement("article");
    c.className = "card glass";
    const id = document.createElement("div");
    id.className = "id";
    id.textContent = it.id;
    const row = document.createElement("div");
    row.className = "row";
    const p = document.createElement("span");
    p.className = "price";
    p.textContent = it.harga;
    const a = document.createElement("a");
    a.className = "btn sm";
    a.textContent = "BELI";
    a.href = waLink(it);
    a.target = "_blank";
    a.rel = "noopener";
    row.append(p, a);
    c.append(id, row);
    list.append(c);
  });
  $("#empty").hidden = shown.length > 0;

  $("#statCount").textContent = items.length;
  $("#statMin").textContent = items.length ? items.reduce((m, i) => (num(i.harga) < num(m) ? i.harga : m), items[0].harga) : "-";
  const f = items[0];
  $("#featId").textContent = f ? f.id : "Segera hadir";
  $("#featPrice").textContent = f ? f.harga : "-";
  $("#featBuy").href = f ? waLink(f) : "#";
  $("#featBuy").style.display = f ? "" : "none";
}

// ====== MENU NAVIGASI ======
const nav = $("#nav");
const burger = $("#burger");
function setMenu(open) {
  nav.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
}
burger.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("click", (e) => {
  if (!nav.classList.contains("open")) return;
  if (!e.target.closest(".top")) setMenu(false);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

// tandai menu aktif sesuai bagian yang sedang dilihat
const links = [...nav.querySelectorAll(".nav-link")];
const targets = links.map((l) => document.querySelector(l.getAttribute("href")));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === `#${en.target.id}`));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  targets.forEach((t) => t && io.observe(t));
}

// ====== PANEL TERSEMBUNYI ======
const dlg = $("#admin");
$(".hint").textContent = ONLINE
  ? "Data tersimpan online dan langsung terlihat di semua perangkat pembeli."
  : "Mode offline: data hanya tersimpan di browser ini. Isi pengaturan Firebase di Ranzuid-STR.js agar terlihat di semua perangkat.";

function openAdmin() {
  $("#pinForm").hidden = false;
  $("#panel").hidden = true;
  $("#pin").value = "";
  $("#pinMsg").textContent = "";
  dlg.showModal();
  $("#pin").focus();
}
let taps = 0, tapTimer;
$("#logo").addEventListener("click", () => {
  taps++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => (taps = 0), 1800);
  if (taps >= 5) { taps = 0; openAdmin(); }
});
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") { e.preventDefault(); openAdmin(); }
});
$("#close").addEventListener("click", () => dlg.close());
dlg.addEventListener("close", refresh);

$("#pinForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pin = $("#pin").value;
  const msg = $("#pinMsg");
  let ok;
  if (ONLINE) {
    msg.textContent = "Memeriksa...";
    try { ok = await signIn(pin); } catch (err) { msg.textContent = "Tidak ada koneksi. Coba lagi."; return; }
    if (ok) { try { items = await fetchRemote(); render(); } catch (err) {} }
  } else {
    ok = pin === ADMIN_PIN;
  }
  if (ok) {
    $("#pinForm").hidden = true;
    $("#panel").hidden = false;
    renderAdmin();
  } else {
    msg.textContent = "PIN salah. Coba lagi.";
  }
});

function renderAdmin() {
  const ul = $("#adminList");
  ul.textContent = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "Belum ada ID. Tambahkan di atas.";
    ul.append(li);
    return;
  }
  items.forEach((it, idx) => {
    const li = document.createElement("li");
    const t = document.createElement("span");
    t.className = "mono";
    t.textContent = `${it.id} | ${it.harga}`;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "Hapus";
    b.addEventListener("click", async () => {
      if (!confirm(`Hapus ID ${it.id}?`)) return;
      const prev = items;
      items = items.filter((_, i) => i !== idx);
      if (!(await persist())) {
        items = prev;
        $("#addMsg").className = "msg";
        $("#addMsg").textContent = "Gagal menyimpan ke server. Tutup panel lalu buka lagi.";
        return;
      }
      render(); renderAdmin();
    });
    li.append(t, b);
    ul.append(li);
  });
}

$("#addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#addMsg");
  msg.className = "msg";
  const id = $("#newId").value.trim();
  const harga = toK($("#newPrice").value);
  if (!/^\d{4,}$/.test(id)) { msg.textContent = "ID harus berupa angka, minimal 4 digit."; return; }
  if (!harga) { msg.textContent = "Harga tidak valid. Contoh: 30k"; return; }
  if (items.some((i) => i.id === id)) { msg.textContent = "ID itu sudah ada di daftar."; return; }
  const prev = items;
  items = [{ id, harga }, ...items];
  if (!(await persist())) {
    items = prev;
    msg.textContent = "Gagal menyimpan ke server. Tutup panel lalu buka lagi.";
    return;
  }
  render(); renderAdmin();
  e.target.reset();
  msg.className = "msg ok";
  msg.textContent = `ID ${id} ditambahkan.`;
});

$("#copy").addEventListener("click", async () => {
  const msg = $("#addMsg");
  try {
    await navigator.clipboard.writeText(JSON.stringify(items, null, 2));
    msg.className = "msg ok";
    msg.textContent = "Data tersalin (JSON).";
  } catch (e) {
    msg.className = "msg";
    msg.textContent = "Gagal menyalin. Salin manual dari daftar di atas.";
  }
});
$("#reset").addEventListener("click", async () => {
  if (!confirm("Kembalikan daftar ke data awal di Ranzuid-STR.js?")) return;
  const prev = items;
  items = clone(DEFAULT);
  if (!(await persist())) { items = prev; $("#addMsg").className = "msg"; $("#addMsg").textContent = "Gagal menyimpan ke server."; return; }
  render(); renderAdmin();
});

$("#search").addEventListener("input", render);
render();
refresh();
setInterval(refresh, 30000);
