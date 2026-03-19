const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { registerRoomHandlers } = require("./rooms");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
	cors: {
		origin: CLIENT_URL,
		methods: ["GET", "POST"],
	},
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));

// iTunes proxy — avoids CORS issues with direct browser requests
app.get("/api/itunes", async (req, res) => {
	try {
		const term = encodeURIComponent(req.query.term || "");
		const limit = Math.min(parseInt(req.query.limit) || 8, 20);
		const url = `https://itunes.apple.com/search?term=${term}&entity=song&media=music&limit=${limit}`;
		const response = await fetch(url);
		const data = await response.json();
		// Only return fields we need
		const results = (data.results || [])
			.map((t) => ({
				trackId: t.trackId,
				trackName: t.trackName,
				artistName: t.artistName,
				collectionName: t.collectionName,
				artworkUrl: t.artworkUrl100?.replace("100x100", "300x300"),
				previewUrl: t.previewUrl,
			}))
			.filter((t) => t.previewUrl);
		res.json({ results });
	} catch (err) {
		console.error("[itunes]", err.message);
		res.status(500).json({ results: [], error: "iTunes search failed" });
	}
});

io.on("connection", (socket) => {
	console.log(`[socket] connected: ${socket.id}`);
	registerRoomHandlers(io, socket);
	socket.on("disconnect", () => {
		console.log(`[socket] disconnected: ${socket.id}`);
	});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
