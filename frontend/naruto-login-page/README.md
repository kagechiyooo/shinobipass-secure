<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2da81391-7a7d-4b81-836e-55602c65a519

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Camera Access From Another Device

Browsers allow camera access on `http://localhost`, but usually block it on plain `http://<LAN-IP>`.
If another machine opens this app over the network and the camera is denied, run the Vite dev server with HTTPS.

1. Generate a local certificate with a tool such as `mkcert`
2. Add these values to `.env.local`:
   `HTTPS_KEY_FILE="C:/path/to/localhost-key.pem"`
   `HTTPS_CERT_FILE="C:/path/to/localhost.pem"`
3. Start the app with `npm run dev`
4. Open the app with `https://<your-lan-ip>:3000` and trust the local certificate on the client machine

Without HTTPS, cross-device camera access will be blocked even if browser camera permission is enabled.
