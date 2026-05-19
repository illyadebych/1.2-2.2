/**
 * 1. МАТЕМАТИЧНЕ ЯДРО ТА ДАНІ
 */
const DataRepository = {
    datasets: {
        5: [
            { x: 1, y: 0.5 }, { x: 2, y: 2.1 }, { x: 3, y: 4.4 },
            { x: 4, y: 7.1 }, { x: 5, y: 10.2 }
        ],
        10: [
            { x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }, { x: 4, y: 8 },
            { x: 5, y: 12 }, { x: 6, y: 17 }, { x: 7, y: 23 }, { x: 8, y: 30 }
        ],
        20: [
            { x: 0, y: 2 }, { x: 0.5, y: 2.5 }, { x: 1, y: 3.2 }, { x: 1.5, y: 4.1 },
            { x: 2, y: 5.2 }, { x: 2.5, y: 6.5 }, { x: 3, y: 8.0 }, { x: 3.5, y: 9.7 },
            { x: 4, y: 11.6 }, { x: 4.5, y: 13.7 }, { x: 5, y: 16.0 }, { x: 5.5, y: 18.5 },
            { x: 6, y: 21.2 }, { x: 6.5, y: 24.1 }, { x: 7, y: 27.2 }, { x: 7.5, y: 30.5 },
            { x: 8, y: 34.0 }, { x: 8.5, y: 37.7 }, { x: 9, y: 41.6 }, { x: 9.5, y: 45.7 }
        ]
    },
    getPoints(count) { return JSON.parse(JSON.stringify(this.datasets[count])); }
};

const MathSolver = {
    lagrange(points, x, activeNodesCount = points.length) {
        let result = 0;
        for (let i = 0; i < activeNodesCount; i++) {
            let term = points[i].y;
            for (let j = 0; j < activeNodesCount; j++) {
                if (i !== j) term *= (x - points[j].x) / (points[i].x - points[j].x);
            }
            result += term;
        }
        return result;
    },

    qrDecomposition(A) {
        const m = A.length, n = A[0].length;
        let Q = Array.from({ length: m }, () => Array(n).fill(0));
        let R = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) Q[i][j] = A[i][j];

        for (let i = 0; i < n; i++) {
            let norm = 0;
            for (let k = 0; k < m; k++) norm += Q[k][i] * Q[k][i];
            R[i][i] = Math.sqrt(norm);
            if (R[i][i] < 1e-12) return { Q, R }; // Запобіжник
            for (let k = 0; k < m; k++) Q[k][i] /= R[i][i];
            for (let j = i + 1; j < n; j++) {
                let dot = 0;
                for (let k = 0; k < m; k++) dot += Q[k][i] * Q[k][j];
                R[i][j] = dot;
                for (let k = 0; k < m; k++) Q[k][j] -= R[i][j] * Q[k][i];
            }
        }
        return { Q, R };
    },

    leastSquaresQR(points) {
        const m = points.length, n = 4; // Кубічний поліном
        let A = Array.from({ length: m }, () => Array(n).fill(0));
        let Y = Array(m).fill(0);

        for (let i = 0; i < m; i++) {
            Y[i] = points[i].y;
            for (let j = 0; j < n; j++) A[i][j] = Math.pow(points[i].x, j);
        }

        const { Q, R } = this.qrDecomposition(A);
        let QTY = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let k = 0; k < m; k++) QTY[i] += Q[k][i] * Y[k];
        }

        let coef = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) sum += R[i][j] * coef[j];
            coef[i] = (QTY[i] - sum) / (R[i][i] || 1);
        }
        return coef;
    },

    evalPoly(coef, x) {
        return coef[0] + coef[1]*x + coef[2]*Math.pow(x,2) + coef[3]*Math.pow(x,3);
    },

    getMSE(points, coef) {
        let sum = 0;
        points.forEach(p => {
            const err = p.y - this.evalPoly(coef, p.x);
            sum += err * err;
        });
        return sum / points.length;
    }
};

/**
 * 2. ГРАФІКА ТА CANVAS
 */
const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

// Стан додатку
let appState = {
    points: [],
    coefMNC: [],
    viewMode: 'all',
    bounds: { xMin: 0, xMax: 10, yMin: -5, yMax: 5 },
    animMNC: 1.0,
    animLagrangeNodes: 0,
    isAnimatingMNC: false,
    isAnimatingLagrange: false
};

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawScene();
}
window.addEventListener('resize', resizeCanvas);

function updateBounds() {
    if (!appState.points.length) return;
    let xs = appState.points.map(p => p.x);
    let ys = appState.points.map(p => p.y);
    
    for(let x = Math.min(...xs); x <= Math.max(...xs); x += 0.5) {
        ys.push(MathSolver.evalPoly(appState.coefMNC, x));
    }

    let xMin = Math.min(...xs), xMax = Math.max(...xs);
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    let dx = (xMax - xMin) || 1, dy = (yMax - yMin) || 1;
    
    appState.bounds = {
        xMin: xMin - dx * 0.1, xMax: xMax + dx * 0.1,
        yMin: yMin - dy * 0.2, yMax: yMax + dy * 0.2
    };
}

// Перетворення координат
function toScreenX(mathX) {
    return ((mathX - appState.bounds.xMin) / (appState.bounds.xMax - appState.bounds.xMin)) * canvas.width;
}
function toScreenY(mathY) {
    return canvas.height - ((mathY - appState.bounds.yMin) / (appState.bounds.yMax - appState.bounds.yMin)) * canvas.height;
}

function drawGridAndAxes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Налаштування шрифту для цифр
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // Напівпрозорий білий колір цифр

    // Визначаємо крок сітки, щоб цифри не злипалися (особливо для Y = 45)
    let rangeX = appState.bounds.xMax - appState.bounds.xMin;
    let rangeY = appState.bounds.yMax - appState.bounds.yMin;
    let stepX = rangeX > 20 ? 5 : (rangeX > 10 ? 2 : 1);
    let stepY = rangeY > 30 ? 5 : (rangeY > 15 ? 2 : 1);

    // Малюємо сітку та підписи
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Дуже тьмяні лінії сітки
    ctx.beginPath();
    
    // Вісь X (вертикальні лінії сітки та підписи внизу екрана)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let x = Math.floor(appState.bounds.xMin); x <= Math.ceil(appState.bounds.xMax); x += stepX) {
        let sx = toScreenX(x);
        ctx.moveTo(sx, 0); 
        ctx.lineTo(sx, canvas.height);
        // Малюємо цифри X (відступ 5px від низу)
        ctx.fillText(x, sx, canvas.height - 5); 
    }
    
    // Вісь Y (горизонтальні лінії сітки та підписи зліва екрана)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = Math.floor(appState.bounds.yMin); y <= Math.ceil(appState.bounds.yMax); y += stepY) {
        let sy = toScreenY(y);
        ctx.moveTo(0, sy); 
        ctx.lineTo(canvas.width, sy);
        // Малюємо цифри Y (відступ 5px від лівого краю)
        ctx.fillText(y, 10, sy); 
    }
    ctx.stroke();

    // Малюємо головні осі координат X=0 та Y=0 (якщо вони влазять в екран)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Трохи яскравіше
    ctx.beginPath();
    let zeroY = toScreenY(0), zeroX = toScreenX(0);
    if(zeroY >= 0 && zeroY <= canvas.height) { 
        ctx.moveTo(0, zeroY); ctx.lineTo(canvas.width, zeroY); 
    }
    if(zeroX >= 0 && zeroX <= canvas.width) { 
        ctx.moveTo(zeroX, 0); ctx.lineTo(zeroX, canvas.height); 
    }
    ctx.stroke();
}

function drawPoints() {
    appState.points.forEach((p, index) => {
        let sx = toScreenX(p.x), sy = toScreenY(p.y);
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        
        if (appState.isAnimatingLagrange && index === appState.animLagrangeNodes - 1) {
            ctx.fillStyle = '#f9e2af';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f9e2af';
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        } else {
            ctx.fillStyle = '#cdd6f4';
            ctx.shadowBlur = 0;
        }
        ctx.fill();
    });
    ctx.shadowBlur = 0;
}

function drawCurve(func, color, progress = 1) {
    if (!appState.points.length) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    
    const startX = appState.points[0].x;
    const endX = appState.points[appState.points.length - 1].x;
    const step = (endX - startX) / 200;

    let first = true;
    for (let x = startX; x <= endX; x += step) {
        let y = func(x);
        
        if (progress < 1) {
            let meanY = appState.points.reduce((s, p) => s + p.y, 0) / appState.points.length;
            y = meanY + (y - meanY) * progress;
        }

        let sx = toScreenX(x), sy = toScreenY(y);
        if (first) { ctx.moveTo(sx, sy); first = false; } 
        else { ctx.lineTo(sx, sy); }
    }
    ctx.stroke();
}

function drawResiduals() {
    ctx.strokeStyle = 'rgba(243, 139, 168, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    appState.points.forEach(p => {
        let targetY = MathSolver.evalPoly(appState.coefMNC, p.x);
        let meanY = appState.points.reduce((s, p) => s + p.y, 0) / appState.points.length;
        
        let animTargetY = meanY + (targetY - meanY) * appState.animMNC;
        let currentY = p.y + (animTargetY - p.y) * appState.animMNC;

        let start = { x: toScreenX(p.x), y: toScreenY(p.y) };
        let end = { x: toScreenX(p.x), y: toScreenY(currentY) };

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    });
    ctx.setLineDash([]);
}

function drawScene() {
    drawGridAndAxes();
    
    if (appState.viewMode === 'all' || appState.viewMode === 'lagrange') {
        if (appState.animLagrangeNodes > 0) {
            drawCurve((x) => MathSolver.lagrange(appState.points, x, appState.animLagrangeNodes), '#89b4fa');
        }
    }

    if (appState.viewMode === 'all' || appState.viewMode === 'mnc') {
        drawCurve((x) => MathSolver.evalPoly(appState.coefMNC, x), '#a6e3a1', appState.animMNC);
        drawResiduals();
    }

    drawPoints();
}

/**
 * 3. КОНТРОЛЕРИ ТА ІНТЕРАКТИВНІСТЬ
 */
function loadData(size) {
    appState.points = DataRepository.getPoints(size);
    appState.coefMNC = MathSolver.leastSquaresQR(appState.points);
    appState.animLagrangeNodes = appState.points.length;
    appState.animMNC = 1.0;
    appState.isAnimatingLagrange = false;
    appState.isAnimatingMNC = false;
    
    document.getElementById('mse-val').innerText = MathSolver.getMSE(appState.points, appState.coefMNC).toFixed(4);
    updateBounds();
    drawScene();
}

document.getElementById('data-btns').addEventListener('click', e => {
    if(e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#data-btns button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    loadData(parseInt(e.target.dataset.size));
});

document.getElementById('view-btns').addEventListener('click', e => {
    if(e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#view-btns button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    appState.viewMode = e.target.dataset.view;
    drawScene();
});

document.getElementById('btn-anim-mnc').addEventListener('click', () => {
    appState.animMNC = 0;
    appState.isAnimatingMNC = true;
    appState.viewMode = appState.viewMode === 'lagrange' ? 'all' : appState.viewMode;
    
    function step() {
        appState.animMNC += 0.02;
        if (appState.animMNC >= 1) {
            appState.animMNC = 1;
            appState.isAnimatingMNC = false;
        }
        drawScene();
        if (appState.isAnimatingMNC) requestAnimationFrame(step);
    }
    step();
});

document.getElementById('btn-anim-lagrange').addEventListener('click', () => {
    appState.animLagrangeNodes = 1;
    appState.isAnimatingLagrange = true;
    appState.viewMode = appState.viewMode === 'mnc' ? 'all' : appState.viewMode;
    
    function step() {
        appState.animLagrangeNodes++;
        drawScene();
        if (appState.animLagrangeNodes < appState.points.length) {
            setTimeout(() => requestAnimationFrame(step), 400);
        } else {
            appState.isAnimatingLagrange = false;
            drawScene();
        }
    }
    drawScene();
    setTimeout(step, 400);
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let hoveredPoint = null;
    appState.points.forEach(p => {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        if (Math.hypot(mouseX - sx, mouseY - sy) < 10) {
            hoveredPoint = p;
        }
    });

    if (hoveredPoint) {
        const err = (hoveredPoint.y - MathSolver.evalPoly(appState.coefMNC, hoveredPoint.x)).toFixed(3);
        tooltip.innerHTML = `x: ${hoveredPoint.x}<br>y: ${hoveredPoint.y}<br>Похибка МНК: ${err}`;
        tooltip.style.left = mouseX + 'px';
        tooltip.style.top = mouseY + 'px';
        tooltip.style.opacity = 1;
    } else {
        tooltip.style.opacity = 0;
    }
});

resizeCanvas();
loadData(5);

лалдвдліадлвоадоадвдодлкоа