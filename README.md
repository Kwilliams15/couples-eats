# Couples Eats 🍽️

A web app that helps couples decide where to eat by matching their food preferences in real time.

## How It Works

1. Person 1 opens the app and clicks **Start a New Session** → gets a 5-letter room code
2. Person 2 opens the app on their own device, clicks **Join Partner's Session**, and enters the code
3. Both fill out a 10-question survey about cuisines, budget, vibe, dietary needs, etc.
4. Once both submit, the server fetches nearby restaurants (Google Places API, 5-mile radius) and scores them against both surveys
5. Results appear on both screens, sorted by match score — tap any to pick it and get directions

## Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express + WebSockets (`ws`)
- **Restaurant data**: Google Places API (Nearby Search)

## Setup

### 0. Node.js note
Node.js is installed on this machine but not on the system PATH. You have two options:
- **Add to PATH**: Add `C:\Program Files\Microsoft Visual Studio\2022\Community\Msbuild\Microsoft\VisualStudio\NodeJs\` to your system PATH environment variable, then use `npm` normally.
- **Use full path**: Replace `npm` with the full path in commands below:
  ```
  "C:\Program Files\Microsoft Visual Studio\2022\Community\Msbuild\Microsoft\VisualStudio\NodeJs\npm.cmd"
  ```

### 1. Get a Google Places API Key

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable the **Places API** and **Maps JavaScript API**
- Create an API key

### 2. Configure the server

```bash
cd server
cp .env.example .env
# Edit .env and add your GOOGLE_PLACES_API_KEY
npm install
```

### 3. Configure the client

```bash
cd client
cp .env.example .env
# VITE_WS_URL=ws://localhost:3001 is set by default
# Add VITE_GOOGLE_API_KEY if you want restaurant photos to load
npm install
```

### 4. Run both

Terminal 1:
```bash
cd server && npm run dev
```

Terminal 2:
```bash
cd client && npm run dev
```

Open `http://localhost:5173` in two browser windows (or two devices on the same network using your local IP).

## Environment Variables

### Server (`server/.env`)
| Variable | Description |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places API key |
| `PORT` | Port to run the server (default: 3001) |

### Client (`client/.env`)
| Variable | Description |
|---|---|
| `VITE_WS_URL` | WebSocket server URL (default: `ws://localhost:3001`) |
| `VITE_GOOGLE_API_KEY` | Google API key for loading restaurant photos (optional) |
