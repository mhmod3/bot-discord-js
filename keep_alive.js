import express from "express";  // إذا كنت تستخدم import في المشروع

const server = express();

server.all("/", (req, res) => {
  res.send("Bot is running!");
});

function keepAlive() {
  server.listen(3000, () => {
    console.log("Server is ready.");
  });
}

export default keepAlive;  // استخدام export default
