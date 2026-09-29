import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

let authToken = null;
export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const baseUrl = import.meta.env.VITE_BASE_URL;

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: (headers, { endpoint }) => {
    headers.set("Content-Type", "application/json");
    if (authToken && endpoint !== "refreshToken") {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    return headers;
  },
});

const normalizeArgs = (args) => {
  if (typeof args === "string") {
    return args.replace(/^api\//, "");
  }
  if (args && typeof args.url === "string") {
    return { ...args, url: args.url.replace(/^api\//, "") };
  }
  return args;
};

// Shared promise for handling concurrent 401 refresh requests
let refreshPromise = null;

const performTokenRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${baseUrl}/refresh_token/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await response.json();
        if (response.ok && data?.accesstoken) {
          const freshToken = data.accesstoken;
          setAuthToken(freshToken);
          return freshToken;
        } else {
          setAuthToken(null);
          return null;
        }
      } catch {
        setAuthToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const normalizedArgs = normalizeArgs(args);
  const targetUrl =
    typeof normalizedArgs === "string"
      ? normalizedArgs
      : normalizedArgs?.url || "";

  let result = await rawBaseQuery(normalizedArgs, api, extraOptions);

  if (
    result.error &&
    result.error.status === 401 &&
    !targetUrl.includes("refresh_token") &&
    !targetUrl.includes("login")
  ) {
    const newAccessToken = await performTokenRefresh();

    if (newAccessToken) {
      // Retry original failed request with the newly obtained access token
      result = await rawBaseQuery(normalizedArgs, api, extraOptions);
    } else {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
  }

  return result;
};

const baseQuery = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Inward",
    "Programer",
    "QA",
    "Account",
    "Quotation",
    "Admin",
    "AdminMaterials",
    "AdminOperators",
    "AdminCompanies",
    "AdminMachines",
    "AdminUsers",
    "AdminReports",
    "AdminRoles",
    "AdminGas",
    "AdminInventory",
    "QuotationProcess",
    "QuotationNote",
    "KPIRecords",
  ],
  endpoints: () => ({}),
});

export default baseQuery;
