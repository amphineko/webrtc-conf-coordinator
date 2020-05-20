import React from 'react'
import ReactDOM from 'react-dom'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-bootstrap/dist/react-bootstrap'

import { AppMain } from './app'
import { setDebug } from './common/log'
import { getSessionOptions, setSessionOptions } from './storage'

setDebug('?')

const urlParams = new URLSearchParams(window.location.search)
const sessionId = urlParams.get('session')
if (!sessionId) throw new Error('Invalid session Id')

const config = {
    gatewayPath: '/Gateway'
}

const iceServers = [
    {
        urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun3.l.google.com:19302',
            'stun:stun4.l.google.com:19302'
        ]
    },
    {
        urls: ['stun:global.stun.twilio.com:3478?transport=udp']
    },
    {
        credential: 'ikazuchi3',
        urls: ['turn:10.251.4.129'],
        username: 'ikazuchi3'
    }
] as RTCIceServer[]

ReactDOM.render(
    <React.StrictMode>
        <AppMain
            config={config}
            iceServers={iceServers}
            sessionId={sessionId}
            userOptions={getSessionOptions(sessionId)}
            updateUserOptions={(options) => setSessionOptions(sessionId, options)}
        />
    </React.StrictMode>,
    document.getElementById('root')
)

window.document.title = 'Ikazuchi RTC'
