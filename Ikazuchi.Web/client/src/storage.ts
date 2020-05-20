import { getLogger } from './common/log'

const logger = getLogger('OptionStorage')

export interface SessionUserOptions {
    localAudio: boolean
    localVideo: boolean
}

const defaultOptions: SessionUserOptions = {
    localAudio: false,
    localVideo: false
}

export function getSessionOptions(id: string): SessionUserOptions {
    return Object.assign({}, (() => {
        try {
            const current = JSON.parse(window.localStorage.getItem(`session-options-${id}`) ?? '{}')
            if (typeof current === 'object') return current
        } catch (err) {
            logger.error(`Failed to retrieve session options: ${err}`)
        }

        return {}
    })(), defaultOptions)
}

export function setSessionOptions(id: string, options: SessionUserOptions) {
    const save = Object.assign({}, defaultOptions, options)
    window.localStorage.setItem(`session-options-${id}`, JSON.stringify(save))
}
