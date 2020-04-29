import React, { useRef, useEffect } from 'react'
import { Row } from 'react-bootstrap'

export interface StreamDescription {
    id: string
    screenName: string
    stream: MediaStream
}

function Player(props: { description: StreamDescription }) {
    const { stream, screenName, id } = props.description

    const video = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (video.current) {
            video.current.autoplay = true
            video.current.srcObject = stream
            video.current.onload = () => {
                if (video.current && video.current.readyState) {
                    video.current.play()
                }
            }

            if (id === 'local') video.current.muted = true
        }
    })

    return (
        <div className="player col-12 col-xl-6">
            <video ref={video}></video>
            <span className="screen-name">{screenName}</span>
        </div>
    )
}

export function PlayerTable(props: { peers: StreamDescription[] }) {
    const players = props.peers.map((description) => (
        <Player description={description} key={description.id} />
    ))

    return (
        <div className="player-grid row align-items-center">
            {players}
        </div>
    )
}
