/**
 * DOM Builder - Safe, Programmatic DOM Construction
 * Replaces string-based innerHTML for security and maintainability.
 * 
 * @module dom-builder
 */

/**
 * Create a DOM element with attributes and children.
 * 
 * @param {string} tag - HTML tag name (e.g. 'div', 'button')
 * @param {Object} [attrs={}] - Attributes & special properties to set:
 *   - `className` → sets element.className
 *   - `style` → if string, sets cssText; if object, merges style properties
 *   - `textContent` → sets text content (safe, no HTML injection)
 *   - `innerHTML` → sets raw HTML (use sparingly, only for trusted content)
 *   - `dataset` → object of data-* attributes
 *   - `on*` → event listeners (e.g. `onClick`, `onKeydown`)
 *   - Anything else → setAttribute()
 * @param {...(Node|string)} children - Child nodes or text strings
 * @returns {HTMLElement}
 * 
 * @example
 * const card = el('div', { className: 'card', dataset: { uuid: '123' } },
 *   el('h2', { textContent: 'Title' }),
 *   el('p', { textContent: 'Body text' }),
 *   el('button', { className: 'btn', onClick: () => save() }, 'Save')
 * );
 */
export function el(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style') {
            if (typeof value === 'string') {
                element.style.cssText = value;
            } else if (typeof value === 'object' && value !== null) {
                Object.assign(element.style, value);
            }
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'dataset') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else if (key.startsWith('on') && typeof value === 'function') {
            const event = key.slice(2).toLowerCase();
            element.addEventListener(event, value);
        } else if (value !== null && value !== undefined && value !== false) {
            element.setAttribute(key, value);
        }
    }

    for (const child of children) {
        if (child === null || child === undefined) continue;
        if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    }

    return element;
}

/**
 * Create an SVG element with attributes and children.
 * Uses the SVG namespace for proper rendering.
 * 
 * @param {string} tag - SVG tag name (e.g. 'svg', 'path', 'polyline')
 * @param {Object} [attrs={}] - Attributes to set via setAttributeNS
 * @param {...(Node|string)} children - Child SVG elements
 * @returns {SVGElement}
 */
export function svg(tag, attrs = {}, ...children) {
    const ns = 'http://www.w3.org/2000/svg';
    const element = document.createElementNS(ns, tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith('on') && typeof value === 'function') {
            const event = key.slice(2).toLowerCase();
            element.addEventListener(event, value);
        } else if (value !== null && value !== undefined && value !== false) {
            element.setAttribute(key, String(value));
        }
    }

    for (const child of children) {
        if (child === null || child === undefined) continue;
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    }

    return element;
}

/**
 * Create common SVG icons used throughout the extension.
 * Returns cloned elements so they can be reused safely.
 */
export const Icons = {
    /** Trash/delete icon (14x14) */
    trash(size = 14) {
        return svg('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
            svg('polyline', { points: '3 6 5 6 21 6' }),
            svg('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
        );
    },

    /** External link icon (14x14) */
    externalLink(size = 14) {
        return svg('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
            svg('path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }),
            svg('polyline', { points: '15 3 21 3 21 9' }),
            svg('line', { x1: '10', y1: '14', x2: '21', y2: '3' })
        );
    },

    /** Zoom in icon */
    zoomIn(size = 20) {
        return svg('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
            svg('circle', { cx: '11', cy: '11', r: '8' }),
            svg('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }),
            svg('line', { x1: '11', y1: '8', x2: '11', y2: '14' }),
            svg('line', { x1: '8', y1: '11', x2: '14', y2: '11' })
        );
    },

    /** Zoom out icon */
    zoomOut(size = 20) {
        return svg('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
            svg('circle', { cx: '11', cy: '11', r: '8' }),
            svg('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }),
            svg('line', { x1: '8', y1: '11', x2: '14', y2: '11' })
        );
    },

    /** Rotate icon */
    rotate(size = 20) {
        return svg('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
            svg('path', { d: 'M21.5 2v6h-6' }),
            svg('path', { d: 'M21.34 15.57a10 10 0 1 1-.57-8.38' })
        );
    },
};

/**
 * Create a document fragment from an array of elements.
 * Useful for efficiently appending multiple children at once.
 * 
 * @param {Node[]} elements - Array of DOM nodes
 * @returns {DocumentFragment}
 */
export function fragment(...elements) {
    const frag = document.createDocumentFragment();
    for (const elem of elements) {
        if (elem) frag.appendChild(elem);
    }
    return frag;
}
