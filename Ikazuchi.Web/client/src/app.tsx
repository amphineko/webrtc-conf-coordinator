import React, { useState, useRef, useEffect } from 'react'
import { Container, Row } from 'react-bootstrap'

import { MemberList, MemberDescriptor } from './member_list'
import { GatewayClient, GatewayState, UserInfo } from './gateway/client'
import { getLogger } from './common/log'
import { StreamDescription, PlayerTable } from './players'

import './app.scss'

export interface AppConfig {
    gatewayPath: string
}

export function AppMain(props: { config: AppConfig, sessionId: string, iceServers: RTCIceServer[] }) {
    const { config: appConfig, sessionId } = props
    const { gatewayPath: gatewayUrl } = appConfig

    const logger = getLogger('AppMain')

    const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | undefined>(undefined)
    const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | undefined>(undefined)
    const [localStream, setLocalStream] = useState<MediaStream | undefined>(undefined)
    const [userMediaRequested, setUserMediaRequested] = useState(false)

    const [gatewayState, setGatewayState] = useState<GatewayState>('disconnected')
    const [peerStates, setPeerStates] = useState<MemberDescriptor[]>([])
    const client = useRef<GatewayClient>(null!)

    const [playbackStreams, setRemoteStreams] = useState<StreamDescription[]>([])

    const userInfoTable = useRef(new Map<string, UserInfo>())

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

    function updatePlaybackStreams() {
        const result: StreamDescription[] = localStream ? [{
            id: 'local',
            screenName: '',
            stream: localStream
        }] : []

        if (client.current !== null) {
            client.current.peers.forEach((peer, id) => {
                const stream = new MediaStream()
                peer.remoteTracks.forEach((track) => stream.addTrack(track))

                const info = userInfoTable.current.get(id)
                const screenName = info ? info.screenName : 'unknown'

                result.push({ id: id, screenName: screenName, stream: stream })
            })
        }

        setRemoteStreams(result)
    }

    useEffect(() => {
        // initialize gateway client, if not connected yet
        if (client.current === null) {
            const c = client.current = new GatewayClient(gatewayUrl, { audio: audioTrack, video: videoTrack }, props.iceServers)

            c.onpeerchanged = c.onpeerstatechanged = () => {
                // update peer list
                const result: MemberDescriptor[] = []
                c.peers.forEach((peer, id) => {
                    const info = userInfoTable.current.get(id)
                    const screenName = info ? info.screenName : 'unknown'
                    result.push({ id: id, screenName: screenName, state: peer.state })
                })
                setPeerStates(result)
            }

            c.onpeertrack = () => updatePlaybackStreams()

            c.onstatechanged = (state) => {
                logger.info(`Gateway connection state → ${state}`)
                setGatewayState(state)
            }

            c.onpeerinfo = (id, info) => userInfoTable.current.set(id, info)

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
                    <PlayerTable peers={playbackStreams} />
                </div>
            </Row>
        </Container>
    )
}
