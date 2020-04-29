import { Logger } from 'loglevel'

import adapter from 'webrtc-adapter'

import { getLogger } from '../common/log'
import { SignalingChannel } from './client'

export interface MediaTracks {
    audio?: MediaStreamTrack
    video?: MediaStreamTrack
}

export type RtcPeerState = 'new' | 'connecting' | 'ready' | 'disconnected'

export class RtcPeer {
    // this peer uses Perfect Negotiation logic
    // https://w3c.github.io/webrtc-pc/#perfect-negotiation-example

    public onconnectionstatechanged: (state: RTCPeerConnectionState, id?: string) => void = () => { }

    public onclose: () => void = () => { }

    public ontrack: () => void = () => { }

    public readonly remoteTracks: MediaStreamTrack[] = []

    public state: RtcPeerState = 'new'

    private readonly logger: Logger = getLogger('RtcPeer')

    private readonly pc: RTCPeerConnection

    private readonly polite: boolean

    private readonly remoteId: string

    private readonly signaling: SignalingChannel

    private tracks: MediaTracks

    private makingOffer = false

    private ignoreOffer = false

    private async sendDescription(description: RTCSessionDescription) {
        await this.signaling.sendLocalDescription(this.remoteId, JSON.stringify(description))
        this.logger.debug(`${this.remoteId} session description sent, type=${description.type}`)
    }

    private getOfferOptions(): RTCOfferOptions {
        return {
            iceRestart: true,
            offerToReceiveAudio: this.tracks.audio && true,
            offerToReceiveVideo: this.tracks.video && true
        }
    }

    public constructor(remoteId: string, tracks: MediaTracks, iceServers: RTCIceServer[], passive: boolean, signaling: SignalingChannel) {
        this.signaling = signaling
        this.polite = passive
        this.remoteId = remoteId
        this.tracks = tracks

        const pc = this.pc = new RTCPeerConnection({ iceServers: iceServers })
        pc.createDataChannel('mandatory', { negotiated: true, id: 810 })

        // forward ice candidates

        pc.onicecandidate = ({ candidate }) => {
            if (!candidate) return
            this.logger.debug(`${remoteId} ICE candidate sent`)
            this.signaling.sendIceCandidate(remoteId, JSON.stringify(candidate))
        }

        // listen attached tracks

        pc.ontrack = ({ track }) => {
            this.remoteTracks.push(track)
            this.logger.debug(`${remoteId} remote attached ${track.kind} track ${track.id}`)
            this.ontrack()
        }

        // perfect negotiation

        pc.onnegotiationneeded = async () => {
            this.logger.debug(`${remoteId} negotiation needed`)

            try {
                this.makingOffer = true

                const offer = await pc.createOffer(this.getOfferOptions())

                if (this.pc.signalingState === 'stable') {
                    this.logger.debug(`${remoteId} negotiation stopped: signaling state === 'stable'`)
                }

                await pc.setLocalDescription(offer)
                await this.sendDescription(pc.localDescription!)
            } catch (err) {
                this.logger.error(`${remoteId} failed to initiate negotiation: ${err}`)
            } finally {
                this.makingOffer = false
            }
        }

        // state tracking

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') this.onclose()
            this.logger.info(`${remoteId} connection state → ${pc.connectionState}`)
        }

        pc.oniceconnectionstatechange = () => this.logger.debug(`${remoteId} ICE connection state → ${pc.iceConnectionState}`)
        pc.onicegatheringstatechange = () => this.logger.debug(`${remoteId} ICE gathering state → ${pc.iceConnectionState}`)
        pc.onsignalingstatechange = () => this.logger.debug(`${remoteId} signaling state → ${pc.iceConnectionState}`)
    }

    public async acceptIceCandidate(payload: string) {
        const candidate = JSON.parse(payload) as RTCIceCandidate
        this.logger.debug(`${this.remoteId} remote ICE candidate`)
        try {
            await this.pc.addIceCandidate(candidate)
        } catch (err) {
            if (!this.ignoreOffer) throw err // suppress ignored offer's candidates
        }
    }

    public async acceptRemoteDescription(payload: string) {
        const description = JSON.parse(payload) as RTCSessionDescription
        try {
            const offerCollision = description.type === 'offer' && (this.makingOffer || this.pc.signalingState !== 'stable')
            this.ignoreOffer = !this.polite && offerCollision
            if (this.ignoreOffer) return

            if (offerCollision) {
                await Promise.all([
                    this.pc.setLocalDescription({ type: 'rollback' }),
                    this.pc.setRemoteDescription(description)
                ])
            } else {
                await this.pc.setRemoteDescription(description)
            }

            if (description.type === 'offer') {
                await this.pc.setRemoteDescription(description)

                const answer = await this.pc.createAnswer(this.getOfferOptions())
                await this.pc.setLocalDescription(answer)
                await this.sendDescription(answer as RTCSessionDescription)
            }
        } catch (err) {
            this.logger.error(`${this.remoteId} failed to accept description: ${err}`)
        }
    }

    public close() {
        this.remoteTracks.forEach((track) => track.stop())
        this.pc.close()
    }

    public setTracks(tracks: MediaTracks) {
        this.pc.getSenders().forEach((sender) => {
            this.logger.debug(`${this.remoteId} local removed ${sender.track?.kind} track ${sender.track?.label}`)
            this.pc.removeTrack(sender)
        })

        if (tracks.audio) {
            this.pc.addTrack(tracks.audio)
            this.logger.debug(`${this.remoteId} local added ${tracks.audio.kind} track ${tracks.audio.label}`)
        }

        if (tracks.video) {
            this.pc.addTrack(tracks.video)
            this.logger.debug(`${this.remoteId} local added ${tracks.video.kind} track ${tracks.video.label}`)
        }
    }

    private updateState() {
        this.state = 'connecting'

        this.pc.signalingState === 'stable' && (this.state = 'ready')
        this.pc.connectionState === 'connected' && (this.state = 'ready');

        (this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed') && (this.state = 'disconnected')
    }
}
