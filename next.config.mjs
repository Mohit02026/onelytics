/** @type {import('next').NextConfig} */
const nextConfig = {
  // Belt-and-suspenders for Next 14.2 — instrumentation.ts is stable in most
  // 14.x releases but this flag is a harmless no-op if already default-on,
  // and its absence would silently skip register() if it's not.
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
