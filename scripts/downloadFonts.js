// d:\Orbosis NGO\ngo-backend\scripts\downloadFonts.js
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory: ../assets/fonts
const TARGET_DIR = path.join(__dirname, '..', 'assets', 'fonts');

// Ensure directory exists
if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Created directory: ${TARGET_DIR}`);
}

// Font definitions: We prioritize the 'static' folder to avoid Variable Fonts
const fonts = [
    {
        name: 'PlayfairDisplay-Bold.ttf',
        urls: [
            // Using specific commit hash (bc7e001) to get the static version before it became a Variable Font
            'https://raw.githubusercontent.com/google/fonts/bc7e001f07452792695b7b9932976f7d98d5e233/ofl/playfairdisplay/PlayfairDisplay-Bold.ttf'
        ]
    },
    {
        name: 'PlayfairDisplay-Regular.ttf',
        urls: [
            'https://raw.githubusercontent.com/google/fonts/bc7e001f07452792695b7b9932976f7d98d5e233/ofl/playfairdisplay/PlayfairDisplay-Regular.ttf'
        ]
    },
    {
        name: 'GreatVibes-Regular.ttf',
        urls: [
            'https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf'
        ]
    },
    {
        name: 'OpenSans-Regular.ttf',
        urls: [
            // Using specific commit hash (f55e32a) to ensure the static folder exists and is accessible
            'https://raw.githubusercontent.com/google/fonts/f55e32a68778d9470d09d72734798a5927963669/ofl/opensans/static/OpenSans-Regular.ttf'
        ]
    },
    {
        name: 'OpenSans-Bold.ttf',
        urls: [
            'https://raw.githubusercontent.com/google/fonts/f55e32a68778d9470d09d72734798a5927963669/ofl/opensans/static/OpenSans-Bold.ttf'
        ]
    },
    {
        name: 'DancingScript-Regular.ttf',
        urls: [
            // Using specific commit hash (3e2030e) for the static version
            'https://raw.githubusercontent.com/google/fonts/3e2030e81e13e292b9585b2e5e2397c09d963b95/ofl/dancingscript/DancingScript-Regular.ttf'
        ]
    },
    {
        name: 'Lato-Regular.ttf',
        urls: [
            'https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf'
        ]
    }
];

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);

        https.get(url, (response) => {
            // Check for valid status code
            if (response.statusCode !== 200) {
                fs.unlink(dest, () => { }); // Delete partial file
                reject(new Error(`Status Code ${response.statusCode}`));
                return;
            }

            // Check content type to ensure we aren't downloading an HTML error page
            const contentType = response.headers['content-type'];
            if (contentType && contentType.includes('text/html')) {
                fs.unlink(dest, () => { });
                reject(new Error(`Invalid Content-Type:  (Likely a 404 page)`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                // Check if file is empty or too small (corrupted)
                if (fs.statSync(dest).size < 1000) {
                    fs.unlink(dest, () => { });
                    reject(new Error('File too small, likely corrupted or empty'));
                } else {
                    resolve();
                }
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
};

const processFonts = async () => {
    console.log('Starting font downloads...');

    for (const font of fonts) {
        const destPath = path.join(TARGET_DIR, font.name);
        let downloaded = false;

        for (const url of font.urls) {
            try {
                await downloadFile(url, destPath);
                console.log(`✅ Downloaded: ${font.name}`);
                downloaded = true;
                break; // Stop trying other URLs for this font
            } catch (error) {
                // Silent fail to try next URL
            }
        }

        if (!downloaded) {
            console.error(`❌ Failed to download: ${font.name} (Tried all candidates)`);
        }
    }

    console.log('\nProcess complete.');
    console.log(`Fonts are located in: `);
};

processFonts();