import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr'

import { RtcPeer, MediaTracks } from './peer'

import { getLogger } from '../common/log'

export type GatewayState = 'connected' | 'connecting' | 'disconnected' | 'ready'

export interface UserInfo {
    screenName: string
}

export interface SignalingChannel {
    sendIceCandidate(destination: string, payload: string): Promise<void>;

    sendLocalDescription(destination: string, payload: string): Promise<void>;
}

export class GatewayClient implements SignalingChannel {
    onpeerchanged: () => void = () => { };

    onpeerstatechanged: () => void = () => { };

    onpeertrack: (remoteId: string) => void = () => { };

    onstatechanged: (state: GatewayState) => void = () => { };

    private readonly hub: HubConnection;

    private readonly iceServers: RTCIceServer[];

    private readonly logger = getLogger('GatewayClient');

    readonly peers: Map<string, RtcPeer>;

    private sessionId?: string = undefined;

    private tracks: MediaTracks;

    public constructor(url: string, iceServers: RTCIceServer[]) {
        this.iceServers = iceServers
        this.tracks = { audio: undefined, video: undefined }

        this.peers = new Map()

        const hub = new HubConnectionBuilder()
            .configureLogging(LogLevel.Debug) // TODO: use global debug switch
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

        hub.on('OnParticipantSessionDescription', async (remoteId, payload) => {
            if (!this.peers.has(remoteId)) {
                // add new passive peer if does not have yet
                this.addPeer(remoteId, true)
            }

            await this.peers.get(remoteId)!.acceptRemoteDescription(payload)
        })

        hub.on('OnParticipantJoin', (id) => {
            this.logger.info(`Participant ${id} joined`)

            // try remove if any stalled peer
            this.removePeer(id)

            // add new caller peer
            this.addPeer(id, false)

            setImmediate(() => this.onpeerchanged())
        })

        hub.on('OnParticipantLeave', (id) => {
            this.logger.info(`Participant ${id} left`)
            this.removePeer(id) // remove disconnected peer
            setImmediate(() => this.onpeerchanged())
        })
    }

    async close() {
        this.peers.forEach((_, id) => this.removePeer(id))

        if (this.sessionId) await this.leave()
        await this.hub.stop()

        setImmediate(() => this.onstatechanged('disconnected'))
    }

    getHubState() {
        return this.hub.state
    }

    async getUserInfo(userId: string) {
        return await this.hub.invoke('GetParticipant', userId)
    }

    async join(id: string) {
        if (this.sessionId) await this.leave()

        this.sessionId = id
        await this.hub.invoke('JoinSession', id)
        this.logger.info(`Joined session ${id}`)

        setImmediate(() => this.onstatechanged('ready'))
    }

    async leave() {
        if (this.hub.state === HubConnectionState.Connected) {
            await this.hub.invoke('LeaveCurrentSession')
        }
        this.sessionId = undefined

        setImmediate(() => this.onstatechanged('connected'))
    }

    async sendIceCandidate(destination: string, payload: string) {
        if (this.hub.state === HubConnectionState.Disconnected) return
        await this.hub.invoke('SendIceCandidate', destination, payload)
    }

    async sendLocalDescription(destination: string, payload: string) {
        if (this.hub.state === HubConnectionState.Disconnected) return
        await this.hub.invoke('SendSessionDescription', destination, payload)
    }

    async setTracks(tracks: MediaTracks) {
        this.tracks = tracks
        this.peers.forEach((peer) => peer.setTracks(tracks))
    }

    async start() {
        setImmediate(() => this.onstatechanged('connecting'))
        try {
            await this.hub.start()
            setImmediate(() => this.onstatechanged('connected'))
        } catch (e) {
            this.logger.error(`Failed to start gateway connection: ${e}`)
            setImmediate(() => this.onstatechanged('disconnected'))
            throw e
        }
    }

    private removePeer(id: string) {
        const peer = this.peers.get(id)
        if (peer) {
            peer.close()
            this.peers.delete(id)

            // notify removed disconnected/stalled peer
            setImmediate(() => this.onpeerchanged())
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
}
