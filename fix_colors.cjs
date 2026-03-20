const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'pages');

const replacements = [
    // Greens -> Accents (Oro cálido) represents Success/Income
    { regex: /text-green-\d{3}/g, replace: 'text-accent' },
    { regex: /bg-green-50/g, replace: 'bg-accent/10' },
    { regex: /bg-green-100/g, replace: 'bg-accent/20' },
    { regex: /bg-green-200/g, replace: 'bg-accent/30' },
    { regex: /bg-green-\d{3}/g, replace: 'bg-accent' },
    { regex: /border-green-\d{3}/g, replace: 'border-accent/50' },

    // Reds -> Foreground (Ciruela noche) represents Danger/Expenses
    { regex: /text-red-\d{3}/g, replace: 'text-foreground' },
    { regex: /bg-red-50/g, replace: 'bg-foreground/5' },
    { regex: /bg-red-100/g, replace: 'bg-foreground/10' },
    { regex: /bg-red-200/g, replace: 'bg-foreground/20' },
    { regex: /bg-red-\d{3}/g, replace: 'bg-foreground' },
    { regex: /border-red-\d{3}/g, replace: 'border-foreground/30' },

    // Ambers -> Primary (Lavanda profunda) represents Warnings/Alerts
    { regex: /text-amber-\d{3}/g, replace: 'text-primary' },
    { regex: /bg-amber-50/g, replace: 'bg-primary/10' },
    { regex: /bg-amber-100/g, replace: 'bg-primary/20' },
    { regex: /bg-amber-200/g, replace: 'bg-primary/30' },
    { regex: /bg-amber-\d{3}/g, replace: 'bg-primary' },
    { regex: /border-amber-\d{3}/g, replace: 'border-primary/40' },

    // Special exact replacements
    { regex: /text-green-\d{3}\/20/g, replace: 'text-accent/20' },
    { regex: /text-red-\d{3}\/20/g, replace: 'text-foreground/20' },
    { regex: /text-amber-\d{3}\/20/g, replace: 'text-primary/20' }
];

function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            replacements.forEach(r => {
                content = content.replace(r.regex, r.replace);
            });
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated colors in ${fullPath}`);
            }
        }
    });
}

walkDir(directoryPath);
console.log('Color replacement complete.');
