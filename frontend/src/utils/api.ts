const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handleResponse(res: Response, defaultError: string) {
  if (!res.ok) {
    let errMsg = defaultError;
    try {
      const err = await res.json();
      errMsg = err.detail || defaultError;
    } catch (_) {
      try {
        const text = await res.text();
        if (text) errMsg = text;
      } catch (__) {}
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export async function cloneRepository(name: string, repoUrl: string, userEmail?: string) {
  const res = await fetch(`${API_BASE_URL}/repositories/clone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, repo_url: repoUrl, user_email: userEmail }),
  });
  return handleResponse(res, "Failed to clone repository.");
}


export async function getAnalysisStatus(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/status`);
  return handleResponse(res, "Failed to check analysis status.");
}

export async function getDashboardData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/dashboard`);
  return handleResponse(res, "Failed to load dashboard data.");
}

export async function getComplexityData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/complexity`);
  return handleResponse(res, "Failed to load complexity details.");
}

export async function getChurnData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/churn`);
  return handleResponse(res, "Failed to load churn details.");
}

export async function getHotspotsData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/hotspots`);
  return handleResponse(res, "Failed to load hotspot details.");
}

export async function getBusFactorData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/bus-factor`);
  return handleResponse(res, "Failed to load bus factor details.");
}

export async function getContributorsData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/contributors`);
  return handleResponse(res, "Failed to load contributor details.");
}

export async function getTechnicalDebtData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/technical-debt`);
  return handleResponse(res, "Failed to load technical debt details.");
}

export async function getRepositoryBranches(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/branches`);
  return handleResponse(res, "Failed to load branches.");
}

export async function switchRepositoryBranch(repoId: string, branch: string) {
  const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/branch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ branch }),
  });
  return handleResponse(res, "Failed to switch branch.");
}

export async function restartAnalysis(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}`, {
    method: "POST",
  });
  return handleResponse(res, "Failed to restart analysis.");
}

export async function registerUser(email: string, name: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, name, password }),
  });
  return handleResponse(res, "Registration failed.");
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res, "Login failed.");
}

export async function getRecentAnalyses(email: string) {
  const url = `${API_BASE_URL}/analysis/recents?email=${encodeURIComponent(email)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load recent analyses.");
  }
  const data: Array<{
    id: string;
    name: string;
    repo_url: string | null;
    status: string;
    analyzed_at: string | null;
    last_analyzed_at: string | null;
  }> = await res.json();
  return data.map(item => ({
    id: item.id,
    name: item.name,
    date: item.analyzed_at ?? item.last_analyzed_at ?? null,
  }));
}

export async function removeRecentAnalysis(repoId: string, email: string) {
  const url = `${API_BASE_URL}/analysis/${repoId}?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    method: "DELETE",
  });
  return handleResponse(res, "Failed to remove repository from recently analyzed.");
}

