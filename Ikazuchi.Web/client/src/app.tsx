import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Container, Row } from 'react-bootstrap'

import { MemberList, MemberDescriptor } from './member_list'
import { GatewayClient, GatewayState, UserInfo } from './gateway/client'
import { getLogger } from './common/log'
import { StreamDescription, PlayerTable } from './players'
import { SessionUserOptions } from './storage'

import './app.scss'

export interface AppConfig {
    gatewayPath: string
}

export function AppMain(props: {
    config: AppConfig,
    iceServers: RTCIceServer[]
    sessionId: string,
    userOptions: SessionUserOptions,
    updateUserOptions: (options: SessionUserOptions) => void
}) {
    const { config: appConfig, sessionId, userOptions } = props
    const { gatewayPath: gatewayUrl } = appConfig

    const logger = getLogger('AppMain')

    const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | undefined>(undefined)
    const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | undefined>(undefined)
    const [localStream, setLocalStream] = useState<MediaStream | undefined>(undefined)
    const [userMediaRequested, setUserMediaRequested] = useState(false)

    const [gatewayState, setGatewayState] = useState<GatewayState>('disconnected')
    const client = useRef<GatewayClient>(null!)

    const [remoteStreams, setRemoteStreams] = useState<{ [id: string]: StreamDescription }>({})

    const [peerInfos, setPeerInfos] = useState<{ [key: string]: UserInfo }>({})

    async function initializeUserMedia() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        setLocalStream(stream)

        const audioTracks = stream.getAudioTracks()
        setAudioTrack(audioTracks.shift())
        audioTracks.forEach((track) => track.stop())

        const videoTracks = stream.getVideoTracks()
        setVideoTrack(videoTracks.shift())
        videoTracks.forEach((track) => track.stop())
    }

    const peerStates = useMemo(() => {
        if (client.current === null) return []

        const result: MemberDescriptor[] = []
        client.current.peers.forEach((peer, id) => {
            const info = id in peerInfos ? peerInfos[id] : undefined
            const screenName = info ? info.screenName : 'loading'
            result.push({ id: id, screenName: screenName, state: peer.state })
        })

        return result
    }, [peerInfos])

    function updatePlaybackStreams() {
        setRemoteStreams({
            local: { id: 'local', screenName: '', stream: localStream }
        })

        if (client.current !== null) {
            client.current.peers.forEach((peer, id) => {
                const stream = (remoteStreams[id] && remoteStreams[id].stream) ?? new MediaStream()
                peer.remoteTracks.forEach((track) => {
                    if (stream.getTrackById(track.id)) return

                    stream.addTrack(track)
                    track.onended = () => stream.removeTrack(track)
                })
                stream.onremovetrack = () => {
                    if (stream.getTracks().length === 0) {
                        setRemoteStreams({ [id]: { id: id, screenName: 'DISCONNECTED', stream: undefined } })
                    }
                }

                const info = id in peerInfos ? peerInfos[id] : undefined
                const screenName = info ? info.screenName : 'unknown'

                setRemoteStreams({ [id]: { id: id, screenName: screenName, stream: stream } })
            })
        }
    }

    function updatePeerInfo() {
        if (client.current === null) return
        client.current.peers.forEach((_, id) => {
            if (id in peerInfos) return

            client.current.getUserInfo(id)
                .then((user: UserInfo) => setPeerInfos({ [id]: user }))
                .catch((e) => { logger.error(`Failed to retrieve user info: ${e}`) })
        })
    }

    useEffect(() => {
        // initialize gateway client, if not connected yet
        if (client.current === null) {
            const c = client.current =
                new GatewayClient(gatewayUrl, { audio: audioTrack, video: videoTrack }, props.iceServers)

            c.onpeerchanged = c.onpeerstatechanged = () => updatePeerInfo()

            c.onpeertrack = () => updatePlaybackStreams()

            c.onstatechanged = (state) => {
                logger.info(`Gateway connection state → ${state}`)
                setGatewayState(state)
            }

            c.start().then(() => { c.join(sessionId) })
        }
    })

    useEffect(() => {
        if (!userMediaRequested) {
            setUserMediaRequested(true)
            initializeUserMedia()
        }
    }, [userMediaRequested])

    useEffect(() => {
        if (client.current !== null) client.current.setTracks({ audio: audioTrack, video: videoTrack })
    }, [audioTrack, client, videoTrack])

    return (
        <Container fluid id="app">
            <Row>
                <div className="col-2">
                    <MemberList gatewayState={gatewayState} peerStates={peerStates} />
                </div>
                <div className="col-10">
                    <PlayerTable peers={remoteStreams} />
                </div>
            </Row>
        </Container>
    )
}
