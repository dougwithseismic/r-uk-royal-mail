const esbuild = require('esbuild')

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
            outdir: 'dist',
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