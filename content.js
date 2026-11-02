
// =============================================
// PATHGUIDE - CONTENT SCRIPT
// Version 0.2: Semantic Element Detection
// =============================================


// 1. DEFINE WORKFLOWS
// We now describe WHAT we want to find,
// rather than specifying a fixed CSS selector.

const workflows = {

  profile: [
    {
      target: {
        name: "Profile Settings",
        role: "button",
        aliases: ["profile", "account settings"]
      },
      instruction: "Open Profile Settings.",
      explanation: "Find and click the Profile Settings button."
    },

    {
      target: {
        name: "Edit Profile",
        role: "button",
        aliases: ["edit", "change profile"]
      },
      instruction: "Choose Edit Profile.",
      explanation: "Find the option that lets you edit your profile."
    },

    {
      target: {
        name: "Save Changes",
        role: "button",
        aliases: ["save", "update profile"]
      },
      instruction: "Save your changes.",
      explanation: "Click Save Changes to finish updating your profile."
    }
  ],

  courses: [
    {
      target: {
        name: "Courses",
        role: "button",
        aliases: ["my courses", "course list"]
      },
      instruction: "Open Courses.",
      explanation: "Find and open the Courses section."
    },

    {
      target: {
        name: "View Assignments",
        role: "button",
        aliases: ["assignments", "course work"]
      },
      instruction: "Open your assignments.",
      explanation: "Find the option to view your assignments."
    }
  ]
};


// 2. STATE VARIABLES

let currentWorkflow = [];
let stepIndex = 0;
let highlightedElement = null;
let isComplete = false;
let guideActive = false;

// Stores webpage elements using their unique IDs
let elementRegistry = new Map();


// 3. CREATE THE PATHGUIDE INTERFACE

const host = document.createElement("div");
host.id = "pathguide-host";

host.style.cssText = `
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483647;
`;

const shadow = host.attachShadow({ mode: "open" });

const highlightStyle = document.createElement("style");

highlightStyle.textContent = `
  .pathguide-highlight {
    outline: 4px solid #6d28d9 !important;
    outline-offset: 4px !important;
    box-shadow: 0 0 0 7px rgba(109, 40, 217, 0.18) !important;
    border-radius: 5px !important;
  }
`;

document.documentElement.appendChild(highlightStyle);
document.documentElement.appendChild(host);


// 4. CHECK WHETHER AN ELEMENT IS VISIBLE

function isVisible(element) {

  const style = window.getComputedStyle(element);

  return (
    element.getClientRects().length > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    !element.disabled &&
    !element.closest("[hidden], [inert], [aria-hidden='true']")
  );
}


// 5. GET THE ACCESSIBLE NAME OR VISIBLE TEXT

function getElementName(element) {

  const ariaLabel = element.getAttribute("aria-label");

  const labelledBy = element.getAttribute("aria-labelledby");

  let labelledText = "";

  if (labelledBy) {
    labelledText = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.innerText || "")
      .join(" ");
  }

  const title = element.getAttribute("title");

  const value = element.value || "";

  const text = element.innerText || element.textContent || "";

  return [
    ariaLabel,
    labelledText,
    title,
    value,
    text
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}


// 6. SCAN THE CURRENT WEBPAGE

function scanPageElements() {

  const elements = document.querySelectorAll(
    "button, a[href], input[type='button'], " +
    "input[type='submit'], [role='button'], [role='link']"
  );

  const discovered = [];

  // Reset the registry before scanning
  elementRegistry.clear();

  elements.forEach(element => {

    if (!isVisible(element)) {
      return;
    }

    const name = getElementName(element);

    if (!name) {
      return;
    }

    const role =
      element.getAttribute("role") ||
      (
        element.tagName === "A" ? "link" :
        "button"
      );

    // Generate a unique ID for this element
    const id = "pg-" + discovered.length;

    elementRegistry.set(id, element);

    discovered.push({
      id: id,
      element: element,
      name: name,
      role: role
    });

  });

  return discovered;
}

// 7. NORMALIZE TEXT BEFORE COMPARISON

function normalizeText(text) {

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Safely display text received from Gemini
function escapeHTML(text) {

  return String(text || "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );

}


// 8. CALCULATE HOW WELL AN ELEMENT MATCHES A TARGET

function calculateScore(candidate, target) {

  const actualName = normalizeText(candidate.name);

  const expectedName = normalizeText(target.name);

  const aliases = (target.aliases || [])
    .map(normalizeText);

  let score = 0;

  // Exact match
  if (actualName === expectedName) {
    score += 100;
  }

  // Actual name contains expected name
  else if (actualName.includes(expectedName)) {
    score += 75;
  }

  // Expected name contains actual name
  else if (expectedName.includes(actualName)) {
    score += 55;
  }

  // Check alternative names
  aliases.forEach(alias => {

    if (actualName === alias) {
      score = Math.max(score, 85);
    }

    else if (
      alias &&
      (actualName.includes(alias) || alias.includes(actualName))
    ) {
      score = Math.max(score, 65);
    }

  });

  // Word overlap
  const expectedWords = expectedName.split(" ");
  const actualWords = actualName.split(" ");

  const commonWords = expectedWords.filter(
    word => actualWords.includes(word)
  );

  if (expectedWords.length > 0) {
    score = Math.max(
      score,
      (commonWords.length / expectedWords.length) * 50
    );
  }

  // Match the expected element role
  if (target.role === candidate.role) {
    score += 15;
  }

  return score;
}


// 9. FIND THE BEST MATCH ON THE WEBPAGE

function findBestMatch(target) {

  const candidates = scanPageElements();

  const rankedCandidates = candidates.map(candidate => {

    return {
      ...candidate,
      score: calculateScore(candidate, target)
    };

  });

  rankedCandidates.sort((a, b) => b.score - a.score);

  // Useful for debugging
  console.table(
    rankedCandidates.map(item => ({
      name: item.name,
      role: item.role,
      score: Math.round(item.score)
    }))
  );

  const bestMatch = rankedCandidates[0];

  // Do not highlight weak or uncertain matches.
  if (!bestMatch || bestMatch.score < 45) {
    return null;
  }

  // Avoid choosing between two almost equally good results.
  const secondMatch = rankedCandidates[1];

  if (
    secondMatch &&
    bestMatch.score - secondMatch.score < 5
  ) {
    console.warn("PathGuide: Multiple possible matches found.");
    return null;
  }

  return bestMatch.element;
}


// 10. CLEAR THE PREVIOUS HIGHLIGHT

function clearHighlight() {

  if (highlightedElement) {
    highlightedElement.classList.remove(
      "pathguide-highlight"
    );

    highlightedElement = null;
  }

}


// 11. PANEL STYLING

const panelStyles = `
  * {
    box-sizing: border-box;
  }

  .panel {
    width: 320px;
    padding: 20px;
    border: 1px solid #ded8f5;
    border-radius: 16px;
    background: white;
    color: #202033;
    box-shadow: 0 8px 35px rgba(20,15,45,0.22);
    font-family: Arial, sans-serif;
  }

  .topRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    color: #5b38d5;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  h2 {
    margin: 12px 0;
    font-size: 21px;
    line-height: 1.3;
  }

  p {
    line-height: 1.55;
  }

  .progress {
    margin: 20px 0 8px;
    color: #5b38d5;
    font-size: 13px;
    font-weight: bold;
  }

  .explanation {
    color: #48485b;
    font-size: 14px;
  }

  .tip {
    padding: 10px;
    border-radius: 8px;
    background: #f3f0ff;
    color: #46328b;
    font-size: 12px;
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  button {
    padding: 11px 14px;
    border: 0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 3px solid #9678ff;
    outline-offset: 3px;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .primary {
    flex: 1;
    background: #5b38d5;
    color: white;
  }

  .secondary {
    background: #efedf5;
    color: #27243a;
  }

  .iconButton {
    padding: 4px 10px;
    background: #f1eff6;
    color: #27243a;
    font-size: 22px;
  }
`;


// 12. DISPLAY THE INSTRUCTION PANEL

function renderPanel(message = null) {

  if (isComplete) {

    shadow.innerHTML = `
      <style>${panelStyles}</style>

      <section class="panel" role="status" aria-live="polite">
        <div class="brand">PATHGUIDE</div>
        <h2>You're all done!</h2>
        <p>You completed the guided task successfully.</p>
        <button id="closeButton" class="primary">
          Finish
        </button>
      </section>
    `;

    shadow.getElementById("closeButton")
      .addEventListener("click", closeGuide);

    return;
  }

  const step = currentWorkflow[stepIndex];
  const heading = escapeHTML(step.title || step.instruction);

  const explanation = escapeHTML(step.explanation);

  const tip = escapeHTML(
  step.tip || "Click the highlighted element to continue."
);

  

  shadow.innerHTML = `
    <style>${panelStyles}</style>

    <section class="panel" aria-label="PathGuide instructions">

      <div class="topRow">
        <span class="brand">PATHGUIDE</span>
        <button id="exitButton" class="iconButton"
          aria-label="Exit guide">×</button>
      </div>

      <p class="progress">
        Step ${stepIndex + 1} of ${currentWorkflow.length}
      </p>

      <h2>${message ? escapeHTML(message) : heading}</h2>

      <p class="explanation">
        ${message
          ? "We could not identify a suitable element. Check the page or try again."
          : explanation}
      </p>

      <p class="tip">
        ${message
          ? "You can retry, go back, or exit the guide."
          : tip}
      </p>

      <div class="actions">
        <button id="backButton" class="secondary">
          Back
        </button>

        ${message
          ? `<button id="retryButton" class="primary">Retry</button>`
          : `<button id="skipButton" class="primary">Skip</button>`
        }
      </div>

    </section>
  `;

  const backButton = shadow.getElementById("backButton");

  backButton.disabled = stepIndex === 0;

  backButton.addEventListener("click", () => {

    if (stepIndex > 0) {
      showStep(stepIndex - 1);
    }

  });

  if (message) {

    shadow.getElementById("retryButton")
      .addEventListener("click", () => {
        showStep(stepIndex);
      });

  } else {

    shadow.getElementById("skipButton")
      .addEventListener("click", () => {

        if (stepIndex < currentWorkflow.length - 1) {
          showStep(stepIndex + 1);
        } else {
          completeGuide();
        }

      });

  }

  shadow.getElementById("exitButton")
    .addEventListener("click", closeGuide);

}


// 13. SHOW A PARTICULAR STEP

function showStep(newIndex) {

  if (newIndex < 0 || newIndex >= currentWorkflow.length) {
    return;
  }

  clearHighlight();

  stepIndex = newIndex;
  isComplete = false;

  const step = currentWorkflow[stepIndex];

  let target;

// AI-generated steps use exact element IDs
if (step.target_id) {

  target = elementRegistry.get(step.target_id);

  // Make sure the element still exists and is visible
  if (
    target &&
    (!target.isConnected || !isVisible(target))
  ) {
    target = null;
  }

} else {

  // Existing keyword/semantic matching remains available
  target = findBestMatch(step.target);

}

  if (!target) {

    renderPanel("Element not found");

    return;
  }

  renderPanel();

  highlightedElement = target;

  target.classList.add("pathguide-highlight");

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  });

}


// 14. COMPLETE THE GUIDE

function completeGuide() {

  clearHighlight();

  isComplete = true;

  renderPanel();

}


// 15. CLOSE THE GUIDE

function closeGuide() {

  clearHighlight();

  shadow.innerHTML = "";

  host.style.display = "none";

  currentWorkflow = [];

  isComplete = false;
  guideActive = false;

}


// 16. DETECT USER CLICKS

function onPageClick(event) {

  if (
    !guideActive ||
    isComplete ||
    !highlightedElement
  ) {
    return;
  }

  if (!(event.target instanceof Element)) {
    return;
  }

  // Check that the click happened on the current target.
  const clickedTarget = event.target.closest(
    "button, a[href], input[type='button'], " +
    "input[type='submit'], [role='button'], [role='link']"
  );

  if (clickedTarget !== highlightedElement) {
    return;
  }

  const clickedStep = stepIndex;

  // Wait for the website to respond to the click.
  setTimeout(() => {

    if (
      !guideActive ||
      stepIndex !== clickedStep ||
      isComplete
    ) {
      return;
    }

    if (stepIndex < currentWorkflow.length - 1) {
      showStep(stepIndex + 1);
    } else {
      completeGuide();
    }

  }, 400);

}

document.addEventListener("click", onPageClick, true);


// 17. RECEIVE REQUESTS FROM THE EXTENSION POPUP

// =============================================
// 17. RECEIVE REQUESTS FROM THE EXTENSION POPUP
// =============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // REQUEST 1: Scan webpage elements for Gemini
  if (message.type === "SCAN_PAGE") {

    const discovered = scanPageElements();

    // Send only relevant information, not DOM elements
    const candidates = discovered.map(item => ({
      id: item.id,
      name: item.name,
      role: item.role
    }));

    sendResponse({
      status: "success",
      candidates: candidates
    });

    return;
  }


  // REQUEST 2: Start a Gemini-generated navigation plan
  if (message.type === "START_AI_GUIDE") {

    const plan = message.plan;

    if (
      !plan ||
      plan.status !== "success" ||
      !Array.isArray(plan.steps) ||
      plan.steps.length === 0
    ) {
      sendResponse({
        status: "error",
        message: "Invalid navigation plan."
      });

      return;
    }

    // Verify that every target exists in our registry
    const validPlan = plan.steps.every(step =>
      step &&
      typeof step.target_id === "string" &&
      elementRegistry.has(step.target_id)
    );

    if (!validPlan) {
      sendResponse({
        status: "error",
        message: "Some navigation targets are unavailable."
      });

      return;
    }

    // Convert Gemini's response into PathGuide steps
    currentWorkflow = plan.steps.map(step => ({
      target_id: step.target_id,
      title: step.title,
      instruction: step.instruction,
      explanation: step.explanation,
      tip: step.tip
    }));

    host.style.display = "block";

    stepIndex = 0;
    isComplete = false;
    guideActive = true;

    showStep(0);

    sendResponse({
      status: "success"
    });

    return;
  }


  // REQUEST 3: Existing predefined workflows
  if (message.type === "START_GUIDE") {

    const selectedWorkflow = workflows[message.workflow];

    if (!selectedWorkflow) {
      sendResponse({
        status: "error",
        message: "Unknown workflow."
      });

      return;
    }

    host.style.display = "block";

    currentWorkflow = selectedWorkflow;

    stepIndex = 0;
    isComplete = false;
    guideActive = true;

    showStep(0);

    sendResponse({
      status: "success"
    });

    return;
  }

});
