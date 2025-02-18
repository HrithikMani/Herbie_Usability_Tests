import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html'  // Allows refresh to work
    }),
    paths: {
      base: process.env.NODE_ENV === 'production' ? '/Herbie_Usability_Tests' : ''
    },
    appDir: '_app'
  }
};
