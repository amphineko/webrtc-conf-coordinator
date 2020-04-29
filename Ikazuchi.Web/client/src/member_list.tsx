import { faBroadcastTower, faExclamationTriangle, faPlug, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { HubConnectionState } from '@microsoft/signalr'
import React from 'react'
import { Badge } from 'react-bootstrap'
import { GatewayState } from './gateway/client'
import { RtcPeerState } from './gateway/peer'

export interface MemberDescriptor {
    id: string
    screenName: string
    state: RtcPeerState
}

function MemberEntry(props: {
    screenName: string,
    state: RtcPeerState
}) {
    const { screenName, state } = props

    return (
        <li className="member">
            <span className="screen-name mr-1">{screenName}</span>
            {state === 'connecting' && <Badge pill variant='warning'><FontAwesomeIcon icon={faSpinner} spin /></Badge>}
            {state === 'disconnected' && <Badge pill variant='danger'><FontAwesomeIcon icon={faExclamationTriangle} /></Badge>}
            {state === 'new' && <Badge pill variant='info'><FontAwesomeIcon icon={faSpinner} spin /></Badge>}
            {state === 'ready' && <Badge pill variant='success'><FontAwesomeIcon icon={faBroadcastTower} /></Badge>}
        </li>
    )
}

export function MemberList(props: {
    gatewayState: GatewayState,
    peerStates: MemberDescriptor[]
}) {
    var gatewayState
    switch (props.gatewayState) {
        case 'connected':
            gatewayState = (
                <span>
                    <Badge pill variant='warning'>
                        Authenticating
                        <FontAwesomeIcon icon={faSpinner} spin />
                    </Badge>
                </span>
            )
            break
        case 'connecting':
            gatewayState = (
                <span>
                    <Badge pill variant='warning'>
                        Connecting
                        <FontAwesomeIcon icon={faSpinner} spin />
                    </Badge>
                </span>
            )
            break
        case 'disconnected':
            gatewayState = (
                <span>
                    <Badge variant='danger'>
                        Disconnected
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                    </Badge>
                </span>
            )
            break
        case 'ready':
            gatewayState = (
                <span>
                    <Badge variant='success'>
                        Ready
                        <FontAwesomeIcon icon={faPlug} />
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
            <div className="gateway-state p-3">
                <span className="title text-muted mr-2">Signaling</span>
                <span className="state">
                    {
                        gatewayState
                    }
                </span>
            </div>
            <hr className="m-0" />
            <h2 className="h6 pt-3 px-3">Members</h2>
            <ul className="member-list m-0 p-3">{peers}</ul>
        </div>
    )
}
