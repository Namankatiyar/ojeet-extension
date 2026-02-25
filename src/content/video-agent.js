/**
 * Video Agent Content Script
 * Runs in ALL frames including YouTube embeds.
 * Detects videos and provides video info to the background service worker.
 * 
 * Uses the Strategy (Provider) Pattern to cleanly separate platform-specific logic.
 * To add a new platform, create a new provider class extending VideoProvider
 * and register it in the `providers` array.
 */

(function () {
  'use strict';

  // ============ Configuration (inlined — content scripts can't use ES modules) ============

  const DEBUG = true;

  /** YouTube video element selectors, ordered by specificity */
  const YOUTUBE_VIDEO_SELECTORS = [
    'video.html5-main-video',
    '.html5-video-container video',
    '#movie_player video',
    '.video-stream.html5-main-video',
    'ytd-player video',
    'video',
  ];

  /** YouTube title selectors */
  const YOUTUBE_TITLE_SELECTORS = [
    'h1.ytd-video-primary-info-renderer yt-formatted-string',
    'h1.title.ytd-video-primary-info-renderer',
    '#title h1 yt-formatted-string',
    '#title h1',
    'h1.title',
    'meta[property="og:title"]',
    'meta[name="title"]',
  ];

  /** Fullscreen container selectors (for restore) */
  const FULLSCREEN_CONTAINER_SELECTORS = [
    '.html5-video-player',
    '.video-container',
  ];

  const FULLSCREEN_EXIT_DELAY = 100;

  const PROVIDERS = {
    YOUTUBE_DIRECT: 'youtube-direct',
    YOUTUBE_EMBED: 'youtube-embed',
    GENERIC_HTML5: 'generic-html5',
  };

  const YOUTUBE_URL_PATTERNS = {
    EMBED: /\/embed\/([a-zA-Z0-9_-]{11})/,
    SHORTS: /\/shorts\/([a-zA-Z0-9_-]{11})/,
    LIVE: /\/live\/([a-zA-Z0-9_-]{11})/,
    PARAM: /[?&]v=([a-zA-Z0-9_-]{11})/,
    SHORT_URL: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  };

  // ============ Message Types ============

  const MessageTypes = {
    REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO',
    RESTORE_STATE: 'RESTORE_STATE',
  };

  // ============ Debug Logger ============

  function log(...args) {
    if (DEBUG) console.log('[Ojeet Video Agent]', ...args);
  }

  log('Script starting on:', window.location.href);

  // ============ VideoProvider Base Class ============

  /**
   * @typedef {Object} VideoInfo
   * @property {string} videoId
   * @property {string} provider
   * @property {string} title
   * @property {number} currentTime
   * @property {number} duration
   * @property {boolean} isLive
   * @property {boolean} isPaused
   * @property {Object} bounds
   */

  class VideoProvider {
    canHandle() { return false; }
    getVideoElement() { return null; }
    getVideoId() { return null; }
    getTitle() { return document.title || 'Untitled Video'; }
    getProviderType() { return 'unknown'; }
    isLiveStream() { return false; }
    onNavigate() { }

    /** Gather complete video info using the abstract methods */
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

  // ============ YouTube Provider ============

  class YouTubeProvider extends VideoProvider {
    constructor() {
      super();
      this._cachedVideo = null;
    }

    canHandle() {
      const hostname = window.location.hostname;
      return hostname.includes('youtube.com') || hostname.includes('youtu.be');
    }

    getVideoElement() {
      if (this._cachedVideo && document.contains(this._cachedVideo)) {
        return this._cachedVideo;
      }

      for (const selector of YOUTUBE_VIDEO_SELECTORS) {
        const video = document.querySelector(selector);
        if (video) {
          log('Found YouTube video with selector:', selector);
          this._cachedVideo = video;
          return video;
        }
      }

      this._cachedVideo = null;
      return null;
    }

    getVideoId() {
      const urlParams = new URLSearchParams(window.location.search);
      const vParam = urlParams.get('v');
      if (vParam) { log('Got video ID from URL param:', vParam); return vParam; }

      const embedMatch = window.location.pathname.match(YOUTUBE_URL_PATTERNS.EMBED);
      if (embedMatch) { log('Got video ID from embed URL:', embedMatch[1]); return embedMatch[1]; }

      const shortsMatch = window.location.pathname.match(YOUTUBE_URL_PATTERNS.SHORTS);
      if (shortsMatch) { log('Got video ID from shorts URL:', shortsMatch[1]); return shortsMatch[1]; }

      const liveMatch = window.location.pathname.match(YOUTUBE_URL_PATTERNS.LIVE);
      if (liveMatch) { log('Got video ID from live URL:', liveMatch[1]); return liveMatch[1]; }

      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        const href = canonical.getAttribute('href') || '';
        const match = href.match(YOUTUBE_URL_PATTERNS.PARAM);
        if (match) { log('Got video ID from canonical:', match[1]); return match[1]; }
      }

      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        const content = ogUrl.getAttribute('content') || '';
        const match = content.match(YOUTUBE_URL_PATTERNS.PARAM) ||
          content.match(YOUTUBE_URL_PATTERNS.SHORT_URL);
        if (match) { log('Got video ID from og:url:', match[1]); return match[1]; }
      }

      log('Could not extract YouTube video ID, using fallback');
      return `yt-unknown-${Date.now()}`;
    }

    getTitle() {
      for (const selector of YOUTUBE_TITLE_SELECTORS) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || el.getAttribute('content');
          if (text) { log('Got title:', text.substring(0, 50)); return text; }
        }
      }
      return document.title || 'Untitled Video';
    }

    getProviderType() {
      return window.self !== window.top
        ? PROVIDERS.YOUTUBE_EMBED
        : PROVIDERS.YOUTUBE_DIRECT;
    }

    isLiveStream() {
      const liveBadge = document.querySelector('.ytp-live-badge') ||
        document.querySelector('.ytp-live');
      return liveBadge && !liveBadge.hasAttribute('disabled');
    }

    onNavigate() {
      this._cachedVideo = null;
    }
  }

  // ============ Generic HTML5 Provider ============

  class GenericProvider extends VideoProvider {
    constructor() {
      super();
      this._cachedVideo = null;
    }

    /** Generic provider is always a candidate (lowest priority fallback) */
    canHandle() {
      return true;
    }

    getVideoElement() {
      if (this._cachedVideo && document.contains(this._cachedVideo)) {
        return this._cachedVideo;
      }

      const videos = Array.from(document.querySelectorAll('video'));
      log('Found', videos.length, 'video elements');

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

    getVideoId() {
      const url = window.location.href;
      let hash = 0;
      for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `generic-${Math.abs(hash).toString(36)}`;
    }

    getProviderType() {
      return PROVIDERS.GENERIC_HTML5;
    }

    onNavigate() {
      this._cachedVideo = null;
    }
  }

  // ============ Provider Registry ============
  // Providers are tried in order — first match wins.
  // To add a new platform (e.g. Twitch, Vimeo), create a new class
  // and insert it before GenericProvider.

  const providers = [
    new YouTubeProvider(),
    new GenericProvider(),    // Always-matching fallback — must be last
  ];

  /**
   * Get the active provider for the current page.
   * @returns {VideoProvider}
   */
  function getActiveProvider() {
    for (const provider of providers) {
      if (provider.canHandle()) {
        return provider;
      }
    }
    return providers[providers.length - 1]; // GenericProvider as ultimate fallback
  }

  // ============ Playback State Management ============

  let wasFullscreen = false;
  let wasPaused = false;

  /**
   * Get the active video element via the current provider.
   */
  function getVideoElement() {
    return getActiveProvider().getVideoElement();
  }

  /**
   * Get comprehensive video info via the current provider.
   */
  function getVideoInfo() {
    const provider = getActiveProvider();
    const info = provider.getVideoInfo();

    if (info) {
      log('Video info:', info);
    } else {
      log('No video element found');
    }

    return info;
  }

  /**
   * Exit fullscreen if active.
   */
  async function exitFullscreenIfNeeded() {
    if (document.fullscreenElement) {
      wasFullscreen = true;
      try {
        await document.exitFullscreen();
        await new Promise(resolve => setTimeout(resolve, FULLSCREEN_EXIT_DELAY));
      } catch (e) {
        log('Could not exit fullscreen:', e);
      }
    }
    return wasFullscreen;
  }

  /**
   * Restore fullscreen if it was active before.
   */
  async function restoreFullscreen() {
    if (wasFullscreen) {
      const video = getVideoElement();
      if (video) {
        try {
          let container = null;
          for (const selector of FULLSCREEN_CONTAINER_SELECTORS) {
            container = video.closest(selector);
            if (container) break;
          }
          await (container || video).requestFullscreen();
        } catch (e) {
          log('Could not restore fullscreen:', e);
        }
      }
      wasFullscreen = false;
    }
  }

  /**
   * Pause the video and store the previous state.
   */
  function pauseVideo() {
    const video = getVideoElement();
    if (video && !video.paused) {
      wasPaused = false;
      video.pause();
    } else {
      wasPaused = true;
    }
  }

  /**
   * Resume the video if it was playing before.
   */
  function resumeVideo() {
    if (!wasPaused) {
      const video = getVideoElement();
      if (video) {
        video.play().catch(() => { });
      }
    }
  }

  // ============ Message Listener ============

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Received message:', message.type);

    const { type, payload } = message;

    switch (type) {
      case MessageTypes.REQUEST_VIDEO_INFO:
        const info = getVideoInfo();
        log('Responding with video info:', !!info);
        sendResponse({ success: !!info, data: info });
        break;

      case MessageTypes.RESTORE_STATE:
        if (payload?.restoreFullscreen) {
          restoreFullscreen();
        }
        if (payload?.resumePlayback) {
          resumeVideo();
        }
        sendResponse({ success: true });
        break;

      default:
        log('Unknown message type:', type);
        break;
    }

    return false;
  });

  // ============ Dynamic Video Detection ============

  function setupVideoObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
            log('Video element detected via MutationObserver');
            // Invalidate cache on all providers
            for (const provider of providers) {
              provider.onNavigate();
            }
          }
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    log('MutationObserver set up');
  }

  // Initialize observer
  if (document.body) {
    setupVideoObserver();
  } else {
    document.addEventListener('DOMContentLoaded', setupVideoObserver);
  }

  // YouTube SPA navigation handling
  const ytProvider = providers.find(p => p instanceof YouTubeProvider);
  if (ytProvider && ytProvider.canHandle()) {
    document.addEventListener('yt-navigate-finish', () => {
      log('YouTube SPA navigation detected');
      for (const provider of providers) provider.onNavigate();
    });

    window.addEventListener('popstate', () => {
      log('Popstate navigation detected');
      for (const provider of providers) provider.onNavigate();
    });
  }

  // ============ Console Debugging API ============

  window.__ojeetVideoAgent = {
    getVideoInfo,
    getVideoElement,
    exitFullscreenIfNeeded,
    restoreFullscreen,
    getActiveProvider: () => getActiveProvider().constructor.name,
    providers: providers.map(p => p.constructor.name),
  };

  log('Video Agent fully initialized with providers:', providers.map(p => p.constructor.name));
})();
