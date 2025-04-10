import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = 4001;
const COORDINATOR_URL = "http://coordinator:4000"; // Coordinator runs inside Docker

let wordCounts: Record<string, number> = {};
let acceptors: string[] = [];

// Helper function to normalize and split words
const normalizeAndSplitWords = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "") // Remove punctuation
    .split(/\s+/)
    .filter(Boolean); // Remove empty strings
};

// Register with Coordinator
const registerWithCoordinator = async () => {
  try {
    await axios.post(`${COORDINATOR_URL}/register`, {
      type: "proposer",
      address: `http://proposer_0:${PORT}`,
    });
    console.log(`Proposer registered with Coordinator`);
  } catch (err) {
    console.error("Registration failed", err);
  }
};

// Fetch acceptors from Coordinator
const fetchAcceptors = async () => {
  try {
    const res = await axios.get(`${COORDINATOR_URL}/nodes`);
    acceptors = res.data.acceptors || [];
    console.log("Fetched acceptors:", acceptors);
  } catch (err) {
    console.error("Error fetching acceptors", err);
  }
};

// Send word counts to acceptors
const sendWordCountsToAcceptors = async () => {
  for (const acceptorUrl of acceptors) {
    try {
      await axios.post("http://sidecar:4999/send", {
        target: `${acceptorUrl}/accept`,
        payload: { wordCounts },
        source: "Proposer_0",
      });
    } catch (err) {
      console.error("Failed to send to acceptor", err);
    }
  }
};

// Initialize proposer
const initializeProposer = async () => {
  await registerWithCoordinator();
  setTimeout(fetchAcceptors, 3000); // Delay to give Coordinator time
};

// Process incoming document
app.post("/process", async (req, res) => {
  const { document } = req.body;
  console.log(`Received line:`, document);

  const words = normalizeAndSplitWords(document);

  // Count words
  words.forEach((word) => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  console.log("Current counts:", wordCounts);

  // Send word counts to acceptors
  await sendWordCountsToAcceptors();

  res.json({ message: "Line processed", wordCounts });
});

// Endpoint to get current word counts
app.get("/counts", (req, res) => {
  res.json({ wordCounts });
});

app.post("/reset", (req, res) => {
  wordCounts = {};
  console.log("word counts reset.");
  res.json({ message: "Learner state has been reset." });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proposer Node running on http://localhost:${PORT}`);
  initializeProposer();
});
