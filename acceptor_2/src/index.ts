import express, { Request, Response } from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = 4006;

let acceptedData: Record<string, number> = {};

const COORDINATOR_URL = "http://coordinator:4000"; // Coordinator runs inside Docker
const LEARNER_URL = "http://learner:4003";

// Register with Coordinator
axios
  .post(`${COORDINATOR_URL}/register`, {
    type: "acceptor",
    address: `http://acceptor_2:${PORT}`,
  })
  .then(() => console.log(`acceptor registered with Coordinator`))
  .catch((err) => console.error("Registration failed", err));

app.listen(PORT, () => {
  console.log(`Acceptor running on http://localhost:${PORT}`);
});

app.post("/accept", async (req: Request, res: Response) => {
  const { wordCounts } = req.body;

  if (!wordCounts || typeof wordCounts !== "object") {
    return res.status(400).json({ message: "Invalid data" });
  }

  for (const [word, count] of Object.entries(wordCounts)) {
    acceptedData[word] = (acceptedData[word] || 0) + (count as number);
  }

  console.log("Accepted updated counts:", acceptedData);

  await axios.post("http://sidecar:4999/send", {
    target: `${LEARNER_URL}/learn`,
    payload: { wordCounts, from: "acceptor_2" },
    source: "Acceptor_2",
  });

  res.json({ message: "Counts accepted" });
});

app.post("/reset", (req, res) => {
  acceptedData = {};
  console.log("word counts reset.");
  res.json({ message: "Learner state has been reset." });
});

app.get("/accepted", (req, res) => {
  res.json({ acceptedData });
});
