import React, { useRef, useEffect } from 'react'
import { UserInfo } from './gateway/client'

interface StreamDescription {
    id: string,
    screenName: string,
    stream: MediaStream
}

function Player(props: { description: StreamDescription }) {
    const { stream, screenName, id } = props.description

    const video = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (video.current) {
            if (stream) video.current.srcObject = stream

            video.current.autoplay = true
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

export function PlayerTable(props: {
    peerInfos: Record<string, UserInfo>,
    streams: Record<string, MediaStream | undefined>
}) {
    const { peerInfos, streams } = props
    const players = Object.keys(streams)
        .map(id => {
            const stream = streams[id]
            if (stream === undefined) return

            const screenName = id in peerInfos ? peerInfos[id].screenName : 'loading'
            return <Player description={{ id, screenName, stream }} key={id} />
        })
        .filter(player => player)

    return (
        <div className="player-grid row align-items-center">
            {players}
        </div>
    )
}
