let allData = [];

function build() {

    let x0 = +document.getElementById("x0").value;
    let y0 = +document.getElementById("y0").value;
    let v0 = +document.getElementById("v0").value;
    let angle = +document.getElementById("angle").value * Math.PI / 180;
    let a = +document.getElementById("a").value;
    let tMax = +document.getElementById("tmax").value;
    let color = document.getElementById("color").value;

    let dt = 0.1;
    let data = [];

    for (let t = -tMax; t <= tMax; t += dt) {

        let vx = v0 * Math.cos(angle);
        let vy = v0 * Math.sin(angle);

        let x = x0 + vx * t + (a * t * t) / 2;
        let y = y0 + vy * t + (a * t * t) / 2;

        data.push({ x, y });
    }

    allData.push({ data, color });
    drawAll();
}

function drawAll() {

    d3.select("#chart").html("");

    let width = 700;
    let height = 500;
    let margin = 50;

    let svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    let flatData = allData.flatMap(d => d.data);

    let xExtent = d3.extent(flatData, d => d.x);
    let yExtent = d3.extent(flatData, d => d.y);

    // щоб 0 завжди був
    xExtent[0] = Math.min(xExtent[0], 0);
    xExtent[1] = Math.max(xExtent[1], 0);
    yExtent[0] = Math.min(yExtent[0], 0);
    yExtent[1] = Math.max(yExtent[1], 0);

    let xScale = d3.scaleLinear()
        .domain(xExtent)
        .range([margin, width - margin]);

    let yScale = d3.scaleLinear()
        .domain(yExtent)
        .range([height - margin, margin]);

    // 🔥 ХРЕСТ (ось X і Y)
    svg.append("line")
        .attr("x1", margin)
        .attr("x2", width - margin)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "black")
        .attr("stroke-width", 2);

    svg.append("line")
        .attr("y1", margin)
        .attr("y2", height - margin)
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("stroke", "black")
        .attr("stroke-width", 2);

    let line = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));

    allData.forEach(obj => {

        let path = svg.append("path")
            .datum(obj.data)
            .attr("fill", "none")
            .attr("stroke", obj.color)
            .attr("stroke-width", 2)
            .attr("d", line);

        // плавна анімація
        let length = path.node().getTotalLength();

        path
            .attr("stroke-dasharray", length)
            .attr("stroke-dashoffset", length)
            .transition()
            .duration(1200)
            .attr("stroke-dashoffset", 0);
    });
}

function clearChart() {
    allData = [];
    d3.select("#chart").html("");
}