import express, { Request, Response } from "express";
import axios from "axios";

const app = express();
app.use(express.json());

interface SidecarRequest {
  target: string;
  payload: any;
  source: string;
}

function logRequest(source: string, target: string, payload: any) {
  const time = new Date().toISOString();
  console.log(
    `[${time}] [${source} → ${target}] Sending:`,
    JSON.stringify(payload, null, 2)
  );
}

function logResponse(
  source: string,
  target: string,
  success: boolean,
  response: any
) {
  const time = new Date().toISOString();
  const result = success ? "SUCCESS" : "FAILED";

  console.log(
    `[${time}] ${result} [${source} → ${target}]:`,
    typeof response === "string" ? response : JSON.stringify(response, null, 2)
  );
}

app.post("/send", async (req: Request, res: Response) => {
  const { target, payload, source }: SidecarRequest = req.body;

  if (!target || !payload || !source) {
    return res
      .status(400)
      .json({ message: "Missing target, source or payload" });
  }

  logRequest(source, target, payload);

  try {
    const response = await axios.post(target, payload);
    logResponse(source, target, true, response.data);
    res
      .status(response.status)
      .json({ status: "success", data: response.data });
  } catch (error: any) {
    const errorMsg = error?.response?.data || error.message;
    logResponse(source, target, false, errorMsg);
    res.status(500).json({ status: "fail", error: errorMsg });
  }
});

app.post("/log", async (req: Request, res: Response) => {
  const { source, message } = req.body;
  console.log(`${source}: ${message}`);
  res.json({ status: "success", message: "Log received" });
});

app.listen(4999, () => {
  console.log("Sidecar proxy running on port 4999");
});
