const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

async function request(endpoint, payload, options = {}) {
  const { method = "POST", token } = options;
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }

  return response.json();
}

export function generatePlan(payload) {
  return request("/plan", payload);
}

export function generateWhatIf(payload) {
  return request("/whatif", payload);
}

export function generateMultiGoalPlan(payload) {
  return request("/plan/multi-goal", payload);
}

export function signup(payload) {
  return request("/auth/signup", payload);
}

export function login(payload) {
  return request("/auth/login", payload);
}

export function savePlan(payload, token) {
  return request("/plans/save", payload, { method: "POST", token });
}

export function listSavedPlans(token) {
  return request("/plans", null, { method: "GET", token });
}

export function createGoal(payload, token) {
  return request("/goals", payload, { method: "POST", token });
}

export function listGoals(token, includeArchived = false) {
  return request(`/goals?include_archived=${includeArchived}`, null, { method: "GET", token });
}

export function updateGoal(goalId, payload, token) {
  return request(`/goals/${goalId}`, payload, { method: "PATCH", token });
}

export function archiveGoal(goalId, token) {
  return request(`/goals/${goalId}/archive`, null, { method: "POST", token });
}

