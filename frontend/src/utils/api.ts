const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function cloneRepository(name: string, repoUrl: string) {
  const res = await fetch(`${API_BASE_URL}/repositories/clone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, repo_url: repoUrl }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to clone repository.");
  }
  return res.json();
}

export async function uploadRepositoryZip(name: string, file: File) {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/repositories/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to upload ZIP file.");
  }
  return res.json();
}

export async function getAnalysisStatus(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/status`);
  if (!res.ok) throw new Error("Failed to get status.");
  return res.json();
}

export async function getDashboardData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/dashboard`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load dashboard data.");
  }
  return res.json();
}

export async function getComplexityData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/complexity`);
  if (!res.ok) throw new Error("Failed to load complexity details.");
  return res.json();
}

export async function getChurnData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/churn`);
  if (!res.ok) throw new Error("Failed to load churn details.");
  return res.json();
}

export async function getHotspotsData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/hotspots`);
  if (!res.ok) throw new Error("Failed to load hotspot details.");
  return res.json();
}

export async function getBusFactorData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/bus-factor`);
  if (!res.ok) throw new Error("Failed to load bus factor details.");
  return res.json();
}

export async function getContributorsData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/contributors`);
  if (!res.ok) throw new Error("Failed to load contributor details.");
  return res.json();
}

export async function getTechnicalDebtData(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/analysis/${repoId}/technical-debt`);
  if (!res.ok) throw new Error("Failed to load technical debt details.");
  return res.json();
}

export async function getRepositoryBranches(repoId: string) {
  const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/branches`);
  if (!res.ok) throw new Error("Failed to load branches.");
  return res.json();
}

export async function switchRepositoryBranch(repoId: string, branch: string) {
  const res = await fetch(`${API_BASE_URL}/repositories/${repoId}/branch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ branch }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to switch branch.");
  }
  return res.json();
}
