import { faBroadcastTower, faExclamationTriangle, faPlug, faSpinner, faMicrophoneAlt, faCamera } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useRef, useState, useEffect, ChangeEvent } from 'react'
import { Badge, Form } from 'react-bootstrap'
import { v4 as uuid } from 'uuid'

import { GatewayState } from './gateway/client'
import { RtcPeerState } from './gateway/peer'

export interface MemberDescriptor {
    id: string;
    screenName: string;
    state: RtcPeerState;
}

export interface MediaOptionProps {
    activeAudio: boolean,
    activeVideo: boolean,
    requestAudio: boolean,
    requestVideo: boolean,
    setRequestAudio: (value: boolean) => void,
    setRequestVideo: (value: boolean) => void
}

function MediaOptions(props: MediaOptionProps) {
    const { activeAudio, activeVideo, requestAudio, requestVideo, setRequestAudio: setAudio, setRequestVideo: setVideo } = props

    const audioCheckbox = useRef<HTMLInputElement>(null)
    const [audioId] = useState(uuid())
    const videoCheckbox = useRef<HTMLInputElement>(null)
    const [videoId] = useState(uuid())

    return (
        <div className="media-options">
            <div className="custom-control custom-checkbox px-0 py-1">
                <span className={`mr-2 ${activeAudio ? '' : 'text-muted'}`}>
                    <FontAwesomeIcon fixedWidth icon={faMicrophoneAlt} />
                </span>
                <Form.Check
                    custom inline id={audioId} label="Microphone" type="switch"
                    checked={requestAudio}
                    disabled={activeAudio !== requestAudio}
                    onChange={(event: ChangeEvent) => setAudio((event.target as HTMLInputElement).checked)} />
                {!activeAudio && requestAudio && <FontAwesomeIcon fixedWidth icon={faSpinner} spin />}
            </div>
            <div className="custom-control custom-checkbox px-0 py-1">
                <span className={`mr-2 ${activeVideo ? '' : 'text-muted'}`}>
                    <FontAwesomeIcon fixedWidth icon={faCamera} />
                </span>
                <Form.Check
                    custom inline id={videoId} label="Camera" type="switch"
                    checked={requestVideo}
                    disabled={activeVideo !== requestVideo}
                    onChange={(event: ChangeEvent) => setVideo((event.target as HTMLInputElement).checked)} />
                {!activeVideo && requestVideo && <FontAwesomeIcon fixedWidth icon={faSpinner} spin />}
            </div>
        </div>
    )
}

function MemberEntry(props: {
    screenName: string,
    state: RtcPeerState;
}) {
    const { screenName, state } = props

    return (
        <li className="member">
            <span className="screen-name mr-1">{screenName}</span>
            {state === 'connecting' &&
                <Badge pill variant="warning">
                    <FontAwesomeIcon fixedWidth icon={faSpinner} spin />
                </Badge>}
            {state === 'disconnected' &&
                <Badge pill variant="danger">
                    <FontAwesomeIcon fixedWidth icon={faExclamationTriangle} />
                </Badge>}
            {state === 'new' &&
                <Badge pill variant="info">
                    <FontAwesomeIcon fixedWidth icon={faSpinner} spin />
                </Badge>}
            {state === 'ready' &&
                <Badge pill variant="success">
                    <FontAwesomeIcon fixedWidth icon={faBroadcastTower} />
                </Badge>}
        </li>
    )
}

export function MemberList(props: {
    gatewayState: GatewayState,
    mediaOptions: MediaOptionProps,
    peerStates: MemberDescriptor[]
}) {
    let gatewayState: Object
    switch (props.gatewayState) {
        case 'connected':
            gatewayState = (
                <span>
                    <Badge pill variant="warning">
                        Authenticating
                        <FontAwesomeIcon fixedWidth icon={faSpinner} spin />
                    </Badge>
                </span>
            )
            break
        case 'connecting':
            gatewayState = (
                <span>
                    <Badge pill variant="warning">
                        Connecting
                        <FontAwesomeIcon fixedWidth icon={faSpinner} spin />
                    </Badge>
                </span>
            )
            break
        case 'disconnected':
            gatewayState = (
                <span>
                    <Badge variant="danger">
                        Disconnected
                        <FontAwesomeIcon fixedWidth icon={faExclamationTriangle} />
                    </Badge>
                </span>
            )
            break
        case 'ready':
            gatewayState = (
                <span>
                    <Badge variant="success">
                        Ready
                        <FontAwesomeIcon fixedWidth icon={faPlug} />
                    </Badge>
                </span>
            )
            break
    }

    const peers = props.peerStates.map(peer => {
        return (<MemberEntry screenName={peer.screenName} state={peer.state} key={peer.id} />)
    })

    return (
        <div className="member-list-container my-4">
            <div className="p-3">
                <MediaOptions {...props.mediaOptions} />
            </div>
            <hr className="m-0" />
            <div className="gateway-state p-3">
                <span className="title text-muted mr-2">Signaling</span>
                <span className="state">
                    {gatewayState}
                </span>
            </div>
            <hr className="m-0" />
            <h2 className="h6 pt-3 px-3">Members</h2>
            <ul className="member-list m-0 p-3">{peers}</ul>
        </div >
    )
}
