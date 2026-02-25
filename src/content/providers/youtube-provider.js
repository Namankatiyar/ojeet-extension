/**
 * YouTube Video Provider
 * Handles all YouTube-specific video detection, ID extraction, and metadata.
 * 
 * @module youtube-provider
 */

import { VideoProvider } from './video-provider.js';
import {
    YOUTUBE_VIDEO_SELECTORS,
    YOUTUBE_TITLE_SELECTORS,
    YOUTUBE_URL_PATTERNS,
    PROVIDERS,
} from '../../config.js';

export class YouTubeProvider extends VideoProvider {
    constructor() {
        super();
        /** @type {HTMLVideoElement|null} */
        this._cachedVideo = null;
    }

    /** @override */
    canHandle() {
        const hostname = window.location.hostname;
        return hostname.includes('youtube.com') || hostname.includes('youtu.be');
    }

    /** @override */
    getVideoElement() {
        // Return cached video if still in DOM
        if (this._cachedVideo && document.contains(this._cachedVideo)) {
            return this._cachedVideo;
        }

        for (const selector of YOUTUBE_VIDEO_SELECTORS) {
            const video = document.querySelector(selector);
            if (video) {
                this._cachedVideo = video;
                return video;
            }
        }

        this._cachedVideo = null;
        return null;
    }

    /** @override */
    getVideoId() {
        // Direct watch page — URL param `v`
        const urlParams = new URLSearchParams(window.location.search);
        const vParam = urlParams.get('v');
        if (vParam) return vParam;

        // Embed URL
        const embedMatch = window.location.pathname.match(YOUTUBE_URL_PATTERNS.EMBED);
        if (embedMatch) return embedMatch[1];

        // Shorts URL
        const shortsMatch = window.location.pathname.match(YOUTUBE_URL_PATTERNS.SHORTS);
        if (shortsMatch) return shortsMatch[1];

        // Live URL
        const liveMatch = window.location.pathname.match(YOUTUBE_URL_PATTERNS.LIVE);
        if (liveMatch) return liveMatch[1];

        // Canonical link
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            const href = canonical.getAttribute('href') || '';
            const match = href.match(YOUTUBE_URL_PATTERNS.PARAM);
            if (match) return match[1];
        }

        // og:url meta tag
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
            const content = ogUrl.getAttribute('content') || '';
            const match = content.match(YOUTUBE_URL_PATTERNS.PARAM) ||
                content.match(YOUTUBE_URL_PATTERNS.SHORT_URL);
            if (match) return match[1];
        }

        // Fallback — generate a unique ID
        return `yt-unknown-${Date.now()}`;
    }

    /** @override */
    getTitle() {
        for (const selector of YOUTUBE_TITLE_SELECTORS) {
            const el = document.querySelector(selector);
            if (el) {
                const text = el.textContent?.trim() || el.getAttribute('content');
                if (text) return text;
            }
        }
        return document.title || 'Untitled Video';
    }

    /** @override */
    getProviderType() {
        return window.self !== window.top
            ? PROVIDERS.YOUTUBE_EMBED
            : PROVIDERS.YOUTUBE_DIRECT;
    }

    /** @override */
    isLiveStream() {
        const liveBadge = document.querySelector('.ytp-live-badge') ||
            document.querySelector('.ytp-live');
        return liveBadge && !liveBadge.hasAttribute('disabled');
    }

    /** @override */
    onNavigate() {
        this._cachedVideo = null;
    }
}
