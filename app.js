const express = require('express');
const app = express();
require("dotenv").config();
const http = require('http');
const cors  = require('cors');
const { createMachine, stopVM, getUsage, runCommand } = require('./Controllers/SlaveMachineController');
const { get } = require('https');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.post("/create", createMachine);
app.post("/stop", stopVM)
app.post("/usage", getUsage)
app.post("/run-command", runCommand)
app.get("/", (req, res) => {
    res.send("Hello World");
})

const PORT = process.env.PORT || 3000;

http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
})