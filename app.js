(() => {
  // src/util.js
  var $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  var EARTH = 63710088e-1;
  var rad = (d) => d * Math.PI / 180;
  var deg = (r) => r * 180 / Math.PI;
  function hav(a, b) {
    const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function bearing(a, b) {
    const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1])), x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }
  var angDiff = (a, b) => (a - b + 540) % 360 - 180;
  var normDeg = (a) => (a % 360 + 360) % 360;
  function fmtDist(m) {
    if (!isFinite(m)) return "\u2014";
    if (m < 1e3) {
      const r = m < 100 ? Math.round(m / 5) * 5 : Math.round(m / 10) * 10;
      return r + " \u0645";
    }
    const k = m / 1e3;
    return (k < 10 ? k.toFixed(1) : Math.round(k)) + " \u0643\u0645";
  }
  function fmtTime(s) {
    if (!isFinite(s)) return "\u2014";
    const m = Math.round(s / 60);
    if (m < 1) return "\u0623\u0642\u0644 \u0645\u0646 \u062F\u0642\u064A\u0642\u0629";
    if (m < 60) return m + " \u062F";
    const h2 = Math.floor(m / 60);
    return h2 + " \u0633" + (m % 60 ? " " + m % 60 + " \u062F" : "");
  }
  function clock(sec) {
    const d = new Date(Date.now() + sec * 1e3);
    return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", numberingSystem: "latn" });
  }
  function store(key, def) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v && typeof v === "object" ? Object.assign({}, def, v) : def;
    } catch (e) {
      return def;
    }
  }
  function save(key, v) {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {
    }
  }
  function timeoutFetch(url, opt = {}, ms = 12e3) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return fetch(url, Object.assign({}, opt, { signal: c.signal })).finally(() => clearTimeout(t));
  }
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // src/car.js
  var body = "#1e6bff";
  var roof = "#3f86ff";
  var glass = "#9cc9f2";
  var tyre = "#16181d";
  var head = "#fff3b0";
  var tail = "#ff2d2d";
  var trim = "#0d3fa6";
  function rect(cx, cy, w, l, ch = 0) {
    const hw = w / 2, hl = l / 2, c = Math.min(ch, hw, hl);
    return [[-hw + c, -hl], [hw - c, -hl], [hw, -hl + c], [hw, hl - c], [hw - c, hl], [-hw + c, hl], [-hw, hl - c], [-hw, -hl + c]].map(([x, y]) => [x + cx, y + cy]);
  }
  var PARTS = [
    [rect(0, 0, 1.86, 4.5, 0.55), 0.32, 0.88, body],
    [rect(0, 0.05, 1.9, 0.5, 0.2), 0.5, 0.7, trim],
    /* belt trim */
    [rect(0, -0.2, 1.64, 2.15, 0.45), 0.88, 1.36, glass],
    /* cabin glass */
    [rect(0, -0.25, 1.52, 1.25, 0.4), 1.36, 1.46, roof],
    /* roof */
    [rect(0, 1.55, 1.5, 1.1, 0.3), 0.88, 0.93, body],
    /* bonnet */
    [rect(-0.93, 1.4, 0.3, 0.74, 0.1), 0, 0.62, tyre],
    [rect(0.93, 1.4, 0.3, 0.74, 0.1), 0, 0.62, tyre],
    [rect(-0.93, -1.4, 0.3, 0.74, 0.1), 0, 0.62, tyre],
    [rect(0.93, -1.4, 0.3, 0.74, 0.1), 0, 0.62, tyre],
    [rect(-0.6, 2.22, 0.42, 0.1), 0.52, 0.72, head],
    [rect(0.6, 2.22, 0.42, 0.1), 0.52, 0.72, head],
    [rect(-0.62, -2.22, 0.44, 0.1), 0.56, 0.76, tail],
    [rect(0.62, -2.22, 0.44, 0.1), 0.56, 0.76, tail]
  ];
  var SHADOW = rect(0, 0, 2.35, 5, 0.9);
  function place(poly, lng, lat, hdg, s) {
    const th = rad(hdg), c = Math.cos(th), sn = Math.sin(th), mLat = 111320, mLng = 111320 * Math.cos(rad(lat));
    const ring = poly.map(([x, y]) => {
      x *= s;
      y *= s;
      const e = x * c + y * sn, n = -x * sn + y * c;
      return [lng + e / mLng, lat + n / mLat];
    });
    ring.push(ring[0]);
    return ring;
  }
  function carData(lng, lat, hdg, s) {
    const features = PARTS.map(([p, b, t, col]) => ({ type: "Feature", properties: { b: b * s, h: t * s, c: col }, geometry: { type: "Polygon", coordinates: [place(p, lng, lat, hdg, s)] } }));
    const shadow = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [place(SHADOW, lng, lat, hdg, s)] } }] };
    return { car: { type: "FeatureCollection", features }, shadow, halo: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } }] } };
  }
  var carScale = (z) => Math.min(60, Math.max(2.2, 2.2 * Math.pow(2, 17.6 - z)));
  function addCarLayers(map2) {
    for (const id of ["car-shadow", "car-halo", "car-body"]) if (map2.getLayer(id)) map2.removeLayer(id);
    for (const id of ["car", "car-shadow", "car-halo"]) if (map2.getSource(id)) map2.removeSource(id);
    const E = { type: "FeatureCollection", features: [] };
    map2.addSource("car-halo", { type: "geojson", data: E });
    map2.addSource("car-shadow", { type: "geojson", data: E });
    map2.addSource("car", { type: "geojson", data: E });
    map2.addLayer({ id: "car-halo", type: "circle", source: "car-halo", paint: { "circle-radius": 26, "circle-color": "#2d8cff", "circle-opacity": 0.18, "circle-stroke-width": 2, "circle-stroke-color": "#2d8cff", "circle-stroke-opacity": 0.55, "circle-pitch-alignment": "map" } });
    map2.addLayer({ id: "car-shadow", type: "fill-extrusion", source: "car-shadow", paint: { "fill-extrusion-color": "#000", "fill-extrusion-opacity": 0.28, "fill-extrusion-height": 0.05, "fill-extrusion-base": 0 } });
    map2.addLayer({ id: "car-body", type: "fill-extrusion", source: "car", paint: { "fill-extrusion-color": ["get", "c"], "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": ["get", "b"], "fill-extrusion-opacity": 1, "fill-extrusion-vertical-gradient": true } });
  }

  // src/nav.js
  var MOD = { left: "\u064A\u0633\u0627\u0631\u0627\u064B", right: "\u064A\u0645\u064A\u0646\u0627\u064B", "slight left": "\u0642\u0644\u064A\u0644\u0627\u064B \u064A\u0633\u0627\u0631\u0627\u064B", "slight right": "\u0642\u0644\u064A\u0644\u0627\u064B \u064A\u0645\u064A\u0646\u0627\u064B", "sharp left": "\u0628\u062D\u062F\u0629 \u064A\u0633\u0627\u0631\u0627\u064B", "sharp right": "\u0628\u062D\u062F\u0629 \u064A\u0645\u064A\u0646\u0627\u064B", straight: "", uturn: "" };
  function icoOf(type, mod) {
    if (type === "arrive") return "i-flag";
    if (type === "depart") return "i-depart";
    if (type === "roundabout" || type === "rotary" || type === "roundabout turn" || type === "exit roundabout" || type === "exit rotary") return "i-round";
    if (mod === "uturn") return "i-uturn";
    if (mod === "left" || mod === "sharp left") return "i-left";
    if (mod === "right" || mod === "sharp right") return "i-right";
    if (mod === "slight left") return "i-slleft";
    if (mod === "slight right") return "i-slright";
    return "i-straight";
  }
  function actionText(st) {
    const t = st.type, m = st.modifier, nm = st.name ? " \u0625\u0644\u0649 " + st.name : "";
    switch (t) {
      case "arrive":
        return "\u0633\u062A\u0635\u0644 \u0625\u0644\u0649 \u0648\u062C\u0647\u062A\u0643" + (m === "left" ? "\u060C \u0648\u0647\u064A \u0639\u0644\u0649 \u064A\u0633\u0627\u0631\u0643" : m === "right" ? "\u060C \u0648\u0647\u064A \u0639\u0644\u0649 \u064A\u0645\u064A\u0646\u0643" : "");
      case "depart":
        return "\u0627\u0646\u0637\u0644\u0642" + nm;
      case "roundabout":
      case "rotary":
      case "roundabout turn":
        return "\u0627\u062F\u062E\u0644 \u0627\u0644\u062F\u0648\u0627\u0631" + (st.exit ? ` \u0648\u062E\u0630 \u0627\u0644\u0645\u062E\u0631\u062C \u0631\u0642\u0645 ${st.exit}` : "") + nm;
      case "exit roundabout":
      case "exit rotary":
        return "\u0627\u062E\u0631\u062C \u0645\u0646 \u0627\u0644\u062F\u0648\u0627\u0631" + nm;
      case "merge":
        return "\u0627\u0646\u062F\u0645\u062C" + (m && MOD[m] ? " " + MOD[m] : "") + nm;
      case "on ramp":
        return "\u0627\u0633\u0644\u0643 \u0627\u0644\u0645\u0646\u062D\u062F\u0631" + (m && MOD[m] ? " " + MOD[m] : "");
      case "off ramp":
        return "\u0627\u062E\u0631\u062C \u0645\u0646 \u0627\u0644\u0645\u062E\u0631\u062C" + (m && MOD[m] ? " " + MOD[m] : "");
      case "fork":
        return m && m.includes("left") ? "\u062E\u0630 \u0627\u0644\u062A\u0641\u0631\u0639 \u0627\u0644\u0623\u064A\u0633\u0631" : m && m.includes("right") ? "\u062E\u0630 \u0627\u0644\u062A\u0641\u0631\u0639 \u0627\u0644\u0623\u064A\u0645\u0646" : "\u062A\u0627\u0628\u0639 \u0639\u0646\u062F \u0627\u0644\u062A\u0641\u0631\u0639";
      case "end of road":
        return "\u0639\u0646\u062F \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u0637\u0631\u064A\u0642 " + (m === "left" ? "\u0627\u062A\u062C\u0647 \u064A\u0633\u0627\u0631\u0627\u064B" : m === "right" ? "\u0627\u062A\u062C\u0647 \u064A\u0645\u064A\u0646\u0627\u064B" : "\u062A\u0627\u0628\u0639") + nm;
    }
    if (m === "uturn") return "\u0627\u0633\u062A\u062F\u0631 \u0644\u0644\u062E\u0644\u0641";
    if (m === "left") return "\u0627\u062A\u062C\u0647 \u064A\u0633\u0627\u0631\u0627\u064B" + nm;
    if (m === "right") return "\u0627\u062A\u062C\u0647 \u064A\u0645\u064A\u0646\u0627\u064B" + nm;
    if (m === "slight left") return "\u0627\u0646\u062D\u0631\u0641 \u0642\u0644\u064A\u0644\u0627\u064B \u064A\u0633\u0627\u0631\u0627\u064B" + nm;
    if (m === "slight right") return "\u0627\u0646\u062D\u0631\u0641 \u0642\u0644\u064A\u0644\u0627\u064B \u064A\u0645\u064A\u0646\u0627\u064B" + nm;
    if (m === "sharp left") return "\u0627\u0646\u0639\u0637\u0641 \u0628\u062D\u062F\u0629 \u064A\u0633\u0627\u0631\u0627\u064B" + nm;
    if (m === "sharp right") return "\u0627\u0646\u0639\u0637\u0641 \u0628\u062D\u062F\u0629 \u064A\u0645\u064A\u0646\u0627\u064B" + nm;
    return "\u062A\u0627\u0628\u0639 \u0644\u0644\u0623\u0645\u0627\u0645" + nm;
  }
  function spokenDist(m) {
    if (m >= 1e3) {
      const k = Math.round(m / 100) / 10;
      return k === 1 ? "\u0643\u064A\u0644\u0648\u0645\u062A\u0631" : k + " \u0643\u064A\u0644\u0648\u0645\u062A\u0631";
    }
    return Math.round(m / 10) * 10 + " \u0645\u062A\u0631";
  }
  function parseOSRM(json) {
    if (!json || !json.routes || !json.routes.length) throw new Error("no_route");
    const r = json.routes[0], coords = r.geometry.coordinates;
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav(coords[i - 1], coords[i]));
    const steps = [];
    let acc = 0;
    for (const leg of r.legs || []) for (const s of leg.steps || []) {
      const mn = s.maneuver || {};
      steps.push({ type: mn.type || "turn", modifier: mn.modifier || "", exit: mn.exit, name: s.name || "", dist: s.distance || 0, dur: s.duration || 0, loc: mn.location, startAlong: acc });
      acc += s.distance || 0;
    }
    const total = cum[cum.length - 1] || r.distance;
    if (acc > 0 && Math.abs(acc - total) > 1) {
      const k = total / acc;
      for (const s of steps) {
        s.startAlong *= k;
        s.dist *= k;
      }
    }
    return { coords, cum, dist: r.distance, dur: r.duration, steps, total };
  }
  var Navigator = class {
    constructor(cb) {
      this.cb = cb || {};
      this.route = null;
      this.active = false;
      this.reset();
    }
    reset() {
      this.idx = 0;
      this.along = 0;
      this.off = 0;
      this.offN = 0;
      this.cur = 0;
      this.spoken = /* @__PURE__ */ new Set();
      this.arrived = false;
      this.lastFix = null;
      this.said = "";
    }
    setRoute(r) {
      this.route = r;
      this.reset();
    }
    start(speakIntro = true) {
      if (!this.route) return;
      this.active = true;
      this.reset();
      const nx = this.route.steps[1];
      if (speakIntro && nx) {
        const d = nx.startAlong;
        this.speak("\u0628\u062F\u0623 \u0627\u0644\u062A\u0648\u062C\u064A\u0647. " + (d >= 500 ? `\u0628\u0639\u062F ${spokenDist(d)} ${actionText(nx)}` : actionText(nx)));
        for (const t of [500, 200, 100, 30]) if (d <= t) this.spoken.add(`1:${t}`);
      }
    }
    stop() {
      this.active = false;
    }
    speak(t) {
      this.said = t;
      this.cb.speak && this.cb.speak(t);
    }
    /* nearest point on polyline; windowed search around last index, full search when lost */
    project(p, full) {
      const c = this.route.coords, cum = this.route.cum;
      const lat0 = rad(p[1]), kx = Math.cos(lat0) * EARTH * Math.PI / 180, ky = EARTH * Math.PI / 180;
      const lo = full ? 0 : Math.max(0, this.idx - 3), hi = full ? c.length - 2 : Math.min(c.length - 2, this.idx + 80);
      let best = 1e12, bi = 0, bt = 0;
      for (let i = lo; i <= hi; i++) {
        const ax = (c[i][0] - p[0]) * kx, ay = (c[i][1] - p[1]) * ky, bx = (c[i + 1][0] - p[0]) * kx, by = (c[i + 1][1] - p[1]) * ky;
        const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
        let t = L2 > 0 ? -(ax * dx + ay * dy) / L2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + dx * t, py = ay + dy * t, d = px * px + py * py;
        if (d < best) {
          best = d;
          bi = i;
          bt = t;
        }
      }
      const seg = cum[bi + 1] - cum[bi];
      return { idx: bi, dist: Math.sqrt(best), along: cum[bi] + seg * bt };
    }
    update(pos, speed) {
      if (!this.route || !this.active || this.arrived) return null;
      let pr = this.project(pos, false);
      if (pr.dist > 150) pr = this.project(pos, true);
      this.idx = pr.idx;
      this.along = pr.along;
      this.off = pr.dist;
      this.offN = pr.dist > 60 ? this.offN + 1 : 0;
      const S = this.route.steps;
      while (this.cur + 1 < S.length - 1 && S[this.cur + 1].startAlong - this.along < 10) this.cur++;
      const next = S[this.cur + 1] || S[S.length - 1];
      const dNext = Math.max(0, next.startAlong - this.along);
      const rem = Math.max(0, this.route.total - this.along);
      const ratio = this.route.total > 0 ? rem / this.route.total : 0;
      const remTime = this.route.dur * ratio;
      const key = this.cur + 1;
      const TH = [500, 200, 100, 30];
      for (const t of TH) {
        if (dNext <= t && !this.spoken.has(`${key}:${t}`)) {
          for (const u of TH) if (u >= t) this.spoken.add(`${key}:${u}`);
          if (t >= 100) this.speak(`\u0628\u0639\u062F ${t} \u0645\u062A\u0631 ${actionText(next)}`);
          else this.speak(next.type === "arrive" ? "\u0633\u062A\u0635\u0644 \u0625\u0644\u0649 \u0648\u062C\u0647\u062A\u0643 \u0627\u0644\u0622\u0646" : `${actionText(next)} \u0627\u0644\u0622\u0646`);
          break;
        }
      }
      const arrived = rem < 25 || next.type === "arrive" && dNext < 12;
      if (arrived && !this.arrived) {
        this.arrived = true;
        this.speak("\u0644\u0642\u062F \u0648\u0635\u0644\u062A \u0625\u0644\u0649 \u0648\u062C\u0647\u062A\u0643");
        this.cb.arrive && this.cb.arrive();
      }
      const st = { along: this.along, off: pr.dist, next, dNext, rem, remTime, cur: this.cur, ico: icoOf(next.type, next.modifier), text: actionText(next), offRoute: this.offN >= 3 };
      return st;
    }
  };

  // src/poi.js
  var CATS = {
    mosque: { label: "\u0645\u0633\u062C\u062F", plural: "\u0627\u0644\u0645\u0633\u0627\u062C\u062F", ico: "i-mosque", color: "#10b981", q: ['nwr["amenity"="place_of_worship"]["religion"="muslim"]'] },
    fuel: { label: "\u0645\u062D\u0637\u0629 \u0648\u0642\u0648\u062F", plural: "\u0645\u062D\u0637\u0627\u062A \u0627\u0644\u0648\u0642\u0648\u062F", ico: "i-fuel", color: "#f59e0b", q: ['nwr["amenity"="fuel"]'] },
    food: { label: "\u0645\u0642\u0647\u0649 / \u0645\u0637\u0639\u0645", plural: "\u0627\u0644\u0645\u0642\u0627\u0647\u064A \u0648\u0627\u0644\u0645\u0637\u0627\u0639\u0645", ico: "i-cup", color: "#f97316", q: ['nwr["amenity"~"^(cafe|restaurant|fast_food)$"]'] },
    shop: { label: "\u0645\u062A\u062C\u0631", plural: "\u0627\u0644\u0645\u062A\u0627\u062C\u0631 \u0648\u0627\u0644\u0633\u0648\u0628\u0631\u0645\u0627\u0631\u0643\u062A", ico: "i-cart", color: "#8b5cf6", q: ['nwr["shop"~"^(supermarket|convenience|mall|department_store|greengrocer|bakery)$"]'] },
    public: { label: "\u062E\u062F\u0645\u0629 \u0639\u0627\u0645\u0629", plural: "\u0627\u0644\u0645\u0628\u0627\u0646\u064A \u0648\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629", ico: "i-building", color: "#0ea5e9", q: ['nwr["amenity"~"^(hospital|clinic|pharmacy|police|townhall|post_office|bank|fire_station|library|university)$"]', 'nwr["office"="government"]'] }
  };
  var MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
  var SUB = { hospital: "\u0645\u0633\u062A\u0634\u0641\u0649", clinic: "\u0639\u064A\u0627\u062F\u0629", pharmacy: "\u0635\u064A\u062F\u0644\u064A\u0629", police: "\u0634\u0631\u0637\u0629", townhall: "\u0628\u0644\u062F\u064A\u0629", post_office: "\u0628\u0631\u064A\u062F", bank: "\u0645\u0635\u0631\u0641", fire_station: "\u0625\u0637\u0641\u0627\u0621", library: "\u0645\u0643\u062A\u0628\u0629", university: "\u062C\u0627\u0645\u0639\u0629", cafe: "\u0645\u0642\u0647\u0649", restaurant: "\u0645\u0637\u0639\u0645", fast_food: "\u0648\u062C\u0628\u0627\u062A \u0633\u0631\u064A\u0639\u0629", supermarket: "\u0633\u0648\u0628\u0631\u0645\u0627\u0631\u0643\u062A", convenience: "\u0628\u0642\u0627\u0644\u0629", mall: "\u0645\u0631\u0643\u0632 \u062A\u0633\u0648\u0642", department_store: "\u0645\u062A\u062C\u0631 \u0643\u0628\u064A\u0631", greengrocer: "\u062E\u0636\u0627\u0631 \u0648\u0641\u0648\u0627\u0643\u0647", bakery: "\u0645\u062E\u0628\u0632" };
  function buildQuery(cat, lat, lng, r) {
    const around = `(around:${r},${lat.toFixed(5)},${lng.toFixed(5)})`;
    return `[out:json][timeout:20];(${CATS[cat].q.map((f) => f + around + ";").join("")});out center 80;`;
  }
  function parseElements(json, cat, origin2, limit = 10) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const e of json && json.elements || []) {
      const lat = e.lat !== void 0 ? e.lat : e.center && e.center.lat, lon = e.lon !== void 0 ? e.lon : e.center && e.center.lon;
      if (lat === void 0 || lon === void 0) continue;
      const t = e.tags || {};
      const sub = SUB[t.amenity] || SUB[t.shop] || "";
      const name = t["name:ar"] || t.name || t["name:en"] || t.brand || (sub ? sub : CATS[cat].label);
      const k = name + "|" + lat.toFixed(4) + "|" + lon.toFixed(4);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ id: e.type + e.id, name, sub: sub || CATS[cat].label, cat, lat, lng: lon, dist: hav(origin2, [lon, lat]), tags: t });
    }
    out.sort((a, b) => a.dist - b.dist);
    return out.slice(0, limit);
  }
  var cache = /* @__PURE__ */ new Map();
  async function fetchPOI(cat, origin2, radius = 2e3) {
    const key = cat + "|" + origin2[0].toFixed(3) + "|" + origin2[1].toFixed(3) + "|" + radius;
    const c = cache.get(key);
    if (c && Date.now() - c.t < 3e5) return c.v;
    const body2 = "data=" + encodeURIComponent(buildQuery(cat, origin2[1], origin2[0], radius));
    let lastErr = null;
    for (const url of MIRRORS) {
      try {
        const r = await timeoutFetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body2 }, 16e3);
        if (!r.ok) throw new Error("http " + r.status);
        const j = await r.json();
        const v = parseElements(j, cat, origin2, 10);
        cache.set(key, { t: Date.now(), v });
        return v;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("overpass");
  }
  function circlePoly(lng, lat, rm, n = 14) {
    const ring = [];
    const mLat = 111320, mLng = 111320 * Math.cos(lat * Math.PI / 180);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      ring.push([lng + Math.cos(a) * rm / mLng, lat + Math.sin(a) * rm / mLat]);
    }
    ring.push(ring[0]);
    return ring;
  }

  // src/qr.js
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 256) x ^= 285;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  var mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  function rsGen(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const ng = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        ng[j] ^= g[j];
        ng[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = ng;
    }
    return g;
  }
  function rsEc(data, n) {
    const g = rsGen(n), r = new Array(n).fill(0);
    for (const d of data) {
      const f = d ^ r[0];
      r.shift();
      r.push(0);
      if (f) for (let i = 0; i < n; i++) r[i] ^= mul(g[i + 1], f);
    }
    return r;
  }
  var VT = [null, [26, 10, [[1, 16]]], [44, 16, [[1, 28]]], [70, 26, [[1, 44]]], [100, 18, [[2, 32]]], [134, 24, [[2, 43]]], [172, 16, [[4, 27]]], [196, 18, [[4, 31]]], [242, 22, [[2, 38], [2, 39]]], [292, 22, [[3, 36], [2, 37]]], [346, 26, [[4, 43], [1, 44]]]];
  var AL = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  var dataCw = (v) => VT[v][2].reduce((s, [n, c]) => s + n * c, 0);
  var MASKS = [(r, c) => (r + c) % 2 === 0, (r, c) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => r * c % 2 + r * c % 3 === 0, (r, c) => (r * c % 2 + r * c % 3) % 2 === 0, (r, c) => ((r + c) % 2 + r * c % 3) % 2 === 0];
  function qrMatrix(text, force, minV) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let v = minV || 1;
    while (v <= 10 && Math.floor((dataCw(v) * 8 - 4 - (v < 10 ? 8 : 16)) / 8) < bytes.length) v++;
    if (v > 10) throw new Error("qr: text too long");
    const bits = [];
    const put = (val, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push(val >> i & 1);
    };
    put(4, 4);
    put(bytes.length, v < 10 ? 8 : 16);
    for (const b of bytes) put(b, 8);
    const cap = dataCw(v) * 8;
    put(0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    const cw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = b << 1 | bits[i + j];
      cw.push(b);
    }
    for (let p = 0; cw.length < dataCw(v); p ^= 1) cw.push(p ? 17 : 236);
    const [, ecLen, groups] = VT[v];
    const blocks = [];
    let o = 0;
    for (const [n, c] of groups) for (let i = 0; i < n; i++) {
      const d = cw.slice(o, o + c);
      o += c;
      blocks.push({ d, e: rsEc(d, ecLen) });
    }
    const out = [];
    const maxD = Math.max(...blocks.map((b) => b.d.length));
    for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
    for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.e[i]);
    const stream = [];
    for (const c of out) for (let i = 7; i >= 0; i--) stream.push(c >> i & 1);
    const size = 17 + 4 * v;
    const mk = () => Array.from({ length: size }, () => new Array(size).fill(0));
    const base = mk(), fn = mk();
    const setF = (x, y, dark) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      base[y][x] = dark ? 1 : 0;
      fn[y][x] = 1;
    };
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setF(cx + dx, cy + dy, d !== 2 && d !== 4);
      }
    };
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    for (let i = 0; i < size; i++) {
      if (!fn[6][i]) setF(i, 6, i % 2 === 0);
      if (!fn[i][6]) setF(6, i, i % 2 === 0);
    }
    const al = AL[v];
    for (const cy of al) for (const cx of al) {
      if (cx === 6 && cy === 6 || cx === 6 && cy === al[al.length - 1] || cy === 6 && cx === al[al.length - 1]) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        setF(8, i, 0);
        setF(i, 8, 0);
      }
    }
    for (let i = 0; i < 8; i++) {
      setF(size - 1 - i, 8, 0);
      setF(8, size - 1 - i, 0);
    }
    if (v >= 7) for (let i = 0; i < 18; i++) {
      const a = size - 11 + i % 3, b = Math.floor(i / 3);
      setF(a, b, 0);
      setF(b, a, 0);
    }
    setF(8, size - 8, 1);
    const data = mk(), isData = mk();
    let bi = 0, up = true;
    for (let c = size - 1; c > 0; c -= 2) {
      if (c === 6) c = 5;
      for (let k = 0; k < size; k++) {
        const r = up ? size - 1 - k : k;
        for (let d = 0; d < 2; d++) {
          const cc = c - d;
          if (!fn[r][cc]) {
            data[r][cc] = bi < stream.length ? stream[bi] : 0;
            bi++;
            isData[r][cc] = 1;
          }
        }
      }
      up = !up;
    }
    const bit = (n, i) => n >> i & 1;
    const build = (mask) => {
      const m = base.map((r) => r.slice());
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (isData[r][c]) m[r][c] = data[r][c] ^ (MASKS[mask](r, c) ? 1 : 0);
      const f = mask;
      let rem = f;
      for (let i = 0; i < 10; i++) rem = rem << 1 ^ (rem >> 9) * 1335;
      const bitsF = (f << 10 | rem) ^ 21522;
      const S = (x, y, d) => {
        m[y][x] = d ? 1 : 0;
      };
      for (let i = 0; i <= 5; i++) S(8, i, bit(bitsF, i));
      S(8, 7, bit(bitsF, 6));
      S(8, 8, bit(bitsF, 7));
      S(7, 8, bit(bitsF, 8));
      for (let i = 9; i < 15; i++) S(14 - i, 8, bit(bitsF, i));
      for (let i = 0; i < 8; i++) S(size - 1 - i, 8, bit(bitsF, i));
      for (let i = 8; i < 15; i++) S(8, size - 15 + i, bit(bitsF, i));
      S(8, size - 8, 1);
      if (v >= 7) {
        let r2 = v;
        for (let i = 0; i < 12; i++) r2 = r2 << 1 ^ (r2 >> 11) * 7973;
        const bv = v << 12 | r2;
        for (let i = 0; i < 18; i++) {
          const a = size - 11 + i % 3, b = Math.floor(i / 3);
          S(a, b, bit(bv, i));
          S(b, a, bit(bv, i));
        }
      }
      return m;
    };
    const penalty = (m) => {
      let p = 0, dark = 0;
      const line = (get) => {
        let run = 1;
        for (let i = 1; i < size; i++) {
          if (get(i) === get(i - 1)) {
            run++;
            if (run === 5) p += 3;
            else if (run > 5) p++;
          } else run = 1;
        }
        for (let i = 0; i + 10 < size; i++) {
          const w = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], w2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
          let a = true, b = true;
          for (let k2 = 0; k2 < 11; k2++) {
            const x = get(i + k2);
            if (x !== w[k2]) a = false;
            if (x !== w2[k2]) b = false;
          }
          if (a) p += 40;
          if (b) p += 40;
        }
      };
      for (let r = 0; r < size; r++) line((i) => m[r][i]);
      for (let c = 0; c < size; c++) line((i) => m[i][c]);
      for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++) {
        const x = m[r][c];
        if (x === m[r][c + 1] && x === m[r + 1][c] && x === m[r + 1][c + 1]) p += 3;
      }
      for (const row2 of m) for (const x of row2) dark += x;
      const k = Math.ceil(Math.abs(dark * 20 / (size * size) - 10)) - 1;
      p += Math.max(0, k) * 10;
      return p;
    };
    let best = null, bp = 1e9;
    if (force !== void 0) return build(force);
    for (let k = 0; k < 8; k++) {
      const m = build(k), p = penalty(m);
      if (p < bp) {
        bp = p;
        best = m;
      }
    }
    return best;
  }
  function qrCanvas(text, px) {
    const m = qrMatrix(text), n = m.length, q = 4, cell = Math.max(2, Math.floor(px / (n + q * 2)));
    const cv = document.createElement("canvas");
    cv.width = cv.height = cell * (n + q * 2);
    const g = cv.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#000";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) g.fillRect((c + q) * cell, (r + q) * cell, cell, cell);
    return cv;
  }

  // src/main.js
  var maplibregl = window.maplibregl;
  var DEF = { voice: true, buildings: true, terrain: true, style: "liberty", headingUp: true, radius: 2e3, recent: [] };
  var ST = store("mp_settings_v1", DEF);
  if (!Array.isArray(ST.recent)) ST.recent = [];
  var STYLES = { liberty: "https://tiles.openfreemap.org/styles/liberty", bright: "https://tiles.openfreemap.org/styles/bright", positron: "https://tiles.openfreemap.org/styles/positron" };
  var DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  var FALLBACK_CENTER = [13.1913, 32.8872];
  var OWN = /* @__PURE__ */ new Set(["car-body", "car-shadow", "car-halo", "route-casing", "route-line", "poi-pillar", "hills", "mp-buildings"]);
  var params = new URLSearchParams(location.search);
  var SIM_SPEED = +params.get("simspeed") || 16;
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === "class") e.className = v;
      else if (k === "on") for (const ev in v) e.addEventListener(ev, v[ev]);
      else if (k === "style") e.style.cssText = v;
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  var svg = (id, cls) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "ic " + (cls || ""));
    const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#" + id);
    s.append(u);
    return s;
  };
  var N = {};
  for (const e of document.querySelectorAll("[id]")) N[e.id] = e;
  function toast(t, ms = 3200) {
    N.toast.textContent = t;
    N.toast.classList.remove("hide");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => N.toast.classList.add("hide"), ms);
  }
  var debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  var me = { has: false, lng: 0, lat: 0, hdg: 0, speed: 0, acc: 0 };
  var vis = { lng: 0, lat: 0, hdg: 0 };
  var map = null;
  var follow = false;
  var northOnly = false;
  var dest = null;
  var route = null;
  var destMarker = null;
  var poiState = null;
  var poiMarkers = [];
  var selPOI = null;
  var navActive = false;
  var simOn = false;
  var simTimer = null;
  var watchId = null;
  var compassHeading = null;
  var lastFixT = 0;
  var lastReroute = 0;
  var wakeLock = null;
  var deferredInstall = null;
  var nav = new Navigator({ speak: (t) => speak(t), arrive: () => onArrive() });
  var lastPos = (() => {
    try {
      return JSON.parse(localStorage.getItem("mp_last"));
    } catch (e) {
      return null;
    }
  })();
  function fallbackStyle() {
    return { version: 8, name: "offline", sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#dfe7ef" } }] };
  }
  function enhanceStyle(j) {
    try {
      const vs = Object.keys(j.sources || {}).find((k) => j.sources[k].type === "vector");
      const ext = (j.layers || []).filter((l) => l.type === "fill-extrusion");
      if (ext.length) {
        for (const l of ext) {
          l.layout = l.layout || {};
          l.layout.visibility = ST.buildings ? "visible" : "none";
          l.minzoom = Math.min(l.minzoom || 15, 14.5);
        }
      } else if (vs) {
        const i = j.layers.findIndex((l) => l.type === "symbol");
        const L = {
          id: "mp-buildings",
          type: "fill-extrusion",
          source: vs,
          "source-layer": "building",
          minzoom: 14,
          layout: { visibility: ST.buildings ? "visible" : "none" },
          paint: { "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 5], 0, "#e6e1d8", 40, "#d3d8e2", 150, "#b9c4dc"], "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.92 }
        };
        j.layers.splice(i < 0 ? j.layers.length : i, 0, L);
      }
    } catch (e) {
    }
    return j;
  }
  async function loadStyle(name) {
    try {
      const r = await timeoutFetch(STYLES[name] || STYLES.liberty, {}, 8e3);
      if (!r.ok) throw new Error("style");
      return enhanceStyle(await r.json());
    } catch (e) {
      setStatus("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u2014 \u064A\u0639\u0645\u0644 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u062D\u062F\u0648\u062F");
      return fallbackStyle();
    }
  }
  var firstSymbol = () => {
    const l = map.getStyle().layers.find((l2) => l2.type === "symbol");
    return l && l.id;
  };
  function setupLayers() {
    const E = { type: "FeatureCollection", features: [] };
    try {
      if (ST.terrain) {
        if (!map.getSource("dem")) map.addSource("dem", { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain \xA9 Mapzen / AWS" });
        if (!map.getLayer("hills")) map.addLayer({ id: "hills", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.3, "hillshade-shadow-color": "#5a6a7c", "hillshade-highlight-color": "#ffffff" } }, firstSymbol() || void 0);
        map.setTerrain({ source: "dem", exaggeration: 1.15 });
      } else {
        map.setTerrain(null);
      }
    } catch (e) {
      console.warn("terrain", e);
    }
    for (const id of ["route-line", "route-casing", "poi-pillar"]) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of ["route", "poi"]) if (map.getSource(id)) map.removeSource(id);
    map.addSource("route", { type: "geojson", data: E });
    map.addSource("poi", { type: "geojson", data: E });
    map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 18, 16], "line-opacity": 0.95 } });
    map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#1a73e8", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 18, 10] } });
    map.addLayer({ id: "poi-pillar", type: "fill-extrusion", source: "poi", paint: { "fill-extrusion-color": ["get", "c"], "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.9 } });
    addCarLayers(map);
    pushRoute();
    pushPOI();
    drawCar(true);
  }
  function pushRoute() {
    const s = map && map.getSource("route");
    if (!s) return;
    s.setData(route ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.coords } } : { type: "FeatureCollection", features: [] });
  }
  function pushPOI() {
    const s = map && map.getSource("poi");
    if (!s) return;
    s.setData({ type: "FeatureCollection", features: poiState ? poiState.list.map((p) => ({ type: "Feature", properties: { c: CATS[p.cat].color, h: 34 }, geometry: { type: "Polygon", coordinates: [circlePoly(p.lng, p.lat, 7)] } })) : [] });
  }
  var lastDraw = 0;
  var lastZ = -1;
  var camB = 0;
  function drawCar(force) {
    if (!map || !me.has || !map.getSource("car")) return;
    const z = map.getZoom(), d = carData(vis.lng, vis.lat, vis.hdg, carScale(z));
    map.getSource("car").setData(d.car);
    map.getSource("car-shadow").setData(d.shadow);
    map.getSource("car-halo").setData(d.halo);
    lastZ = z;
  }
  function loop(t) {
    requestAnimationFrame(loop);
    if (!map || !me.has) return;
    const dt = Math.min(0.1, (t - (loop.t || t)) / 1e3);
    loop.t = t;
    const k = 1 - Math.exp(-dt * 7), kh = 1 - Math.exp(-dt * 9);
    vis.lng += (me.lng - vis.lng) * k;
    vis.lat += (me.lat - vis.lat) * k;
    vis.hdg = normDeg(vis.hdg + angDiff(me.hdg, vis.hdg) * kh);
    if (t - lastDraw < 33) return;
    lastDraw = t;
    drawCar();
    if (follow) {
      const useHeading = navActive || !northOnly && ST.headingUp && me.speed > 0.8;
      if (useHeading) camB = normDeg(camB + angDiff(vis.hdg, camB) * 0.18);
      else camB = map.getBearing();
      map.jumpTo({ center: [vis.lng, vis.lat], bearing: useHeading ? camB : map.getBearing(), padding: { top: navActive ? Math.round(innerHeight * 0.38) : 0, bottom: 0, left: 0, right: 0 } });
    }
  }
  function setFollow(v) {
    follow = v;
    N.bLocate.classList.toggle("on", v);
  }
  function startGPS() {
    if (!("geolocation" in navigator)) {
      toast("\u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632 \u0644\u0627 \u064A\u062F\u0639\u0645 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0645\u0648\u0642\u0639");
      return;
    }
    if (watchId != null) return;
    watchId = navigator.geolocation.watchPosition(
      (p) => {
        if (!simOn) handleFix({ lng: p.coords.longitude, lat: p.coords.latitude, acc: p.coords.accuracy, speed: p.coords.speed, heading: p.coords.heading, t: p.timestamp || Date.now() });
      },
      (err) => {
        if (err.code === 1) {
          toast("\u062A\u0645 \u0631\u0641\u0636 \u0625\u0630\u0646 \u0627\u0644\u0645\u0648\u0642\u0639 \u2014 \u0641\u0639\u0651\u0644\u0647 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629", 5e3);
          setStatus("\u0625\u0630\u0646 \u0627\u0644\u0645\u0648\u0642\u0639 \u0645\u0631\u0641\u0648\u0636");
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        } else if (err.code === 2) setStatus("\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0645\u0648\u0642\u0639 \u062D\u0627\u0644\u064A\u0627\u064B");
        else setStatus("\u0625\u0634\u0627\u0631\u0629 GPS \u0636\u0639\u064A\u0641\u0629\u2026");
      },
      { enableHighAccuracy: true, maximumAge: 1e3, timeout: 2e4 }
    );
  }
  function handleFix(f) {
    const prev = me.has ? [me.lng, me.lat] : null, cur = [f.lng, f.lat];
    const moved = prev ? hav(prev, cur) : 0;
    const dts = lastFixT ? Math.max(0.2, (f.t - lastFixT) / 1e3) : 1;
    let hdg = null;
    if (f.heading != null && !isNaN(f.heading) && (f.speed == null || f.speed > 1)) hdg = f.heading;
    else if (prev && moved > 4 && (f.acc == null || f.acc < 80)) hdg = bearing(prev, cur);
    const spd = f.speed != null && !isNaN(f.speed) ? f.speed : prev ? moved / dts : 0;
    if (me.has && moved < 1.2 && spd < 0.6 && !f.force) {
      me.acc = f.acc;
      if (compassHeading != null) me.hdg = compassHeading;
      return;
    }
    me.speed = spd;
    me.acc = f.acc == null ? 0 : f.acc;
    if (hdg != null) me.hdg = hdg;
    else if (compassHeading != null && spd < 1.2) me.hdg = compassHeading;
    me.lng = f.lng;
    me.lat = f.lat;
    lastFixT = f.t;
    if (!me.has) {
      me.has = true;
      vis.lng = me.lng;
      vis.lat = me.lat;
      vis.hdg = me.hdg;
      camB = me.hdg;
      map.jumpTo({ center: cur, zoom: Math.max(map.getZoom(), 16.3), pitch: 60 });
      setFollow(true);
      drawCar(true);
    }
    try {
      localStorage.setItem("mp_last", JSON.stringify({ lng: me.lng, lat: me.lat }));
    } catch (e) {
    }
    setStatus(simOn ? "\u0645\u062D\u0627\u0643\u0627\u0629 \u0627\u0644\u0642\u064A\u0627\u062F\u0629" : me.acc ? `\u062F\u0642\u0629 \u0627\u0644\u0645\u0648\u0642\u0639 \u2248 ${Math.round(me.acc)} \u0645` : "\u0627\u0644\u0645\u0648\u0642\u0639 \u0646\u0634\u0637");
    if (navActive) navTick();
  }
  function enableCompass() {
    const on = (e) => {
      let a = null;
      if (typeof e.webkitCompassHeading === "number") a = e.webkitCompassHeading;
      else if (e.absolute && typeof e.alpha === "number") a = 360 - e.alpha;
      if (a == null || isNaN(a)) return;
      compassHeading = compassHeading == null ? a : normDeg(compassHeading + angDiff(a, compassHeading) * 0.25);
    };
    const go = () => {
      addEventListener("deviceorientationabsolute", on, true);
      addEventListener("deviceorientation", on, true);
    };
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission().then((r) => {
          if (r === "granted") go();
        }).catch(() => {
        });
      } else go();
    } catch (e) {
    }
  }
  function setStatus(t) {
    if (!t) {
      N.status.classList.add("hide");
      return;
    }
    N.status.textContent = t;
    N.status.classList.remove("hide");
  }
  var origin = () => me.has ? [me.lng, me.lat] : (() => {
    const c = map.getCenter();
    return [c.lng, c.lat];
  })();
  var lastNom = 0;
  async function nominatim(q) {
    const wait = lastNom + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    lastNom = Date.now();
    const o = origin();
    let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=ar,en&q=${encodeURIComponent(q)}&viewbox=${o[0] - 0.6},${o[1] + 0.6},${o[0] + 0.6},${o[1] - 0.6}`;
    const r = await timeoutFetch(url, { headers: { Accept: "application/json" } }, 12e3);
    if (!r.ok) throw new Error("nominatim");
    return r.json();
  }
  function showSugg(items, emptyMsg) {
    const ul = N.sugg;
    ul.replaceChildren();
    if (!items.length) {
      ul.append(h("li", { class: "none" }, emptyMsg || "\u0644\u0627 \u0646\u062A\u0627\u0626\u062C"));
    }
    for (const it of items) {
      ul.append(h("li", { tabindex: "0", role: "option", on: { click: () => choose(it), keydown: (e) => {
        if (e.key === "Enter") choose(it);
      } } }, svg(it.ico || "i-pin"), h("div", {}, h("b", {}, it.title), h("small", {}, it.sub || ""))));
    }
    ul.classList.remove("hide");
  }
  function choose(it) {
    N.sugg.classList.add("hide");
    N.q.value = it.title;
    N.qclear.classList.remove("hide");
    N.q.blur();
    rememberSearch(it);
    setDestination({ lng: it.lng, lat: it.lat, name: it.title, sub: it.sub });
  }
  function rememberSearch(it) {
    ST.recent = [{ title: it.title, sub: it.sub || "", lng: it.lng, lat: it.lat }, ...ST.recent.filter((r) => r.title !== it.title)].slice(0, 6);
    save("mp_settings_v1", ST);
  }
  async function doSearch() {
    const v = N.q.value.trim();
    N.qclear.classList.toggle("hide", !v);
    if (v.length < 2) {
      N.sugg.classList.add("hide");
      return;
    }
    showSugg([{ title: "\u062C\u0627\u0631\u064D \u0627\u0644\u0628\u062D\u062B\u2026", sub: "", lng: 0, lat: 0, ico: "i-search" }].map((x) => ({ ...x })));
    N.sugg.firstChild.onclick = null;
    try {
      const res = await nominatim(v);
      if (N.q.value.trim() !== v) return;
      showSugg(res.map((r) => {
        const parts = String(r.display_name || "").split(",");
        return { title: (r.name || parts[0] || "").trim() || "\u0645\u0643\u0627\u0646", sub: parts.slice(1, 4).join("\u060C").trim(), lng: +r.lon, lat: +r.lat, ico: "i-pin" };
      }).filter((x) => isFinite(x.lng) && isFinite(x.lat)), "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u0644\u0647\u0630\u0627 \u0627\u0644\u0628\u062D\u062B");
    } catch (e) {
      showSugg([], "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0628\u062D\u062B \u2014 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644");
    }
  }
  function showRecent() {
    const r = ST.recent;
    if (!r.length) {
      toast("\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u062B \u0633\u0627\u0628\u0642\u0629");
      return;
    }
    showSugg(r.map((x) => ({ ...x, ico: "i-note" })));
  }
  function setMarker() {
    if (destMarker) {
      destMarker.remove();
      destMarker = null;
    }
    if (!dest) return;
    const el = h("div", { class: "pin dest" }, h("div", { class: "head" }), h("div", { class: "glyph" }, svg("i-flag")), h("div", { class: "foot" }), h("div", { class: "lbl" }, dest.name || "\u0627\u0644\u0648\u062C\u0647\u0629"));
    destMarker = new maplibregl.Marker({ element: h("div", { class: "mk" }, el), anchor: "bottom" }).setLngLat([dest.lng, dest.lat]).addTo(map);
  }
  async function setDestination(d, keepPOI) {
    dest = d;
    setMarker();
    if (!keepPOI) {
      clearPOI(true);
    }
    await computeRoute(false);
  }
  async function computeRoute(silent) {
    if (!dest) return;
    const a = origin();
    if (!silent) showSheet(sheetLoading("\u062C\u0627\u0631\u064D \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0627\u0631\u2026"));
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${a[0].toFixed(6)},${a[1].toFixed(6)};${dest.lng.toFixed(6)},${dest.lat.toFixed(6)}?overview=full&geometries=geojson&steps=true&alternatives=false`;
      const r = await timeoutFetch(url, {}, 15e3);
      const j = await r.json();
      if (j.code !== "Ok") throw new Error(j.code || "route");
      route = parseOSRM(j);
      nav.setRoute(route);
      pushRoute();
      if (!silent) {
        fitRoute();
        showRouteSheet();
      }
      return true;
    } catch (e) {
      route = null;
      pushRoute();
      if (!silent) showSheet(h("div", {}, h("div", { class: "sh-h" }, svg("i-route"), h("h3", {}, dest.name || "\u0627\u0644\u0648\u062C\u0647\u0629")), h("p", { class: "err" }, "\u062A\u0639\u0630\u0651\u0631 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0627\u0631. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0623\u0648 \u062C\u0631\u0651\u0628 \u0648\u062C\u0647\u0629 \u0623\u062E\u0631\u0649."), h("div", { class: "btns" }, h("button", { class: "ghost", on: { click: clearAll } }, "\u0625\u063A\u0644\u0627\u0642"), h("button", { class: "primary", on: { click: () => computeRoute(false) } }, "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629"))));
      return false;
    }
  }
  function fitRoute() {
    if (!route) return;
    setFollow(false);
    const b = new maplibregl.LngLatBounds();
    for (const c of route.coords) b.extend(c);
    if (me.has) b.extend([me.lng, me.lat]);
    map.fitBounds(b, { padding: { top: 150, bottom: Math.round(innerHeight * 0.42), left: 50, right: 50 }, pitch: 45, bearing: 0, duration: 900, maxZoom: 17 });
  }
  function clearAll() {
    stopNav(true);
    dest = null;
    route = null;
    setMarker();
    pushRoute();
    clearPOI(true);
    hideSheet();
    N.q.value = "";
    N.qclear.classList.add("hide");
  }
  function showSheet(node) {
    N.sheetBody.replaceChildren(node);
    N.sheet.classList.remove("hide");
    document.body.classList.add("sheetOpen");
    requestAnimationFrame(() => document.documentElement.style.setProperty("--sheetH", N.sheet.offsetHeight + "px"));
  }
  function hideSheet() {
    N.sheet.classList.add("hide");
    document.body.classList.remove("sheetOpen");
  }
  var sheetLoading = (t) => h("div", { class: "sh-h" }, svg("i-route"), h("h3", {}, t));
  function statBox(v, l, c) {
    return h("div", { class: "stat " + (c || "") }, h("b", {}, v), h("small", {}, l));
  }
  function showRouteSheet() {
    if (!route || !dest) return;
    const steps = h("ul", { class: "steps-l hide" }, route.steps.filter((s) => s.type !== "depart").map((s) => h("li", {}, svg(icoOf(s.type, s.modifier)), h("span", {}, actionText(s)), h("small", {}, s.type === "arrive" ? "" : fmtDist(s.dist)))));
    const body2 = h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg("i-pin"), h("h3", {}, dest.name || "\u0627\u0644\u0648\u062C\u0647\u0629"), h("button", { class: "plain", "aria-label": "\u0625\u063A\u0644\u0627\u0642", on: { click: clearAll } }, svg("i-close"))),
      dest.sub ? h("p", { class: "note" }, dest.sub) : null,
      h("div", { class: "stats" }, statBox(fmtDist(route.dist), "\u0627\u0644\u0645\u0633\u0627\u0641\u0629", "acc"), statBox(fmtTime(route.dur), "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0648\u0642\u0639"), statBox(clock(route.dur), "\u0627\u0644\u0648\u0635\u0648\u0644")),
      h("div", { class: "btns" }, h("button", { class: "primary", on: { click: () => startNav(false) } }, svg("i-car"), "\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0648\u062C\u064A\u0647"), h("button", { class: "ghost", on: { click: () => startNav(true) } }, svg("i-route"), "\u0645\u062D\u0627\u0643\u0627\u0629")),
      h("div", { class: "btns" }, h("button", { class: "ghost", on: { click: () => steps.classList.toggle("hide") } }, svg("i-doc"), "\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u0637\u0631\u064A\u0642"), poiState ? h("button", { class: "ghost", on: { click: () => renderPOIList() } }, svg("i-pin"), "\u0627\u0644\u0642\u0627\u0626\u0645\u0629") : null),
      steps
    );
    showSheet(body2);
  }
  function speak(t) {
    N.hudText && (N.hudText.title = t);
    if (!ST.voice || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "ar-SA";
      const v = speechSynthesis.getVoices().find((v2) => /^ar/i.test(v2.lang));
      if (v) u.voice = v;
      u.rate = 1;
      speechSynthesis.speak(u);
    } catch (e) {
    }
  }
  function unlockSpeech() {
    try {
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        speechSynthesis.speak(u);
      }
    } catch (e) {
    }
  }
  async function lockScreen() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
    }
  }
  function startNav(sim) {
    if (!route) return;
    unlockSpeech();
    enableCompass();
    if (sim) {
      stopSim();
      me.has = true;
      const p = route.coords[0];
      const p2 = route.coords[Math.min(5, route.coords.length - 1)];
      me.lng = p[0];
      me.lat = p[1];
      me.hdg = bearing(p, p2);
      vis.lng = me.lng;
      vis.lat = me.lat;
      vis.hdg = me.hdg;
      camB = me.hdg;
      lastFixT = 0;
    } else if (!me.has) {
      toast("\u0641\u0639\u0651\u0644 \u0627\u0644\u0645\u0648\u0642\u0639 \u0623\u0648\u0644\u0627\u064B (\u0632\u0631 \u0627\u0644\u0647\u062F\u0641) \u0644\u0628\u062F\u0621 \u0627\u0644\u062A\u0648\u062C\u064A\u0647\u060C \u0623\u0648 \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u062D\u0627\u0643\u0627\u0629");
      startGPS();
      return;
    } else if (hav([me.lng, me.lat], route.coords[0]) > 80) {
      computeRoute(true).then(() => {
        if (route) startNav(false);
      });
      return;
    }
    navActive = true;
    nav.start(true);
    document.body.classList.add("navmode");
    N.hud.classList.remove("hide");
    hideSheet();
    N.hudVol.firstChild && 0;
    setVolIcon();
    setFollow(true);
    lockScreen();
    map.easeTo({ center: [vis.lng, vis.lat], zoom: 17.6, pitch: 65, bearing: vis.hdg, duration: 900 });
    if (sim) startSim();
    else navTick();
  }
  function stopNav(silent) {
    if (!navActive && !simOn) {
      return;
    }
    navActive = false;
    nav.stop();
    stopSim();
    document.body.classList.remove("navmode");
    N.hud.classList.add("hide");
    try {
      speechSynthesis.cancel();
    } catch (e) {
    }
    try {
      wakeLock && wakeLock.release();
    } catch (e) {
    }
    wakeLock = null;
    map.easeTo({ pitch: 55, duration: 600 });
    if (!silent && route) showRouteSheet();
  }
  function navTick() {
    const st = nav.update([me.lng, me.lat], me.speed);
    if (!st) return;
    N.hudDist.textContent = st.next.type === "arrive" && st.dNext < 30 ? "\u0627\u0644\u0648\u0635\u0648\u0644" : fmtDist(st.dNext);
    N.hudText.textContent = st.text;
    N.hudIco.firstChild.setAttribute("href", "#" + st.ico);
    N.hudSpeed.textContent = Math.round(me.speed * 3.6) + " \u0643\u0645/\u0633";
    N.hudRem.textContent = fmtDist(st.rem) + " \xB7 " + fmtTime(st.remTime);
    N.hudEta.textContent = "\u0627\u0644\u0648\u0635\u0648\u0644 " + clock(st.remTime);
    if (st.offRoute && !simOn && Date.now() - lastReroute > 15e3) {
      lastReroute = Date.now();
      speak("\u062C\u0627\u0631\u064D \u0625\u0639\u0627\u062F\u0629 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0627\u0631");
      computeRoute(true).then((ok) => {
        if (ok) {
          nav.start(false);
        }
      });
    }
  }
  function onArrive() {
    toast("\u0648\u0635\u0644\u062A \u0625\u0644\u0649 \u0648\u062C\u0647\u062A\u0643 \u{1F389}", 5e3);
    setTimeout(() => stopNav(false), 2500);
  }
  function setVolIcon() {
    N.hudVol.firstChild.firstChild.setAttribute("href", ST.voice ? "#i-vol" : "#i-mute");
  }
  function pointAt(r, d) {
    const c = r.coords, cum = r.cum;
    if (d <= 0) return c[0];
    if (d >= cum[cum.length - 1]) return c[c.length - 1];
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = lo + hi >> 1;
      if (cum[m] <= d) lo = m;
      else hi = m;
    }
    const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return [c[lo][0] + (c[hi][0] - c[lo][0]) * t, c[lo][1] + (c[hi][1] - c[lo][1]) * t];
  }
  function startSim() {
    simOn = true;
    let d = 0;
    const tick = () => {
      if (!navActive || !route) {
        stopSim();
        return;
      }
      d += SIM_SPEED * 0.5;
      if (d >= route.total) {
        stopSim();
        return;
      }
      const p = pointAt(route, d), p2 = pointAt(route, d + 6);
      handleFix({ lng: p[0], lat: p[1], acc: 5, speed: SIM_SPEED, heading: bearing(p, p2), t: Date.now(), force: true });
    };
    tick();
    simTimer = setInterval(tick, 500);
  }
  function stopSim() {
    simOn = false;
    clearInterval(simTimer);
    simTimer = null;
  }
  function clearPOI(keepChips) {
    for (const m of poiMarkers) m.remove();
    poiMarkers = [];
    poiState = null;
    selPOI = null;
    pushPOI();
    if (!keepChips || true) $$("#chips button").forEach((b) => b.classList.remove("on", "busy"));
  }
  async function showPOI(cat, btn) {
    if (btn.classList.contains("on")) {
      clearPOI();
      hideSheet();
      return;
    }
    $$("#chips button").forEach((b) => b.classList.remove("on"));
    btn.classList.add("busy");
    try {
      const o = origin();
      let list = await fetchPOI(cat, o, ST.radius), rad2 = ST.radius;
      if (!list.length && rad2 < 5e3) {
        rad2 = 5e3;
        list = await fetchPOI(cat, o, rad2);
      }
      btn.classList.remove("busy");
      for (const m of poiMarkers) m.remove();
      poiMarkers = [];
      poiState = { cat, list, radius: rad2 };
      btn.classList.add("on");
      if (dest) {
        dest = null;
        route = null;
        setMarker();
        pushRoute();
        stopNav(true);
      }
      buildPOIMarkers();
      pushPOI();
      renderPOIList();
      if (list.length) {
        const b = new maplibregl.LngLatBounds();
        b.extend(o);
        for (const p of list) b.extend([p.lng, p.lat]);
        setFollow(false);
        map.fitBounds(b, { padding: { top: 150, bottom: Math.round(innerHeight * 0.45), left: 50, right: 50 }, pitch: 50, duration: 900, maxZoom: 17 });
      }
    } catch (e) {
      btn.classList.remove("busy");
      toast("\u062A\u0639\u0630\u0651\u0631 \u062C\u0644\u0628 \u0627\u0644\u0623\u0645\u0627\u0643\u0646 \u0627\u0644\u0642\u0631\u064A\u0628\u0629 \u2014 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B", 4500);
    }
  }
  function buildPOIMarkers() {
    const C = CATS[poiState.cat];
    poiState.list.forEach((p, i) => {
      const el = h("div", { class: "pin", style: `--c:${C.color}`, title: p.name }, h("div", { class: "head" }), h("div", { class: "glyph" }, svg(C.ico)), h("div", { class: "foot" }), h("div", { class: "lbl" }, p.name), h("div", { class: "rem" }, "\u2248 " + fmtDist(p.dist)));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectPOI(p);
      });
      p.el = el;
      poiMarkers.push(new maplibregl.Marker({ element: h("div", { class: "mk" }, el), anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map));
    });
  }
  function renderPOIList() {
    if (!poiState) return;
    const C = CATS[poiState.cat];
    const items = poiState.list.map((p, i) => h("button", { class: "item", style: `--c:${C.color}`, on: { click: () => selectPOI(p) } }, h("div", { class: "pic" }, svg(C.ico)), h("div", { class: "tx" }, h("b", {}, p.name), h("small", {}, p.sub)), h("div", { class: "dd" }, fmtDist(p.dist))));
    showSheet(h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg(C.ico), h("h3", {}, `${C.plural} \u2014 \u0623\u0642\u0631\u0628 ${poiState.list.length}`), h("button", { class: "plain", "aria-label": "\u0625\u063A\u0644\u0627\u0642", on: { click: () => {
        clearPOI();
        hideSheet();
      } } }, svg("i-close"))),
      poiState.list.length ? h("div", { class: "list" }, items) : h("p", { class: "note" }, `\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0645\u0627\u0643\u0646 \u0636\u0645\u0646 ${fmtDist(poiState.radius)}.`),
      h("p", { class: "note" }, `\u0627\u0644\u0645\u0633\u0627\u0641\u0627\u062A \u0628\u062E\u0637 \u0645\u0633\u062A\u0642\u064A\u0645 \u0636\u0645\u0646 ${fmtDist(poiState.radius)} \u2014 \u062A\u062A\u062D\u0648\u0644 \u0625\u0644\u0649 \u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0637\u0631\u064A\u0642 \u0639\u0646\u062F \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0645\u0643\u0627\u0646. \xA9 OpenStreetMap`)
    ));
  }
  async function selectPOI(p) {
    selPOI = p;
    for (const q of poiState.list) q.el && q.el.classList.toggle("sel", q === p);
    map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16), pitch: 60, duration: 900 });
    dest = { lng: p.lng, lat: p.lat, name: p.name, sub: p.sub };
    setMarkerKeep();
    const ok = await computeRoute(false);
    if (ok && p.el) {
      const rem = p.el.querySelector(".rem");
      if (rem) rem.textContent = fmtDist(route.dist);
    }
  }
  function setMarkerKeep() {
    if (destMarker) {
      destMarker.remove();
      destMarker = null;
    }
  }
  function openModal(id) {
    N[id].classList.remove("hide");
  }
  function closeModals() {
    for (const m of $$(".modal")) m.classList.add("hide");
  }
  function row(title, sub, ctrl) {
    return h("div", { class: "set" }, h("label", {}, title, sub ? h("small", {}, sub) : null), ctrl);
  }
  function toggle(key, on) {
    const i = h("input", { type: "checkbox", class: "sw" });
    i.checked = !!ST[key];
    i.addEventListener("change", () => {
      ST[key] = i.checked;
      save("mp_settings_v1", ST);
      on && on(i.checked);
    });
    return i;
  }
  function renderSettings() {
    const sel = (key, opts, on) => {
      const s = h("select", { class: "sel" }, opts.map(([v, l]) => {
        const o = h("option", { value: v }, l);
        if (String(ST[key]) === String(v)) o.selected = true;
        return o;
      }));
      s.addEventListener("change", () => {
        ST[key] = typeof DEF[key] === "number" ? +s.value : s.value;
        save("mp_settings_v1", ST);
        on && on();
      });
      return s;
    };
    N.setBody.replaceChildren(
      row("\u0627\u0644\u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0635\u0648\u062A\u064A", "\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0639\u0631\u0628\u064A\u0629 \u0645\u062B\u0644: \u0628\u0639\u062F 100 \u0645\u062A\u0631 \u0627\u062A\u062C\u0647 \u064A\u0645\u064A\u0646\u0627\u064B", toggle("voice", () => {
        if (navActive) setVolIcon();
      })),
      row("\u0627\u0644\u0645\u0628\u0627\u0646\u064A \u062B\u0644\u0627\u062B\u064A\u0629 \u0627\u0644\u0623\u0628\u0639\u0627\u062F", "\u0625\u0638\u0647\u0627\u0631 \u0627\u0631\u062A\u0641\u0627\u0639\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0646\u064A", toggle("buildings", (v) => {
        for (const l of map.getStyle().layers) if (l.type === "fill-extrusion" && !OWN.has(l.id) || l.id === "mp-buildings") map.setLayoutProperty(l.id, "visibility", v ? "visible" : "none");
      })),
      row("\u062A\u0636\u0627\u0631\u064A\u0633 \u0627\u0644\u0623\u0631\u0636 3D", "\u064A\u0633\u062A\u0647\u0644\u0643 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0628\u0637\u0627\u0631\u064A\u0629 \u0623\u0643\u062B\u0631", toggle("terrain", () => {
        setupTerrainOnly();
      })),
      row("\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u0645\u0639 \u0627\u0644\u0633\u064A\u0631", "\u062A\u062F\u0648\u064A\u0631 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u062D\u0633\u0628 \u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u062D\u0631\u0643\u0629", toggle("headingUp")),
      row("\u0646\u0645\u0637 \u0627\u0644\u062E\u0631\u064A\u0637\u0629", null, sel("style", [["liberty", "\u0642\u064A\u0627\u0633\u064A"], ["bright", "\u0632\u0627\u0647\u064D"], ["positron", "\u0641\u0627\u062A\u062D \u0647\u0627\u062F\u0626"]], async () => {
        map.setStyle(await loadStyle(ST.style));
      })),
      row("\u0646\u0637\u0627\u0642 \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0623\u0645\u0627\u0643\u0646", null, sel("radius", [[1e3, "1 \u0643\u0645"], [2e3, "2 \u0643\u0645"], [5e3, "5 \u0643\u0645"]])),
      row("\u0645\u0633\u062D \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u0624\u0642\u062A", "\u062D\u0630\u0641 \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0644\u0639\u0645\u0644 \u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A", h("button", { class: "ghost", style: "flex:none;min-height:40px", on: { click: async () => {
        try {
          for (const k of await caches.keys()) await caches.delete(k);
          toast("\u062A\u0645 \u0645\u0633\u062D \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u0624\u0642\u062A");
        } catch (e) {
          toast("\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0645\u0633\u062D");
        }
      } } }, "\u0645\u0633\u062D")),
      h("p", { class: "hint" }, "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: \xA9 \u0645\u0633\u0627\u0647\u0645\u0648 OpenStreetMap \xB7 \u062E\u0631\u0627\u0626\u0637 OpenFreeMap (OpenMapTiles) \xB7 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A OSRM \xB7 \u0627\u0644\u0623\u0645\u0627\u0643\u0646 Overpass \xB7 \u0627\u0644\u0628\u062D\u062B Nominatim \xB7 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 MapLibre GL JS.")
    );
  }
  function setupTerrainOnly() {
    try {
      if (ST.terrain) {
        if (!map.getSource("dem")) map.addSource("dem", { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14 });
        map.setTerrain({ source: "dem", exaggeration: 1.15 });
      } else map.setTerrain(null);
    } catch (e) {
    }
  }
  var appURL = () => location.href.split("#")[0];
  function standalone() {
    return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  }
  function openInstall() {
    openModal("mInstall");
    N.doInstall.classList.toggle("hide", !deferredInstall);
    if (standalone()) toast("\u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u064A\u0639\u0645\u0644 \u0627\u0644\u0622\u0646 \u0643\u062A\u0637\u0628\u064A\u0642 \u0645\u062B\u0628\u0651\u062A \u2713");
    const img = N.qrImg;
    if (!img.dataset.t) {
      img.dataset.t = 1;
      const fall = () => {
        try {
          const c = qrCanvas(appURL(), 200);
          c.setAttribute("aria-label", "\u0631\u0645\u0632 QR \u0644\u0641\u062A\u062D \u0627\u0644\u062A\u0637\u0628\u064A\u0642");
          N.qrHolder.replaceChildren(c);
        } catch (e) {
        }
      };
      img.addEventListener("error", fall);
      if (img.complete && img.naturalWidth === 0) fall();
    }
  }
  async function doShare() {
    const data = { title: "\u0645\u0633\u0627\u0631 3D", text: "\u062E\u0631\u0627\u0626\u0637 \u0648\u0645\u0644\u0627\u062D\u0629 \u062B\u0644\u0627\u062B\u064A\u0629 \u0627\u0644\u0623\u0628\u0639\u0627\u062F \u0628\u062A\u0648\u062C\u064A\u0647 \u0635\u0648\u062A\u064A \u0639\u0631\u0628\u064A", url: appURL() };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    doCopy();
  }
  async function doCopy() {
    const url = appURL();
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch (e) {
      const t = h("textarea", { style: "position:fixed;opacity:0" });
      t.value = url;
      document.body.append(t);
      t.select();
      try {
        ok = document.execCommand("copy");
      } catch (_) {
      }
      t.remove();
    }
    const sp = N.doCopy.querySelector("span");
    sp.textContent = ok ? "\u062A\u0645 \u0627\u0644\u0646\u0633\u062E \u2713" : "\u0627\u0646\u0633\u062E \u064A\u062F\u0648\u064A\u0627\u064B: " + url;
    setTimeout(() => sp.textContent = "\u0646\u0633\u062E \u0627\u0644\u0631\u0627\u0628\u0637", 2500);
  }
  function wire() {
    N.q.addEventListener("input", debounce(doSearch, 650));
    N.q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
    });
    N.q.addEventListener("focus", () => {
      if (!N.q.value && ST.recent.length) showRecent();
    });
    N.qclear.addEventListener("click", () => {
      N.q.value = "";
      N.qclear.classList.add("hide");
      N.sugg.classList.add("hide");
      N.q.focus();
    });
    N.bRecent.addEventListener("click", showRecent);
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".searchbox")) N.sugg.classList.add("hide");
    });
    $$("#chips button").forEach((b) => {
      b.style.setProperty("--c", CATS[b.dataset.cat].color);
      b.addEventListener("click", () => showPOI(b.dataset.cat, b));
    });
    N.bLocate.addEventListener("click", () => {
      startGPS();
      enableCompass();
      if (me.has) {
        setFollow(true);
        northOnly = false;
        map.easeTo({ center: [vis.lng, vis.lat], zoom: Math.max(map.getZoom(), 16.5), pitch: 60, duration: 700 });
      } else toast("\u062C\u0627\u0631\u064D \u062A\u062D\u062F\u064A\u062F \u0645\u0648\u0642\u0639\u0643\u2026");
    });
    N.bHome.addEventListener("click", () => {
      if (navActive) return;
      hideSheet();
      clearPOI();
      const c = me.has ? [me.lng, me.lat] : lastPos ? [lastPos.lng, lastPos.lat] : FALLBACK_CENTER;
      setFollow(me.has);
      northOnly = false;
      map.flyTo({ center: c, zoom: 15.2, pitch: 60, bearing: 0, duration: 1100 });
    });
    N.bPitch.addEventListener("click", () => map.easeTo({ pitch: map.getPitch() > 10 ? 0 : 60, duration: 600 }));
    N.bCompass.addEventListener("click", () => {
      if (Math.abs(angDiff(map.getBearing(), 0)) > 2) {
        northOnly = true;
        setFollow(follow);
        map.easeTo({ bearing: 0, duration: 500 });
      } else {
        northOnly = false;
        if (me.has) {
          setFollow(true);
          map.easeTo({ bearing: me.hdg, duration: 500 });
        }
      }
    });
    N.hudStop.addEventListener("click", () => stopNav(false));
    N.hudVol.addEventListener("click", () => {
      ST.voice = !ST.voice;
      save("mp_settings_v1", ST);
      setVolIcon();
      if (!ST.voice) {
        try {
          speechSynthesis.cancel();
        } catch (e) {
        }
      } else if (nav.said) speak(nav.said);
    });
    N.bSettings.addEventListener("click", () => {
      renderSettings();
      openModal("mSettings");
    });
    N.bInstall.addEventListener("click", openInstall);
    for (const b of $$("[data-close]")) b.addEventListener("click", closeModals);
    for (const m of $$(".modal")) m.addEventListener("click", (e) => {
      if (e.target === m) closeModals();
    });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModals();
    });
    N.doShare.addEventListener("click", doShare);
    N.doCopy.addEventListener("click", doCopy);
    N.doInstall.addEventListener("click", async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      try {
        await deferredInstall.userChoice;
      } catch (e) {
      }
      deferredInstall = null;
      N.doInstall.classList.add("hide");
    });
    addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
    });
    addEventListener("appinstalled", () => {
      deferredInstall = null;
      toast("\u062A\u0645 \u062A\u062B\u0628\u064A\u062A \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u2713");
    });
    addEventListener("online", () => setStatus("\u0639\u0627\u062F \u0627\u0644\u0627\u062A\u0635\u0627\u0644"));
    addEventListener("offline", () => setStatus("\u0628\u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A \u2014 \u062A\u0638\u0647\u0631 \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u062E\u0632\u0646\u0629 \u0641\u0642\u0637"));
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navActive) lockScreen();
    });
    const user = (e) => !!e.originalEvent;
    map.on("dragstart", (e) => {
      if (user(e) && follow) {
        setFollow(false);
      }
    });
    map.on("rotatestart", (e) => {
      if (user(e) && follow && !navActive) setFollow(false);
    });
    map.on("rotate", () => {
      N.bCompass.firstChild.style.transform = `rotate(${-map.getBearing()}deg)`;
    });
    map.on("contextmenu", (e) => askDest(e.lngLat));
    const cv = map.getCanvas();
    let lp = null, lpXY = null;
    cv.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) {
        clearTimeout(lp);
        return;
      }
      const t = e.touches[0];
      lpXY = [t.clientX, t.clientY];
      clearTimeout(lp);
      lp = setTimeout(() => {
        const r = cv.getBoundingClientRect();
        askDest(map.unproject([t.clientX - r.left, t.clientY - r.top]));
      }, 700);
    }, { passive: true });
    cv.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      if (lpXY && t && Math.hypot(t.clientX - lpXY[0], t.clientY - lpXY[1]) > 10) clearTimeout(lp);
    }, { passive: true });
    cv.addEventListener("touchend", () => clearTimeout(lp), { passive: true });
    cv.addEventListener("touchcancel", () => clearTimeout(lp), { passive: true });
  }
  async function askDest(ll) {
    const d = { lng: ll.lng, lat: ll.lat, name: "\u0645\u0648\u0642\u0639 \u0645\u062D\u062F\u062F \u0639\u0644\u0649 \u0627\u0644\u062E\u0631\u064A\u0637\u0629" };
    try {
      const r = await timeoutFetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=ar,en&lat=${ll.lat}&lon=${ll.lng}`, {}, 6e3);
      if (r.ok) {
        const j = await r.json();
        if (j && j.display_name) {
          const p = j.display_name.split(",");
          d.name = (j.name || p[0] || d.name).trim();
          d.sub = p.slice(1, 3).join("\u060C").trim();
        }
      }
    } catch (e) {
    }
    setDestination(d);
  }
  async function boot() {
    const style = await loadStyle(ST.style);
    const c = lastPos ? [lastPos.lng, lastPos.lat] : FALLBACK_CENTER;
    map = new maplibregl.Map({ container: "map", style, center: c, zoom: lastPos ? 15.5 : 13, pitch: 60, bearing: -12, maxPitch: 80, attributionControl: false, antialias: devicePixelRatio < 2, fadeDuration: 120, pixelRatio: Math.min(devicePixelRatio || 1, 2), dragRotate: true, touchPitch: true });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "\xA9 OpenStreetMap \xB7 OpenFreeMap \xB7 OSRM" }), "bottom-left");
    map.on("style.load", setupLayers);
    map.on("error", (e) => {
      if (e && e.error && /Failed to fetch|NetworkError|AJAXError/i.test(String(e.error.message || e.error))) setStatus(navigator.onLine ? "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u0639\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0631\u064A\u0637\u0629" : "\u0628\u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A \u2014 \u062A\u0638\u0647\u0631 \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u062E\u0632\u0646\u0629 \u0641\u0642\u0637");
    });
    wire();
    requestAnimationFrame(loop);
    window.__mp = { map, me, vis, nav, get state() {
      return { follow, navActive, simOn, dest, route, poiState };
    }, handleFix, startGPS, setDestination, showPOI };
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const p = await navigator.permissions.query({ name: "geolocation" });
        if (p.state === "granted") startGPS();
        p.onchange = () => {
          if (p.state === "granted") startGPS();
        };
      } catch (e) {
      }
    }
    if (!navigator.onLine) setStatus("\u0628\u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A \u2014 \u062A\u0638\u0647\u0631 \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u062E\u0632\u0646\u0629 \u0641\u0642\u0637");
    if ("serviceWorker" in navigator) {
      const reg = () => navigator.serviceWorker.register("sw.js").catch(() => {
      });
      document.readyState === "complete" ? reg() : addEventListener("load", reg);
    }
  }
  boot();
})();
