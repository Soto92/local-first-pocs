const form = document.getElementById("item-form");
const titleInput = document.getElementById("title");
const statusSelect = document.getElementById("status");
const itemsList = document.getElementById("items");
const refreshBtn = document.getElementById("refresh");

const DB_NAME = "local_first_db";
const DB_VERSION = 1;
const STORE = "items";

const dbPromise = openDb();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, fn) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listItems() {
  const items = await withStore("readonly", (store) =>
    requestToPromise(store.getAll())
  );
  return items.sort((a, b) => b.id - a.id);
}

async function addItem(item) {
  return withStore("readwrite", (store) => requestToPromise(store.add(item)));
}

async function ensureSeed() {
  const items = await listItems();
  if (items.length > 0) return;

  const now = new Date().toISOString();
  await addItem({ title: "Write first local entry", status: "todo", updated_at: now });
  await addItem({ title: "Flip status locally", status: "doing", updated_at: now });
}

function renderItems(items) {
  itemsList.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="item-title">${item.title}</div>
      <div class="item-meta">${item.status} · ${item.updated_at}</div>
    `;
    itemsList.appendChild(li);
  }
}

async function refresh() {
  const items = await listItems();
  renderItems(items);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) return;

  const item = {
    title,
    status: statusSelect.value,
    updated_at: new Date().toISOString(),
  };

  await addItem(item);

  titleInput.value = "";
  statusSelect.value = "todo";
  await refresh();
});

refreshBtn.addEventListener("click", refresh);

ensureSeed().then(refresh);
