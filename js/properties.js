'use strict';

/**
 * Properties Module — Augusta Parry
 *
 * Fetches property data from the Pafilia XML feed, parses it, and renders
 * interactive cards into #portfolio-grid. Includes filtering by development,
 * loading skeletons, sessionStorage caching, and graceful fallback content
 * when the feed is unavailable or returns a navigation page.
 */
const Properties = (function () {

    // =========================================================================
    // Configuration
    // =========================================================================
    const FEED_URL = 'https://feeds.pafilia.com/xml-feeds/marketing/mini-site/';
    const CACHE_KEY = 'augustaParry_properties';
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    // DOM references (resolved on init)
    let gridEl = null;
    let filterEl = null;

    // =========================================================================
    // 1. Loading Skeletons
    // =========================================================================
    /**
     * Renders placeholder skeleton cards while the feed loads.
     */
    function showSkeletons(count) {
        if (!gridEl) return;

        count = count || 6;
        let html = '';

        for (let i = 0; i < count; i++) {
            html += `
                <div class="property-card property-card--skeleton" aria-hidden="true">
                    <div class="skeleton skeleton--image"></div>
                    <div class="skeleton skeleton--title"></div>
                    <div class="skeleton skeleton--text"></div>
                    <div class="skeleton skeleton--text skeleton--short"></div>
                </div>
            `;
        }

        gridEl.innerHTML = html;
    }

    // =========================================================================
    // 2. Cache Helpers
    // =========================================================================
    /**
     * Reads cached property data from sessionStorage if still fresh.
     * Returns null if no cache or expired.
     */
    function getCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (Date.now() - cached.timestamp > CACHE_TTL) {
                sessionStorage.removeItem(CACHE_KEY);
                return null;
            }

            return cached.data;
        } catch (e) {
            return null;
        }
    }

    /**
     * Writes property data to sessionStorage with a timestamp.
     */
    function setCache(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {
            // sessionStorage full or unavailable — fail silently
        }
    }

    // =========================================================================
    // 3. Fetch & Parse XML Feed
    // =========================================================================
    /**
     * Fetches the Pafilia XML feed and parses property nodes from it.
     * Returns an array of property objects or null if the response isn't
     * usable XML data (e.g. an HTML navigation page).
     */
    async function fetchProperties() {
        const response = await fetch(FEED_URL, {
            mode: 'cors',
            headers: { 'Accept': 'application/xml, text/xml' }
        });

        if (!response.ok) {
            throw new Error('Feed responded with status ' + response.status);
        }

        const text = await response.text();

        // Detect if the response is an HTML page rather than XML data.
        // Pafilia may serve a navigation/index page at this URL.
        if (isNavigationPage(text)) {
            return null;
        }

        return parseXML(text);
    }

    /**
     * Checks whether the response body looks like an HTML navigation page
     * rather than raw XML property data.
     */
    function isNavigationPage(text) {
        const lower = text.trim().toLowerCase();

        // If it starts with <!doctype html> or <html, it's an HTML page
        if (lower.startsWith('<!doctype html') || lower.startsWith('<html')) {
            return true;
        }

        // If it contains typical HTML body elements but no property nodes
        if (lower.includes('<body') && !lower.includes('<property')) {
            return true;
        }

        return false;
    }

    /**
     * Parses XML text into an array of property objects.
     * Looks for common Pafilia feed node structures:
     *   <property>, <unit>, <listing>, or <item>
     */
    function parseXML(text) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'application/xml');

        // Check for parser errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            console.warn('[Properties] XML parse error:', parseError.textContent);
            return null;
        }

        // Try various node names that Pafilia feeds may use
        const nodeNames = ['property', 'unit', 'listing', 'item'];
        let propertyNodes = [];

        for (const name of nodeNames) {
            propertyNodes = xmlDoc.getElementsByTagName(name);
            if (propertyNodes.length > 0) break;
        }

        if (propertyNodes.length === 0) {
            return null;
        }

        const properties = [];

        for (let i = 0; i < propertyNodes.length; i++) {
            const node = propertyNodes[i];
            const property = extractPropertyData(node);
            if (property) {
                properties.push(property);
            }
        }

        return properties.length > 0 ? properties : null;
    }

    /**
     * Extracts structured data from a single property XML node.
     * Tries multiple possible child element names for each field.
     */
    function extractPropertyData(node) {
        const get = (names) => {
            for (const name of names) {
                const el = node.getElementsByTagName(name)[0];
                if (el && el.textContent.trim()) {
                    return el.textContent.trim();
                }
            }
            return '';
        };

        const title = get(['title', 'name', 'property_name', 'unit_name']);
        const image = get(['image', 'photo', 'main_image', 'thumbnail', 'image_url']);
        const description = get(['description', 'details', 'summary', 'short_description']);
        const price = get(['price', 'sale_price', 'asking_price', 'price_from']);
        const development = get(['development', 'project', 'project_name', 'development_name']);
        const bedrooms = get(['bedrooms', 'beds', 'bedroom_count']);
        const location = get(['location', 'area', 'city', 'region']);
        const type = get(['type', 'property_type', 'unit_type']);

        // Must have at least a title or description to be useful
        if (!title && !description) return null;

        return {
            title: title,
            image: image,
            description: description,
            price: price,
            development: development,
            bedrooms: bedrooms,
            location: location,
            type: type
        };
    }

    // =========================================================================
    // 4. Render Properties
    // =========================================================================
    /**
     * Renders an array of property objects as cards into #portfolio-grid.
     * Each card includes an image, title, price, and expandable detail.
     */
    function renderProperties(properties) {
        if (!gridEl) return;

        if (!properties || properties.length === 0) {
            showFallback();
            return;
        }

        // Build filter options from unique development names
        const developments = [...new Set(
            properties
                .map(p => p.development)
                .filter(Boolean)
        )].sort();

        if (developments.length > 1 && filterEl) {
            renderFilter(developments);
        }

        // Render cards
        gridEl.innerHTML = properties.map(property => createCardHTML(property)).join('');
    }

    /**
     * Creates the HTML string for a single property card.
     */
    function createCardHTML(property) {
        const imageSrc = property.image || 'images/hero.jpeg';
        const priceDisplay = property.price
            ? `<span class="property-card__price">${formatPrice(property.price)}</span>`
            : '';
        const bedroomDisplay = property.bedrooms
            ? `<span class="property-card__beds">${property.bedrooms} bed</span>`
            : '';
        const locationDisplay = property.location
            ? `<span class="property-card__location">${property.location}</span>`
            : '';
        const typeDisplay = property.type
            ? `<span class="property-card__type">${property.type}</span>`
            : '';

        const metaItems = [bedroomDisplay, typeDisplay, locationDisplay].filter(Boolean).join('');
        const metaHTML = metaItems ? `<div class="property-card__meta">${metaItems}</div>` : '';

        const descriptionHTML = property.description
            ? `<p class="property-card__description">${truncateText(property.description, 160)}</p>`
            : '';

        return `
            <article class="property-card fade-in-up"
                     onclick="toggleDetail(this)"
                     data-development="${escapeAttr(property.development)}"
                     role="button"
                     tabindex="0"
                     aria-expanded="false">
                <div class="property-card__image-wrap">
                    <img src="${escapeAttr(imageSrc)}"
                         alt="${escapeAttr(property.title || 'Property')}"
                         loading="lazy"
                         onerror="this.src='images/hero.jpeg'">
                </div>
                <div class="property-card__body">
                    <h3 class="property-card__title">${escapeHTML(property.title || 'Untitled Property')}</h3>
                    ${priceDisplay}
                    ${metaHTML}
                </div>
                <div class="property-detail" style="max-height: 0; overflow: hidden; transition: max-height 0.4s ease;">
                    ${descriptionHTML}
                    <a href="#contact" class="property-card__enquire btn btn--primary">
                        Enquire About This Property
                    </a>
                </div>
            </article>
        `;
    }

    // =========================================================================
    // 5. Filtering by Development
    // =========================================================================
    /**
     * Renders the development filter dropdown and wires up change events.
     */
    function renderFilter(developments) {
        if (!filterEl) return;

        let optionsHTML = '<option value="">All Developments</option>';
        developments.forEach(dev => {
            optionsHTML += `<option value="${escapeAttr(dev)}">${escapeHTML(dev)}</option>`;
        });

        filterEl.innerHTML = `
            <label for="development-filter" class="sr-only">Filter by development</label>
            <select id="development-filter" class="filter__select">
                ${optionsHTML}
            </select>
        `;

        const select = filterEl.querySelector('#development-filter');
        if (select) {
            select.addEventListener('change', () => {
                filterByDevelopment(select.value);
            });
        }
    }

    /**
     * Shows/hides property cards based on the selected development name.
     */
    function filterByDevelopment(development) {
        if (!gridEl) return;

        const cards = gridEl.querySelectorAll('.property-card');

        cards.forEach(card => {
            if (!development || card.dataset.development === development) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // =========================================================================
    // 6. Fallback Content
    // =========================================================================
    /**
     * Shows a graceful fallback message when properties cannot be loaded
     * or the feed returns a navigation page.
     */
    function showFallback() {
        if (!gridEl) return;

        gridEl.innerHTML = `
            <div class="portfolio__fallback">
                <p class="portfolio__fallback-text">
                    For our complete portfolio of 144+ properties, please contact Augusta directly.
                </p>
                <a href="#contact" class="btn btn--primary">Get in Touch</a>
            </div>
        `;
    }

    // =========================================================================
    // 7. Utility Helpers
    // =========================================================================
    /**
     * Formats a price string, adding currency symbol if not present.
     */
    function formatPrice(price) {
        if (!price) return '';

        // If already formatted with a currency symbol, return as-is
        if (/^[£€$]/.test(price)) return price;

        // Try to parse as a number and format
        const num = parseFloat(price.replace(/[^0-9.]/g, ''));
        if (isNaN(num)) return price;

        return '€' + num.toLocaleString('en-GB', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    /**
     * Truncates text to a maximum length, adding ellipsis.
     */
    function truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
    }

    /**
     * Escapes HTML entities to prevent XSS.
     */
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Escapes a string for safe use in an HTML attribute.
     */
    function escapeAttr(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // =========================================================================
    // 8. Public Init
    // =========================================================================
    /**
     * Initialises the properties module. Call after DOMContentLoaded.
     * - Shows loading skeletons
     * - Checks sessionStorage cache
     * - Fetches feed if no cache
     * - Renders properties or fallback
     */
    async function init() {
        gridEl = document.getElementById('portfolio-grid');
        filterEl = document.querySelector('.portfolio__filter');

        // Nothing to do if the grid element isn't on this page
        if (!gridEl) return;

        // Show skeletons while loading
        showSkeletons(6);

        // Check cache first
        const cached = getCache();
        if (cached) {
            renderProperties(cached);
            return;
        }

        // Fetch from feed
        try {
            const properties = await fetchProperties();

            if (properties && properties.length > 0) {
                setCache(properties);
                renderProperties(properties);
            } else {
                // Feed returned a navigation page or empty data
                showFallback();
            }
        } catch (error) {
            console.warn('[Properties] Failed to load feed:', error.message);
            showFallback();
        }
    }

    // =========================================================================
    // Public API
    // =========================================================================
    return {
        init: init,
        renderProperties: renderProperties,
        filterByDevelopment: filterByDevelopment
    };

})();

// Auto-initialise when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Properties.init();
});
