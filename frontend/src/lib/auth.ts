export interface AuthUser {
  token: string;
  name: string;
  email: string;
  role: "Admin" | "Customer";
}

export function saveAuth(user: AuthUser) {
  localStorage.setItem("token", user.token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function isAdmin(): boolean {
  return getAuth()?.role === "Admin";
}
