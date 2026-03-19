# Trashcan 🎮

A real-time multiplayer game room

## Stack

| Layer              | Tech                       |
| ------------------ | -------------------------- |
| Frontend           | React + Vite + TailwindCSS |
| Backend            | Express + Socket.io        |
| Hosting (frontend) | Vercel                     |
| Hosting (backend)  | Railway                    |

---

## Local Development

### 1. Install dependencies

```bash
# From the root
npm install          # installs concurrently
npm run install:all  # installs client + server deps
```

### 2. Configure environment

```bash
# client
cp client/.env.example client/.env

# server
cp server/.env.example server/.env
```

### 3. Run both servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## Deployment

### Backend → Railway

1. Push the repo to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repo, set the **root directory** to `/server`
4. Add environment variable: `CLIENT_URL=https://your-vercel-app.vercel.app`
5. Railway auto-detects Node and runs `npm start`

### Frontend → Vercel

1. Create a new project on [Vercel](https://vercel.com)
2. Connect your GitHub repo, set the **root directory** to `/client`
3. Add environment variable: `VITE_SERVER_URL=https://your-railway-app.up.railway.app`
4. Vercel auto-detects Vite and builds

---

## Project Structure

```
gameroom/
├── client/
│   ├── src/
│   │   ├── context/
│   │   │   └── RoomContext.jsx     # Global socket + room state
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Create / join room
│   │   │   ├── LobbyPage.jsx       # Waiting room + game config
│   │   │   └── GamePage.jsx        # Routes to active game
│   │   ├── games/
│   │   │   ├── skribbl/
│   │   │   │   ├── SkribblGame.jsx
│   │   │   │   ├── DrawingCanvas.jsx
│   │   │   │   ├── GuessList.jsx
│   │   │   │   ├── WordDisplay.jsx
│   │   │   │   └── WordChoicePicker.jsx
│   │   │   └── codenames/
│   │   │       ├── CodenamesGame.jsx
│   │   │       ├── CodenamesBoard.jsx
│   │   │       ├── CodenamesHUD.jsx
│   │   │       └── TeamSetup.jsx
│   │   └── components/
│   │       ├── PlayerList.jsx
│   │       ├── ConnectionBanner.jsx
│   │       └── EndScreen.jsx
│   └── ...config files
└── server/
    ├── index.js                    # Express + Socket.io entry
    ├── rooms.js                    # Room lifecycle manager
    ├── utils/
    │   └── nanoid.js
    └── games/
        ├── skribbl/
        │   ├── index.js            # Game logic + socket events
        │   └── words.js            # Word list
        └── codenames/
            ├── index.js            # Game logic + socket events
            └── words.js            # Word list
```

---

## Adding a New Game

1. Create `server/games/mygame/index.js` exporting `{ init, start, handleEvent, getClientState }`
2. Register it in `server/rooms.js` → `const GAMES = { skribbl, codenames, mygame }`
3. Create `client/src/games/mygame/MyGame.jsx`
4. Add it to `client/src/pages/GamePage.jsx` and `LobbyPage.jsx`

The room system handles everything else (join, leave, reconnect, lobby).

---

## Socket Event Reference

### Room events

| Event                | Direction     | Payload            |
| -------------------- | ------------- | ------------------ |
| `room:create`        | client→server | `{ name }`         |
| `room:join`          | client→server | `{ code, name }`   |
| `room:rejoin`        | client→server | `{ code, name }`   |
| `room:updated`       | server→client | `room` object      |
| `game:start`         | client→server | `{ game, config }` |
| `game:returnToLobby` | client→server | —                  |

### Skribbl events

| Event                 | Direction     | Payload                           |
| --------------------- | ------------- | --------------------------------- |
| `skribbl:wordChosen`  | client→server | `{ word }`                        |
| `skribbl:draw`        | both          | `{ x0, y0, x1, y1, color, size }` |
| `skribbl:canvasClear` | both          | —                                 |
| `skribbl:guess`       | client→server | `{ text }`                        |
| `skribbl:chatMessage` | server→client | `{ playerName, text, correct }`   |
| `skribbl:turnEnded`   | server→client | `{ word, scores }`                |

### Codenames events

| Event                      | Direction     | Payload                 |
| -------------------------- | ------------- | ----------------------- |
| `codenames:joinTeam`       | client→server | `{ team }`              |
| `codenames:claimSpymaster` | client→server | —                       |
| `codenames:giveClue`       | client→server | `{ clue, count }`       |
| `codenames:guess`          | client→server | `{ index }`             |
| `codenames:endTurn`        | client→server | —                       |
| `codenames:state`          | server→client | full game state         |
| `codenames:cardRevealed`   | server→client | `{ index, type, word }` |
