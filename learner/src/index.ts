import express, { Request, Response } from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = 4003;
const COORDINATOR_URL = "http://coordinator:4000"; // Coordinator runs inside Docker
const finalCounts: Record<string, number> = {};

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
  const { wordCounts } = req.body;

  if (!wordCounts || typeof wordCounts !== "object") {
    return res.status(400).json({ message: "Invalid data" });
  }

  // Update final word counts
  for (const [word, count] of Object.entries(wordCounts)) {
    finalCounts[word] = (finalCounts[word] || 0) + (count as number);
  }

  console.log("Updated final counts:", finalCounts);
  res.json({ message: "Counts learned" });
});

// Endpoint to retrieve final word counts
app.get("/final", (_req: Request, res: Response) => {
  res.json({ finalCounts });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Learner running on http://localhost:${PORT}`);
});
