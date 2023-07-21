const esbuild = require('esbuild')

const bannerComment = `
// ==UserScript==
// @name       r/place UK-O-Matic
// @namespace  r/place UK Nerds
// @version    0.1
// @description  Connects to a WebSocket server on localhost
// @match      https://www.reddit.com/r/place/*
// @match      https://new.reddit.com/r/place/*
// @grant      GM_addStyle
// @grant      GM_xmlhttpRequest
// @run-at     document-end
// ==/UserScript==`

// Build the main application for Node.js
esbuild
    .build({
        entryPoints: ['src/server.ts'],
        bundle: true,
        platform: 'node',
        outbase: 'src', // base directory
        outdir: 'dist', // output directory
    })
    .then(() => {
        // Build the user scripts for the browser
        return esbuild.build({
            entryPoints: ['src/userscripts/main.ts'],
            bundle: true,
            platform: 'browser',
            target: ['es2020'],
            outbase: 'src',
            outfile: './userscript.build.js',
            banner: {
                js: bannerComment,
            },
        })
    })
    .then(() => {
        return esbuild.build({
            entryPoints: ['src/reddit/api.ts'],
            bundle: true,
            platform: 'browser',
            target: ['es2020'],
            outbase: 'src',
            outfile: './reddit/reddit-api.browser.js',
        })
    })
    .then(() => {
        return esbuild.build({
            entryPoints: ['src/reddit/api.ts'],
            bundle: true,
            platform: 'node',
            outbase: 'src',
            outfile: './reddit/reddit-api.node.js',
        })
    })
    .catch(() => {
        process.exit(1)
    })
