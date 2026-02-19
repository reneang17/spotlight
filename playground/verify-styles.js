
(async function verifyStyles() {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    
    // Helper to get computed style
    const getBgColor = () => {
        return window.getComputedStyle(document.body).backgroundColor;
    };

    console.group('Style Verification');

    // 1. Check Default
    // Assuming we start at default or can reset.
    // The demo might settle on a theme, so let's try to reset by clicking default button if available, 
    // or manually clearing classes.
    document.body.className = ''; 
    await sleep(100);
    const defaultColor = getBgColor();
    console.log('Default BG:', defaultColor);

    // 2. Check Paper
    document.body.classList.add('theme-paper');
    await sleep(100);
    const paperColor = getBgColor();
    console.log('Paper BG:', paperColor);
    if (paperColor === defaultColor || paperColor === 'rgba(0, 0, 0, 0)') {
        console.error('FAIL: Paper theme did not change background.');
    } else {
        console.log('PASS: Paper theme applied.');
    }
    document.body.classList.remove('theme-paper');

    // 3. Check Dark
    document.body.classList.add('theme-dark');
    await sleep(100);
    const darkColor = getBgColor();
    console.log('Dark BG:', darkColor);
    // Approximate black/dark check
    if (darkColor === 'rgb(0, 0, 0)' || darkColor === '#000000') {
         console.log('PASS: Dark theme applied.');
    } else {
         console.error('FAIL: Dark theme mismatch:', darkColor);
    }
    document.body.classList.remove('theme-dark');

    console.groupEnd();
    return { defaultColor, paperColor, darkColor };
})();
