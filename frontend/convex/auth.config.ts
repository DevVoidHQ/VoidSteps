const domain = (process.env as Record<string, string | undefined>)
  .CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: [
    {
      domain,
      applicationID: "convex",
    },
  ],
};
