/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.com/docs/gatsby-config/
 */
 
module.exports = {
  /* Your site config here */
  plugins: [
    {
      resolve: "gatsby-source-graphql",
      options: {
        typeName: "Lolly",
        fieldName: "lolly",
        url: `https://ulsr6z47i5fmlnhlycrd7ahjce.appsync-api.us-east-2.amazonaws.com/graphql`,
        headers: {
          "x-api-key": "da2-r2wl3vq7f5autny6ks77d37zme"
        }
      },
    },
  ],
}
