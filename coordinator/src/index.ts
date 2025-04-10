import express, { Request, Response } from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = 4000;
let nodes: {
  proposers: string[];
  acceptors: string[];
  learner: string | null;
} = {
  proposers: [],
  acceptors: [],
  learner: null,
};

// Endpoint for nodes to register
app.post("/register", (req: Request, res: Response) => {
  const { type, address } = req.body;

  if (type === "proposer") nodes.proposers.push(address);
  else if (type === "acceptor") nodes.acceptors.push(address);
  else if (type === "learner") nodes.learner = address;

  console.log(`Registered ${type}: ${address}`);
  res.json({ message: `${type} registered successfully` });
});

app.listen(PORT, () => {
  console.log(`Coordinator Node running on http://localhost:${PORT}`);
});

// Helper function to group words by their starting letter
function groupWordsByFirstLetter(words: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const word of words) {
    const firstLetter = word[0].toLowerCase();
    if (!grouped[firstLetter]) grouped[firstLetter] = [];
    grouped[firstLetter].push(word);
  }
  console.log("Grouped words by first letter:", grouped);
  return grouped;
}

// Helper function to assign ranges to proposers
function getProposerRanges(proposers: string[]): { proposer: string; range: [string, string] }[] {
  if (proposers.length < 3) {
    throw new Error("Insufficient proposers: At least three proposers are required.");
  }
  const ranges: { proposer: string; range: [string, string] }[] = [
    { proposer: proposers[0], range: ["a", "i"] },
    { proposer: proposers[1], range: ["j", "r"] },
    { proposer: proposers[2], range: ["s", "z"] },
  ];
  console.log("Assigned ranges to proposers:", ranges);
  return ranges;
}

// Endpoint for broadcasting document lines to all proposers
app.post("/broadcast", async (req: Request, res: Response) => {
  const { document } = req.body;

  if (!document || document.trim().length === 0) {
    console.error("Invalid document received for broadcast.");
    return res.status(400).json({ message: "Invalid document" });
  }

  const words = document.trim().split(/\s+/);
  const groupedWords = groupWordsByFirstLetter(words);

  let proposerRanges;
  try {
    proposerRanges = getProposerRanges(nodes.proposers);
  } catch (error) {
    console.error("Error assigning ranges to proposers:", error);
    return res.status(500).json({ message: error });
  }

  const promises = proposerRanges.map(({ proposer, range }) => {
    const [start, end] = range;
    const assignedWords = Object.entries(groupedWords)
      .filter(([letter]) => letter >= start && letter <= end)
      .flatMap(([_, words]) => words);

    console.log(`Sending words to proposer ${proposer}:`, assignedWords);

    return axios.post(`${proposer}/process`, {
      document: assignedWords.join(" "),
    });
  });

  try {
    await Promise.all(promises);
    console.log("Broadcast completed successfully.");
    res.json({ message: "Document split and sent to proposers" });
  } catch (err) {
    console.error("Broadcast failed:", err || err);
    res.status(500).json({ message: "Broadcast failed" });
  }
});

// Endpoint for getting the list of nodes
app.get("/nodes", (req, res) => {
  res.json(nodes);
});
