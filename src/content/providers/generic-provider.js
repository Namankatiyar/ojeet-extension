/**
 * Generic HTML5 Video Provider
 * Fallback provider for any page with a standard <video> element.
 * 
 * @module generic-provider
 */

import { VideoProvider } from './video-provider.js';
import { PROVIDERS } from '../../config.js';

export class GenericProvider extends VideoProvider {
    constructor() {
        super();
        /** @type {HTMLVideoElement|null} */
        this._cachedVideo = null;
    }

    /** @override — Generic provider is always a candidate (lowest priority) */
    canHandle() {
        return true;
    }

    /** @override */
    getVideoElement() {
        // Return cached video if still in DOM
        if (this._cachedVideo && document.contains(this._cachedVideo)) {
            return this._cachedVideo;
        }

        const videos = Array.from(document.querySelectorAll('video'));

        let video = null;

        if (videos.length === 1) {
            video = videos[0];
        } else if (videos.length > 1) {
            // Prioritize a playing video
            video = videos.find(v => !v.paused);

            // Or select the largest visible one
            if (!video) {
                video = videos.reduce((best, v) => {
                    const rect = v.getBoundingClientRect();
                    const area = rect.width * rect.height;
                    if (!best) return v;
                    const bestRect = best.getBoundingClientRect();
                    const bestArea = bestRect.width * bestRect.height;
                    return area > bestArea ? v : best;
                }, null);
            }
        }

        this._cachedVideo = video;
        return video;
    }

    /** @override */
    getVideoId() {
        const url = window.location.href;
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit int
        }
        return `generic-${Math.abs(hash).toString(36)}`;
    }

    /** @override */
    getProviderType() {
        return PROVIDERS.GENERIC_HTML5;
    }

    /** @override */
    onNavigate() {
        this._cachedVideo = null;
    }
}
