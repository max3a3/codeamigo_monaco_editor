module.exports = {
  async headers() {
    return [
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=1, stale-while-revalidate=59',
          },
        ],
        source: '/',
      },
    ];
  },
  webpack: (config, { buildId, defaultLoaders, dev, isServer, webpack }) => {
    return config;
  },
};
