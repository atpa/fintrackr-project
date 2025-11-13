module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addWatchTarget('src/assets');

  eleventyConfig.addGlobalData('eleventyComputed', {
    permalink: (data = {}) => {
      const page = data.page || {};
      const slug = page.fileSlug;

      if (!slug) {
        return data.permalink;
      }

      if (slug === 'index') {
        return 'index.html';
      }

      return `${slug}.html`;
    },
  });

  return {
    dir: {
      input: 'src/pages',
      includes: '../partials',
      layouts: '../layouts',
      output: 'dist',
    },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
};
