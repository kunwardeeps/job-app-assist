# Job App Assist Chrome Extension

AI-powered Chrome extension to help you apply for jobs faster by auto-filling job application forms using your resume and an LLM (Google Gemini or others).

## Features
- Reads your resume from a file (e.g., `resume.json`)
- Detects and answers job portal questions using Google Gemini or other LLMs
- Auto-fills forms in one click
- Switch LLM model and API in the config page

## Installation
1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the `job-app-assist` folder.
5. Set up your resume file and LLM API in the extension's options page.

## Usage
- Visit a job application page.
- Click the extension icon, then click "Auto Fill".
- The extension will read your resume, detect questions, call the LLM, and fill the form.

## Configuration
- Go to the extension's options page to set:
  - Resume file path (e.g., `C:/Users/YourName/Documents/resume.json`)
  - LLM API key and endpoint
  - Model selection (e.g., Google Gemini, OpenAI GPT-4)

## Development
- Main files:
  - `manifest.json`: Extension manifest
  - `background.js`: Background logic
  - `content.js`: In-page logic
  - `popup.html`/`popup.js`: Popup UI
  - `options.html`/`options.js`: Config UI
  - `llm.js`: LLM API logic
  - `resume.json`: Sample resume

## Security Note
- Your resume is read locally and not uploaded unless you use a cloud file path.
- LLM API calls send only the necessary prompt (resume + questions) to the selected provider.

---

For questions or issues, open an issue in this repository.
