const AWS = require("aws-sdk")
const ddb = new AWS.DynamoDB.DocumentClient()

exports.handler = async (event: any) => {
  console.log("event", JSON.stringify(event, null, 2))

  const params = {
    TableName: process.env.LOLLY_TABLE_NAME,
    Item: {
      lollyPath: event.detail.event.lollyPath,
      recipientName: event.detail.event.recipientName,
      message: event.detail.event.message,
      senderName: event.detail.event.senderName,
      flavourTop: event.detail.event.flavourTop,
      flavourMiddle: event.detail.event.flavourMiddle,
      flavourBottom: event.detail.event.flavourBottom
    },
  }
  
  try {
      const result = await ddb.put(params).promise()
      console.log(result)
  } catch (err) {
    console.log(err)
  }
}
