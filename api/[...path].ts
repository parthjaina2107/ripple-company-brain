// Vercel routes every /api/* request to the Express application. The Vite
// build serves the UI separately, while this function keeps graph operations
// on the server where database credentials remain private.
export { default } from "../server/index.js";
