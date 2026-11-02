import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bcryptjs and Prisma must stay server-side; keep them out of the edge bundle.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
