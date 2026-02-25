/**
 * Video Agent Content Script
 * Runs in ALL frames including YouTube embeds
 * Detects videos and provides video info to background
 */

(function() {
  'use strict';
  
  // Message types
  const MessageTypes = {
    REQUEST_VIDEO_INFO: 'REQUEST_VIDEO_INFO',
    RESTORE_STATE: 'RESTORE_STATE'
  };
  
  // State
  let wasFullscreen = false;
  let wasPaused = false;
  let cachedVideo = null;
  
  // Debug mode
  const DEBUG = true;
  function log(...args) {
    if (DEBUG) console.log('[Ojeet Video Agent]', ...args);
  }
  
  log('Script starting on:', window.location.href);
  
  /**
   * Detect if this is a YouTube page
   */
  function isYouTubePage() {
    const hostname = window.location.hostname;
    return hostname.includes('youtube.com') || hostname.includes('youtu.be');
  }
  
  /**
   * Get the primary video element with retry logic
   */
  function getVideoElement() {
    // Return cached video if still valid
    if (cachedVideo && document.contains(cachedVideo)) {
      return cachedVideo;
    }
    
    let video = null;
    
    // YouTube-specific selectors (try multiple)
    if (isYouTubePage()) {
      const selectors = [
        'video.html5-main-video',
        '.html5-video-container video',
        '#movie_player video',
        '.video-stream.html5-main-video',
        'ytd-player video',
        'video'
      ];
      
      for (const selector of selectors) {
        video = document.querySelector(selector);
        if (video) {
          log('Found YouTube video with selector:', selector);
          break;
        }
      }
    }
    
    // Generic fallback
    if (!video) {
      const videos = Array.from(document.querySelectorAll('video'));
      log('Found', videos.length, 'video elements');
      
      if (videos.length === 1) {
        video = videos[0];
      } else if (videos.length > 1) {
        // Prioritize playing video
        video = videos.find(v => !v.paused);
        
        // Or get largest visible one
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
    }
    
    cachedVideo = video;
    return video;
  }
  
  /**
   * Extract YouTube video ID
   */
  function getYouTubeVideoId() {
    // Direct YouTube page - check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const vParam = urlParams.get('v');
    if (vParam) {
      log('Got video ID from URL param:', vParam);
      return vParam;
    }
    
    // Embed URL pattern
    const embedMatch = window.location.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      log('Got video ID from embed URL:', embedMatch[1]);
      return embedMatch[1];
    }
    
    // Shorts pattern
    const shortsMatch = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      log('Got video ID from shorts URL:', shortsMatch[1]);
      return shortsMatch[1];
    }
    
    // Live pattern
    const liveMatch = window.location.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    if (liveMatch) {
      log('Got video ID from live URL:', liveMatch[1]);
      return liveMatch[1];
    }
    
    // Try canonical link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      const href = canonical.getAttribute('href') || '';
      const match = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (match) {
        log('Got video ID from canonical:', match[1]);
        return match[1];
      }
    }
    
    // Try og:url meta tag
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      const content = ogUrl.getAttribute('content') || '';
      const match = content.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || 
                   content.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        log('Got video ID from og:url:', match[1]);
        return match[1];
      }
    }
    
    log('Could not extract video ID');
    return null;
  }
  
  /**
   * Get video title
   */
  function getVideoTitle() {
    if (isYouTubePage()) {
      // Try multiple YouTube title selectors
      const selectors = [
        'h1.ytd-video-primary-info-renderer yt-formatted-string',
        'h1.title.ytd-video-primary-info-renderer',
        '#title h1 yt-formatted-string',
        '#title h1',
        'h1.title',
        'meta[property="og:title"]',
        'meta[name="title"]'
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || el.getAttribute('content');
          if (text) {
            log('Got title:', text.substring(0, 50));
            return text;
          }
        }
      }
    }
    
    return document.title || 'Untitled Video';
  }
  
  /**
   * Check if livestream
   */
  function isLiveStream() {
    if (isYouTubePage()) {
      const liveBadge = document.querySelector('.ytp-live-badge') ||
                        document.querySelector('.ytp-live');
      return liveBadge && !liveBadge.hasAttribute('disabled');
    }
    return false;
  }
  
  /**
   * Generate video ID for non-YouTube videos
   */
  function generateGenericVideoId() {
    const url = window.location.href;
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `generic-${Math.abs(hash).toString(36)}`;
  }
  
  /**
   * Get comprehensive video info
   */
  function getVideoInfo() {
    const video = getVideoElement();
    
    if (!video) {
      log('No video element found');
      return null;
    }
    
    log('Video element found:', {
      src: video.src?.substring(0, 50),
      currentTime: video.currentTime,
      paused: video.paused,
      readyState: video.readyState
    });
    
    const isYT = isYouTubePage();
    let videoId;
    
    if (isYT) {
      videoId = getYouTubeVideoId();
      if (!videoId) {
        // For YouTube, we really need the video ID
        log('YouTube page but could not get video ID');
        // Generate a fallback ID based on current time if needed
        videoId = `yt-unknown-${Date.now()}`;
      }
    } else {
      videoId = generateGenericVideoId();
    }
    
    // Get video bounds relative to viewport
    const rect = video.getBoundingClientRect();
    
    // Determine provider type
    let provider = 'generic-html5';
    if (isYT) {
      provider = window.self !== window.top ? 'youtube-embed' : 'youtube-direct';
    }
    
    const info = {
      videoId,
      provider,
      title: getVideoTitle(),
      currentTime: video.currentTime,
      duration: video.duration || 0,
      isLive: isLiveStream(),
      isPaused: video.paused,
      bounds: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: window.devicePixelRatio || 1
      }
    };
    
    log('Video info:', info);
    return info;
  }
  
  /**
   * Exit fullscreen if active
   */
  async function exitFullscreenIfNeeded() {
    if (document.fullscreenElement) {
      wasFullscreen = true;
      try {
        await document.exitFullscreen();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        log('Could not exit fullscreen:', e);
      }
    }
    return wasFullscreen;
  }
  
  /**
   * Restore fullscreen if it was active before
   */
  async function restoreFullscreen() {
    if (wasFullscreen) {
      const video = getVideoElement();
      if (video) {
        try {
          const container = video.closest('.html5-video-player') || 
                           video.closest('.video-container') ||
                           video;
          await container.requestFullscreen();
        } catch (e) {
          log('Could not restore fullscreen:', e);
        }
      }
      wasFullscreen = false;
    }
  }
  
  /**
   * Pause video and store state
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
   * Resume video if it was playing
   */
  function resumeVideo() {
    if (!wasPaused) {
      const video = getVideoElement();
      if (video) {
        video.play().catch(() => {});
      }
    }
  }
  
  /**
   * Message listener
   */
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
  
  /**
   * Watch for video elements being added to the page
   */
  function setupVideoObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
            log('Video element detected via MutationObserver');
            cachedVideo = null; // Clear cache to re-detect
          }
        }
      }
    });
    
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    
    log('MutationObserver set up');
  }
  
  // Initialize
  if (document.body) {
    setupVideoObserver();
  } else {
    document.addEventListener('DOMContentLoaded', setupVideoObserver);
  }
  
  // Also try to detect video on YouTube SPA navigation
  if (isYouTubePage()) {
    // YouTube uses yt-navigate-finish for SPA navigation
    document.addEventListener('yt-navigate-finish', () => {
      log('YouTube SPA navigation detected');
      cachedVideo = null;
    });
    
    // Also listen for popstate
    window.addEventListener('popstate', () => {
      log('Popstate navigation detected');
      cachedVideo = null;
    });
  }
  
  // Export for debugging in console
  window.__ojeetVideoAgent = {
    getVideoInfo,
    getVideoElement,
    exitFullscreenIfNeeded,
    restoreFullscreen,
    isYouTubePage
  };
  
  log('Video Agent fully initialized');
})();
