import { faBroadcastTower, faExclamationTriangle, faPlug, faSpinner, faMicrophoneAlt, faCamera, faSlash, faKey, faSatelliteDish, faSearch, faNetworkWired } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome'
import React, { useState, ChangeEvent } from 'react'
import { Badge, Form } from 'react-bootstrap'
import { v4 as uuid } from 'uuid'

import { GatewayState, UserInfo } from './gateway/client'
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

function MediaDeviceToggle(props: {
    active: boolean,
    icon: FontAwesomeIconProps,
    label: string,
    request: boolean,
    setRequest: (value: boolean) => void,
}) {
    const { active, icon, label, request, setRequest } = props

    const [inputId] = useState(uuid())

    return (
        <Form.Check custom id={inputId} inline type="switch">
            <Form.Check.Input
                checked={request}
                disabled={active !== request}
                onChange={(event: ChangeEvent) => setRequest((event.target as HTMLInputElement).checked)}
            />
            <Form.Check.Label>
                <span className={`mx-1 fa-layers fa-fw ${active ? '' : 'text-muted'}`}>
                    {!active && <FontAwesomeIcon fixedWidth icon={faSlash} />}
                    <FontAwesomeIcon fixedWidth {...icon} />
                </span>
                <span className="d-none d-xl-inline">
                    {label}
                </span>
            </Form.Check.Label>
        </Form.Check>
    )
}

function MediaOptions(props: MediaOptionProps) {
    const { activeAudio, activeVideo, requestAudio, requestVideo, setRequestAudio, setRequestVideo } = props

    return (
        <div className="media-options">
            <MediaDeviceToggle
                active={activeAudio}
                icon={{ icon: faMicrophoneAlt }}
                label="Audio"
                request={requestAudio}
                setRequest={(value) => setRequestAudio(value)}
            />
            <MediaDeviceToggle
                active={activeVideo}
                icon={{ icon: faCamera }}
                label="Video"
                request={requestVideo}
                setRequest={(value) => setRequestVideo(value)}
            />
        </div>
    )
}

type RtcPeerStateBadgeProps = {
    icon: FontAwesomeIconProps,
    text?: string,
    variant: 'danger' | 'success' | 'warning'
}

function RtcPeerStateBadge(props: RtcPeerStateBadgeProps) {
    const { icon, text, variant } = props
    return (
        <Badge pill variant={variant}>
            <FontAwesomeIcon fixedWidth {...icon} title={text} />
        </Badge>
    )
}

const rtcPeerStateBadges: Record<RtcPeerState, JSX.Element> = {
    connecting: <RtcPeerStateBadge icon={{ icon: faSearch }} text="Waiting for signaling" variant={'warning'} />,
    disconnected: <RtcPeerStateBadge icon={{ icon: faExclamationTriangle }} text="Failed to connect" variant={'danger'} />,
    'ice-connecting': <RtcPeerStateBadge icon={{ icon: faNetworkWired }} text="ICE connecting" variant={'warning'} />,
    new: <RtcPeerStateBadge icon={{ icon: faExclamationTriangle }} text="New" variant={'warning'} />,
    ready: <RtcPeerStateBadge icon={{ icon: faBroadcastTower }} text="Connected" variant={'success'} />
}

function RtcPeerEntry(props: {
    screenName: string,
    state: RtcPeerState;
}) {
    const { screenName, state } = props

    return (
        <li className="member">
            <span className="screen-name mr-1">{screenName}</span>
            {rtcPeerStateBadges[state]}
        </li>
    )
}

type GatewayStateBadgeProps = {
    icon: FontAwesomeIconProps,
    text: string,
    variant: 'danger' | 'success' | 'warning'
}

function GatewayStateBadge(props: GatewayStateBadgeProps) {
    const { icon, text, variant } = props
    return (
        <Badge pill variant={variant}>
            <span className="d-none d-xl-inline">
                {text}
            </span>
            <FontAwesomeIcon fixedWidth {...icon} />
        </Badge>
    )
}

const gatewayStateBadges: Record<GatewayState, JSX.Element> = {
    connected: <GatewayStateBadge icon={{ icon: faKey }} text="Authenticating" variant="warning" />,
    connecting: <GatewayStateBadge icon={{ icon: faSpinner, spin: true }} text="Connecting" variant="warning" />,
    disconnected: <GatewayStateBadge icon={{ icon: faExclamationTriangle }} text="Disconnected" variant="danger" />,
    ready: <GatewayStateBadge icon={{ icon: faPlug }} text="Ready" variant="success" />
}

export function MemberList(props: {
    gatewayState: GatewayState,
    mediaOptions: MediaOptionProps,
    peerInfos: Record<string, UserInfo>,
    peerStates: Record<string, RtcPeerState>
}) {
    const { gatewayState, mediaOptions, peerInfos, peerStates } = props

    const peers = Object.keys(peerStates).map(id => {
        const screenName = id in peerInfos ? peerInfos[id].screenName : 'loading'
        return (<RtcPeerEntry screenName={screenName} state={peerStates[id]} key={id} />)
    })

    return (
        <div className="member-list-container my-4">
            <div className="p-3">
                <MediaOptions {...props.mediaOptions} />
            </div>
            <hr className="m-0" />
            <div className="gateway-state p-3">
                <span className="mr-2">
                    <FontAwesomeIcon fixedWidth icon={faSatelliteDish} />
                </span>
                <span className="state">
                    {gatewayStateBadges[props.gatewayState]}
                </span>
            </div>
            <hr className="m-0" />
            <h2 className="h6 pt-3 px-3">Members</h2>
            <ul className="member-list m-0 p-3">{peers}</ul>
        </div >
    )
}
