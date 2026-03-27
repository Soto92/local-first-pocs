const form = document.getElementById("rating-form");
const nameInput = document.getElementById("name");
const peopleList = document.getElementById("people-list");
const faces = Array.from(document.querySelectorAll(".face"));
const localStatus = document.getElementById("local-status");
const syncStatus = document.getElementById("sync-status");
const refreshBtn = document.getElementById("refresh");
const peopleUl = document.getElementById("people");
const detailsCard = document.getElementById("details-card");
const detailsEmpty = document.getElementById("details-empty");
const details = document.getElementById("details");
const detailsName = document.getElementById("details-name");
const detailsScore = document.getElementById("details-score");
const countGreen = document.getElementById("count-green");
const countYellow = document.getElementById("count-yellow");
const countRed = document.getElementById("count-red");
const saveDetailBtn = document.getElementById("save-detail");

const DB_NAME = "points_local_first";
const DB_VERSION = 1;
const STORE_PEOPLE = "people";
const STORE_RATINGS = "ratings";

let selectedFace = null;
let selectedPerson = null;
let syncing = false;

const dbPromise = openDb();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PEOPLE)) {
        db.createObjectStore(STORE_PEOPLE, { keyPath: "name" });
      }
      if (!db.objectStoreNames.contains(STORE_RATINGS)) {
        db.createObjectStore(STORE_RATINGS, { keyPath: "local_id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(storeName, mode, fn) {
  return dbPromise.then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function scoreForFace(face) {
  if (face === "green") return 10;
  if (face === "yellow") return 0;
  return -10;
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function addPerson(name) {
  return withStore(STORE_PEOPLE, "readwrite", (store) =>
    requestToPromise(store.put({ name }))
  );
}

async function listPeople() {
  const people = await withStore(STORE_PEOPLE, "readonly", (store) =>
    requestToPromise(store.getAll())
  );
  return people.map((p) => p.name).sort();
}

async function addRating(rating) {
  return withStore(STORE_RATINGS, "readwrite", (store) =>
    requestToPromise(store.add(rating))
  );
}

async function updateRating(localId, updates) {
  return withStore(STORE_RATINGS, "readwrite", async (store) => {
    const current = await requestToPromise(store.get(localId));
    const next = { ...current, ...updates };
    return requestToPromise(store.put(next));
  });
}

async function listRatings() {
  const ratings = await withStore(STORE_RATINGS, "readonly", (store) =>
    requestToPromise(store.getAll())
  );
  return ratings.sort((a, b) => b.local_id - a.local_id);
}

async function pendingRatings() {
  const ratings = await listRatings();
  return ratings.filter((r) => r.sync_status === "pending");
}

function setFace(face) {
  selectedFace = face;
  faces.forEach((btn) => {
    const active = btn.dataset.face === face;
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.classList.toggle("active", active);
  });
}

async function renderPeople() {
  const ratings = await listRatings();
  const totals = new Map();
  for (const rating of ratings) {
    totals.set(rating.name, (totals.get(rating.name) || 0) + rating.score);
  }

  const names = await listPeople();
  peopleUl.innerHTML = "";
  names.forEach((name) => {
    const li = document.createElement("li");
    li.className = "row";
    li.innerHTML = `
      <button type="button" data-name="${name}">${name}</button>
      <span>${totals.get(name) || 0}</span>
    `;
    peopleUl.appendChild(li);
  });
}

async function renderDetails(name) {
  if (!name) {
    details.hidden = true;
    detailsEmpty.hidden = false;
    return;
  }

  const ratings = await listRatings();
  const filtered = ratings.filter((r) => r.name === name);
  const counts = { green: 0, yellow: 0, red: 0 };
  let total = 0;

  for (const r of filtered) {
    counts[r.face] += 1;
    total += r.score;
  }

  detailsName.textContent = name;
  detailsScore.textContent = `${total} points`;
  countGreen.textContent = counts.green;
  countYellow.textContent = counts.yellow;
  countRed.textContent = counts.red;

  detailsEmpty.hidden = true;
  details.hidden = false;
}

async function refreshUI() {
  const names = await listPeople();
  peopleList.innerHTML = names.map((n) => `<option value="${n}"></option>`).join("");
  await renderPeople();
  await renderDetails(selectedPerson);
  const pending = await pendingRatings();
  syncStatus.textContent = pending.length
    ? `Pending sync: ${pending.length}`
    : "Sync idle.";
}

async function syncPeopleFromServer() {
  try {
    const res = await fetch("/people");
    if (!res.ok) return;
    const names = await res.json();
    for (const name of names) {
      await addPerson(name);
    }
  } catch (_) {
    // ignore when offline or backend is down
  }
}

async function syncNow() {
  if (syncing) return;
  syncing = true;
  const pending = await pendingRatings();
  if (!pending.length) {
    syncing = false;
    return;
  }

  syncStatus.textContent = `Syncing ${pending.length} item(s)...`;
  for (const rating of pending) {
    try {
      const res = await fetch("/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rating.name,
          face: rating.face,
          client_id: rating.client_id,
        }),
      });

      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      await updateRating(rating.local_id, {
        sync_status: "synced",
        server_id: data.server_id,
        server_created_at: data.created_at,
      });
    } catch (err) {
      await updateRating(rating.local_id, { sync_status: "pending" });
    }
  }

  syncing = false;
  await refreshUI();
}

faces.forEach((btn) => {
  btn.addEventListener("click", () => setFace(btn.dataset.face));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (!name || !selectedFace) return;

  await addPerson(name);
  const rating = {
    name,
    face: selectedFace,
    score: scoreForFace(selectedFace),
    client_id: uuid(),
    sync_status: "pending",
    created_at_local: new Date().toISOString(),
  };

  await addRating(rating);
  localStatus.textContent = `Saved locally for ${name}.`;
  nameInput.value = "";
  setFace(null);
  selectedPerson = name;
  await refreshUI();
  await syncNow();
});

peopleUl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-name]");
  if (!button) return;
  selectedPerson = button.dataset.name;
  await renderDetails(selectedPerson);
});

saveDetailBtn.addEventListener("click", async () => {
  if (!selectedPerson || !selectedFace) return;
  const rating = {
    name: selectedPerson,
    face: selectedFace,
    score: scoreForFace(selectedFace),
    client_id: uuid(),
    sync_status: "pending",
    created_at_local: new Date().toISOString(),
  };

  await addRating(rating);
  localStatus.textContent = `Saved locally for ${selectedPerson}.`;
  setFace(null);
  await refreshUI();
  await syncNow();
});

refreshBtn.addEventListener("click", async () => {
  await refreshUI();
  await syncNow();
});

syncPeopleFromServer().then(refreshUI);
setInterval(syncNow, 5000);
