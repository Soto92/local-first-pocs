const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "points.db");
const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    face TEXT NOT NULL,
    score INTEGER NOT NULL,
    client_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (person_id) REFERENCES people(id)
  );
`);

const insertPerson = db.prepare(
  "INSERT OR IGNORE INTO people (name) VALUES (@name)"
);
const findPerson = db.prepare("SELECT id, name FROM people WHERE name = @name");

const insertRating = db.prepare(`
  INSERT OR IGNORE INTO ratings (person_id, face, score, client_id)
  VALUES (@person_id, @face, @score, @client_id)
`);
const findRatingByClient = db.prepare(
  "SELECT id, person_id, face, score, client_id, created_at FROM ratings WHERE client_id = @client_id"
);

const listPeople = db.prepare("SELECT name FROM people ORDER BY name ASC");

const faceToScore = {
  green: 10,
  yellow: 0,
  red: -10,
};

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/people", (req, res) => {
  res.json(listPeople.all().map((row) => row.name));
});

app.post("/ratings", (req, res) => {
  const name = (req.body.name || "").trim();
  const face = (req.body.face || "").trim();
  const clientId = (req.body.client_id || "").trim() || null;

  if (!name) return res.status(400).json({ error: "name is required" });
  if (!faceToScore[face]) {
    return res.status(400).json({ error: "face must be green, yellow, or red" });
  }

  insertPerson.run({ name });
  const person = findPerson.get({ name });

  const score = faceToScore[face];
  insertRating.run({
    person_id: person.id,
    face,
    score,
    client_id: clientId,
  });

  const rating = clientId
    ? findRatingByClient.get({ client_id: clientId })
    : null;

  res.status(201).json({
    server_id: rating ? rating.id : null,
    person_id: person.id,
    name: person.name,
    face,
    score,
    created_at: rating ? rating.created_at : null,
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Local backend running at http://localhost:${port}`);
});
