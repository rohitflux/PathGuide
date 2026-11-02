
const goalInput = document.getElementById("goal");
const startButton = document.getElementById("startButton");
const statusText = document.getElementById("status");

startButton.addEventListener("click", startGuide);

async function startGuide() {
  const goal = goalInput.value.trim().toLowerCase();

  if (!goal) {
    statusText.textContent = "Please tell me what you want to do.";
    return;
  }

  startButton.disabled = true;
  startButton.textContent = "Starting...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id || !tab.url?.startsWith("file://")) {
      statusText.textContent =
        "Open the local PathGuide demo website first.";
      return;
    }

    // STEP 1: Use predefined workflows for tested tasks.
    let workflow = null;

    if (
      goal.includes("profile") ||
      goal.includes("edit") ||
      goal.includes("change name") ||
      goal.includes("save changes")
    ) {
      workflow = "profile";
    } else if (
      goal.includes("assignment") ||
      goal.includes("course") ||
      goal.includes("class")
    ) {
      workflow = "courses";
    }

    if (workflow) {
      statusText.textContent = "Starting your guided workflow...";

      const result = await chrome.tabs.sendMessage(tab.id, {
        type: "START_GUIDE",
        workflow: workflow
      });

      if (!result || result.status !== "success") {
        throw new Error(result?.message || "Could not start workflow.");
      }

      statusText.textContent = "Your guide is ready!";
      return;
    }

    // STEP 2: Use Gemini for other navigation requests.
    statusText.textContent = "Scanning the webpage...";

    const scanResult = await chrome.tabs.sendMessage(tab.id, {
      type: "SCAN_PAGE"
    });

    if (
      !scanResult ||
      scanResult.status !== "success" ||
      !scanResult.candidates ||
      scanResult.candidates.length === 0
    ) {
      throw new Error("No suitable webpage elements were detected.");
    }

    statusText.textContent = "Gemini is planning your navigation...";

    const response = await fetch("http://127.0.0.1:5000/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        goal: goal,
        candidates: scanResult.candidates
      })
    });

    const plan = await response.json();

    if (!response.ok) {
      throw new Error(plan.message || "AI planning failed.");
    }

    if (plan.status !== "success" || !plan.steps?.length) {
      throw new Error(plan.message || "No navigation path was found.");
    }

    statusText.textContent = "Starting your AI guide...";

    const guideResult = await chrome.tabs.sendMessage(tab.id, {
      type: "START_AI_GUIDE",
      plan: plan
    });

    if (!guideResult || guideResult.status !== "success") {
      throw new Error(guideResult?.message || "Could not start AI guide.");
    }

    statusText.textContent = "Your AI guide is ready!";

  } catch (error) {
    console.error("PathGuide error:", error);
    statusText.textContent = "Error: " + error.message;

  } finally {
    startButton.disabled = false;
    startButton.textContent = "Start guiding me";
  }
}
