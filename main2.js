new p5(function(p) {

    /* ─────── CONFIG ─────── */
    let fullPct = 0.0;
    let partialPct = 0.0;
    let manualPct = 0.0;

    const fullColor = '#1B2F33';
    const partialColor = '#447604';
    const manualColor = '#208AAE';

    const TOTAL_SQUARES = 100;
    const GRID_COLS = 10;
    const GRID_ROWS = 10;
    const PADDING = 8;

    // Animation timing (in milliseconds)
    const ANIMATION_DURATION = 2000; // How fast the compress/expand happens
    const PAUSE_DURATION = 1000; // How long to wait between cycles

    let squares = [];
    let squareSize = 0;
    let allColors = [];

    /* ─────── HELPERS ─────── */
    function calculateSquareSize() {
        const availableWidth = p.width - PADDING * (GRID_COLS + 1);
        const availableHeight = p.height - PADDING * (GRID_ROWS + 1);
        squareSize = Math.min(availableWidth / GRID_COLS, availableHeight / GRID_ROWS);
    }

    function generateSquares() {
        squares = [];
        calculateSquareSize();

        // Calculate counts (round up)
        const fullCount = Math.ceil(fullPct * TOTAL_SQUARES);
        const partialCount = Math.ceil(partialPct * TOTAL_SQUARES);
        const manualCount = TOTAL_SQUARES - fullCount - partialCount;

        // Create array of colors
        allColors = [
            ...Array(fullCount).fill(fullColor),
            ...Array(partialCount).fill(partialColor),
            ...Array(manualCount).fill(manualColor)
        ];

        // Shuffle colors
        shuffleColors();

        // Generate grid positions
        const totalWidth = GRID_COLS * squareSize + (GRID_COLS + 1) * PADDING;
        const totalHeight = GRID_ROWS * squareSize + (GRID_ROWS + 1) * PADDING;
        const offsetX = (p.width - totalWidth) / 2;
        const offsetY = (p.height - totalHeight) / 2;

        for (let i = 0; i < TOTAL_SQUARES; i++) {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const x = offsetX + PADDING + col * (squareSize + PADDING);
            const y = offsetY + PADDING + row * (squareSize + PADDING);
            squares.push({
                x,
                y,
                color: allColors[i],
                direction: Math.floor(Math.random() * 4) // 0=left, 1=right, 2=up, 3=down
            });
        }
    }

    function shuffleColors() {
        for (let i = allColors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allColors[i], allColors[j]] = [allColors[j], allColors[i]];
        }
    }

    function loadAndResetData() {
        p.loadJSON('data_entry_auto_pct.json', (data) => {
            fullPct = data.full;
            partialPct = data.partial;
            manualPct = 1 - fullPct - partialPct;
            generateSquares();
        }, () => {
            // Fallback if file doesn't exist
            fullPct = 0.185;
            partialPct = 0.157;
            manualPct = 1 - fullPct - partialPct;
            generateSquares();
        });
    }

    /* ─────── SETUP ─────── */
    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        loadAndResetData();
        setInterval(loadAndResetData, 10 * 60 * 1000);
    };

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        generateSquares();
    };

    /* ─────── DRAW LOOP ─────── */
    p.draw = () => {
        p.background('#f9f9f9');

        // Draw animated squares
        p.noStroke();
        const time = p.millis();
        const cycleDuration = ANIMATION_DURATION + PAUSE_DURATION;
        const cycleTime = time % cycleDuration;

        // Check if we should update directions (at the start of each new cycle)
        const lastCycleTime = (time - p.deltaTime) % cycleDuration;
        if (lastCycleTime > cycleTime) {
            // New cycle started - pick new random directions
            squares.forEach((square) => {
                square.direction = Math.floor(Math.random() * 4);
            });
        }

        squares.forEach((square, i) => {
            let scale = 1;
            let animProgress = 0;

            // Only animate during ANIMATION_DURATION, then stay at full size during PAUSE_DURATION
            if (cycleTime < ANIMATION_DURATION) {
                animProgress = cycleTime / ANIMATION_DURATION;

                // Check if we're crossing the midpoint (fully compressed) to change colors
                const lastAnimProgress = Math.max(0, (cycleTime - p.deltaTime)) / ANIMATION_DURATION;
                if (lastAnimProgress < 0.5 && animProgress >= 0.5) {
                    // At the midpoint - reshuffle and assign new colors
                    shuffleColors();
                    squares.forEach((sq, idx) => {
                        sq.color = allColors[idx];
                    });
                }

                // Calculate scale factor (compress 0-0.5, expand 0.5-1)
                if (animProgress < 0.5) {
                    scale = 1 - (animProgress * 2); // 1 -> 0
                } else {
                    scale = (animProgress - 0.5) * 2; // 0 -> 1
                }
            }

            let w = squareSize;
            let h = squareSize;
            let offsetX = 0;
            let offsetY = 0;

            // Apply compression/expansion from the same side
            if (square.direction === 0) { // left
                w = squareSize * scale;
            } else if (square.direction === 1) { // right
                w = squareSize * scale;
                offsetX = squareSize - w;
            } else if (square.direction === 2) { // up
                h = squareSize * scale;
            } else { // down
                h = squareSize * scale;
                offsetY = squareSize - h;
            }

            p.fill(square.color);
            p.rect(square.x + offsetX, square.y + offsetY, Math.max(w, 2), Math.max(h, 2), 4);
        });

        drawInfoPanel();
    };

    /* ─────── PANEL ─────── */
    function drawInfoPanel() {
        const labels = [
            { name: 'Full',    value: fullPct,    color: fullColor },
            { name: 'Partial', value: partialPct, color: partialColor },
            { name: 'Manual',  value: manualPct,  color: manualColor },
        ];

        p.textStyle(p.NORMAL);
        p.textSize(18);
        const labelWidths = labels.map(lbl =>
            p.textWidth(`${lbl.name}: ${(Math.round(lbl.value * 1000) / 10).toFixed(1)}%`)
        );

        p.textStyle(p.BOLD);
        p.textSize(22);
        const titleWidth = p.textWidth('Data Entry Automation');

        const sw = 16, innerPad = 16, gap = 10;
        const pillarW = sw + gap;
        const txtBlock = Math.max(...labelWidths, titleWidth);
        const innerW = pillarW + txtBlock + innerPad;
        const innerH = 36 + 20 + labels.length * 42;
        const pad = 24;
        const x = p.width - innerW - pad;
        const y = pad;

        p.noStroke();
        p.fill(255, 238);
        p.rect(x, y, innerW, innerH, 12);
        p.stroke(0, 40);
        p.noFill();
        p.rect(x, y, innerW, innerH, 12);

        p.noStroke();
        p.textStyle(p.BOLD);
        p.textSize(22);
        p.fill(0);
        p.textAlign(p.LEFT, p.TOP);
        p.text('Data Entry Automation', x + innerPad, y + 12);

        p.textStyle(p.NORMAL);
        p.textSize(18);
        labels.forEach((lbl, i) => {
            const yy = y + 36 + 20 + i * 42;
            p.fill(lbl.color);
            p.rect(x + innerPad, yy + 7, sw, sw, 3);
            p.fill(0);
            p.textAlign(p.LEFT, p.CENTER);
            p.text(`${lbl.name}: ${(Math.round(lbl.value * 1000) / 10).toFixed(1)}%`,
                x + innerPad + pillarW, yy + 15);
        });
    }
});
