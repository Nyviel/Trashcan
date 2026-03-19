import { useEffect, useRef, useState } from "react";
import socket from "../socket";

const COLORS = [
	"#ffffff",
	"#000000",
	"#ff2d78",
	"#00e5ff",
	"#ffe600",
	"#00ff88",
	"#ff6b35",
	"#b44dff",
	"#4ecdc4",
	"#a8e6cf",
	"#ffd93d",
	"#6bcb77",
];
const SIZES = [3, 6, 12, 20];

export default function DrawingCanvas({
	canDraw,
	phase,
	singleStrokeMode = false,
	onStrokeComplete,
	drawEvent = "skribbl:draw",
	clearEvent = "skribbl:canvasClear",
	onMouseUpCallback,
}) {
	const canvasRef = useRef(null);
	const drawing = useRef(false);
	const lastPos = useRef(null);
	const history = useRef([]);
	const [color, setColor] = useState("#ffffff");
	const [size, setSize] = useState(6);
	const [isEraser, setIsEraser] = useState(false);

	const actualColor = isEraser ? "#050f08" : color;

	function clearCanvas() {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#050f08";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	// Listen for remote draw/clear events — keyed on the event names for this game
	useEffect(() => {
		clearCanvas();

		function onRemoteDraw({ x0, y0, x1, y1, color, size }) {
			drawLine(x0, y0, x1, y1, color, size, false);
		}
		function onRemoteClear() {
			clearCanvas();
		}

		socket.on(drawEvent, onRemoteDraw);
		socket.on(clearEvent, onRemoteClear);

		return () => {
			socket.off(drawEvent, onRemoteDraw);
			socket.off(clearEvent, onRemoteClear);
		};
	}, [drawEvent, clearEvent]);

	// Reset canvas when a new drawing phase starts
	useEffect(() => {
		if (phase === "drawing" || phase === "choosing") clearCanvas();
	}, [phase]);

	function getPos(e) {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const clientX = e.touches ? e.touches[0].clientX : e.clientX;
		const clientY = e.touches ? e.touches[0].clientY : e.clientY;
		return {
			x: (clientX - rect.left) * scaleX,
			y: (clientY - rect.top) * scaleY,
		};
	}

	function drawLine(x0, y0, x1, y1, col, sz, emit) {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
		ctx.strokeStyle = col;
		ctx.lineWidth = sz;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.stroke();

		if (emit) {
			socket.emit(drawEvent, { x0, y0, x1, y1, color: col, size: sz });
		}
	}

	function onMouseDown(e) {
		if (!canDraw) return;
		drawing.current = true;
		lastPos.current = getPos(e);
		const canvas = canvasRef.current;
		history.current.push(canvas.toDataURL());
		if (history.current.length > 20) history.current.shift();
	}

	function onMouseMove(e) {
		if (!drawing.current || !canDraw) return;
		const pos = getPos(e);
		drawLine(
			lastPos.current.x,
			lastPos.current.y,
			pos.x,
			pos.y,
			actualColor,
			size,
			true,
		);
		lastPos.current = pos;
	}

	function onMouseUp() {
		if (drawing.current) {
			if (singleStrokeMode && onStrokeComplete) {
				const dataUrl = canvasRef.current?.toDataURL("image/jpeg", 0.6);
				onStrokeComplete({ dataUrl });
			}
			if (onMouseUpCallback) onMouseUpCallback();
		}
		drawing.current = false;
	}

	function handleClear() {
		clearCanvas();
		socket.emit(clearEvent);
	}

	function handleUndo() {
		if (!history.current.length) return;
		const prev = history.current.pop();
		const img = new Image();
		img.src = prev;
		img.onload = () => {
			const ctx = canvasRef.current.getContext("2d");
			ctx.drawImage(img, 0, 0);
			socket.emit(clearEvent);
		};
	}

	return (
		<div className="flex flex-col items-center gap-3 w-full h-full">
			<canvas
				ref={canvasRef}
				width={800}
				height={550}
				className={`rounded-xl border border-bg-border w-full max-w-3xl object-contain ${canDraw ? "cursor-crosshair" : "cursor-default"}`}
				style={{
					background: "#0a0a0f",
					maxHeight: "calc(100% - 60px)",
				}}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={onMouseUp}
				onMouseLeave={onMouseUp}
				onTouchStart={onMouseDown}
				onTouchMove={onMouseMove}
				onTouchEnd={onMouseUp}
			/>

			{/* Toolbar */}
			{canDraw && (
				<div className="flex items-center gap-3 bg-bg-card border border-bg-border rounded-2xl px-4 py-2.5">
					{/* Colors */}
					<div className="flex gap-1.5 flex-wrap max-w-[160px]">
						{COLORS.map((c) => (
							<button
								key={c}
								onClick={() => {
									setColor(c);
									setIsEraser(false);
								}}
								className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110
                  ${color === c && !isEraser ? "border-white scale-125" : "border-transparent"}`}
								style={{ background: c }}
							/>
						))}
					</div>

					<div className="w-px h-8 bg-bg-border" />

					{/* Sizes */}
					<div className="flex items-center gap-2">
						{SIZES.map((s) => (
							<button
								key={s}
								onClick={() => {
									setSize(s);
									setIsEraser(false);
								}}
								className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors
                  ${size === s && !isEraser ? "bg-bg-elevated border border-neon-cyan/40" : "hover:bg-bg-elevated"}`}
							>
								<div
									className="rounded-full bg-white"
									style={{
										width: s,
										height: s,
										maxWidth: 20,
										maxHeight: 20,
									}}
								/>
							</button>
						))}
					</div>

					<div className="w-px h-8 bg-bg-border" />

					{/* Eraser */}
					<button
						onClick={() => setIsEraser(!isEraser)}
						className={`btn text-sm px-3 py-1.5 ${isEraser ? "bg-neon-pink/20 border border-neon-pink/40 text-neon-pink" : "btn-ghost"}`}
					>
						✏️ Erase
					</button>

					{/* Undo */}
					<button
						onClick={handleUndo}
						className="btn-ghost text-sm px-3 py-1.5"
					>
						↩ Undo
					</button>

					{/* Clear */}
					<button
						onClick={handleClear}
						className="btn-ghost text-sm px-3 py-1.5 text-neon-pink/70 hover:text-neon-pink"
					>
						🗑 Clear
					</button>
				</div>
			)}
		</div>
	);
}
