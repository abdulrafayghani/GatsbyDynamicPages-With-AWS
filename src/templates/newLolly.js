import React from 'react'
import { graphql } from 'gatsby'
import Section from '../components/Section/Section'

export const query = graphql`
query getLolly($lollyPath: String!) {
  lolly {
    getLolly(lollyPath: $lollyPath) {
      lollyPath
      recipientName
      message
      senderName
      flavourTop
      flavourMiddle
      flavourBottom
    }
  }
}
`

const NewLolly = ({ data: { lolly: { getLolly } } }) => {
  const { lollyPath, recipientName, message, senderName, flavourTop, flavourMiddle, flavourBottom }  = getLolly
    return (
        <div>
          <Section lollyPath={lollyPath} recipientName={recipientName} message={message} senderName={senderName} flavourTop={flavourTop} flavourMiddle={flavourMiddle} flavourBottom={flavourBottom} />
        </div>
    )
}

export default NewLolly
