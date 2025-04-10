import express, { Request, Response } from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = 4003;
const COORDINATOR_URL = "http://coordinator:4000"; // Coordinator runs inside Docker

const pendingValidations: Record<string, Set<string>> = {};
const submitters: Record<string, Set<string>> = {};
let finalCounts: Record<string, number> = {};

// Register with Coordinator
const registerWithCoordinator = async () => {
  try {
    await axios.post(`${COORDINATOR_URL}/register`, {
      type: "learner",
      address: `http://learner:${PORT}`,
    });
    console.log("Learner registered with Coordinator");
  } catch (err) {
    console.error("Registration failed", err);
  }
};

registerWithCoordinator();

// Endpoint to learn word counts
app.post("/learn", (req: Request, res: Response) => {
  const { wordCounts, from } = req.body;

  if (!wordCounts || typeof wordCounts !== "object" || !from) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const hash = JSON.stringify(wordCounts);

  if (!pendingValidations[hash]) {
    pendingValidations[hash] = new Set();
    submitters[hash] = new Set();
  }

  pendingValidations[hash].add(hash);
  submitters[hash].add(from);

  // If at least 2 different acceptors submitted the same result
  if (submitters[hash].size >= 2) {
    console.log(`Validated by:`, [...submitters[hash]]);

    for (const [word, count] of Object.entries(wordCounts)) {
      finalCounts[word] = (finalCounts[word] || 0) + (count as number);
    }

    // Clean up
    delete pendingValidations[hash];
    delete submitters[hash];

    return res.json({ message: "Counts learned and validated" });
  }

  res.json({ message: "Waiting for more validations" });
});

// Endpoint to retrieve final word counts
app.get("/final", (_req: Request, res: Response) => {
  res.json({ finalCounts });
});

app.post("/reset", (req: Request, res: Response) => {
  finalCounts = {};
  console.log("Final word counts reset.");
  res.json({ message: "Learner state has been reset." });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Learner running on http://localhost:${PORT}`);
});
