/**
 * crawl-and-screenshot.js
 *
 * Crawls a locally running website (default: http://localhost:3000),
 * discovers every internal page reachable via <a href> links, and
 * saves a full-page screenshot of each one.
 *
 * SETUP
 *   npm install -D playwright
 *   npx playwright install chromium
 *
 * RUN
 *   node crawl-and-screenshot.js
 *
 * CONFIG
 *   Edit the CONFIG block below — base URL, login credentials (if the
 *   site/admin panel requires auth), max pages, output folder, viewport.
 *
 * OUTPUT
 *   ./screenshots/
 *     000-home.png
 *     001-jobs.png
 *     002-jobs-new.png
 *     ...
 *     _sitemap.json   <- list of every URL found + its screenshot file
 *     _errors.json    <- any page that failed to load/screenshot
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ────────────────────────────────────────────────────────────
// CONFIG — edit these values for your setup
// ────────────────────────────────────────────────────────────
const CONFIG = {
    baseUrl: 'http://localhost:3000',
    outputDir: path.join(__dirname, 'screenshots'),
    viewport: { width: 1440, height: 900 },
    maxPages: 200,              // safety cap so a bug can't crawl forever
    waitAfterLoadMs: 500,       // extra settle time before screenshot (animations, lazy content)
    fullPage: true,             // full scrollable page vs just the viewport
    timeoutMs: 30000,           // per-page navigation timeout

    // Paths to skip entirely (logout links, external redirects, file downloads, etc.)
    excludePatterns: [
        /\/logout/i,
        /\/api\//i,
        /\.(pdf|zip|csv|xlsx|png|jpg|jpeg|svg)$/i,
        /^mailto:/i,
        /^tel:/i,
    ],

    // OPTIONAL: log in before crawling (needed for the admin panel).
    // Set `enabled: true` and fill in the selectors/credentials for your login form.
    login: {
        enabled: true,
        loginUrl: 'http://localhost:3000/login',
        usernameSelector: 'input[name="digitalsolutionsilchar@gmail.com"]',
        passwordSelector: 'input[name="password123"]',
        submitSelector: 'button[type="submit"]',
        username: 'digitalsolutionsilchar@gmail.com',
        password: 'password123',
        // A selector that only appears once logged in (used to confirm success)
        successSelector: 'text=Dashboard',
    },
};
// ────────────────────────────────────────────────────────────

function isExcluded(url) {
    return CONFIG.excludePatterns.some((re) => re.test(url));
}

function isSameOrigin(url, base) {
    try {
        return new URL(url).origin === new URL(base).origin;
    } catch {
        return false;
    }
}

function urlToFilename(url, index) {
    const u = new URL(url);
    let slug = (u.pathname === '/' ? 'home' : u.pathname)
        .replace(/^\/+|\/+$/g, '')
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9-_]/g, '')
        .toLowerCase();
    if (u.search) {
        slug += '-' + u.search.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
    }
    const prefix = String(index).padStart(3, '0');
    return `${prefix}-${slug || 'page'}.png`;
}

async function loginIfNeeded(page) {
    if (!CONFIG.login.enabled) return;
    console.log(`Logging in at ${CONFIG.login.loginUrl} ...`);
    await page.goto(CONFIG.login.loginUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeoutMs });
    await page.fill(CONFIG.login.usernameSelector, CONFIG.login.username);
    await page.fill(CONFIG.login.passwordSelector, CONFIG.login.password);
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: CONFIG.timeoutMs }).catch(() => { }),
        page.click(CONFIG.login.submitSelector),
    ]);
    if (CONFIG.login.successSelector) {
        await page.waitForSelector(CONFIG.login.successSelector, { timeout: CONFIG.timeoutMs }).catch(() => {
            console.warn('⚠ Could not confirm login success selector — continuing anyway.');
        });
    }
    console.log('Login step complete.');
}

async function main() {
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: CONFIG.viewport });
    const page = await context.newPage();

    await loginIfNeeded(page);

    const visited = new Set();
    const queue = [CONFIG.baseUrl];
    const sitemap = [];
    const errors = [];
    let index = 0;

    while (queue.length > 0 && visited.size < CONFIG.maxPages) {
        const url = queue.shift();
        const normalizedUrl = url.split('#')[0]; // ignore hash-only differences

        if (visited.has(normalizedUrl) || isExcluded(normalizedUrl)) continue;
        visited.add(normalizedUrl);

        console.log(`[${visited.size}] Visiting: ${normalizedUrl}`);

        try {
            await page.goto(normalizedUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeoutMs });
            await page.waitForTimeout(CONFIG.waitAfterLoadMs);

            const filename = urlToFilename(normalizedUrl, index);
            const filepath = path.join(CONFIG.outputDir, filename);
            await page.screenshot({ path: filepath, fullPage: CONFIG.fullPage });

            sitemap.push({ url: normalizedUrl, screenshot: filename, title: await page.title() });
            index++;

            // Discover links on this page
            const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
            for (const link of links) {
                if (
                    isSameOrigin(link, CONFIG.baseUrl) &&
                    !isExcluded(link) &&
                    !visited.has(link.split('#')[0])
                ) {
                    queue.push(link);
                }
            }
        } catch (err) {
            console.error(`  ✗ Failed: ${normalizedUrl} — ${err.message}`);
            errors.push({ url: normalizedUrl, error: err.message });
        }
    }

    fs.writeFileSync(
        path.join(CONFIG.outputDir, '_sitemap.json'),
        JSON.stringify(sitemap, null, 2)
    );
    fs.writeFileSync(
        path.join(CONFIG.outputDir, '_errors.json'),
        JSON.stringify(errors, null, 2)
    );

    await browser.close();

    console.log('\n────────────────────────────────');
    console.log(`Done. ${sitemap.length} pages screenshotted, ${errors.length} errors.`);
    console.log(`Output folder: ${CONFIG.outputDir}`);
    console.log('────────────────────────────────');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});