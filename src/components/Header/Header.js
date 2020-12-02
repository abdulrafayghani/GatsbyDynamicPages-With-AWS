import { navigate } from "gatsby"
import React from "react"

export const Header = () => {
  return (
    <div  className="container">
      <button style={{backgroundColor: '#21212b', border: 'transparent'}} onClick={() => navigate('/')}>
        <h1 className='title'  >Virtual Lollipop</h1>
      </button>
      <p className='subtitle'> because we all know someone who deserves some sugar.</p>
    </div>
  )
}
