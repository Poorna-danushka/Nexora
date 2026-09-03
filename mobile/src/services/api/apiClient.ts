// ─── Axios API Client ─────────────────────────────────────────────────────────
//
// This file creates ONE reusable Axios instance for the entire Nexora app.
// Every screen that needs to talk to the FastAPI backend uses THIS instance —
// not a new Axios import configured from scratch.
//
// WHY create an instance instead of using axios directly?
//   `import axios from 'axios'; axios.get(...)`  would work, but it means
//   repeating baseURL, headers, and future authentication config everywhere.
//
//   `axios.create({...})` creates a pre-configured copy of Axios.
//   Think of it as a "preset" for your API calls — you set the rules once here
//   and every request made through this instance follows those rules.

import axios from 'axios';

// ─── Base URL ─────────────────────────────────────────────────────────────────
//
// The base URL is the beginning of every URL for this app's API requests.
// Axios automatically prepends this to every path you give it:
//
//   baseURL = "http://127.0.0.1:8000"
//   apiClient.get("/")         →  GET http://127.0.0.1:8000/
//   apiClient.get("/users")    →  GET http://127.0.0.1:8000/users
//   apiClient.post("/users")   →  POST http://127.0.0.1:8000/users
//
// ⚠️  IMPORTANT — "127.0.0.1" means "this device itself":
//
//   ✅ Web browser (testing with --web)  → reaches FastAPI on your laptop
//   ⚠️  Android emulator                 → use "10.0.2.2" instead
//   ⚠️  Physical phone on WiFi           → use your computer's LAN IP
//                                           e.g. "192.168.1.42"
//                                           Find it with: ipconfig (Windows)
//
// For now we use 127.0.0.1 because we are testing in a web browser.
const BASE_URL = 'http://127.0.0.1:8000';

// ─── Create the Axios instance ────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,

  // Headers are key-value pairs sent with every HTTP request.
  // They describe the request to the server.
  //
  // "Content-Type": "application/json" tells FastAPI:
  //   "The body I am sending is JSON text, please parse it as JSON."
  //
  // FastAPI reads this header and knows how to deserialize the request body.
  // Without it, FastAPI might not understand the POST body correctly.
  headers: {
    'Content-Type': 'application/json',
  },

  // timeout: if the server does not respond within 8 seconds,
  // Axios automatically cancels the request and throws an error.
  // Without a timeout, a slow server could leave your app "stuck" forever.
  timeout: 8000,
});

export default apiClient;
