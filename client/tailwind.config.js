/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,jsx}"],
	theme: {
		extend: {
			fontFamily: {
				display: ['"Exo 2"', "sans-serif"],
				body: ['"DM Sans"', "sans-serif"],
			},
			colors: {
				bg: {
					base: "#030d06",
					card: "#071510",
					elevated: "#0d2018",
					border: "#1a3d28",
				},
				neon: {
					green: "#00ff88",
					lime: "#a8ff3e",
					cyan: "#00e5ff",
					pink: "#ff2d78",
					purple: "#b44dff",
					yellow: "#ffe600",
				},
				team: {
					red: "#ff3b5c",
					blue: "#3b82f6",
				},
			},
			boxShadow: {
				neon: "0 0 20px rgba(0,255,136,0.5), 0 0 40px rgba(0,255,136,0.2)",
				"neon-lg":
					"0 0 30px rgba(0,255,136,0.7), 0 0 60px rgba(0,255,136,0.3), 0 0 100px rgba(0,255,136,0.1)",
				"neon-pink": "0 0 20px rgba(255,45,120,0.4)",
				"neon-cyan": "0 0 20px rgba(0,229,255,0.4)",
				"neon-inner": "inset 0 0 20px rgba(0,255,136,0.08)",
				"card-glow":
					"0 0 0 1px rgba(0,255,136,0.1), 0 0 30px rgba(0,255,136,0.06)",
			},
			animation: {
				"pulse-fast": "pulse 0.8s cubic-bezier(0.4,0,0.6,1) infinite",
				"fade-in": "fadeIn 0.35s ease forwards",
				"slide-up": "slideUp 0.3s ease forwards",
				"slide-down": "slideDown 0.3s ease forwards",
				"glow-pulse": "glowPulse 2s ease-in-out infinite",
				flicker: "flicker 8s linear infinite",
				"float-a": "floatA 14s ease-in-out infinite",
				"float-b": "floatB 18s ease-in-out infinite",
				"float-c": "floatC 22s ease-in-out infinite",
				"border-pulse": "borderPulse 2s ease-in-out infinite",
				"spin-slow": "spin 8s linear infinite",
			},
		},
	},
	plugins: [],
};
