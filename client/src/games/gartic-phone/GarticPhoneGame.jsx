import { useEffect, useReducer, useRef, useState } from "react";
import socket from "../../socket";
import { useRoom } from "../../context/RoomContext";
import GarticWriting from "./GarticWriting";
import GarticDrawing from "./GarticDrawing";
import GarticGallery from "./GarticGallery";

function reducer(state, action) {
	switch (action.type) {
		case "STATE":
			return { ...state, ...action.payload };
		case "PROGRESS":
			return {
				...state,
				submitted: action.payload.submitted,
				total: action.payload.total,
			};
		case "GALLERY_START":
			return {
				...state,
				phase: "gallery",
				galleryChain: action.payload.currentChain,
				galleryEntries: [action.payload.currentChain.entries[0]],
				totalChains: action.payload.totalChains,
				chainIndex: 0,
			};
		case "GALLERY_REVEAL":
			return {
				...state,
				galleryEntries: [
					...(state.galleryEntries || []),
					action.payload.entry,
				],
				isLastEntry: action.payload.isLastEntry,
				isLastChain: action.payload.isLastChain,
			};
		case "GALLERY_NEXT_CHAIN":
			return {
				...state,
				galleryChain: action.payload.chain,
				galleryEntries: [action.payload.chain.entries[0]],
				chainIndex: action.payload.chainIndex,
				isLastEntry: false,
			};
		default:
			return state;
	}
}

const initState = {
	phase: "writing",
	step: 0,
	totalSteps: 0,
	timeLeft: 60,
	prompt: null,
	submittedThisStep: false,
	submitted: 0,
	total: 0,
	galleryChain: null,
	galleryEntries: [],
	totalChains: 0,
	chainIndex: 0,
	isLastEntry: false,
	isLastChain: false,
};

export default function GarticPhoneGame() {
	const { room, me } = useRoom();
	const [state, dispatch] = useReducer(reducer, initState);
	const timerRef = useRef(null);
	const [timeLeft, setTimeLeft] = useState(0);

	useEffect(() => {
		socket.on("gartic:gameStarted", () => {});

		socket.on("gartic:state", (data) => {
			dispatch({ type: "STATE", payload: data });
			if (data.timeLeft !== undefined) {
				clearInterval(timerRef.current);
				let t = data.timeLeft;
				setTimeLeft(t);
				timerRef.current = setInterval(() => {
					t--;
					setTimeLeft(t);
					if (t <= 0) clearInterval(timerRef.current);
				}, 1000);
			}
		});

		socket.on("gartic:progressUpdate", (data) =>
			dispatch({ type: "PROGRESS", payload: data }),
		);
		socket.on("gartic:galleryStart", (data) =>
			dispatch({ type: "GALLERY_START", payload: data }),
		);
		socket.on("gartic:galleryReveal", (data) =>
			dispatch({ type: "GALLERY_REVEAL", payload: data }),
		);
		socket.on("gartic:galleryNextChain", (data) =>
			dispatch({ type: "GALLERY_NEXT_CHAIN", payload: data }),
		);

		return () => {
			clearInterval(timerRef.current);
			[
				"gartic:gameStarted",
				"gartic:state",
				"gartic:progressUpdate",
				"gartic:galleryStart",
				"gartic:galleryReveal",
				"gartic:galleryNextChain",
			].forEach((e) => socket.off(e));
		};
	}, []);

	if (state.phase === "gallery") {
		return (
			<GarticGallery
				chain={state.galleryChain}
				entries={state.galleryEntries}
				chainIndex={state.chainIndex}
				totalChains={state.totalChains}
				isLastEntry={state.isLastEntry}
				isLastChain={state.isLastChain}
				isHost={room?.hostId === me?.id}
			/>
		);
	}

	if (state.phase === "drawing") {
		return (
			<GarticDrawing
				prompt={state.prompt}
				step={state.step}
				totalSteps={state.totalSteps}
				timeLeft={timeLeft}
				submitted={state.submittedThisStep}
				progressSubmitted={state.submitted}
				progressTotal={state.total}
				me={me}
				room={room}
			/>
		);
	}

	// writing / describing
	return (
		<GarticWriting
			prompt={state.prompt}
			step={state.step}
			totalSteps={state.totalSteps}
			timeLeft={timeLeft}
			submitted={state.submittedThisStep}
			progressSubmitted={state.submitted}
			progressTotal={state.total}
		/>
	);
}
