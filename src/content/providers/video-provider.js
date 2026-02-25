/**
 * VideoProvider Base Class
 * Defines the interface for all video platform providers.
 * Each provider must implement detection, ID extraction, and metadata retrieval.
 * 
 * @module video-provider
 */

/**
 * @typedef {Object} VideoInfo
 * @property {string} videoId - Unique video identifier
 * @property {string} provider - Provider type string
 * @property {string} title - Video title
 * @property {number} currentTime - Current playback position in seconds
 * @property {number} duration - Total duration in seconds
 * @property {boolean} isLive - Whether the video is a livestream
 * @property {boolean} isPaused - Whether the video is currently paused
 * @property {Object} bounds - Video element viewport bounds
 * @property {number} bounds.x - Left position
 * @property {number} bounds.y - Top position
 * @property {number} bounds.width - Width in pixels
 * @property {number} bounds.height - Height in pixels
 * @property {number} bounds.devicePixelRatio - Device pixel ratio
 */

export class VideoProvider {
    /**
     * Check if this provider can handle the current page.
     * @returns {boolean}
     */
    canHandle() {
        throw new Error('canHandle() must be implemented by subclass');
    }

    /**
     * Find and return the primary video element on the page.
     * @returns {HTMLVideoElement|null}
     */
    getVideoElement() {
        throw new Error('getVideoElement() must be implemented by subclass');
    }

    /**
     * Extract the video ID for the current page/content.
     * @returns {string|null}
     */
    getVideoId() {
        throw new Error('getVideoId() must be implemented by subclass');
    }

    /**
     * Get the video title.
     * @returns {string}
     */
    getTitle() {
        return document.title || 'Untitled Video';
    }

    /**
     * Get the provider type string identifier.
     * @returns {string}
     */
    getProviderType() {
        throw new Error('getProviderType() must be implemented by subclass');
    }

    /**
     * Check if the video is a livestream.
     * @returns {boolean}
     */
    isLiveStream() {
        return false;
    }

    /**
     * Called when YouTube SPA navigations occur (only relevant for YouTube).
     * Subclasses can override to handle navigation events.
     */
    onNavigate() {
        // No-op by default
    }

    /**
     * Gather complete video info. Shared implementation that calls the
     * abstract methods above. Subclasses generally don't need to override this.
     * 
     * @returns {VideoInfo|null}
     */
    getVideoInfo() {
        const video = this.getVideoElement();
        if (!video) return null;

        const videoId = this.getVideoId();
        if (!videoId) return null;

        const rect = video.getBoundingClientRect();

        return {
            videoId,
            provider: this.getProviderType(),
            title: this.getTitle(),
            currentTime: video.currentTime,
            duration: video.duration || 0,
            isLive: this.isLiveStream(),
            isPaused: video.paused,
            bounds: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                devicePixelRatio: window.devicePixelRatio || 1,
            },
        };
    }
}
