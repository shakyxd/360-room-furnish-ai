# 360 Room Furnish AI

Upload a 360° equirectangular room image and use Gemini AI to furnish or unfurnish it. Results are displayed as interactive 360° panoramic viewers side by side.

## Stack

- **Frontend:** React + Vite, Pannellum (360° viewer via CDN)
- **Backend:** Node.js + Express, Gemini API (`gemini-2.5-flash-preview-05-20`)

## Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the API key

```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 3. Run

In two separate terminals:

```bash
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Usage

1. Upload a 360° equirectangular JPG or PNG — drag & drop, click to browse, or paste (Ctrl+V)
2. Click **Furnish Room** to add modern furniture, or **Unfurnish Room** to strip it bare
3. Both the original and AI result appear as interactive 360° viewers you can drag to look around
4. Click **Download Result** to save the generated image
