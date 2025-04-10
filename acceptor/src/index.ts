import express, { Request, Response } from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = 4002;

const acceptedData: Record<string, number> = {};

const COORDINATOR_URL = "http://coordinator:4000"; // Coordinator runs inside Docker
const LEARNER_URL = "http://learner:4003";


// Register with Coordinator
axios
  .post(`${COORDINATOR_URL}/register`, {
    type: "acceptor",
    address: `http://acceptor:${PORT}`,
  })
  .then(() => console.log(`acceptor registered with Coordinator`))
  .catch((err) => console.error("Registration failed", err));

app.listen(PORT, () => {
    console.log(`Acceptor running on http://localhost:${PORT}`);
});

app.post("/accept", (req: Request, res: Response) => {
    const { wordCounts } = req.body;

    if (!wordCounts || typeof wordCounts !== "object") {
        return res.status(400).json({ message: "Invalid data" });
    }

    for (const [word, count] of Object.entries(wordCounts)) {
        acceptedData[word] = (acceptedData[word] || 0) + (count as number);
    }

    console.log("Accepted updated counts:", acceptedData);

    axios.post(`${LEARNER_URL}/learn`, { wordCounts })
    .then(() => console.log("Forwarded counts to Learner"))
    .catch(err => console.error("Failed to send to learner", err));

    res.json({ message: "Counts accepted" });
});

app.get("/accepted", (req, res) => {
    res.json({ acceptedData });
});


