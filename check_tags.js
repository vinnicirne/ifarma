
import fs from 'fs';

const content = fs.readFileSync('src/pages/merchant/StoreCustomization.tsx', 'utf8');

function checkTags(code) {
    let balance = 0;
    let lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Remove comments
        line = line.replace(/\{\/\*.*?\*\/\}/g, '');

        let opens = (line.match(/<div/g) || []).length;
        let closes = (line.match(/<\/div>/g) || []).length;

        // Handle self-closing divs if any (rare but)
        let selfCloses = (line.match(/<div[^>]*\/>/g) || []).length;
        opens -= selfCloses;

        balance += opens;
        balance -= closes;
    }
    console.log("Final Div Balance:", balance);
}

checkTags(content);
