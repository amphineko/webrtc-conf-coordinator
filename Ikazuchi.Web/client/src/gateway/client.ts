import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr'

import { RtcPeer, MediaTracks } from './peer'

import { getLogger } from '../common/log'

export type GatewayState = 'connected' | 'connecting' | 'disconnected' | 'ready'

export interface UserInfo {
    screenName: string
}

export interface SignalingChannel {
    sendIceCandidate(destination: string, payload: string): Promise<void>

    sendLocalDescription(destination: string, payload: string): Promise<void>
}

export class GatewayClient implements SignalingChannel {
    public onpeerchanged: () => void = () => { }

    public onpeerstatechanged: () => void = () => { }

    public onpeertrack: (remoteId: string) => void = () => { }

    public onpeerinfo: (id: string, userInfo: UserInfo) => void = () => { }

    public onstatechanged: (state: GatewayState) => void = () => { }

    private readonly hub: HubConnection

    private readonly iceServers: RTCIceServer[]

    private readonly logger = getLogger('GatewayClient')

    public readonly peers: Map<string, RtcPeer>

    private sessionId?: string = undefined

    private tracks: MediaTracks

    public constructor(url: string, tracks: MediaTracks, iceServers: RTCIceServer[]) {
        this.iceServers = iceServers
        this.tracks = tracks

        this.peers = new Map()

        const hub = new HubConnectionBuilder()
            .configureLogging(LogLevel.Debug)
            .withAutomaticReconnect()
            .withUrl(url)
            .build()
        this.hub = hub

        hub.onclose = () => this.onstatechanged('disconnected')
        hub.onreconnecting = () => this.onstatechanged('connecting')
        hub.onreconnected = () => this.onstatechanged('connected')

        hub.on('OnParticipantIceCandidate', async (remoteId, payload) => {
            await this.peers.get(remoteId)?.acceptIceCandidate(payload)
        })

        hub.on('OnParticipantSessionDescription', async (remoteId, payload, userInfo) => {
            this.onpeerinfo(remoteId, userInfo)

            if (!this.peers.has(remoteId)) {
                this.addPeer(remoteId, true) // add new passive peer if does not have yet
            }

            await this.peers.get(remoteId)!.acceptRemoteDescription(payload)
        })

        hub.on('OnParticipantJoin', (id, userInfo) => {
            this.onpeerinfo(id, userInfo)

            this.logger.info(`Participant ${id} joined`)

            this.removePeer(id) // try remove if any stalled peer
            this.addPeer(id, false) // add new caller peer
        })

        hub.on('OnParticipantLeave', (id) => {
            this.logger.info(`Participant ${id} left`)
            this.removePeer(id) // remove disconnected peer
        })
    }

    public async close() {
        this.peers.forEach((_, id) => this.removePeer(id))

        if (this.sessionId) await this.leave()
        await this.hub.stop()

        this.onstatechanged('disconnected')
    }

    public getHubState() {
        return this.hub.state
    }

    private removePeer(id: string) {
        const peer = this.peers.get(id)
        if (peer) {
            peer.close()
            this.peers.delete(id)

            this.onpeerchanged() // notify removed disconnected/stalled peer
        }
    }

    private async addPeer(id: string, passive: boolean) {
        this.removePeer(id) // try remove if any stalled peer

        const peer = new RtcPeer(id, this.tracks, this.iceServers, passive, this)
        this.peers.set(id, peer)

        peer.ontrack = () => this.onpeertrack(id)

        peer.onclose = () => {
            const stalled = this.peers.get(id)
            if (stalled === peer) this.peers.delete(id)
        }

        peer.onconnectionstatechanged = (state, id) => this.onpeerstatechanged()

        peer.setTracks(this.tracks)

        this.onpeerchanged() // notify added new peer
    }

    public async sendIceCandidate(destination: string, payload: string) {
        if (this.hub.state === HubConnectionState.Disconnected) return
        await this.hub.invoke('SendIceCandidate', destination, payload)
    }

    public async sendLocalDescription(destination: string, payload: string) {
        if (this.hub.state === HubConnectionState.Disconnected) return
        await this.hub.invoke('SendSessionDescription', destination, payload)
    }

    public async setTracks(tracks: MediaTracks) {
        this.tracks = tracks
        this.peers.forEach((peer) => peer.setTracks(tracks))
    }

    public async join(id: string) {
        if (this.sessionId) await this.leave()

        this.sessionId = id
        await this.hub.invoke('JoinSession', id)
        this.logger.info(`Joined session ${id}`)

        this.onstatechanged('ready')
    }

    public async leave() {
        if (this.hub.state === HubConnectionState.Connected) await this.hub.invoke('LeaveCurrentSession')
        this.sessionId = undefined
        this.onstatechanged('connected')
    }

    public start() {
        this.onstatechanged('connecting')
        return this.hub.start().then(() => {
            this.onstatechanged('connected')
        }).catch(() => {
            this.onstatechanged('disconnected')
        })
    }
}
