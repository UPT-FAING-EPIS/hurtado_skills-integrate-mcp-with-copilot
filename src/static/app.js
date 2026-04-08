document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const authMessageDiv = document.getElementById("auth-message");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");

  const tokenKey = "activityToken";
  const userEmailKey = "activityUserEmail";
  let token = localStorage.getItem(tokenKey);

  function getAuthHeaders(isJson = false) {
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (isJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  function showAuthMessage(text, type = "info") {
    authMessageDiv.textContent = text;
    authMessageDiv.className = `message ${type}`;
    authMessageDiv.classList.remove("hidden");
    setTimeout(() => {
      authMessageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    const isLoggedIn = !!token;
    loginForm.classList.toggle("hidden", isLoggedIn);
    logoutBtn.classList.toggle("hidden", !isLoggedIn);

    if (isLoggedIn) {
      const savedEmail = localStorage.getItem(userEmailKey);
      if (savedEmail) {
        authMessageDiv.textContent = `Logged in as ${savedEmail}`;
        authMessageDiv.className = "message info";
        authMessageDiv.classList.remove("hidden");
      }
    } else {
      authMessageDiv.classList.add("hidden");
    }
  }

  function clearAuthState() {
    token = null;
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userEmailKey);
    updateAuthUI();
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!token) {
      showAuthMessage("Please log in before unregistering.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders()
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401 || response.status === 403) {
          clearAuthState();
          showAuthMessage("Authentication failed. Please log in again.", "error");
        }
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!token) {
      showAuthMessage("Please log in before signing up.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders()
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401 || response.status === 403) {
          clearAuthState();
          showAuthMessage("Authentication failed. Please log in again.", "error");
        }
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  async function handleLogin(event) {
    event.preventDefault();

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      if (response.ok) {
        token = result.access_token;
        localStorage.setItem(tokenKey, token);
        localStorage.setItem(userEmailKey, result.email);
        loginForm.reset();
        updateAuthUI();
        showAuthMessage(`Logged in as ${result.email}`, "success");
        fetchActivities();
      } else {
        showAuthMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showAuthMessage("Unable to log in. Please try again.", "error");
      console.error("Login error:", error);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch("/logout", {
        method: "POST",
        headers: getAuthHeaders()
      });

      if (response.ok) {
        clearAuthState();
        showAuthMessage("Logged out successfully.", "success");
      } else {
        clearAuthState();
        showAuthMessage("Logged out locally.", "info");
      }
    } catch (error) {
      clearAuthState();
      showAuthMessage("Logged out locally.", "info");
      console.error("Logout error:", error);
    }
  }

  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
