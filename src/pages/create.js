import React, { useRef, useState } from 'react'
import { gql, useMutation } from "@apollo/client";
import shortid from 'shortid'
import { Layout } from '../components/Layout/Layout'
import Lolly from '../components/Lolly/Lolly'
import Section from '../components/Section/Section';
import { Router } from '@reach/router';
import Page404 from './404';

const createLollyMutation = gql`
    mutation createLolly($lollyPath: String!, $recipientName: String!, $message: String!, $senderName: String!, $flavourTop: String!, $flavourMiddle: String!,$flavourBottom: String!) {
        createLolly(lollyPath: $lollyPath, recipientName: $recipientName, message: $message, senderName: $senderName, flavourTop: $flavourTop, flavourMiddle: $flavourMiddle, flavourBottom: $flavourBottom) {
            result
        }
    }
`

export default function Create({ location }){
    const [createLolly] = useMutation(createLollyMutation)
    const [path, setPath] = useState('')

    const [topColor, setTopColor] = useState('#e97393')    
    const [middleColor, setMiddleColor] = useState('#d23a62')    
    const [bottomColor, seBottomColor] = useState('#bb1161') 
    const recipientName = useRef()
    const message = useRef()
    const senderName = useRef()

    const submitLollyForm = async () => {
        const id = shortid.generate()

        const result = await createLolly({
            variables: {
                recipientName: recipientName.current.value,
                message: message.current.value,
                senderName: senderName.current.value,
                flavourTop: topColor,
                flavourMiddle: middleColor,
                flavourBottom: bottomColor,
                lollyPath: id
            }
        })
        //  const { lollyPath } = result.data.createLolly
         console.log(result)
         setPath(id)
    }

    return(
        <div>
            <Router basepath='/newLolly'>
                <Page404 path= '/:lollyPath' />
            </Router>
            { path ? ( 
                <Section lollyPath={path} recipientName={recipientName.current.value} message={message.current.value} senderName={senderName.current.value} flavourTop={topColor} flavourMiddle={middleColor} flavourBottom={bottomColor} location={location.origin} />
            ) : (
                <Layout>
                <div className='lolly'>
                    <div className='giftLolly'>
                        <Lolly fillLollyTop={topColor} fillLollyMiddle={middleColor} fillLollyBottom={bottomColor} />
                    </div>
                    <div className='falvours'>
                        <label id='flavourTop' className='pickerLabel'>
                            <input type='color' className="colourpicker" id="flavourTop" name="flavourTop" value={topColor} onChange={(e) => setTopColor(e.target.value)} />
                        </label>
                        <label id='flavourTop' className='pickerLabel'>
                            <input type='color' className="colourpicker" id="falvourMidlle" name="falvourMidlle" value={middleColor} onChange={(e) => setMiddleColor(e.target.value)} />
                        </label>                        <label id='flavourTop' className='pickerLabel'>
                            <input type='color' className="colourpicker" id="flavourBottom" name="flavourBottom" value={bottomColor} onChange={(e) => seBottomColor(e.target.value)} />
                        </label>
                    </div>
                    <div className='info'>
                        <div className='details'>
                            <p>
                                <label htmlFor='recipientName' >To</label>
                                <input type="text" required id="recipientName" name="recipientName" placeholder="From" ref={recipientName} />
                            </p>
                            <div className='message'>
                                <label htmlFor='recipientName'>
                                    Say Something Nice
                                </label>
                                <textarea name="message" required id="message" cols="30" rows="10" ref={message} />
                            </div>
                            <p>
                                <label htmlFor='recipientName'>From</label>
                                <input type="text" required placeholder="from your friend..."  ref={senderName} />
                            </p>
                        </div>
                        <input type="submit" onClick={submitLollyForm} />
                    </div>
                </div>
        </Layout>
        )}
    </div>    
    )
}
