import net from "net";

const HOST = process.env.TCP_HOST || "127.0.0.1";
const PORT = Number(process.env.TCP_PORT) || 5000;

const server = net.createServer((socket) => {
  console.log("Client connected");

  const client = net.createConnection({ host: HOST, port: PORT }, () => {
    console.log("Connected to TCP server");
  });

  socket.on("data", (data) => {
    client.write(data);
  });

  client.on("data", (data) => {
    socket.write(data);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});