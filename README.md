# PathGuide – AI-Assisted Digital Navigation

PathGuide is an accessibility-focused Chrome extension designed to make digital platforms easier to navigate, especially for people with disabilities, language barriers, or limited technical literacy.

Instead of requiring users to understand a website's layout, PathGuide allows them to describe what they want to do in natural language. It then identifies relevant webpage elements and provides step-by-step visual guidance.

## Problem Statement

Many digital platforms are difficult to navigate for users who are unfamiliar with their interfaces or face accessibility barriers. PathGuide aims to simplify these interactions through natural-language instructions and visual guidance.

## Key Features

- **Natural-language navigation:** Users describe their desired task in their own words.
- **AI-assisted planning:** Gemini analyses detected webpage elements and generates a navigation plan.
- **Visual highlighting:** Relevant webpage elements are highlighted to guide users.
- **Step-by-step instructions:** Users receive instructions and explanations for each navigation step.
- **Predefined workflows:** Tested workflows are available for profile editing and assignments navigation.
- **Interactive guidance:** Users can proceed by clicking highlighted elements, retry steps, skip steps, or exit the guide.

## How It Works

1. The user enters a navigation goal in the PathGuide extension.
2. PathGuide scans the current webpage for relevant interactive elements.
3. For supported predefined tasks, it uses built-in workflows.
4. For other tasks, the detected elements are sent to a local Python backend.
5. The backend uses Google's Gemini API to generate a navigation plan.
6. PathGuide displays the plan through visual highlights and step-by-step instructions.

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Browser Platform:** Chrome Extension (Manifest V3)
- **Backend:** Python and Flask
- **AI Integration:** Google Gemini API

## Project Structure

```text
PathGuide/
│
├── backend/
│   ├── app.py
│   └── .gitignore
│
├── demo/
│   ├── index.html
│   └── style.css
│
├── content.js
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
└── .gitignore
```

## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/PathGuide.git
cd PathGuide
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Set up the Python backend

Open a terminal in the project folder and run:

```bash
cd backend
python -m venv venv
```

On Windows, activate the virtual environment:

```bash
venv\Scripts\activate
```

Install the required packages:

```bash
pip install flask python-dotenv google-genai
```

### 3. Configure the Gemini API key

Create a `.env` file inside the `backend` folder:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Do not share or upload this file. The API key must remain private.

### 4. Start the backend

From the `backend` directory, run:

```bash
python app.py
```

The backend runs locally at:

`http://127.0.0.1:5000`

### 5. Load the Chrome extension

1. Open Chrome and visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the main PathGuide project folder containing `manifest.json`.
5. Open the extension's Details and enable **Allow access to file URLs**.

### 6. Run the demo

1. Open `demo/index.html` in Chrome.
2. Make sure the Python backend is running.
3. Open the PathGuide extension.
4. Enter a navigation goal and click **Start guiding me**.

## Current Development Status

PathGuide is currently a working prototype.

Implemented:
- Chrome extension interface.
- Webpage element detection.
- Predefined navigation workflows.
- Gemini API integration through a Flask backend.
- AI-generated navigation plans.
- Visual highlighting and interactive step-by-step guidance.

Current limitations:
- The current prototype is configured for local demo webpages rather than arbitrary websites.
- Navigation planning is based on elements detected on the current page.
- Guidance does not yet reliably persist across full-page navigations.
- Element detection and navigation accuracy need further improvement.

## Future Scope

- Support for a wider range of websites.
- Persistent navigation across multiple pages.
- Improved detection of custom webpage controls.
- More robust accessibility support.
- Multilingual natural-language navigation.
- Voice-based interaction.

---

**PathGuide – Making digital navigation simpler and more accessible.**