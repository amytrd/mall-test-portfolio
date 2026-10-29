/* ==========================================================================
   性能图表：TPS / P95 随并发变化的双折线图
   设计约束：
   - 3 条序列，颜色固定跟随实体（登录=蓝 / 商品=橙 / 订单=绿）
   - 2px 线宽、8px 标记点、标记点 2px 表面描边
   - 图例在 HTML 中，右端直接标注，颜色不是唯一识别通道
   - 悬停十字线 + tooltip；数据表在 <details> 中作为等价视图
   ========================================================================== */

(function () {
  "use strict";

  const SURFACE = "#141416";
  const INK = "#f5f5f3";
  const INK_2 = "#c3c2b7";
  const MUTED = "#898781";
  const GRID = "#2c2c30";
  const AXIS = "#3a3a3f";

  const X = [20, 50, 100, 200];

  const SERIES = [
    {
      key: "login",
      name: "登录",
      color: "#3987e5",
      tps: [136.1, 166.6, 167.2, 167.6],
      p95: [264, 393, 717, 1284],
    },
    {
      key: "product",
      name: "商品列表",
      color: "#d95926",
      tps: [753.0, 834.7, 801.9, 791.9],
      p95: [58, 75, 188, 365],
    },
    {
      key: "order",
      name: "订单查询",
      color: "#199e70",
      tps: [856.2, 829.3, 803.4, 901.0],
      p95: [26, 90, 184, 234],
    },
  ];

  const CONFIG = {
    tps: {
      metric: "tps",
      max: 1000,
      ticks: [0, 200, 400, 600, 800, 1000],
      unit: "TPS",
      decimals: 1,
      aria: "登录接口 TPS 在 167 附近触顶；商品与订单查询在 800 到 900 之间。",
    },
    p95: {
      metric: "p95",
      max: 1500,
      ticks: [0, 300, 600, 900, 1200, 1500],
      unit: "ms",
      decimals: 0,
      aria: "200 并发下登录接口 P95 为 1284 毫秒，商品 365 毫秒，订单 234 毫秒。",
    },
  };

  const W = 920;
  const H = 380;
  const PAD = { l: 62, r: 136, t: 24, b: 52 };
  const INNER_W = W - PAD.l - PAD.r;
  const INNER_H = H - PAD.t - PAD.b;

  const NS = "http://www.w3.org/2000/svg";

  function el(name, attrs) {
    const node = document.createElementNS(NS, name);
    if (attrs) {
      for (const key in attrs) node.setAttribute(key, attrs[key]);
    }
    return node;
  }

  function xAt(i) {
    return PAD.l + (INNER_W / (X.length - 1)) * i;
  }

  function yAt(value, max) {
    return PAD.t + INNER_H - (value / max) * INNER_H;
  }

  function fmt(value, decimals) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function buildChart(container, config) {
    const max = config.max;

    container.innerHTML = "";
    container.setAttribute("role", "img");
    container.setAttribute("aria-label", config.aria);

    const svg = el("svg", {
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: "xMidYMid meet",
      "aria-hidden": "true",
      focusable: "false",
    });

    /* ---- y 网格与刻度（recessive） ---- */
    config.ticks.forEach(function (tick) {
      const y = yAt(tick, max);
      svg.appendChild(
        el("line", {
          x1: PAD.l,
          x2: PAD.l + INNER_W,
          y1: y,
          y2: y,
          stroke: tick === 0 ? AXIS : GRID,
          "stroke-width": 1,
        })
      );
      const label = el("text", {
        x: PAD.l - 14,
        y: y + 4,
        fill: MUTED,
        "font-size": 11,
        "text-anchor": "end",
        "font-family": "system-ui, -apple-system, 'Segoe UI', sans-serif",
        style: "font-variant-numeric: tabular-nums;",
      });
      label.textContent = tick === 0 ? "0" : fmt(tick, 0);
      svg.appendChild(label);
    });

    /* ---- y 轴单位 ---- */
    const unit = el("text", {
      x: PAD.l - 14,
      y: PAD.t - 8,
      fill: MUTED,
      "font-size": 10.5,
      "text-anchor": "end",
      "font-family": "'Cascadia Code', Consolas, monospace",
      "letter-spacing": "0.08em",
    });
    unit.textContent = config.unit;
    svg.appendChild(unit);

    /* ---- x 轴刻度 ---- */
    X.forEach(function (value, i) {
      const x = xAt(i);
      const label = el("text", {
        x: x,
        y: PAD.t + INNER_H + 26,
        fill: MUTED,
        "font-size": 11.5,
        "text-anchor": "middle",
        "font-family": "system-ui, -apple-system, 'Segoe UI', sans-serif",
        style: "font-variant-numeric: tabular-nums;",
      });
      label.textContent = value;
      svg.appendChild(label);
    });

    const xLabel = el("text", {
      x: PAD.l + INNER_W / 2,
      y: H - 8,
      fill: MUTED,
      "font-size": 10.5,
      "text-anchor": "middle",
      "font-family": "system-ui, -apple-system, 'Segoe UI', sans-serif",
      "letter-spacing": "0.06em",
    });
    xLabel.textContent = "并发用户数";
    svg.appendChild(xLabel);

    /* ---- 折线与标记点 ---- */
    SERIES.forEach(function (series) {
      const values = series[config.metric];
      let d = "";
      values.forEach(function (value, i) {
        d += (i === 0 ? "M" : "L") + xAt(i) + " " + yAt(value, max);
      });

      svg.appendChild(
        el("path", {
          d: d,
          fill: "none",
          stroke: series.color,
          "stroke-width": 2,
          "stroke-linejoin": "round",
          "stroke-linecap": "round",
        })
      );

      values.forEach(function (value, i) {
        svg.appendChild(
          el("circle", {
            cx: xAt(i),
            cy: yAt(value, max),
            r: 4,
            fill: series.color,
            stroke: SURFACE,
            "stroke-width": 2,
          })
        );
      });

      /* ---- 右端直接标注：彩色点 + 文本（文本保持 ink token） ---- */
      const lastIndex = values.length - 1;
      const lastValue = values[lastIndex];
      const labelX = xAt(lastIndex) + 15;
      const labelY = yAt(lastValue, max) + 4;

      svg.appendChild(
        el("circle", {
          cx: labelX,
          cy: labelY - 4,
          r: 3.5,
          fill: series.color,
        })
      );

      const nameText = el("text", {
        x: labelX + 10,
        y: labelY,
        fill: INK_2,
        "font-size": 11.5,
        "font-family": "system-ui, -apple-system, 'Segoe UI', sans-serif",
      });
      nameText.textContent = series.name + " ";
      svg.appendChild(nameText);

      const valueText = el("text", {
        x: labelX + 10 + 58,
        y: labelY,
        fill: INK,
        "font-size": 11.5,
        "font-weight": 650,
        "font-family": "'Cascadia Code', Consolas, monospace",
        style: "font-variant-numeric: tabular-nums;",
      });
      valueText.textContent = fmt(lastValue, config.decimals);
      svg.appendChild(valueText);
    });

    /* ---- 悬停层 ---- */
    const crosshair = el("line", {
      x1: 0,
      x2: 0,
      y1: PAD.t,
      y2: PAD.t + INNER_H,
      stroke: "#5a5a60",
      "stroke-width": 1,
      "stroke-dasharray": "3 4",
      opacity: 0,
    });
    svg.appendChild(crosshair);

    const hoverDots = SERIES.map(function (series) {
      const dot = el("circle", {
        r: 5,
        fill: series.color,
        stroke: SURFACE,
        "stroke-width": 2,
        opacity: 0,
      });
      svg.appendChild(dot);
      return dot;
    });

    const overlay = el("rect", {
      x: PAD.l,
      y: PAD.t,
      width: INNER_W,
      height: INNER_H,
      fill: "transparent",
      style: "cursor: crosshair;",
      tabindex: 0,
      role: "application",
      "aria-label": "使用左右方向键查看各并发档位数据",
    });
    svg.appendChild(overlay);

    container.appendChild(svg);

    /* ---- tooltip ---- */
    const tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    container.appendChild(tooltip);

    let activeIndex = -1;

    function show(index) {
      activeIndex = Math.max(0, Math.min(X.length - 1, index));
      const x = xAt(activeIndex);

      crosshair.setAttribute("x1", x);
      crosshair.setAttribute("x2", x);
      crosshair.setAttribute("opacity", 1);

      let minY = PAD.t + INNER_H;
      SERIES.forEach(function (series, i) {
        const value = series[config.metric][activeIndex];
        const y = yAt(value, max);
        minY = Math.min(minY, y);
        hoverDots[i].setAttribute("cx", x);
        hoverDots[i].setAttribute("cy", y);
        hoverDots[i].setAttribute("opacity", 1);
      });

      const rows = SERIES.map(function (series) {
        return (
          '<div class="tt-row"><span><span class="tt-dot" style="display:inline-block;background:' +
          series.color +
          '"></span>' +
          series.name +
          "</span><b>" +
          fmt(series[config.metric][activeIndex], config.decimals) +
          " " +
          config.unit +
          "</b></div>"
        );
      }).join("");

      tooltip.innerHTML =
        '<div class="tt-title">并发 ' + X[activeIndex] + "</div>" + rows;

      // 用像素定位，兼容移动端横向滚动时 SVG 与容器的宽度差。
      const svgRect = svg.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const leftPx =
        svgRect.left - containerRect.left + (x / W) * svgRect.width + container.scrollLeft;
      const topPx = svgRect.top - containerRect.top + (minY / H) * svgRect.height;
      const minLeft = 88;
      const maxLeft = Math.max(minLeft, container.clientWidth - 88);
      tooltip.style.left = Math.max(minLeft, Math.min(maxLeft, leftPx)) + "px";
      tooltip.style.top = Math.max(42, topPx) + "px";
      tooltip.classList.add("on");
      tooltip.setAttribute("aria-hidden", "false");
    }

    function hide() {
      activeIndex = -1;
      crosshair.setAttribute("opacity", 0);
      hoverDots.forEach(function (dot) {
        dot.setAttribute("opacity", 0);
      });
      tooltip.classList.remove("on");
      tooltip.setAttribute("aria-hidden", "true");
    }

    function nearestIndex(clientX) {
      const rect = svg.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * W;
      let best = 0;
      let bestDistance = Infinity;
      for (let i = 0; i < X.length; i += 1) {
        const distance = Math.abs(xAt(i) - px);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }
      return best;
    }

    overlay.addEventListener("pointermove", function (event) {
      show(nearestIndex(event.clientX));
    });
    overlay.addEventListener("pointerleave", hide);

    overlay.addEventListener("focus", function () {
      show(activeIndex < 0 ? 0 : activeIndex);
    });
    overlay.addEventListener("blur", hide);
    overlay.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        show(activeIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(activeIndex - 1);
      } else if (event.key === "Escape") {
        hide();
      }
    });
  }

  function init() {
    const tps = document.getElementById("chart-tps");
    const p95 = document.getElementById("chart-p95");
    if (tps) buildChart(tps, CONFIG.tps);
    if (p95) buildChart(p95, CONFIG.p95);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
