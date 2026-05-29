import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import generateRoute from "./routes/generate";
import workspaceRoute from "./routes/workspace";
import workspaceChatRoute from "./routes/workspaceChat";
import fixRoute from "./routes/fix";
import githubRoute from "./routes/github";



const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend running successfully 🚀" });
});


app.use("/api/generate", generateRoute);
app.use("/api/workspaces", workspaceRoute);
app.use("/api/workspaces", workspaceChatRoute);
app.use("/api", fixRoute);
app.use("/api/github", githubRoute);



app.get("/api/generate", (req, res) => {
  res.json({ message: "GENERATION PAGE 🚀" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
