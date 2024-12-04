/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    loader: "custom",
    loaderFile: "./components/partials/ImageLoader.jsx",
  },
};

export default nextConfig;
