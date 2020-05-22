import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Container, Row } from 'react-bootstrap'

import { MemberList, MemberDescriptor, MediaOptionProps } from './member_list'
import { GatewayClient, GatewayState, UserInfo } from './gateway/client'
import { getLogger } from './common/log'
import { PlayerTable } from './players'
import { SessionUserOptions } from './storage'

import './app.scss'
import { RtcPeerState } from './gateway/peer'

export interface AppConfig {
    gatewayPath: string
}

async function requestUserMedia(request: { audio?: boolean, video?: boolean }) {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: request.audio && true,
        video: request.video && true
    })

    const audioTracks = stream.getAudioTracks()
    const audioTrack = audioTracks.shift()
    audioTracks.forEach((track) => track.stop())

    const videoTracks = stream.getVideoTracks()
    const videoTrack = videoTracks.shift()
    videoTracks.forEach((track) => track.stop())

    return { audio: audioTrack, video: videoTrack }
}

const logger = getLogger('AppMain')

export function AppMain(props: {
    config: AppConfig,
    iceServers: RTCIceServer[]
    sessionId: string,
    userOptions: SessionUserOptions,
    updateUserOptions: (options: SessionUserOptions) => void
}) {
    const { config: appConfig, sessionId, userOptions, updateUserOptions } = props
    const { gatewayPath: gatewayUrl } = appConfig

    /* user media management */

    const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | undefined>(undefined)
    const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | undefined>(undefined)
    const [requestAudio, setRequestAudio] = useState<boolean>(userOptions.localAudio)
    const [requestVideo, setRequestVideo] = useState<boolean>(userOptions.localVideo)

    const [localStream, setLocalStream] = useState<MediaStream | undefined>(undefined)

    const mediaOptionProps: MediaOptionProps = {
        activeAudio: audioTrack !== undefined,
        activeVideo: videoTrack !== undefined,
        requestAudio: requestAudio,
        requestVideo: requestVideo,
        setRequestAudio: setRequestAudio,
        setRequestVideo: setRequestVideo
    }

    useEffect(() => {
        if (audioTrack && !requestAudio) {
            audioTrack.stop()
            setAudioTrack(undefined)
        }

        if (!audioTrack && requestAudio) {
            requestUserMedia({ audio: true })
                .then(({ audio }) => { setAudioTrack(audio) })
                .catch((err) => {
                    logger.error(`Failed to request user audio: ${err}`)
                    setRequestAudio(false)
                })
        }

        if (videoTrack && !requestVideo) {
            videoTrack.stop()
            setVideoTrack(undefined)
        }

        if (!videoTrack && requestVideo) {
            requestUserMedia({ video: true })
                .then(({ video }) => { setVideoTrack(video) })
                .catch((err) => {
                    logger.error(`Failed to request user video: ${err}`)
                    setRequestVideo(false)
                })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestAudio, requestVideo])

    useEffect(() => {
        // clear stalled stream
        if (!audioTrack && !videoTrack && localStream) setLocalStream(undefined)

        const stream = localStream ?? new MediaStream();
        [audioTrack, videoTrack].forEach(track => {
            // skip if exists
            if (!track || stream.getTrackById(track.id)) return

            stream.addTrack(track)
            track.addEventListener('ended', () => stream.removeTrack(track))
        })
        stream.onremovetrack = () => {
            // clear stalled stream on all tracks stopped
            if (stream.getTracks().length === 0) setLocalStream(undefined)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioTrack, localStream, videoTrack])

    useEffect(() => {
        if (client.current !== null) client.current.setTracks({ audio: audioTrack, video: videoTrack })
    }, [audioTrack, videoTrack])

    /* gateway connection management */

    const [gatewayState, setGatewayState] = useState<GatewayState>('disconnected')
    const client = useRef<GatewayClient>(null!)

    useEffect(() => {
        if (client.current === null) {
            const c = client.current = new GatewayClient(gatewayUrl, props.iceServers)

            c.onpeerstatechanged = (id) => setPeerStates({ [id]: c.peers.get(id)?.state ?? 'new' })

            c.onpeertrack = () => updatePlaybackStreams()

            c.onstatechanged = (state) => {
                logger.info(`Gateway connection state → ${state}`)
                setGatewayState(state)
            }

            c.start().then(() => { c.join(sessionId) })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* peer states */

    const [peerInfos, setPeerInfos] = useState<Record<string, UserInfo>>({})
    const [peerStates, setPeerStates] = useState<Record<string, RtcPeerState>>({})

    useEffect(() => {
        if (client.current === null) return

        client.current.peers.forEach((_, id) => {
            if (id in peerInfos) return

            client.current.getUserInfo(id)
                .then((user: UserInfo) => setPeerInfos({ [id]: user }))
                .catch((e) => { logger.error(`Failed to retrieve user info: ${e}`) })
        })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [peerStates])

    useEffect(() => setPeerInfos({ local: { screenName: 'local' } }), [])

    /* peer streams */

    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream | undefined>>({})

    function updatePlaybackStreams() {
        if (client.current !== null) {
            client.current.peers.forEach((peer, id) => {
                const stream = remoteStreams[id] ?? new MediaStream()

                peer.remoteTracks.forEach((track) => {
                    if (stream.getTrackById(track.id)) return

                    stream.addTrack(track)
                    track.addEventListener('ended', () => stream.removeTrack(track)) // TODO: track removal from stream doesn't work
                })

                setRemoteStreams({ [id]: stream })
            })
        }
    }

    useEffect(() => {
        if (localStream) {
            setRemoteStreams({ local: localStream })
        } else {
            setRemoteStreams({ local: undefined })
        }
    }, [localStream])

    return (
        <Container fluid id="app">
            <Row>
                <div className="col-2">
                    <MemberList gatewayState={gatewayState} mediaOptions={mediaOptionProps} peerInfos={peerInfos} peerStates={peerStates} />
                </div>
                <div className="col-10">
                    <PlayerTable peerInfos={peerInfos} streams={remoteStreams} />
                </div>
            </Row>
        </Container>
    )
}
