new p5(function(p) {

    /* ─────── CONFIG ─────── */
    const FPS          = 10;
    const TOTAL_RIBBONS = 300;

    let fullPct = 0.0;
    let partialPct = 0.0;
    let manualPct = 0.0;

    const fullColor    = '#14342B';
    const partialColor = '#FF579F';
    const manualColor  = '#63B0CD';

    const spacing     = 20;
    const flowScale   = 0.01;
    const ribbonThick = 60;
    const stepSize    = 3;
    const zInc        = 0.0008;
    const minLen      = 5;
    const maxLen      = 225;

    let field = [];
    let flowAngles = [];
    let zoff = 0;
    let seedN;
    let ribbons = [];
    let cols, rows;

    /* ─────── RIBBON CLASS ─────── */
    class Ribbon {
        constructor(x, y, len, fill) {
            this.head  = p.createVector(x, y);
            this.path  = [];
            this.alive = true;
            this.len   = len;
            this.fill  = fill;
            this.depth = p.random();
        }
        update(field) {
            if (!this.alive) {
                this.path.shift();
                return this.path.length;
            }
            if (this.head.x < 0 || this.head.x > p.width ||
                this.head.y < 0 || this.head.y > p.height) {
                this.alive = false;
                return this.path.length;
            }

            const cx = p.floor(this.head.x / spacing);
            const cy = p.floor(this.head.y / spacing);
            if (cy < 0 || cy >= field.length ||
                cx < 0 || cx >= field[0].length) {
                this.alive = false;
                return this.path.length;
            }

            const ang = field[cy][cx];
            const dir = p5.Vector.fromAngle(ang);
            const nrm = p.createVector(-dir.y, dir.x);

            const top = p5.Vector.add(this.head, p5.Vector.mult(nrm,  ribbonThick / 2));
            const bot = p5.Vector.add(this.head, p5.Vector.mult(nrm, -ribbonThick / 2));
            this.path.push({ top, bot });
            if (this.path.length > this.len) this.path.shift();

            this.head.add(p5.Vector.mult(dir, stepSize));
            return true;
        }
        draw() {
            if (this.path.length < 2) return;
            p.stroke(0, 120);
            p.strokeWeight(1.5);
            p.fill(this.fill);
            p.beginShape();
            this.path.forEach(seg => p.vertex(seg.top.x, seg.top.y));
            for (let i = this.path.length - 1; i >= 0; i--) {
                const seg = this.path[i];
                p.vertex(seg.bot.x, seg.bot.y);
            }
            p.endShape(p.CLOSE);
        }
    }

    /* ─────── HELPERS ─────── */
    function spawnRibbon() {
        const x   = p.random(p.width),
            y   = p.random(p.height),
            len = p.floor(p.random(minLen, maxLen));

        const r = Math.random();
        const color = r < fullPct              ? fullColor
            : r < fullPct + partialPct ? partialColor
                : manualColor;

        return new Ribbon(x, y, len, color);
    }

    function buildInitialField() {
        cols = Math.floor(p.width / spacing);
        rows = Math.floor(p.height / spacing);
        flowAngles = Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) =>
                p.noise(x * flowScale, y * flowScale, seedN) * p.TWO_PI * 2
            )
        );
    }

    function getFieldWithOffset(offset = 0.0) {
        return flowAngles.map(row =>
            row.map(angle => (angle + offset) % p.TWO_PI)
        );
    }

    /* ─────── SETUP ─────── */
    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.frameRate(FPS);
        seedN = p.random(1000);
        buildInitialField();
        loadAndResetData();
        setInterval(loadAndResetData, 10 * 60 * 1000);
    };

    function loadAndResetData() {
        p.loadJSON('data_entry_auto_pct.json', (data) => {
            fullPct = data.full;
            partialPct = data.partial;
            manualPct = 1 - fullPct - partialPct;
            ribbons = [];
            for (let i = 0; i < TOTAL_RIBBONS; i++) ribbons.push(spawnRibbon());
        });
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        buildInitialField();
        ribbons = [];
        for (let i = 0; i < TOTAL_RIBBONS; i++) ribbons.push(spawnRibbon());
    };

    /* ─────── DRAW LOOP ─────── */
    p.draw = () => {
        p.background('#f9f9f9');
        zoff += zInc;
        field = getFieldWithOffset(zoff);
        ribbons = ribbons.filter(r => r.update(field));
        ribbons.sort((a, b) => a.depth - b.depth).forEach(r => r.draw());
        while (ribbons.length < TOTAL_RIBBONS) ribbons.push(spawnRibbon());
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
            p.textWidth(`${lbl.name}: ${(lbl.value * 100).toFixed(1)}%`)
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
            p.text(`${lbl.name}: ${(lbl.value * 100).toFixed(1)}%`,
                x + innerPad + pillarW, yy + 15);
        });
    }
});
