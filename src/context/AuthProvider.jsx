import { useState, useEffect, useCallback, useRef } from "react";
import { AuthContext } from "./AuthContext";
import { setAuthToken } from "../store/baseQuery";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isRefreshing = useRef(false);

  const login = (data) => {
    const tokenVal = data?.accesstoken || data?.token;
    setAuthToken(tokenVal);
    setUser(data?.user || data);
    setToken(tokenVal);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_BASE_URL;
      await fetch(`${baseUrl}/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAuthToken(null);
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // Session Recovery via /refresh_token/ + GET /me/
  const checkSession = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      const baseUrl = import.meta.env.VITE_BASE_URL;

      // Step 1: Obtains a new access token from the HttpOnly refreshToken cookie
      const refreshResponse = await fetch(`${baseUrl}/refresh_token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const refreshData = await refreshResponse.json();

      if (refreshResponse.ok && refreshData.accesstoken) {
        const freshToken = refreshData.accesstoken;
        setAuthToken(freshToken);
        setToken(freshToken);

        // Step 2: Fetch the live user profile directly from GET /me/
        const meResponse = await fetch(`${baseUrl}/me/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${freshToken}`,
            "Content-Type": "application/json",
          },
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          const liveUser = meData.user || meData;

          setUser(liveUser);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
      isRefreshing.current = false;
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateUser,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
