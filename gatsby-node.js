const path = require("path")

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions
  const response = await graphql(`
    query {
      lolly {
        getLollies {
          lollyPath
        }
      }
    }
  `)
  response.data.lolly.getLollies.forEach(edge => {
    createPage({
      path: `/create/${edge.lollyPath}`,
      component: path.resolve(`./src/templates/newLolly.js`),
      context: {
        id: edge.lollyPath,
      },
    })
  })
}
