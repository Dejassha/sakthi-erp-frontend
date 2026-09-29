import baseQuery from "../baseQuery";

export const authApi = baseQuery.injectEndpoints({
  endpoints: (builder) => ({
    loginUser: builder.mutation({
      query: (credentials) => ({
        url: "login/",
        method: "POST",
        body: credentials,
      }),
    }),
    refreshToken: builder.mutation({
      query: () => ({
        url: "refresh_token/",
        method: "POST",
      }),
    }),
    getMe: builder.query({
      query: () => ({
        url: "me/",
        method: "GET",
      }),
    }),
  }),
});

export const { useLoginUserMutation, useRefreshTokenMutation, useGetMeQuery } =
  authApi;
