import express from "express";
import cors from "cors";
import net from "net";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ POST API (this was missing)
app.post("/send", (req, res) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).send("No data provided");
  }

  const client = new net.Socket();

  // 🔴 IMPORTANT: এখানে তোমার real TCP server দাও
  const HOST = "trackfleet.in";
  const PORT = 8449;

  client.connect(PORT, HOST, () => {
    client.write(data);
  });

  client.on("data", (response) => {
    res.send(response.toString());
    client.destroy();
  });

  client.on("error", (err) => {
    res.status(500).send("TCP Error: " + err.message);
  });
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("✅ Backend running");
});

const PORT_SERVER = process.env.PORT || 3000;

app.listen(PORT_SERVER, () => {
  console.log("Server running on port " + PORT_SERVER);
});