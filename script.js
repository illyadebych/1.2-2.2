function draw() {
    // 1. Отримання даних
    const v0 = parseFloat(document.getElementById("v0").value);
    const angleDeg = parseFloat(document.getElementById("angle").value);
    const g = parseFloat(document.getElementById("g_val").value);
    const angleRad = angleDeg * (Math.PI / 180);

    // 2. Фізичні розрахунки
    const timeFlight = (2 * v0 * Math.sin(angleRad)) / g;
    const maxHeight = (Math.pow(v0 * Math.sin(angleRad), 2)) / (2 * g);
    const maxRange = (Math.pow(v0, 2) * Math.sin(2 * angleRad)) / g;

    let data = [];
    const steps = 100;
    const dt = timeFlight / steps;

    for (let i = 0; i <= steps; i++) {
        let t = i * dt;
        let x = v0 * Math.cos(angleRad) * t;
        let y = v0 * Math.sin(angleRad) * t - (0.5 * g * t * t);
        data.push({ x: x, y: Math.max(0, y) });
    }

    // 3. Налаштування SVG
    const svg = d3.select("#chart");
    svg.selectAll("*").remove(); // Очищення

    const width = 800;
    const height = 450;
    const margin = { top: 40, right: 40, bottom: 50, left: 60 };

    // 4. Створення динамічних шкал (Scales)
    const xScale = d3.scaleLinear()
        .domain([0, maxRange * 1.1]) // +10% запасу
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([0, maxHeight * 1.2]) // +20% запасу для висоти
        .range([height - margin.bottom, margin.top]);

    // 5. Осі та сітка
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).ticks(10))
        .append("text")
        .attr("x", width - margin.right)
        .attr("y", -10)
        .attr("fill", "black")
        .text("X (метри)");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(10))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 15)
        .attr("x", -margin.top)
        .attr("fill", "black")
        .text("Y (метри)");

    // 6. Побудова траєкторії
    const lineGenerator = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveBasis); // Згладжування

    const path = svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#007bff")
        .attr("stroke-width", 3)
        .attr("d", lineGenerator);

    // 7. Анімація лінії
    const totalLength = path.node().getTotalLength();
    path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    // 8. Анімація кульки
    const ball = svg.append("circle")
        .attr("r", 6)
        .attr("fill", "#dc3545");

    ball.transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attrTween("transform", function() {
            return function(t) {
                const point = path.node().getPointAtLength(t * totalLength);
                return `translate(${point.x},${point.y})`;
            };
        });

    // 9. Вивід текстових результатів
    const resultsDiv = d3.select("#results");
    resultsDiv.html(`
        <div class="result-item">Дальність: ${maxRange.toFixed(2)} м</div>
        <div class="result-item">Висота: ${maxHeight.toFixed(2)} м</div>
        <div class="result-item">Час: ${timeFlight.toFixed(2)} с</div>
    `);
}

// Початковий запуск при завантаженні
window.onload = draw;