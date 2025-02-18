import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',  // Output directory
      assets: 'build',
      fallback: null
    }),
    paths: {
      base: process.env.NODE_ENV === 'production' ? '/Herbie_Usability_Tests' : ''
    }
  }
};
