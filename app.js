(() => {
  // src/util.js
  var $ = (s, r = document) => r.querySelector(s);
  var $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  var EARTH = 63710088e-1;
  var rad = (d) => d * Math.PI / 180;
  var deg = (r) => r * 180 / Math.PI;
  var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
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
  var carScale = (z) => Math.min(60, Math.max(3, 3 * Math.pow(2, 17.6 - z)));
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
    if (type === "arrive" || type === "waypoint") return "i-flag";
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
    const b = actionBase(st);
    return st.landmark && st.type !== "arrive" && st.type !== "waypoint" && st.type !== "depart" ? b + " \u0639\u0646\u062F " + st.landmark : b;
  }
  function actionBase(st) {
    const t = st.type, m = st.modifier, nm = st.name ? " \u0625\u0644\u0649 " + st.name : "";
    switch (t) {
      case "waypoint":
        return "\u0648\u0635\u0644\u062A \u0625\u0644\u0649 \u0646\u0642\u0637\u0629 \u0627\u0644\u062A\u0648\u0642\u0641";
      case "continue":
        return "\u062A\u0627\u0628\u0639 \u0644\u0644\u0623\u0645\u0627\u0645" + nm;
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
  function parseOSRM(json, idx = 0) {
    if (!json || !json.routes || !json.routes.length) throw new Error("no_route");
    const r = json.routes[idx] || json.routes[0], coords = r.geometry.coordinates;
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav(coords[i - 1], coords[i]));
    const steps = [];
    let acc = 0;
    const legs = r.legs || [];
    for (let li = 0; li < legs.length; li++) for (const s of legs[li].steps || []) {
      const mn = s.maneuver || {};
      let ty = mn.type || "turn";
      if (li < legs.length - 1 && ty === "arrive") ty = "waypoint";
      if (li > 0 && ty === "depart") ty = "continue";
      const it = s.intersections && s.intersections[0];
      steps.push({ lanes: it && it.lanes && it.lanes.length ? it.lanes : null, type: ty, modifier: mn.modifier || "", exit: mn.exit, name: s.name || "", dist: s.distance || 0, dur: s.duration || 0, loc: mn.location, startAlong: acc });
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

  // src/traffic.js
  var RAMP = [[0, [34, 197, 94]], [0.35, [250, 204, 21]], [0.65, [249, 115, 22]], [0.85, [239, 68, 68]], [1, [153, 27, 27]]];
  function rampColor(l) {
    l = clamp(l, 0, 1);
    for (let i = 1; i < RAMP.length; i++) {
      const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i];
      if (l <= b) {
        const t = (l - a) / (b - a || 1);
        const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
      }
    }
    return "rgb(153,27,27)";
  }
  function baseLoad(date) {
    const h2 = date.getHours() + date.getMinutes() / 60;
    const g = (m, s, a) => a * Math.exp(-((h2 - m) ** 2) / (2 * s * s));
    let v = 0.1 + g(8, 1.1, 0.7) + g(13.5, 1.2, 0.5) + g(18.2, 1.5, 0.78) + g(21, 1.2, 0.25);
    if (date.getDay() === 5) v *= 0.7;
    return clamp(v, 0.05, 0.95);
  }
  function hash(n) {
    n = n << 13 ^ n;
    return 1 - (n * (n * n * 15731 + 789221) + 1376312589 & 2147483647) / 1073741824;
  }
  function vnoise(x, seed) {
    const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    return (hash(i * 131 + seed) * (1 - s) + hash((i + 1) * 131 + seed) * s) * 0.5 + 0.5;
  }
  function estimate(route2, mode2, date = /* @__PURE__ */ new Date()) {
    const total = route2.total || route2.dist || 1, base = baseLoad(date);
    const seed = Math.floor(Math.abs(route2.coords[0][0] * 1e3 + route2.coords[0][1] * 700)) % 9973;
    const S = route2.steps;
    const speedAt = (d) => {
      let k = 0;
      for (let j = 0; j < S.length; j++) if (S[j].startAlong <= d) k = j;
      const st = S[k];
      return st && st.dur > 0 ? st.dist / st.dur : 12;
    };
    const spots = [];
    S.forEach((st, i) => {
      if (st.type === "depart" || st.type === "arrive" || st.type === "waypoint") return;
      const r = vnoise(i * 1.7, seed + 3);
      if (r > 0.38) spots.push({ c: st.startAlong, a: (0.55 + 0.75 * r) * (speedAt(st.startAlong) < 17 ? 1 : 0.55), w: 150 + 260 * vnoise(i * 2.3, seed + 9) });
    });
    const extra = Math.floor(total / 2500);
    for (let i = 0; i < extra; i++) {
      const c = total * vnoise(i * 3.1, seed + 21);
      spots.push({ c, a: 0.5 + 0.6 * vnoise(i, seed + 5), w: 300 + 350 * vnoise(i * 1.3, seed + 31) });
    }
    const N2 = Math.max(30, Math.min(220, Math.round(total / 50)));
    const L = [];
    for (let i = 0; i <= N2; i++) {
      const d = total * i / N2;
      let v = 0;
      for (const sp of spots) {
        const g = Math.exp(-((d - sp.c) ** 2) / (2 * sp.w * sp.w));
        v = Math.max(v, sp.a * g);
      }
      const urban = speedAt(d) < 17 ? 1 : 0.6;
      L.push(clamp(base * 1.25 * v * urban + base * 0.12 * vnoise(d / 900, seed), 0, 1));
    }
    const SM = L.map((_, i) => {
      let s = 0, c = 0;
      for (let j = -1; j <= 1; j++) {
        const v = L[i + j];
        if (v != null) {
          s += v;
          c++;
        }
      }
      return s / c;
    });
    const stops = SM.map((l, i) => [i / N2, l]);
    let dur = 0;
    for (let i = 0; i < N2; i++) {
      const d = total * i / N2;
      let k = 0;
      for (let j = 0; j < S.length; j++) if (S[j].startAlong <= d) k = j;
      const st = S[k];
      const seg = st && st.dist > 0 ? st.dur * (total / N2) / st.dist : route2.dur / N2;
      const lv = (SM[i] + SM[i + 1]) / 2;
      dur += seg * (1 + (mode2 === "moto" ? 0.9 : 1.7) * lv) * (mode2 === "moto" ? 0.88 : 1);
    }
    const avg = SM.reduce((a, b) => a + b, 0) / SM.length;
    const label = avg < 0.12 ? "\u0633\u0644\u0633" : avg < 0.28 ? "\u062E\u0641\u064A\u0641" : avg < 0.5 ? "\u0645\u062A\u0648\u0633\u0637" : "\u0643\u062B\u064A\u0641";
    return { stops, avg, dur, delay: Math.max(0, dur - route2.dur), label };
  }
  function gradientExpr(stops) {
    const e = ["interpolate", ["linear"], ["line-progress"]];
    let last = -1;
    stops.forEach(([p, l], i) => {
      let q = i === 0 ? 0 : i === stops.length - 1 ? 1 : p;
      if (q <= last) q = last + 1e-4;
      last = q;
      e.push(q, rampColor(l));
    });
    return e;
  }
  var solidGradient = (c) => ["interpolate", ["linear"], ["line-progress"], 0, c, 1, c];

  // src/smart.js
  function bboxOf(coords, pad = 0) {
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (const p of coords) {
      if (p[0] < a) a = p[0];
      if (p[0] > c) c = p[0];
      if (p[1] < b) b = p[1];
      if (p[1] > d) d = p[1];
    }
    return [a - pad, b - pad, c + pad, d + pad];
  }
  function simplify(coords, n) {
    if (coords.length <= n) return coords;
    const out = [], k = (coords.length - 1) / (n - 1);
    for (let i = 0; i < n; i++) out.push(coords[Math.round(i * k)]);
    return out;
  }
  function nearest(pt, coords, cum) {
    const kx = 111320 * Math.cos(rad(pt[1])), ky = 110540;
    let best = 1e12, al = 0;
    for (let i = 1; i < coords.length; i++) {
      const ax = (coords[i - 1][0] - pt[0]) * kx, ay = (coords[i - 1][1] - pt[1]) * ky, bx = (coords[i][0] - pt[0]) * kx, by = (coords[i][1] - pt[1]) * ky;
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let t = l2 ? clamp(-(ax * dx + ay * dy) / l2, 0, 1) : 0;
      const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px, py);
      if (d < best) {
        best = d;
        al = cum ? cum[i - 1] + (cum[i] - cum[i - 1]) * t : 0;
      }
    }
    return { d: best, along: al };
  }
  var aroundPoly = (coords, r) => `(around:${r},${simplify(coords, 40).map((p) => p[1].toFixed(5) + "," + p[0].toFixed(5)).join(",")})`;
  var ctr = (e) => e.lat !== void 0 ? [e.lon, e.lat] : e.center ? [e.center.lon, e.center.lat] : e.geometry && e.geometry[0] ? [e.geometry[0].lon, e.geometry[0].lat] : null;
  var nameOf = (t) => t["name:ar"] || t.name || t["name:en"] || "";
  async function op(q, ms = 16e3) {
    const body2 = "data=" + encodeURIComponent(q);
    let err = null;
    for (const url of MIRRORS) {
      const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body2, signal: c.signal });
        if (!r.ok) throw new Error("http " + r.status);
        return await r.json();
      } catch (e) {
        err = e;
      } finally {
        clearTimeout(t);
      }
    }
    throw err || new Error("overpass");
  }
  async function accessScan(routes2) {
    const all = [];
    for (const r of routes2) all.push(...r.coords);
    const bb = bboxOf(all, 6e-4);
    if ((bb[2] - bb[0]) * (bb[3] - bb[1]) > 0.02) return { skipped: true, scores: routes2.map(() => 0), hits: routes2.map(() => []), aids: routes2.map(() => []) };
    const B = `(${bb[1].toFixed(5)},${bb[0].toFixed(5)},${bb[3].toFixed(5)},${bb[2].toFixed(5)})`;
    const j = await op(`[out:json][timeout:20];(way["highway"="steps"]${B};node["kerb"="raised"]${B};way["highway"~"^(footway|path|pedestrian|cycleway)$"]["wheelchair"="no"]${B};way["highway"~"^(footway|path|pedestrian|residential|service|track)$"]["surface"~"^(sand|dirt|ground|gravel|unpaved|grass|earth|mud|cobblestone|sett)$"]${B};way["highway"~"^(footway|path)$"]["incline"]${B};node["highway"="elevator"]${B};node["kerb"="lowered"]${B};node["kerb"="flush"]${B};way["ramp"="yes"]${B};node["ramp"="yes"]${B};node["amenity"="parking"]["capacity:disabled"]${B};);out geom 500;`);
    const items = [];
    for (const e of j.elements || []) {
      const t = e.tags || {};
      let kind = null, w = 0, aid = false;
      if (t.highway === "steps") {
        kind = "\u0633\u0644\u0627\u0644\u0645";
        w = 10;
      } else if (t.kerb === "raised") {
        kind = "\u0631\u0635\u064A\u0641 \u0645\u0631\u062A\u0641\u0639";
        w = 3;
      } else if (t.wheelchair === "no") {
        kind = "\u063A\u064A\u0631 \u0645\u0647\u064A\u0623 \u0644\u0644\u0643\u0631\u0627\u0633\u064A";
        w = 8;
      } else if (t.surface && t.highway !== "elevator" && !t.ramp) {
        kind = "\u0633\u0637\u062D \u063A\u064A\u0631 \u0645\u0645\u0647\u062F";
        w = 2;
      } else if (t.incline && t.highway && !t.ramp) {
        const v = parseFloat(String(t.incline).replace("%", ""));
        if (Math.abs(v) >= 8) {
          kind = "\u0645\u0646\u062D\u062F\u0631 \u0634\u062F\u064A\u062F";
          w = 4;
        }
      } else if (t.highway === "elevator") {
        kind = "\u0645\u0635\u0639\u062F";
        aid = true;
      } else if (t.kerb === "lowered" || t.kerb === "flush") {
        kind = "\u0631\u0635\u064A\u0641 \u0645\u062E\u0641\u0648\u0636";
        aid = true;
      } else if (t.ramp === "yes") {
        kind = "\u0645\u0646\u062D\u062F\u0631 (Ramp)";
        aid = true;
      } else if (t["capacity:disabled"]) {
        kind = "\u0645\u0648\u0642\u0641 \u0630\u0648\u064A \u0627\u0644\u0625\u0639\u0627\u0642\u0629";
        aid = true;
      }
      if (!kind) continue;
      const pts = e.geometry ? e.geometry.map((g) => [g.lon, g.lat]) : [ctr(e)];
      if (!pts[0]) continue;
      items.push({ kind, w, aid, pts, name: nameOf(t) });
    }
    const scores = [], hits = [], aids = [];
    for (const r of routes2) {
      let s = 0;
      const h2 = [], a = [];
      for (const it of items) {
        let m = 1e9, mp = null;
        for (const p of it.pts) {
          const n = nearest(p, r.coords, r.cum);
          if (n.d < m) {
            m = n.d;
            mp = p;
          }
        }
        if (!it.aid && m <= 12) {
          s += it.w;
          h2.push({ kind: it.kind, lng: mp[0], lat: mp[1] });
        } else if (it.aid && m <= 60) a.push({ kind: it.kind, lng: mp[0], lat: mp[1], name: it.name });
      }
      scores.push(s);
      hits.push(h2);
      aids.push(a);
    }
    return { scores, hits, aids };
  }
  async function parkingScan(lng, lat, r = 450) {
    const A = `(around:${r},${lat.toFixed(5)},${lng.toFixed(5)})`;
    const j = await op(`[out:json][timeout:15];(nwr["amenity"="parking"]["access"!~"^(private|customers)$"]${A};way["highway"]["parking:lane:both"~"parallel|diagonal|perpendicular"]${A};way["highway"]["parking:lane:right"~"parallel|diagonal|perpendicular"]${A};way["highway"]["parking:lane:left"~"parallel|diagonal|perpendicular"]${A};nwr["shop"]${A};nwr["amenity"~"^(cafe|restaurant|fast_food|bank|pharmacy|clinic)$"]${A};);out center 250;`);
    const lots = [], streets = /* @__PURE__ */ new Map();
    let busy = 0;
    for (const e of j.elements || []) {
      const t = e.tags || {};
      const c = ctr(e);
      if (!c) continue;
      if (t.amenity === "parking") {
        lots.push({ name: nameOf(t) || (t.parking === "surface" ? "\u0645\u0648\u0642\u0641 \u0645\u0643\u0634\u0648\u0641" : t.parking === "underground" ? "\u0645\u0648\u0642\u0641 \u0633\u0641\u0644\u064A" : t.parking === "multi-storey" ? "\u0645\u0648\u0642\u0641 \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0637\u0648\u0627\u0628\u0642" : "\u0645\u0648\u0642\u0641 \u0633\u064A\u0627\u0631\u0627\u062A"), lng: c[0], lat: c[1], cap: +t.capacity || null, d: hav([lng, lat], c), fee: t.fee === "yes" });
      } else if (t.highway) {
        const n = nameOf(t) || "\u0634\u0627\u0631\u0639 \u0628\u062F\u0648\u0646 \u0627\u0633\u0645";
        const d = hav([lng, lat], c);
        const o = streets.get(n);
        if (!o || d < o.d) streets.set(n, { name: n, lng: c[0], lat: c[1], d });
      } else busy++;
    }
    lots.sort((a, b) => a.d - b.d);
    const st = [...streets.values()].sort((a, b) => a.d - b.d);
    return { lots, streets: st.slice(0, 4), busy };
  }
  function parkingChance(date, scan) {
    const demand = baseLoad(date) * (0.55 + Math.min(1, scan.busy / 45) * 0.75);
    const cap = scan.lots.reduce((s, l) => s + (l.cap || 25), 0);
    const supply = Math.min(1, cap / 160 + scan.streets.length * 0.12);
    const p = clamp(Math.round((1 - demand) * 70 + supply * 35), 5, 95);
    return { p, label: p >= 65 ? "\u0645\u0631\u062A\u0641\u0639" : p >= 40 ? "\u0645\u062A\u0648\u0633\u0637" : "\u0645\u0646\u062E\u0641\u0636" };
  }
  async function elevations(coords, n = 60) {
    const pts = simplify(coords, n);
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${pts.map((p) => p[1].toFixed(4)).join(",")}&longitude=${pts.map((p) => p[0].toFixed(4)).join(",")}`;
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8e3);
    try {
      const r = await fetch(url, { signal: c.signal });
      const j = await r.json();
      return { pts, el: j.elevation };
    } finally {
      clearTimeout(t);
    }
  }
  function climbOf(el) {
    const s = el.map((v, i) => {
      const a = el[Math.max(0, i - 1)], b = el[Math.min(el.length - 1, i + 1)];
      return (a + v + b) / 3;
    });
    let up = 0, down = 0;
    for (let i = 1; i < s.length; i++) {
      const d = s[i] - s[i - 1];
      if (d > 0) up += d;
      else down -= d;
    }
    return { up, down };
  }
  function ecoEstimate(route2, climb, opts, wind) {
    const km = route2.dist / 1e3, hrs = Math.max(1 / 60, route2.dur / 3600), v = km / hrs;
    const speedF = 1 + Math.pow((v - 65) / 65, 2) * 0.55;
    const stopF = 1 + 0.45 * (route2.traffic && route2.traffic.avg || 0.15);
    const turns = route2.steps.filter((s) => s.type === "turn" || s.type === "end of road" || s.type === "roundabout").length;
    let L = km * opts.cons / 100 * speedF * stopF + turns * 25e-4;
    L += climb.up * 1500 * 9.81 / (0.25 * 342e5) - climb.down * 1500 * 9.81 * 0.04 / (0.25 * 342e5);
    if (wind && route2.coords.length > 1) {
      const a = route2.coords[0], b = route2.coords[route2.coords.length - 1];
      const brg = Math.atan2((b[0] - a[0]) * Math.cos(rad(a[1])), b[1] - a[1]) * 180 / Math.PI;
      const head2 = wind.speed * Math.cos(rad(wind.from - brg));
      const rel = Math.max(0.5, (v + head2) / Math.max(10, v));
      L *= 1 + 0.33 * (rel * rel - 1) * (km > 5 ? 1 : 0.3);
    }
    L = Math.max(0, L);
    return { liters: L, cost: L * opts.price, climb: Math.round(climb.up), v: Math.round(v) };
  }
  async function routeFlags(route2) {
    const A = aroundPoly(route2.coords, 18);
    const j = await op(`[out:json][timeout:20];(way["highway"]["tunnel"~"^(yes|building_passage)$"]${A};way["highway"]["toll"="yes"]${A};);out center tags 60;`, 15e3);
    const tunnels = [];
    let toll = false;
    for (const e of j.elements || []) {
      const t = e.tags || {};
      if (t.toll === "yes") toll = true;
      if (t.tunnel) {
        const c = ctr(e);
        if (!c) continue;
        const n = nearest(c, route2.coords, route2.cum);
        if (n.d < 40) tunnels.push({ along: n.along, name: nameOf(t) });
      }
    }
    tunnels.sort((a, b) => a.along - b.along);
    return { tunnels, toll };
  }
  async function stopsAlong(route2, cat, fromAlong = 0) {
    const A = aroundPoly(route2.coords, 1500);
    const j = await op(`[out:json][timeout:25];(${CATS[cat].q.map((f) => f + A + ";").join("")});out center 150;`, 2e4);
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (const e of j.elements || []) {
      const c = ctr(e);
      if (!c) continue;
      const t = e.tags || {};
      const nm = nameOf(t) || CATS[cat].label;
      const k = nm + c[0].toFixed(3) + c[1].toFixed(3);
      if (seen.has(k)) continue;
      seen.add(k);
      const n = nearest(c, route2.coords, route2.cum);
      if (n.along < fromAlong + 500 || n.along > route2.total - 300) continue;
      const detourMin = Math.max(0, 2 * n.d * 1.35 / 9 / 60);
      out.push({ name: nm, lng: c[0], lat: c[1], along: n.along, off: n.d, detour: detourMin });
    }
    out.sort((a, b) => a.detour - b.detour);
    return out.slice(0, 8).sort((a, b) => a.along - b.along);
  }
  var LM_WORD = { pharmacy: "\u0635\u064A\u062F\u0644\u064A\u0629", bank: "\u0645\u0635\u0631\u0641", fuel: "\u0645\u062D\u0637\u0629 \u0648\u0642\u0648\u062F", restaurant: "\u0645\u0637\u0639\u0645", cafe: "\u0645\u0642\u0647\u0649", fast_food: "\u0645\u0637\u0639\u0645", school: "\u0645\u062F\u0631\u0633\u0629", hospital: "\u0645\u0633\u062A\u0634\u0641\u0649", clinic: "\u0639\u064A\u0627\u062F\u0629", place_of_worship: "\u0645\u0633\u062C\u062F", police: "\u0645\u0631\u0643\u0632 \u0627\u0644\u0634\u0631\u0637\u0629", post_office: "\u0645\u0643\u062A\u0628 \u0627\u0644\u0628\u0631\u064A\u062F", marketplace: "\u0633\u0648\u0642", bakery: "\u0645\u062E\u0628\u0632", townhall: "\u0645\u0628\u0646\u0649 \u0627\u0644\u0628\u0644\u062F\u064A\u0629", college: "\u0643\u0644\u064A\u0629", university: "\u062C\u0627\u0645\u0639\u0629", supermarket: "\u0633\u0648\u0628\u0631\u0645\u0627\u0631\u0643\u062A", mall: "\u0645\u0631\u0643\u0632 \u062A\u0633\u0648\u0642", convenience: "\u0628\u0642\u0627\u0644\u0629", department_store: "\u0645\u062A\u062C\u0631", hotel: "\u0641\u0646\u062F\u0642" };
  async function landmarksFor(locs) {
    if (!locs.length) return [];
    const parts = locs.map((l) => {
      const A = `(around:42,${l[1].toFixed(5)},${l[0].toFixed(5)})`;
      return `nwr["name"]["amenity"~"^(pharmacy|bank|fuel|restaurant|cafe|fast_food|school|hospital|clinic|place_of_worship|police|post_office|marketplace|bakery|townhall|college|university)$"]${A};nwr["name"]["shop"~"^(supermarket|mall|convenience|bakery|department_store)$"]${A};nwr["name"]["tourism"="hotel"]${A};`;
    }).join("");
    const j = await op(`[out:json][timeout:10];(${parts});out center 80;`, 7e3);
    return locs.map((l) => {
      let best = null, bd = 1e9;
      for (const e of j.elements || []) {
        const c = ctr(e);
        if (!c) continue;
        const d = hav(l, c);
        if (d > 45 || d >= bd) continue;
        const t = e.tags || {};
        const w = LM_WORD[t.amenity] || LM_WORD[t.shop] || LM_WORD[t.tourism] || "";
        const nm = nameOf(t);
        if (!nm) continue;
        bd = d;
        best = (w && !nm.includes(w) ? w + " " : "") + nm;
      }
      return best;
    });
  }
  var WX = (c) => c === 0 ? "\u0635\u0627\u0641\u064D" : c <= 3 ? "\u063A\u0627\u0626\u0645 \u062C\u0632\u0626\u064A\u0627\u064B" : c <= 48 ? "\u0636\u0628\u0627\u0628" : c <= 57 ? "\u0631\u0630\u0627\u0630" : c <= 67 ? "\u0623\u0645\u0637\u0627\u0631" : c <= 77 ? "\u062B\u0644\u0648\u062C" : c <= 82 ? "\u0632\u062E\u0627\u062A \u0645\u0637\u0631" : c <= 86 ? "\u0632\u062E\u0627\u062A \u062B\u0644\u062C" : "\u0639\u0627\u0635\u0641\u0629 \u0631\u0639\u062F\u064A\u0629";
  async function weatherAlong(route2, depart = /* @__PURE__ */ new Date()) {
    const n = clamp(Math.ceil(route2.total / 25e3) + 1, 2, 7);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1), d = route2.total * f;
      let k = 0;
      while (k < route2.cum.length - 2 && route2.cum[k + 1] < d) k++;
      const t = (d - route2.cum[k]) / (route2.cum[k + 1] - route2.cum[k] || 1);
      const a = route2.coords[k], b = route2.coords[k + 1] || a;
      pts.push({ lng: a[0] + (b[0] - a[0]) * t, lat: a[1] + (b[1] - a[1]) * t, d, arr: new Date(depart.getTime() + route2.dur * 1e3 * f) });
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p.lat.toFixed(3)).join(",")}&longitude=${pts.map((p) => p.lng.toFixed(3)).join(",")}&hourly=precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m&forecast_days=2&timezone=auto&wind_speed_unit=kmh`;
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), 9e3);
    let j;
    try {
      const r = await fetch(url, { signal: c.signal });
      j = await r.json();
    } finally {
      clearTimeout(to);
    }
    const arr = Array.isArray(j) ? j : [j];
    return pts.map((p, i) => {
      const w = arr[i] || arr[0];
      const H = w.hourly;
      const off = (w.utc_offset_seconds || 0) * 1e3;
      const key = new Date(p.arr.getTime() + off).toISOString().slice(0, 13) + ":00";
      let ix = H.time.indexOf(key);
      if (ix < 0) ix = Math.min(H.time.length - 1, Math.max(0, Math.round((p.arr - Date.now()) / 36e5)));
      const pr = H.precipitation[ix] || 0, code = H.weather_code[ix] || 0, wind = H.wind_speed_10m[ix] || 0, gust = H.wind_gusts_10m[ix] || 0;
      const level2 = pr >= 4 || code >= 95 || gust >= 75 ? "bad" : pr >= 1 || code >= 45 && code <= 48 || code >= 61 || wind >= 40 || gust >= 55 ? "warn" : "ok";
      return { ...p, precip: pr, code, text: WX(code), wind: Math.round(wind), gust: Math.round(gust), dir: H.wind_direction_10m[ix] || 0, temp: Math.round(H.temperature_2m[ix]), level: level2 };
    });
  }
  function departureCurve(route2, mode2, now = /* @__PURE__ */ new Date()) {
    const out = [];
    for (let off = 0; off <= 180; off += 15) {
      const d = new Date(now.getTime() + off * 6e4);
      const e = estimate(route2, mode2, d);
      out.push({ off, dur: e.dur, avg: e.avg });
    }
    let best = out[0];
    for (const o of out) if (o.dur < best.dur - 20) best = o;
    return { list: out, best };
  }
  function tilesAlong(route2, zooms = [12, 13, 14], cap = 240) {
    const set = /* @__PURE__ */ new Set(), list = [];
    for (const z of zooms) {
      const n = Math.pow(2, z);
      let last = "";
      for (let i = 0; i < route2.coords.length; i += Math.max(1, Math.floor(route2.coords.length / 600))) {
        const p = route2.coords[i];
        const x = Math.floor((p[0] + 180) / 360 * n), y = Math.floor((1 - Math.log(Math.tan(rad(p[1])) + 1 / Math.cos(rad(p[1]))) / Math.PI) / 2 * n);
        if (x + "," + y === last) continue;
        last = x + "," + y;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const k = z + "/" + (x + dx) + "/" + (y + dy);
          if (!set.has(k)) {
            set.add(k);
            list.push([z, x + dx, y + dy]);
          }
        }
      }
    }
    return list.slice(0, cap);
  }
  async function precache(tpl, tiles, onProgress) {
    let done = 0, fail = 0;
    const q = tiles.slice();
    const worker = async () => {
      while (q.length) {
        const [z, x, y] = q.shift();
        const u = tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y);
        try {
          const r = await fetch(u);
          if (!r.ok) fail++;
        } catch (e) {
          fail++;
        }
        done++;
        onProgress && onProgress(done, tiles.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { done, fail };
  }
  async function meetupPoints(people, route2) {
    const cx = people.reduce((s, p) => s + p.lng, 0) / people.length, cy = people.reduce((s, p) => s + p.lat, 0) / people.length;
    let cands2 = [];
    try {
      const j = await op(`[out:json][timeout:15];nwr["amenity"~"^(cafe|restaurant|fast_food)$"](around:2500,${cy.toFixed(5)},${cx.toFixed(5)});out center 60;`, 14e3);
      for (const e of j.elements || []) {
        const c = ctr(e);
        if (!c) continue;
        const t = e.tags || {};
        cands2.push({ name: nameOf(t) || "\u0645\u0642\u0647\u0649 / \u0645\u0637\u0639\u0645", lng: c[0], lat: c[1], d: hav([cx, cy], c) });
      }
    } catch (e) {
    }
    cands2.sort((a, b) => a.d - b.d);
    cands2 = cands2.slice(0, 4);
    if (!cands2.length) cands2 = [{ name: "\u0646\u0642\u0637\u0629 \u0627\u0644\u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A\u0629", lng: cx, lat: cy, d: 0, plain: true }];
    const res = await Promise.all(cands2.map(async (c) => {
      const times = await Promise.all(people.map((p) => route2(p, c).catch(() => null)));
      return { ...c, times };
    }));
    const ok = res.filter((r) => r.times.every((t) => t != null));
    if (!ok.length) throw new Error("meet");
    for (const r of ok) {
      const mx = Math.max(...r.times), mn = Math.min(...r.times);
      r.score = mx + (mx - mn) * 0.6;
    }
    ok.sort((a, b) => a.score - b.score);
    return ok;
  }

  // src/main.js
  var maplibregl = window.maplibregl;
  var APP_VERSION = "3.1";
  var lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2;
  var DEF = { voice: true, buildings: true, terrain: true, style: "liberty", headingUp: true, radius: 2e3, recent: [], perf: "auto", cons: 8, price: 0.15, cur: "\u062F.\u0644" };
  var ST = store("mp_settings_v3", DEF);
  if (!Array.isArray(ST.recent)) ST.recent = [];
  var STYLES = { liberty: "https://tiles.openfreemap.org/styles/liberty", bright: "https://tiles.openfreemap.org/styles/bright", positron: "https://tiles.openfreemap.org/styles/positron" };
  var DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  var FALLBACK_CENTER = [13.1913, 32.8872];
  var RT = "https://routing.openstreetmap.de/";
  var NETS = { car: RT + "routed-car/route/v1/driving/", bike: RT + "routed-bike/route/v1/driving/", foot: RT + "routed-foot/route/v1/driving/" };
  var OSRM_FALLBACK = "https://router.project-osrm.org/route/v1/driving/";
  var MODES = { car: { label: "\u0633\u064A\u0627\u0631\u0629", ico: "i-car", net: "car", color: "#1a73e8" }, moto: { label: "\u062F\u0631\u0627\u062C\u0629 \u0646\u0627\u0631\u064A\u0629", ico: "i-moto", net: "car", color: "#1a73e8" }, bike: { label: "\u062F\u0631\u0627\u062C\u0629 \u0647\u0648\u0627\u0626\u064A\u0629", ico: "i-bike", net: "bike", color: "#16a34a" }, foot: { label: "\u0645\u0634\u064A\u0627\u064B", ico: "i-walk", net: "foot", color: "#7c3aed" }, access: { label: "\u0643\u0631\u0633\u064A \u0645\u062A\u062D\u0631\u0643 / \u0639\u0631\u0628\u0629 / \u0643\u0628\u0627\u0631 \u0627\u0644\u0633\u0646", ico: "i-access", net: "foot", color: "#0891b2" } };
  var OWN = /* @__PURE__ */ new Set(["car-body", "car-shadow", "car-halo", "route-casing", "route-line", "poi-pillar", "hills", "mp-buildings", "me-halo", "me-dot"]);
  var params = new URLSearchParams(location.search);
  var SIM_SPEED = +params.get("simspeed") || 16;
  var HAZ = { pothole: "\u062D\u0641\u0631\u064A\u0627\u062A / \u062D\u0641\u0631\u0629", water: "\u062A\u062C\u0645\u0639 \u0645\u064A\u0627\u0647", bump: "\u0645\u0637\u0628 \u0639\u0634\u0648\u0627\u0626\u064A", nosidewalk: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0631\u0635\u064A\u0641", crash: "\u062D\u0627\u062F\u062B / \u0639\u0627\u0626\u0642", police: "\u0646\u0642\u0637\u0629 \u062A\u0641\u062A\u064A\u0634" };
  var isWalk = (m) => m === "foot" || m === "access" || m === "bike";
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "on") for (const ev in v) e.addEventListener(ev, v[ev]);
      else if (k === "style") e.style.cssText = v;
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  var NS = "http://www.w3.org/2000/svg";
  var svg = (id, cls) => {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("class", "ic " + (cls || ""));
    const u = document.createElementNS(NS, "use");
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
  async function getJSON(url, ms = 1e4, signal) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    if (signal) signal.addEventListener("abort", () => c.abort());
    try {
      const r = await fetch(url, { signal: c.signal, headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("http " + r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }
  var me = { has: false, lng: 0, lat: 0, hdg: 0, speed: 0, acc: 0 };
  var vis = { lng: 0, lat: 0, hdg: 0 };
  var map = null;
  var follow = false;
  var northOnly = false;
  var dest = null;
  var route = null;
  var mode = "car";
  var routes = {};
  var cands = [];
  var destMarker = null;
  var poiState = null;
  var poiMarkers = [];
  var hazMarkers = [];
  var VS = null;
  var navActive = false;
  var simOn = false;
  var simTimer = null;
  var watchId = null;
  var compassHeading = null;
  var lastFixT = 0;
  var lastFixWall = 0;
  var lastReroute = 0;
  var wakeLock = null;
  var deferredInstall = null;
  var swReg = null;
  var updating = false;
  var lastAlong = null;
  var resumeT = 0;
  var autoLow = false;
  var prev = null;
  var meet = { on: false, pts: [], mode: "car", mk: [] };
  var lmBusy = false;
  var lastCur = -1;
  var lanesEl = null;
  var wxMarkers = [];
  var extraMk = [];
  var warned = /* @__PURE__ */ new Set();
  var nav = new Navigator({ speak: (t) => speak(t), arrive: () => onArrive() });
  var lastPos = (() => {
    try {
      return JSON.parse(localStorage.getItem("mp_last"));
    } catch (e) {
      return null;
    }
  })();
  var carMode = () => navActive && (mode === "car" || mode === "moto");
  var level = () => ST.perf === "auto" ? lowEnd || autoLow ? "low" : "high" : ST.perf === "low" ? "low" : "high";
  var fallbackStyle = () => ({ version: 8, name: "offline", sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#dfe7ef" } }] });
  function enhanceStyle(j) {
    try {
      VS = Object.keys(j.sources || {}).find((k) => j.sources[k].type === "vector") || null;
      const ext = (j.layers || []).filter((l) => l.type === "fill-extrusion");
      if (ext.length) {
        for (const l of ext) {
          l.layout = l.layout || {};
          l.layout.visibility = ST.buildings ? "visible" : "none";
          l.minzoom = level() === "low" ? 15.3 : Math.min(l.minzoom || 15, 14.5);
        }
      } else if (VS) {
        const i = j.layers.findIndex((l) => l.type === "symbol");
        const L = {
          id: "mp-buildings",
          type: "fill-extrusion",
          source: VS,
          "source-layer": "building",
          minzoom: level() === "low" ? 15.3 : 14,
          layout: { visibility: ST.buildings ? "visible" : "none" },
          paint: { "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 5], 0, "#e6e1d8", 40, "#d3d8e2", 150, "#b9c4dc"], "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.93 }
        };
        j.layers.splice(i < 0 ? j.layers.length : i, 0, L);
      }
    } catch (e) {
    }
    return j;
  }
  async function loadStyle(name) {
    try {
      const j = await getJSON(STYLES[name] || STYLES.liberty, 8e3);
      return enhanceStyle(j);
    } catch (e) {
      setStatus("\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u2014 \u064A\u0639\u0645\u0644 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u062D\u062F\u0648\u062F");
      return fallbackStyle();
    }
  }
  var firstSymbol = () => {
    const l = map.getStyle().layers.find((l2) => l2.type === "symbol");
    return l && l.id;
  };
  var EMPTY = { type: "FeatureCollection", features: [] };
  var terrainOn = () => ST.terrain && level() === "high";
  function applyTerrain() {
    try {
      if (terrainOn()) {
        if (!map.getSource("dem")) map.addSource("dem", { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain \xA9 Mapzen / AWS" });
        if (!map.getLayer("hills")) map.addLayer({ id: "hills", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.3, "hillshade-shadow-color": "#5a6a7c", "hillshade-highlight-color": "#ffffff" } }, firstSymbol() || void 0);
        map.setTerrain({ source: "dem", exaggeration: 1.2 });
      } else {
        map.setTerrain(null);
        if (map.getLayer("hills")) map.removeLayer("hills");
      }
    } catch (e) {
      console.warn("terrain", e);
    }
  }
  function applyPerf() {
    try {
      map.setPixelRatio && map.setPixelRatio(Math.min(devicePixelRatio || 1, level() === "low" ? 1.25 : 2));
    } catch (e) {
    }
    try {
      for (const l of map.getStyle().layers) if (l.type === "fill-extrusion" && !OWN.has(l.id)) map.setLayerZoomRange(l.id, level() === "low" ? 15.3 : 14.5, 24);
      if (map.getLayer("mp-buildings")) map.setLayerZoomRange("mp-buildings", level() === "low" ? 15.3 : 14, 24);
    } catch (e) {
    }
    applyTerrain();
  }
  function setupLayers() {
    try {
      map.setLight({ anchor: "map", color: "#fff4dc", intensity: 0.42, position: [1.4, 215, 38] });
      if (map.setSky) map.setSky({ "sky-color": "#6fb1f2", "horizon-color": "#eaf3ff", "fog-color": "#dde8f4", "sky-horizon-blend": 0.55, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.25, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 1, 12, 0] });
    } catch (e) {
    }
    applyTerrain();
    for (const id of ["route-line", "route-casing", "poi-pillar", "me-dot", "me-halo"]) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of ["route", "poi", "me"]) if (map.getSource(id)) map.removeSource(id);
    map.addSource("route", { type: "geojson", data: EMPTY, lineMetrics: true });
    map.addSource("poi", { type: "geojson", data: EMPTY });
    map.addSource("me", { type: "geojson", data: EMPTY });
    map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 7, 18, 19], "line-opacity": 0.96 } });
    map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4.5, 18, 12], "line-gradient": solidGradient("#1a73e8") } });
    map.addLayer({ id: "poi-pillar", type: "fill-extrusion", source: "poi", paint: { "fill-extrusion-color": ["get", "c"], "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.9 } });
    map.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 16, "circle-color": "#facc15", "circle-opacity": 0.28, "circle-pitch-alignment": "map" } });
    map.addLayer({ id: "me-dot", type: "circle", source: "me", paint: { "circle-radius": 7, "circle-color": "#facc15", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5, "circle-pitch-alignment": "map" } });
    addCarLayers(map);
    pushRoute();
    pushPOI();
    lastCarMode = null;
    lastPt = [0, 0];
    drawMe(true);
    applyPerf();
  }
  function setVisibleMe(car) {
    for (const id of ["me-dot", "me-halo"]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", car ? "none" : "visible");
  }
  function pushRoute() {
    const s = map && map.getSource("route");
    if (!s) return;
    if (route) {
      s.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.coords } });
      try {
        map.setPaintProperty("route-line", "line-gradient", route.traffic ? gradientExpr(route.traffic.stops) : solidGradient(MODES[mode].color));
      } catch (e) {
      }
    } else s.setData(EMPTY);
  }
  function pushPOI() {
    const s = map && map.getSource("poi");
    if (!s) return;
    s.setData({ type: "FeatureCollection", features: poiState ? poiState.list.map((p) => ({ type: "Feature", properties: { c: CATS[p.cat].color, h: 34 }, geometry: { type: "Polygon", coordinates: [circlePoly(p.lng, p.lat, 7)] } })) : [] });
  }
  var lastDraw = 0;
  var camB = 0;
  var lastCarMode = null;
  var lastPt = [0, 0];
  var fpsN = 0;
  var fpsSum = 0;
  function drawMe(force) {
    if (!map || !me.has || !map.getSource("me") || prev) return;
    const cm = carMode();
    if (cm !== lastCarMode) {
      lastCarMode = cm;
      setVisibleMe(cm);
      if (!cm) {
        for (const k of ["car", "car-shadow", "car-halo"]) map.getSource(k) && map.getSource(k).setData(EMPTY);
      }
    }
    if (cm) {
      const d = carData(vis.lng, vis.lat, vis.hdg, carScale(map.getZoom()));
      map.getSource("car").setData(d.car);
      map.getSource("car-shadow").setData(d.shadow);
      map.getSource("car-halo").setData(d.halo);
    } else if (force || Math.abs(vis.lng - lastPt[0]) + Math.abs(vis.lat - lastPt[1]) > 1e-9) {
      map.getSource("me").setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [vis.lng, vis.lat] } });
      lastPt = [vis.lng, vis.lat];
    }
  }
  function predicted(now) {
    if (!navActive || me.speed < 1.2 || !lastFixWall) return [me.lng, me.lat];
    const dt = Math.min(1.6, (now - lastFixWall) / 1e3), v = me.speed * dt, r = me.hdg * Math.PI / 180;
    return [me.lng + Math.sin(r) * v / (111320 * Math.cos(me.lat * Math.PI / 180)), me.lat + Math.cos(r) * v / 111320];
  }
  function watchFps(t, dt) {
    if (ST.perf !== "auto" || autoLow || lowEnd) return;
    if (t < 6e3) return;
    fpsN++;
    fpsSum += dt;
    if (fpsN >= 150) {
      if (fpsSum / fpsN > 0.036) {
        autoLow = true;
        applyPerf();
        toast("\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0648\u0636\u0639 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u062E\u0641\u064A\u0641 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0644\u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u0633\u0644\u0627\u0633\u0629", 4500);
      }
      fpsN = 0;
      fpsSum = 0;
    }
  }
  function loop(t) {
    requestAnimationFrame(loop);
    if (!map || !me.has || prev) return;
    const dt = Math.min(0.1, (t - (loop.t || t)) / 1e3);
    loop.t = t;
    if (follow || navActive) watchFps(t, dt);
    const k = 1 - Math.exp(-dt * 8), kh = 1 - Math.exp(-dt * 9);
    const tg = predicted(Date.now());
    vis.lng += (tg[0] - vis.lng) * k;
    vis.lat += (tg[1] - vis.lat) * k;
    vis.hdg = normDeg(vis.hdg + angDiff(me.hdg, vis.hdg) * kh);
    if (t - lastDraw < (level() === "low" ? 40 : 28)) return;
    lastDraw = t;
    drawMe();
    deadReckon();
    if (follow) {
      const useHeading = navActive || !northOnly && ST.headingUp && me.speed > 0.8;
      if (useHeading) camB = normDeg(camB + angDiff(vis.hdg, camB) * 0.16);
      else camB = map.getBearing();
      map.jumpTo({ center: [vis.lng, vis.lat], bearing: useHeading ? camB : map.getBearing(), padding: { top: navActive ? Math.round(innerHeight * 0.38) : 0, bottom: 0, left: 0, right: 0 } });
    }
  }
  function setFollow(v) {
    follow = v;
    N.bLocate.classList.toggle("on", v);
  }
  function userTouched() {
    if (prev) return;
    if (navActive) {
      if (follow || resumeT) {
        setFollow(false);
        clearTimeout(resumeT);
        resumeT = setTimeout(() => {
          resumeT = 0;
          if (navActive && me.has) setFollow(true);
        }, 9e3);
      }
    } else if (follow) setFollow(false);
  }
  function deadReckon() {
    if (!navActive || simOn || !route || lastAlong == null) return;
    const gap = (Date.now() - lastFixWall) / 1e3;
    if (gap < 4 || gap > 120 || me.speed < 1.5) return;
    if (deadReckon.t && Date.now() - deadReckon.t < 500) return;
    deadReckon.t = Date.now();
    lastAlong = Math.min(route.total, lastAlong + me.speed * 0.5);
    const p = pointAt(route, lastAlong), q = pointAt(route, lastAlong + 8);
    me.lng = p[0];
    me.lat = p[1];
    me.hdg = bearing(p, q);
    setStatus("\u0625\u0634\u0627\u0631\u0629 GPS \u0645\u0641\u0642\u0648\u062F\u0629 \u2014 \u0645\u0648\u0642\u0639 \u062A\u0642\u062F\u064A\u0631\u064A");
    navTick(true);
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
          toast("\u062A\u0645 \u0631\u0641\u0636 \u0625\u0630\u0646 \u0627\u0644\u0645\u0648\u0642\u0639 \u2014 \u0641\u0639\u0651\u0644\u0647 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u062B\u0645 \u0627\u0636\u063A\u0637 \u0632\u0631 \u0645\u0648\u0642\u0639\u064A", 5500);
          setStatus("\u0625\u0630\u0646 \u0627\u0644\u0645\u0648\u0642\u0639 \u0645\u0631\u0641\u0648\u0636");
          try {
            navigator.geolocation.clearWatch(watchId);
          } catch (e) {
          }
          watchId = null;
        } else if (err.code === 2) setStatus("\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0645\u0648\u0642\u0639 \u062D\u0627\u0644\u064A\u0627\u064B");
        else setStatus("\u0625\u0634\u0627\u0631\u0629 GPS \u0636\u0639\u064A\u0641\u0629\u2026");
      },
      { enableHighAccuracy: true, maximumAge: 1e3, timeout: 2e4 }
    );
  }
  function handleFix(f) {
    const prevP = me.has ? [me.lng, me.lat] : null, cur = [f.lng, f.lat];
    const moved = prevP ? hav(prevP, cur) : 0;
    const dts = lastFixT ? Math.max(0.2, (f.t - lastFixT) / 1e3) : 1;
    let hdg = null;
    if (f.heading != null && !isNaN(f.heading) && (f.speed == null || f.speed > 1)) hdg = f.heading;
    else if (prevP && moved > 4 && (f.acc == null || f.acc < 80)) hdg = bearing(prevP, cur);
    const spd = f.speed != null && !isNaN(f.speed) ? f.speed : prevP ? moved / dts : 0;
    lastFixWall = Date.now();
    if (me.has && moved < 1.2 && spd < 0.6 && !f.force) {
      me.acc = f.acc;
      me.speed = 0;
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
      if (!meet.on && !dest) {
        map.jumpTo({ center: cur, zoom: Math.max(map.getZoom(), 16.3), pitch: 60 });
        setFollow(true);
      }
      drawMe(true);
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
  var sCache = /* @__PURE__ */ new Map();
  var sAbort = null;
  var lastNom = 0;
  var rowOf = (title, sub, lng, lat, ico) => ({ title: String(title || "\u0645\u0643\u0627\u0646").trim(), sub: sub || "", lng: +lng, lat: +lat, ico: ico || "i-pin" });
  async function photon(q, signal) {
    const o = origin();
    const j = await getJSON(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lat=${o[1].toFixed(3)}&lon=${o[0].toFixed(3)}&location_bias_scale=0.5`, 4500, signal);
    return (j.features || []).map((f) => {
      const p = f.properties || {}, c = f.geometry.coordinates;
      const t = p.name || [p.street, p.housenumber].filter(Boolean).join(" ");
      return rowOf(t, [p.street && p.name ? p.street : "", p.district, p.city, p.state, p.country].filter(Boolean).join("\u060C "), c[0], c[1]);
    }).filter((r) => r.title && isFinite(r.lng));
  }
  async function nominatim(q, signal) {
    const wait = lastNom + 1e3 - Date.now();
    if (wait > 0) await sleep(wait);
    lastNom = Date.now();
    const o = origin();
    const j = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=ar,en&q=${encodeURIComponent(q)}&viewbox=${o[0] - 0.6},${o[1] + 0.6},${o[0] + 0.6},${o[1] - 0.6}`, 9e3, signal);
    return j.map((r) => {
      const p = String(r.display_name || "").split(",");
      return rowOf(r.name || p[0], p.slice(1, 4).join("\u060C").trim(), r.lon, r.lat);
    });
  }
  function showSugg(items, emptyMsg, loading) {
    const ul = N.sugg;
    ul.replaceChildren();
    if (!items.length) ul.append(h("li", { class: "none" }, emptyMsg || "\u0644\u0627 \u0646\u062A\u0627\u0626\u062C"));
    for (const it of items) ul.append(h("li", { tabindex: "0", role: "option", on: { click: () => choose(it), keydown: (e) => {
      if (e.key === "Enter") choose(it);
    } } }, svg(it.ico || "i-pin"), h("div", {}, h("b", {}, it.title), h("small", {}, it.sub || ""))));
    if (loading && items.length) ul.append(h("li", { class: "none" }, "\u062C\u0627\u0631\u064D \u0627\u0644\u0628\u062D\u062B\u2026"));
    ul.classList.remove("hide");
  }
  function choose(it) {
    N.sugg.classList.add("hide");
    N.q.value = it.title;
    N.qclear.classList.remove("hide");
    N.q.blur();
    rememberSearch(it);
    if (meet.on) {
      addMeetPoint({ lng: it.lng, lat: it.lat, name: it.title });
      map.flyTo({ center: [it.lng, it.lat], duration: 700 });
      return;
    }
    clearPOI();
    showPlace({ lng: it.lng, lat: it.lat, name: it.title, sub: it.sub }, true);
  }
  function rememberSearch(it) {
    ST.recent = [{ title: it.title, sub: it.sub || "", lng: it.lng, lat: it.lat }, ...ST.recent.filter((r) => r.title !== it.title)].slice(0, 8);
    save("mp_settings_v3", ST);
  }
  async function doSearch() {
    const v = N.q.value.trim();
    N.qclear.classList.toggle("hide", !v);
    if (v.length < 2) {
      N.sugg.classList.add("hide");
      return;
    }
    if (sAbort) sAbort.abort();
    sAbort = new AbortController();
    const sig = sAbort.signal;
    const local = ST.recent.filter((r) => r.title.includes(v)).slice(0, 3).map((r) => ({ ...r, ico: "i-note" }));
    if (sCache.has(v)) {
      showSugg([...local, ...sCache.get(v)]);
      return;
    }
    showSugg(local, "", true);
    if (!local.length) showSugg([], "\u062C\u0627\u0631\u064D \u0627\u0644\u0628\u062D\u062B\u2026");
    try {
      let res = [];
      try {
        res = await photon(v, sig);
      } catch (e) {
        if (sig.aborted) return;
      }
      if (!res.length && !sig.aborted) res = await nominatim(v, sig);
      if (sig.aborted) return;
      sCache.set(v, res);
      if (sCache.size > 60) sCache.delete(sCache.keys().next().value);
      showSugg([...local, ...res.filter((r) => !local.some((l) => l.title === r.title))], "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u0644\u0647\u0630\u0627 \u0627\u0644\u0628\u062D\u062B");
    } catch (e) {
      if (!sig.aborted) showSugg(local, "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0628\u062D\u062B \u2014 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644");
    }
  }
  function showRecent() {
    if (!ST.recent.length) {
      toast("\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u062B \u0633\u0627\u0628\u0642\u0629");
      return;
    }
    showSugg(ST.recent.map((x) => ({ ...x, ico: "i-note" })));
  }
  var TYPE_AR = { restaurant: "\u0645\u0637\u0639\u0645", cafe: "\u0645\u0642\u0647\u0649", fast_food: "\u0648\u062C\u0628\u0627\u062A \u0633\u0631\u064A\u0639\u0629", fuel: "\u0645\u062D\u0637\u0629 \u0648\u0642\u0648\u062F", place_of_worship: "\u062F\u0627\u0631 \u0639\u0628\u0627\u062F\u0629", mosque: "\u0645\u0633\u062C\u062F", hospital: "\u0645\u0633\u062A\u0634\u0641\u0649", clinic: "\u0639\u064A\u0627\u062F\u0629", pharmacy: "\u0635\u064A\u062F\u0644\u064A\u0629", school: "\u0645\u062F\u0631\u0633\u0629", university: "\u062C\u0627\u0645\u0639\u0629", bank: "\u0628\u0646\u0643", atm: "\u0635\u0631\u0627\u0641 \u0622\u0644\u064A", supermarket: "\u0633\u0648\u0628\u0631\u0645\u0627\u0631\u0643\u062A", convenience: "\u0628\u0642\u0627\u0644\u0629", bakery: "\u0645\u062E\u0628\u0632", park: "\u062D\u062F\u064A\u0642\u0629", hotel: "\u0641\u0646\u062F\u0642", parking: "\u0645\u0648\u0642\u0641 \u0633\u064A\u0627\u0631\u0627\u062A", police: "\u0634\u0631\u0637\u0629", post_office: "\u0628\u0631\u064A\u062F", library: "\u0645\u0643\u062A\u0628\u0629", cinema: "\u0633\u064A\u0646\u0645\u0627", stadium: "\u0645\u0644\u0639\u0628", bus_station: "\u0645\u062D\u0637\u0629 \u062D\u0627\u0641\u0644\u0627\u062A", museum: "\u0645\u062A\u062D\u0641", shop: "\u0645\u062A\u062C\u0631", mall: "\u0645\u0631\u0643\u0632 \u062A\u0633\u0648\u0642" };
  var kmFrom = (p) => me.has ? fmtDist(hav([me.lng, me.lat], [p.lng, p.lat])) : null;
  function setMarker() {
    if (destMarker) {
      destMarker.remove();
      destMarker = null;
    }
    if (!dest) return;
    const el = h("div", { class: "pin dest" }, h("div", { class: "head" }), h("div", { class: "glyph" }, svg("i-flag")), h("div", { class: "foot" }), h("div", { class: "lbl" }, dest.name || "\u0627\u0644\u0648\u062C\u0647\u0629"));
    destMarker = new maplibregl.Marker({ element: h("div", { class: "mk" }, el), anchor: "bottom" }).setLngLat([dest.lng, dest.lat]).addTo(map);
  }
  var shareURL = (p) => {
    const u = new URL(location.href.split("#")[0].split("?")[0]);
    u.searchParams.set("ll", p.lat.toFixed(5) + "," + p.lng.toFixed(5));
    if (p.name) u.searchParams.set("n", p.name);
    return u.toString();
  };
  async function sharePlace(p) {
    const data = { title: p.name || "\u0645\u0648\u0642\u0639", text: (p.name || "\u0645\u0648\u0642\u0639") + " \u2014 \u0639\u0628\u0631 \u062A\u0637\u0628\u064A\u0642 \u0645\u0633\u0627\u0631\u064A", url: shareURL(p) };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(data.url);
      toast("\u062A\u0645 \u0646\u0633\u062E \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0642\u0639");
    } catch (e) {
      toast(data.url, 6e3);
    }
  }
  function showPlace(p, fly) {
    stopNavIfIdle();
    clearExtras();
    route = null;
    routes = {};
    cands = [];
    pushRoute();
    dest = p;
    setMarker();
    if (fly) {
      setFollow(false);
      map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16), pitch: 60, duration: 900, padding: { top: 0, bottom: Math.round(innerHeight * 0.3), left: 0, right: 0 } });
    }
    renderPlace();
  }
  function renderPlace() {
    const p = dest;
    if (!p) return;
    const d = kmFrom(p);
    showSheet(h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg("i-pin"), h("h3", {}, p.name || "\u0645\u0648\u0642\u0639 \u0645\u062D\u062F\u062F"), h("button", { class: "plain", "aria-label": "\u0625\u063A\u0644\u0627\u0642", on: { click: clearAll } }, svg("i-close"))),
      p.sub ? h("p", { class: "note" }, p.sub) : null,
      h("div", { class: "chipsrow" }, p.type ? h("span", { class: "tag" }, p.type) : null, d ? h("span", { class: "tag" }, "\u064A\u0628\u0639\u062F \u0639\u0646\u0643 \u2248 " + d) : null, h("span", { class: "tag mono" }, p.lat.toFixed(5) + " , " + p.lng.toFixed(5))),
      h(
        "div",
        { class: "btns" },
        h("button", { class: "primary", on: { click: () => chooseMode() } }, svg("i-route"), "\u0628\u062F\u0621"),
        h("button", { class: "ghost", on: { click: () => sharePlace(p) } }, svg("i-share"), "\u0645\u0634\u0627\u0631\u0643\u0629"),
        h("button", { class: "ghost", on: { click: async () => {
          try {
            await navigator.clipboard.writeText(p.lat.toFixed(6) + "," + p.lng.toFixed(6));
            toast("\u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u0625\u062D\u062F\u0627\u062B\u064A\u0627\u062A");
          } catch (e) {
            toast(p.lat.toFixed(6) + "," + p.lng.toFixed(6), 5e3);
          }
        } } }, svg("i-copy"), "\u0646\u0633\u062E")
      ),
      h("div", { class: "btns" }, h("button", { class: "ghost", on: { click: () => showParking() } }, svg("i-park"), "\u0627\u0644\u0645\u0648\u0627\u0642\u0641 \u0627\u0644\u0642\u0631\u064A\u0628\u0629 \u0648\u0641\u0631\u0635\u0629 \u0648\u062C\u0648\u062F \u0645\u0648\u0642\u0641"))
    ));
  }
  async function mapClick(e) {
    if (navActive || prev) return;
    const ll = e.lngLat;
    if (meet.on) {
      addMeetPoint({ lng: ll.lng, lat: ll.lat, name: "\u0627\u0644\u0634\u062E\u0635 " + (meet.pts.length + 1) });
      return;
    }
    let name = null, type = null;
    try {
      const fs = map.queryRenderedFeatures(e.point).filter((f2) => f2.properties && !OWN.has(f2.layer.id) && (f2.properties["name:ar"] || f2.properties.name));
      const f = fs.find((f2) => f2.sourceLayer === "poi") || fs.find((f2) => f2.sourceLayer !== "transportation_name" && f2.sourceLayer !== "waterway") || fs[0];
      if (f) {
        name = f.properties["name:ar"] || f.properties.name;
        const c = f.properties.subclass || f.properties.class;
        type = TYPE_AR[c] || null;
      }
    } catch (_) {
    }
    const p = { lng: ll.lng, lat: ll.lat, name: name || "\u0645\u0648\u0642\u0639 \u0645\u062D\u062F\u062F \u0639\u0644\u0649 \u0627\u0644\u062E\u0631\u064A\u0637\u0629", type };
    clearPOI();
    showPlace(p, false);
    try {
      const j = await getJSON(`https://photon.komoot.io/reverse?lon=${ll.lng.toFixed(6)}&lat=${ll.lat.toFixed(6)}`, 5e3);
      const pr = j.features && j.features[0] && j.features[0].properties || {};
      if (dest !== p) return;
      if (!name && (pr.name || pr.street)) p.name = pr.name || [pr.street, pr.housenumber].filter(Boolean).join(" ");
      p.sub = [pr.street && pr.name ? pr.street : "", pr.district, pr.city, pr.state, pr.country].filter(Boolean).join("\u060C ");
      if (!p.type && pr.osm_value && TYPE_AR[pr.osm_value]) p.type = TYPE_AR[pr.osm_value];
      setMarker();
      renderPlace();
    } catch (err) {
    }
  }
  async function showParking() {
    if (!dest) return;
    const p = dest;
    showSheet(h("div", {}, h("div", { class: "sh-h" }, svg("i-park"), h("h3", {}, "\u0627\u0644\u0645\u0648\u0627\u0642\u0641 \u0642\u0631\u0628 \u0627\u0644\u0648\u062C\u0647\u0629"), h("button", { class: "plain", on: { click: () => renderPlace() } }, svg("i-close"))), h("p", { class: "note" }, "\u062C\u0627\u0631\u064D \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0646\u0637\u0642\u0629\u2026")));
    try {
      const sc = await parkingScan(p.lng, p.lat);
      const ch = parkingChance(/* @__PURE__ */ new Date(), sc);
      const col = ch.p >= 65 ? "#22c55e" : ch.p >= 40 ? "#facc15" : "#ef4444";
      const lots = sc.lots.slice(0, 4).map((l) => h("button", { class: "item", on: { click: () => showPlace({ lng: l.lng, lat: l.lat, name: l.name, sub: "\u0645\u0648\u0642\u0641 \u0633\u064A\u0627\u0631\u0627\u062A" + (l.fee ? " \xB7 \u0645\u062F\u0641\u0648\u0639" : "") + (l.cap ? " \xB7 \u0633\u0639\u0629 " + l.cap : ""), type: "\u0645\u0648\u0642\u0641" }, true) } }, h("div", { class: "pic", style: "--c:#2563eb" }, svg("i-park")), h("div", { class: "tx" }, h("b", {}, l.name), h("small", {}, l.cap ? "\u0633\u0639\u0629 " + l.cap + " \u0633\u064A\u0627\u0631\u0629" : "\u0627\u0644\u0633\u0639\u0629 \u063A\u064A\u0631 \u0645\u0633\u062C\u0651\u0644\u0629")), h("div", { class: "dd" }, fmtDist(l.d))));
      const sts = sc.streets.map((s) => h("button", { class: "item", on: { click: () => showPlace({ lng: s.lng, lat: s.lat, name: s.name, sub: "\u0634\u0627\u0631\u0639 \u064A\u0633\u0645\u062D \u0628\u0627\u0644\u0648\u0642\u0648\u0641 \u0639\u0644\u0649 \u062C\u0627\u0646\u0628\u0647", type: "\u0648\u0642\u0648\u0641 \u0641\u064A \u0627\u0644\u0634\u0627\u0631\u0639" }, true) } }, h("div", { class: "pic", style: "--c:#0ea5e9" }, svg("i-route")), h("div", { class: "tx" }, h("b", {}, s.name), h("small", {}, "\u0648\u0642\u0648\u0641 \u0639\u0644\u0649 \u062C\u0627\u0646\u0628 \u0627\u0644\u0637\u0631\u064A\u0642 (\u062D\u0633\u0628 OSM)")), h("div", { class: "dd" }, fmtDist(s.d))));
      showSheet(h(
        "div",
        {},
        h("div", { class: "sh-h" }, svg("i-park"), h("h3", {}, "\u0627\u0644\u0645\u0648\u0627\u0642\u0641 \u0642\u0631\u0628 " + (p.name || "\u0627\u0644\u0648\u062C\u0647\u0629")), h("button", { class: "plain", on: { click: () => renderPlace() } }, svg("i-close"))),
        h("div", { class: "gauge" }, h("div", { class: "g-n", style: "color:" + col }, ch.p + "%"), h("div", { class: "g-t" }, h("b", {}, "\u0641\u0631\u0635\u0629 \u0625\u064A\u062C\u0627\u062F \u0645\u0648\u0642\u0641 \u0627\u0644\u0622\u0646: " + ch.label), h("small", {}, "\u062A\u0642\u062F\u064A\u0631 \u064A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u0648\u0642\u062A \u0648\u0627\u0644\u064A\u0648\u0645 \u0648\u0643\u062B\u0627\u0641\u0629 \u0627\u0644\u0645\u062D\u0644\u0627\u062A \u0648\u0627\u0644\u0645\u0648\u0627\u0642\u0641 \u0627\u0644\u0645\u0633\u062C\u0651\u0644\u0629"))),
        lots.length || sts.length ? h("div", { class: "list" }, lots, sts) : h("p", { class: "note" }, "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0648\u0627\u0642\u0641 \u0645\u0633\u062C\u0651\u0644\u0629 \u0641\u064A OSM \u0636\u0645\u0646 450 \u0645 \u2014 \u062C\u0631\u0651\u0628 \u0627\u0644\u0648\u0642\u0648\u0641 \u0639\u0644\u0649 \u0627\u0644\u0634\u0648\u0627\u0631\u0639 \u0627\u0644\u0645\u062C\u0627\u0648\u0631\u0629."),
        h("p", { class: "note" }, "\u0644\u064A\u0633\u062A \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u062D\u0638\u064A\u0629 \u0644\u0625\u0634\u063A\u0627\u0644 \u0627\u0644\u0645\u0648\u0627\u0642\u0641: \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0635\u0627\u062F\u0631 \u0645\u062C\u0627\u0646\u064A\u0629 \u0644\u0630\u0644\u0643.")
      ));
    } catch (e) {
      showSheet(h("div", {}, h("div", { class: "sh-h" }, svg("i-park"), h("h3", {}, "\u0627\u0644\u0645\u0648\u0627\u0642\u0641"), h("button", { class: "plain", on: { click: () => renderPlace() } }, svg("i-close"))), h("p", { class: "err" }, "\u062A\u0639\u0630\u0651\u0631 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u0642\u0641. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644."), h("div", { class: "btns" }, h("button", { class: "ghost", on: { click: renderPlace } }, "\u0631\u062C\u0648\u0639"), h("button", { class: "primary", on: { click: showParking } }, "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629"))));
    }
  }
  async function osrm(net, a, b, alts, via) {
    const pts = [a, ...via || [], b].map((p) => p[0].toFixed(6) + "," + p[1].toFixed(6)).join(";");
    const q = `${pts}?overview=full&geometries=geojson&steps=true&annotations=false${alts ? "&alternatives=true" : ""}`;
    try {
      const j = await getJSON(NETS[net] + q, 13e3);
      if (j.code === "Ok") return j;
    } catch (e) {
    }
    if (net === "car") {
      const j = await getJSON(OSRM_FALLBACK + q + "&continue_straight=default", 13e3);
      if (j.code === "Ok") return j;
    }
    throw new Error("route");
  }
  var WALK_SPEED = { foot: 1.4, access: 1, bike: 4.1 };
  function buildRoute(j, m, idx = 0) {
    const r = parseOSRM(j, idx);
    if (m === "car" || m === "moto") {
      const tr = estimate(r, m);
      r.traffic = tr;
      r.freeDur = r.dur;
      r.dur = tr.dur;
    } else {
      r.traffic = null;
      const sp = WALK_SPEED[m] || 1.4, d = r.dist / sp, k = d / (r.dur || d);
      r.freeDur = r.dur;
      r.dur = d;
      for (const st of r.steps) st.dur *= k;
    }
    return r;
  }
  async function chooseMode() {
    if (!dest) return;
    const a = origin();
    if (!me.has) toast("\u0645\u0648\u0642\u0639\u0643 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F \u2014 \u0633\u064A\u064F\u062D\u0633\u0628 \u0627\u0644\u0645\u0633\u0627\u0631 \u0645\u0646 \u0645\u0631\u0643\u0632 \u0627\u0644\u062E\u0631\u064A\u0637\u0629", 3800);
    const cards = {};
    const grid = h("div", { class: "modes" });
    for (const m of Object.keys(MODES)) {
      const t = h("small", {}, "\u2026"), d = h("small", { class: "dim" }, "");
      const b = h("button", { class: "mode" + (m === "access" ? " wide" : ""), disabled: "", on: { click: () => applyMode(m) } }, svg(MODES[m].ico), h("b", {}, MODES[m].label), t, d);
      cards[m] = { b, t, d };
      grid.append(b);
    }
    showSheet(h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg("i-route"), h("h3", {}, "\u0627\u062E\u062A\u0631 \u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062A\u0646\u0642\u0644"), h("button", { class: "plain", "aria-label": "\u0631\u062C\u0648\u0639", on: { click: () => renderPlace() } }, svg("i-close"))),
      h("p", { class: "note" }, "\u0625\u0644\u0649: " + (dest.name || "\u0627\u0644\u0648\u062C\u0647\u0629")),
      grid
    ));
    routes = {};
    const nets = {};
    const B = [dest.lng, dest.lat];
    const get = (n) => nets[n] || (nets[n] = osrm(n, a, B, n === "car" || n === "foot"));
    let best = null, bestT = 1e12;
    const done = [];
    await Promise.all(Object.keys(MODES).map(async (m) => {
      try {
        const j = await get(MODES[m].net);
        let r;
        if (m === "access") {
          const all = j.routes.slice(0, 3).map((_, i) => buildRoute(j, "foot", i));
          let scan = null;
          try {
            scan = await accessScan(all);
          } catch (e) {
          }
          let bi = 0;
          if (scan && !scan.skipped) {
            for (let i = 1; i < all.length; i++) if (scan.scores[i] < scan.scores[bi] || scan.scores[i] === scan.scores[bi] && all[i].dur < all[bi].dur && false) bi = i;
          }
          r = buildRoute(j, "access", bi);
          r.access = scan ? { score: scan.scores[bi], hits: scan.hits[bi], aids: scan.aids[bi], skipped: !!scan.skipped, alts: all.length } : { unknown: true };
        } else {
          r = buildRoute(j, m, 0);
        }
        routes[m] = r;
        const c = cards[m];
        c.b.removeAttribute("disabled");
        c.t.textContent = fmtTime(r.dur);
        c.d.textContent = fmtDist(r.dist) + (m === "access" && r.access && !r.access.unknown && !r.access.skipped ? r.access.hits.length ? " \xB7 " + r.access.hits.length + " \u0639\u0627\u0626\u0642 \u0645\u062D\u062A\u0645\u0644" : " \xB7 \u0644\u0627 \u0639\u0648\u0627\u0626\u0642 \u0645\u0633\u062C\u0651\u0644\u0629" : "");
        if (m !== "access" && r.dur < bestT) {
          bestT = r.dur;
          best = m;
        }
        done.push(m);
      } catch (e) {
        cards[m].t.textContent = "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D";
        cards[m].b.classList.add("off");
      }
    }));
    if (best && cards[best]) cards[best].b.classList.add("fast");
    if (!done.length) showSheet(h("div", {}, h("div", { class: "sh-h" }, svg("i-route"), h("h3", {}, dest.name || "\u0627\u0644\u0648\u062C\u0647\u0629")), h("p", { class: "err" }, "\u062A\u0639\u0630\u0651\u0631 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0627\u0631. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0623\u0648 \u062C\u0631\u0651\u0628 \u0648\u062C\u0647\u0629 \u0623\u062E\u0631\u0649."), h("div", { class: "btns" }, h("button", { class: "ghost", on: { click: renderPlace } }, "\u0631\u062C\u0648\u0639"), h("button", { class: "primary", on: { click: chooseMode } }, "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629"))));
    else nets._j = nets.car || nets.foot, routesAlt = nets;
  }
  var routesAlt = {};
  async function applyMode(m) {
    const r = routes[m];
    if (!r) return;
    mode = m;
    route = r;
    cands = [r];
    clearExtras();
    if (m === "car" || m === "moto") {
      try {
        const j = await routesAlt.car;
        cands = [r];
        for (let i = 1; i < Math.min(3, j.routes.length); i++) cands.push(buildRoute(j, m, i));
      } catch (e) {
      }
    }
    nav.setRoute(r);
    pushRoute();
    fitRoute();
    showRouteSheet();
    loadFlags(r);
    if (m === "access" && r.access && r.access.aids) drawAccessMarkers(r);
  }
  function useCandidate(i) {
    const r = cands[i];
    if (!r) return;
    route = r;
    nav.setRoute(r);
    pushRoute();
    showRouteSheet();
    loadFlags(r);
  }
  async function recompute() {
    try {
      const j = await osrm(MODES[mode].net, origin(), [dest.lng, dest.lat], false, route && route.via ? [route.via] : null);
      const r = buildRoute(j, mode === "access" ? "foot" : mode);
      if (route && route.via) r.via = route.via;
      route = r;
      nav.setRoute(r);
      pushRoute();
      loadFlags(r);
      return true;
    } catch (e) {
      return false;
    }
  }
  function fitRoute() {
    if (!route) return;
    setFollow(false);
    const b = new maplibregl.LngLatBounds();
    for (const c of route.coords) b.extend(c);
    if (me.has) b.extend([me.lng, me.lat]);
    map.fitBounds(b, { padding: { top: 150, bottom: Math.round(innerHeight * 0.45), left: 50, right: 50 }, pitch: 50, bearing: 0, duration: 900, maxZoom: 17 });
  }
  function stopNavIfIdle() {
    if (navActive) stopNav(true);
  }
  function clearExtras() {
    for (const m of extraMk) m.remove();
    extraMk = [];
    for (const m of wxMarkers) m.remove();
    wxMarkers = [];
  }
  function clearAll() {
    stopPreview(true);
    endMeet(true);
    stopNav(true);
    dest = null;
    route = null;
    routes = {};
    cands = [];
    clearExtras();
    setMarker();
    pushRoute();
    clearPOI();
    hideSheet();
    N.q.value = "";
    N.qclear.classList.add("hide");
  }
  async function loadFlags(r) {
    if (r.flags || r.flagsBusy) return;
    r.flagsBusy = true;
    try {
      r.flags = await routeFlags(r);
      if (route === r && !navActive && !prev) renderFlags();
    } catch (e) {
      r.flags = { tunnels: [], toll: false, unknown: true };
    }
    r.flagsBusy = false;
  }
  function renderFlags() {
    const b = N.flagBox || $("#flagBox");
    if (!b || !route || !route.flags) return;
    b.replaceChildren();
    const f = route.flags;
    if (f.tunnels.length) b.append(h("span", { class: "tag warn" }, `${f.tunnels.length} \u0646\u0641\u0642/\u0645\u0645\u0631 \u0645\u063A\u0637\u0649 \u0639\u0644\u0649 \u0627\u0644\u0637\u0631\u064A\u0642`));
    if (f.toll) b.append(h("span", { class: "tag warn" }, "\u064A\u062A\u0636\u0645\u0646 \u0637\u0631\u064A\u0642\u0627\u064B \u0645\u062F\u0641\u0648\u0639 \u0627\u0644\u0631\u0633\u0648\u0645 (\u063A\u064A\u0631 \u0645\u062D\u062A\u0633\u0628)"));
  }
  function drawAccessMarkers(r) {
    const mk = (x, cls, txt) => {
      const el = h("div", { class: "mk" }, h("div", { class: "amark " + cls, title: x.kind }, txt));
      extraMk.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([x.lng, x.lat]).addTo(map));
    };
    for (const x of r.access.hits || []) mk(x, "bad", "!");
    for (const x of r.access.aids || []) mk(x, "ok", "\u2713");
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
  var statBox = (v, l, c) => h("div", { class: "stat " + (c || "") }, h("b", {}, v), h("small", {}, l));
  function subSheet(title, ico, ...body2) {
    showSheet(h("div", {}, h("div", { class: "sh-h" }, svg(ico), h("h3", {}, title), h("button", { class: "plain", "aria-label": "\u0631\u062C\u0648\u0639", on: { click: () => showRouteSheet() } }, svg("i-close"))), ...body2));
  }
  function showRouteSheet() {
    if (!route || !dest) return;
    const tr = route.traffic;
    const M = MODES[mode];
    const steps = h("ul", { class: "steps-l hide" }, route.steps.filter((s) => s.type !== "depart").map((s) => h("li", {}, svg(icoOf(s.type, s.modifier)), h("span", {}, actionText(s)), h("small", {}, s.type === "arrive" ? "" : fmtDist(s.dist)))));
    const eco = mode === "car" || mode === "moto" ? h("div", { class: "eco", id: "ecoBox" }, h("small", { class: "note" }, "\u062C\u0627\u0631\u064D \u062D\u0633\u0627\u0628 \u0627\u0644\u0648\u0642\u0648\u062F \u0648\u0627\u0644\u062A\u0643\u0644\u0641\u0629\u2026")) : null;
    const acc = route.access ? renderAccess(route.access) : null;
    showSheet(h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg(M.ico), h("h3", {}, dest.name || "\u0627\u0644\u0648\u062C\u0647\u0629"), h("button", { class: "plain", "aria-label": "\u0625\u063A\u0644\u0627\u0642", on: { click: clearAll } }, svg("i-close"))),
      h("div", { class: "stats" }, statBox(fmtTime(route.dur), "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0648\u0642\u0639", "acc"), statBox(fmtDist(route.dist), "\u0627\u0644\u0645\u0633\u0627\u0641\u0629"), statBox(clock(route.dur), "\u0627\u0644\u0648\u0635\u0648\u0644")),
      cands.length > 1 ? h("div", { class: "alts" }, cands.map((c, i) => h("button", { class: "alt" + (c === route ? " on" : ""), on: { click: () => useCandidate(i) } }, h("b", {}, i === 0 ? "\u0627\u0644\u0623\u0633\u0631\u0639" : "\u0628\u062F\u064A\u0644 " + i), h("small", {}, fmtTime(c.dur) + " \xB7 " + fmtDist(c.dist))))) : null,
      tr ? h("div", { class: "traffic" }, h("div", { class: "tl" }, h("b", {}, "\u0627\u0644\u0627\u0632\u062F\u062D\u0627\u0645: " + tr.label), h("small", {}, tr.delay >= 60 ? `\u062A\u0623\u062E\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u2248 ${fmtTime(tr.delay)}` : "\u0628\u062F\u0648\u0646 \u062A\u0623\u062E\u064A\u0631 \u064A\u064F\u0630\u0643\u0631")), h("div", { class: "bar" }), h("div", { class: "bl" }, h("span", {}, "\u0633\u0644\u0633"), h("span", {}, "\u0645\u062A\u0648\u0633\u0637"), h("span", {}, "\u0645\u0632\u062F\u062D\u0645")), h("p", { class: "note" }, "\u062A\u0642\u062F\u064A\u0631 \u062D\u0633\u0628 \u0627\u0644\u0648\u0642\u062A \u0648\u0646\u0648\u0639 \u0627\u0644\u0637\u0631\u064A\u0642 \u0648\u0644\u064A\u0633 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0628\u0627\u0634\u0631\u0629.")) : null,
      acc,
      eco,
      h("div", { class: "chipsrow", id: "flagBox" }),
      h("div", { class: "btns" }, h("button", { class: "primary", on: { click: () => startNav(false) } }, svg(isWalk(mode) ? "i-walk" : "i-car"), "\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0648\u062C\u064A\u0647"), h("button", { class: "ghost", on: { click: () => startNav(true) } }, svg("i-route"), "\u0645\u062D\u0627\u0643\u0627\u0629")),
      h(
        "div",
        { class: "tools" },
        toolBtn("i-play", "\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0645\u0633\u0627\u0631", startPreview),
        toolBtn("i-clock", "\u0648\u0642\u062A \u0627\u0644\u0645\u063A\u0627\u062F\u0631\u0629", showDeparture),
        toolBtn("i-cloud", "\u0637\u0642\u0633 \u0627\u0644\u0637\u0631\u064A\u0642", showWeather),
        toolBtn("i-fuel", "\u062A\u0648\u0642\u0641 \u0630\u0643\u064A", showStops),
        toolBtn("i-download", "\u0628\u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A", () => doPrecache(false)),
        toolBtn("i-refresh", "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0648\u0633\u064A\u0644\u0629", chooseMode),
        toolBtn("i-doc", "\u0627\u0644\u062E\u0637\u0648\u0627\u062A", () => steps.classList.toggle("hide"))
      ),
      steps
    ));
    if (route.flags) renderFlags();
    if (eco) fillEco();
  }
  var toolBtn = (ico, t, fn) => h("button", { class: "tool", on: { click: () => fn() } }, svg(ico), h("span", {}, t));
  function renderAccess(a) {
    if (a.unknown) return h("div", { class: "acc" }, h("b", {}, "\u0641\u062D\u0635 \u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644"), h("p", { class: "note" }, "\u062A\u0639\u0630\u0651\u0631 \u0641\u062D\u0635 \u0627\u0644\u0639\u0648\u0627\u0626\u0642 \u0627\u0644\u0622\u0646 (\u0644\u0627 \u0627\u062A\u0635\u0627\u0644 \u0628\u062E\u062F\u0645\u0629 OSM). \u0627\u0644\u0645\u0633\u0627\u0631 \u0645\u0634\u064A \u0639\u0627\u062F\u064A."));
    const head2 = a.skipped ? "\u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0643\u0628\u064A\u0631\u0629 \u0644\u0641\u062D\u0635 \u0627\u0644\u0623\u0631\u0635\u0641\u0629 \u0648\u0627\u0644\u0633\u0644\u0627\u0644\u0645 \u2014 \u064A\u064F\u0646\u0635\u062D \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0633\u0627\u0631 \u0628\u0635\u0631\u064A\u0627\u064B." : a.hits.length ? `\u26A0 ${a.hits.length} \u0639\u0627\u0626\u0642 \u0645\u062D\u062A\u0645\u0644 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0631 (${[...new Set(a.hits.map((x) => x.kind))].join("\u060C ")})` : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0648\u0627\u0626\u0642 \u0645\u0633\u062C\u0651\u0644\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631 (\u0633\u0644\u0627\u0644\u0645/\u0623\u0631\u0635\u0641\u0629 \u0645\u0631\u062A\u0641\u0639\u0629)";
    return h(
      "div",
      { class: "acc" + (a.hits && a.hits.length ? " bad" : "") },
      h("b", {}, "\u0645\u0633\u0627\u0631 \u0645\u0647\u064A\u0651\u0623 \u2014 " + (a.alts > 1 ? `\u0627\u062E\u062A\u064A\u0631 \u0627\u0644\u0623\u0642\u0644 \u0639\u0648\u0627\u0626\u0642 \u0645\u0646 ${a.alts} \u0645\u0633\u0627\u0631\u0627\u062A` : "\u0645\u0633\u0627\u0631 \u0648\u0627\u062D\u062F \u0645\u062A\u0627\u062D")),
      h("p", { class: "note2" }, head2),
      a.aids && a.aids.length ? h("p", { class: "note2 ok" }, "\u062A\u0633\u0647\u064A\u0644\u0627\u062A \u0642\u0631\u064A\u0628\u0629: " + [...new Set(a.aids.map((x) => x.kind))].join("\u060C ")) : null,
      h("p", { class: "note" }, "\u0645\u0628\u0646\u064A \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A OpenStreetMap \u0648\u0642\u062F \u062A\u0643\u0648\u0646 \u0646\u0627\u0642\u0635\u0629 \u2014 \u062A\u062D\u0642\u0642 \u062F\u0627\u0626\u0645\u0627\u064B \u0628\u0646\u0641\u0633\u0643. \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A: ! \u0639\u0627\u0626\u0642\u060C \u2713 \u062A\u0633\u0647\u064A\u0644.")
    );
  }
  var ecoCache = /* @__PURE__ */ new Map();
  var windCache = null;
  async function climbFor(r) {
    const k = r.coords.length + ":" + Math.round(r.dist);
    if (ecoCache.has(k)) return ecoCache.get(k);
    let c = null;
    try {
      const e = await elevations(r.coords);
      if (e.el && e.el.length > 2) c = climbOf(e.el);
    } catch (_) {
    }
    ecoCache.set(k, c);
    return c;
  }
  async function windNow(a) {
    if (windCache && Date.now() - windCache.t < 9e5) return windCache.v;
    try {
      const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${a[1].toFixed(3)}&longitude=${a[0].toFixed(3)}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`, 6e3);
      const v = { speed: j.current.wind_speed_10m, from: j.current.wind_direction_10m };
      windCache = { t: Date.now(), v };
      return v;
    } catch (e) {
      return null;
    }
  }
  async function fillEco() {
    const box = $("#ecoBox");
    if (!box) return;
    const list = cands.length ? cands : [route];
    const [cl, wind] = await Promise.all([Promise.all(list.map(climbFor)), windNow(origin())]);
    if (!$("#ecoBox") || route !== (cands.includes(route) ? route : route)) return;
    const est = list.map((r, i) => ecoEstimate(r, cl[i] || { up: 0, down: 0 }, { cons: +ST.cons || 8, price: +ST.price || 0.15 }, wind));
    const cur = est[list.indexOf(route) >= 0 ? list.indexOf(route) : 0], bi = est.reduce((b, e, i) => e.liters < est[b].liters ? i : b, 0);
    const L = (v) => v.toFixed(v < 10 ? 2 : 1), C = (v) => (v < 10 ? v.toFixed(2) : v.toFixed(1)) + " " + ST.cur;
    box.replaceChildren(...[
      h("div", { class: "eco-h" }, svg("i-coin"), h("b", {}, "\u0627\u0644\u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0648\u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629")),
      h("div", { class: "eco-r" }, h("span", {}, "\u0648\u0642\u0648\u062F \u2248 " + L(cur.liters) + " \u0644\u062A\u0631"), h("span", {}, "\u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u2248 " + C(cur.cost))),
      h("small", { class: "note" }, (cl[list.indexOf(route) >= 0 ? list.indexOf(route) : 0] ? `\u0635\u0639\u0648\u062F \u2248 ${cur.climb} \u0645` : "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629") + (wind ? ` \xB7 \u0631\u064A\u0627\u062D ${Math.round(wind.speed)} \u0643\u0645/\u0633` : "") + ` \xB7 \u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0627\u0644\u0633\u064A\u0627\u0631\u0629 ${ST.cons} \u0644\u062A\u0631/100\u0643\u0645 (\u063A\u064A\u0651\u0631\u0647 \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A)`),
      list.length > 1 && list[bi] !== route && est[bi].liters < cur.liters * 0.97 ? h("button", { class: "ghost small", on: { click: () => useCandidate(bi) } }, `\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0623\u0648\u0641\u0631: \u064A\u0648\u0641\u0651\u0631 ${C(cur.cost - est[bi].cost)} (${fmtTime(list[bi].dur - route.dur)} \u0641\u0631\u0642)`) : null
    ].filter(Boolean));
  }
  function showDeparture() {
    if (!route) return;
    if (!route.traffic) {
      subSheet("\u0623\u0641\u0636\u0644 \u0648\u0642\u062A \u0644\u0644\u0645\u063A\u0627\u062F\u0631\u0629", "i-clock", h("p", { class: "note" }, "\u0647\u0630\u0647 \u0627\u0644\u0645\u064A\u0632\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0629 \u0648\u0627\u0644\u062F\u0631\u0627\u062C\u0629 \u0627\u0644\u0646\u0627\u0631\u064A\u0629 (\u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u0627\u0632\u062F\u062D\u0627\u0645)."));
      return;
    }
    const dc = departureCurve(route, mode);
    const mx = Math.max(...dc.list.map((o) => o.dur)), mn = Math.min(...dc.list.map((o) => o.dur));
    const now = dc.list[0], best = dc.best;
    const W = 300, Hh = 110, bw = W / dc.list.length;
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", `0 0 ${W} ${Hh + 22}`);
    s.setAttribute("class", "chart");
    dc.list.forEach((o, i) => {
      const hh = 14 + (o.dur - mn) / Math.max(1, mx - mn) * (Hh - 20) * 0.8 + (Hh - 20) * 0.2 * 0;
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", i * bw + 3);
      r.setAttribute("width", bw - 6);
      r.setAttribute("rx", 4);
      const hgt = 20 + o.dur / mx * (Hh - 26);
      r.setAttribute("y", Hh - hgt);
      r.setAttribute("height", hgt);
      r.setAttribute("fill", rampColor(o.avg * 1.4));
      if (o === best) r.setAttribute("stroke", "#fff"), r.setAttribute("stroke-width", "2");
      s.append(r);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", i * bw + bw / 2);
      t.setAttribute("y", Hh + 14);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "9");
      t.setAttribute("fill", "#9fb0d0");
      t.textContent = o.off === 0 ? "\u0627\u0644\u0622\u0646" : o.off % 60 === 0 ? o.off / 60 + "\u0633" : o.off + "\u062F";
      s.append(t);
    });
    const msg = best.off === 0 || now.dur - best.dur < 90 ? `\u0627\u062E\u0631\u062C \u0627\u0644\u0622\u0646: \u0627\u0644\u0631\u062D\u0644\u0629 \u2248 ${fmtTime(now.dur)} \u0648\u0647\u0648 \u0645\u0646 \u0623\u0641\u0636\u0644 \u0627\u0644\u0623\u0648\u0642\u0627\u062A.` : `\u0627\u062E\u0631\u062C \u0627\u0644\u0622\u0646: \u2248 ${fmtTime(now.dur)} \u2014 \u0644\u0643\u0646 \u0628\u0639\u062F ${best.off} \u062F\u0642\u064A\u0642\u0629 \u2248 ${fmtTime(best.dur)} \u0641\u0642\u0637 (\u062A\u0648\u0641\u064A\u0631 ${fmtTime(now.dur - best.dur)}).`;
    subSheet("\u0623\u0641\u0636\u0644 \u0648\u0642\u062A \u0644\u0644\u0645\u063A\u0627\u062F\u0631\u0629", "i-clock", h("p", { class: "big-msg" }, msg), s, h("p", { class: "note" }, "\u0627\u0644\u0623\u0639\u0645\u062F\u0629: \u0645\u062F\u0629 \u0627\u0644\u0631\u062D\u0644\u0629 \u0644\u0648 \u062E\u0631\u062C\u062A \u0628\u0639\u062F \u0643\u0644 \u0641\u062A\u0631\u0629 (\u0627\u0644\u0623\u062E\u0636\u0631 \u0633\u0644\u0633\u060C \u0627\u0644\u0623\u062D\u0645\u0631 \u0645\u0632\u062F\u062D\u0645). \u062A\u0642\u062F\u064A\u0631 \u0645\u0646 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0627\u0632\u062F\u062D\u0627\u0645 \u0648\u0644\u064A\u0633 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0628\u0627\u0634\u0631\u0629."));
  }
  async function showWeather() {
    if (!route) return;
    subSheet("\u0637\u0642\u0633 \u0627\u0644\u0637\u0631\u064A\u0642", "i-cloud", h("p", { class: "note" }, "\u062C\u0627\u0631\u064D \u062C\u0644\u0628 \u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A \u0644\u0643\u0644 \u0646\u0642\u0637\u0629 \u0648\u0642\u062A \u0648\u0635\u0648\u0644\u0643\u2026"));
    try {
      const w = await weatherAlong(route, /* @__PURE__ */ new Date());
      clearExtras();
      const worst = w.find((x) => x.level === "bad") || w.find((x) => x.level === "warn");
      const warn = worst ? h("div", { class: "wxwarn " + worst.level }, svg("i-warn"), h("span", {}, (worst.level === "bad" ? "\u062A\u062D\u0630\u064A\u0631: " : "\u062A\u0646\u0628\u064A\u0647: ") + worst.text + " \u0639\u0646\u062F \u0627\u0644\u0643\u064A\u0644\u0648\u0645\u062A\u0631 " + Math.round(worst.d / 1e3) + " (\u062D\u0648\u0627\u0644\u064A " + worst.arr.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) + ")" + (worst.precip > 0 ? ` \u2014 \u0623\u0645\u0637\u0627\u0631 ${worst.precip} \u0645\u0645/\u0633` : "") + (worst.gust >= 55 ? ` \u2014 \u0647\u0628\u0651\u0627\u062A \u0631\u064A\u0627\u062D ${worst.gust} \u0643\u0645/\u0633` : ""))) : h("div", { class: "wxwarn ok" }, svg("i-check"), h("span", {}, "\u0644\u0627 \u062A\u0648\u0642\u0639\u0627\u062A \u062E\u0637\u0631\u0629 \u0639\u0644\u0649 \u0637\u0648\u0644 \u0627\u0644\u0637\u0631\u064A\u0642 \u0648\u0642\u062A \u0645\u0631\u0648\u0631\u0643"));
      const col = { ok: "#22c55e", warn: "#f59e0b", bad: "#ef4444" };
      w.forEach((x) => {
        const el = h("div", { class: "mk" }, h("div", { class: "wxdot", style: "background:" + col[x.level], title: x.text }, x.temp + "\xB0"));
        wxMarkers.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([x.lng, x.lat]).addTo(map));
      });
      subSheet(
        "\u0637\u0642\u0633 \u0627\u0644\u0637\u0631\u064A\u0642",
        "i-cloud",
        warn,
        h("div", { class: "wx" }, w.map((x) => h("div", { class: "wxc " + x.level }, h("b", {}, x.d < 50 ? "\u0627\u0644\u0628\u062F\u0627\u064A\u0629" : x === w[w.length - 1] ? "\u0627\u0644\u0648\u0635\u0648\u0644" : Math.round(x.d / 1e3) + " \u0643\u0645"), h("span", {}, x.arr.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })), h("em", {}, x.temp + "\xB0"), h("small", {}, x.text), h("small", {}, x.precip > 0 ? x.precip + " \u0645\u0645" : "\u062C\u0627\u0641"), h("small", {}, "\u0631\u064A\u0627\u062D " + x.wind)))),
        h("p", { class: "note" }, "\u0645\u0635\u062F\u0631 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: Open-Meteo. \u0627\u0644\u062A\u0648\u0642\u0639 \u0644\u0643\u0644 \u0646\u0642\u0637\u0629 \u0645\u0631\u0628\u0648\u0637 \u0628\u0648\u0642\u062A \u0648\u0635\u0648\u0644\u0643 \u0627\u0644\u0645\u062A\u0648\u0642\u0639 \u0625\u0644\u064A\u0647\u0627.")
      );
    } catch (e) {
      subSheet("\u0637\u0642\u0633 \u0627\u0644\u0637\u0631\u064A\u0642", "i-cloud", h("p", { class: "err" }, "\u062A\u0639\u0630\u0651\u0631 \u062C\u0644\u0628 \u0627\u0644\u0637\u0642\u0633. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644."), h("div", { class: "btns" }, h("button", { class: "primary", on: { click: showWeather } }, "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629")));
    }
  }
  async function showStops(cat) {
    if (!route) return;
    const from = nav.along || 0;
    const chips = h("div", { class: "chipsrow" }, [["fuel", "\u0648\u0642\u0648\u062F"], ["food", "\u0637\u0639\u0627\u0645 \u0648\u0642\u0647\u0648\u0629"], ["mosque", "\u0645\u0635\u0644\u0651\u0649 / \u0645\u0633\u062C\u062F"], ["shop", "\u0645\u062A\u062C\u0631"]].map(([c2, l]) => h("button", { class: "tag btn" + ((cat || "fuel") === c2 ? " on" : ""), on: { click: () => showStops(c2) } }, l)));
    const c = cat || "fuel";
    subSheet("\u062A\u0648\u0642\u0641 \u0630\u0643\u064A \u0639\u0644\u0649 \u0637\u0631\u064A\u0642\u0643", "i-fuel", chips, h("p", { class: "note" }, "\u062C\u0627\u0631\u064D \u0627\u0644\u0628\u062D\u062B \u0628\u062C\u0627\u0646\u0628 \u0627\u0644\u0637\u0631\u064A\u0642\u2026"));
    try {
      const L = await stopsAlong(route, c, from);
      clearExtras();
      const items = L.map((s) => {
        const el = h("div", { class: "mk" }, h("div", { class: "amark ok", title: s.name }, "\u2022"));
        extraMk.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([s.lng, s.lat]).addTo(map));
        return h("button", { class: "item", style: "--c:" + CATS[c].color, on: { click: () => addStop(s) } }, h("div", { class: "pic" }, svg(CATS[c].ico)), h("div", { class: "tx" }, h("b", {}, s.name), h("small", {}, `\u0628\u0639\u062F ${fmtDist(s.along)} \u0645\u0646 \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \xB7 \u0639\u0644\u0649 \u0628\u0639\u062F ${fmtDist(s.off)} \u0645\u0646 \u0627\u0644\u0637\u0631\u064A\u0642`)), h("div", { class: "dd" }, s.detour < 0.7 ? "\u0628\u0644\u0627 \u0627\u0646\u062D\u0631\u0627\u0641" : "+" + Math.max(1, Math.round(s.detour)) + " \u062F"));
      });
      subSheet("\u062A\u0648\u0642\u0641 \u0630\u0643\u064A \u0639\u0644\u0649 \u0637\u0631\u064A\u0642\u0643", "i-fuel", chips, items.length ? h("div", { class: "list" }, items) : h("p", { class: "note" }, "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0645\u0627\u0643\u0646 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0646\u0648\u0639 \u0628\u062C\u0627\u0646\u0628 \u0627\u0644\u0645\u0633\u0627\u0631."), h("p", { class: "note" }, "\u0627\u0644\u0627\u0646\u062D\u0631\u0627\u0641 \u062A\u0642\u062F\u064A\u0631 (\u0636\u0639\u0641 \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0639\u0646 \u0627\u0644\u0637\u0631\u064A\u0642). \u0627\u0636\u063A\u0637 \u0645\u0643\u0627\u0646\u0627\u064B \u0644\u0625\u0636\u0627\u0641\u062A\u0647 \u0643\u0645\u062D\u0637\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u0627\u0631."));
    } catch (e) {
      subSheet("\u062A\u0648\u0642\u0641 \u0630\u0643\u064A", "i-fuel", chips, h("p", { class: "err" }, "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0628\u062D\u062B. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644."));
    }
  }
  async function addStop(s) {
    toast("\u062C\u0627\u0631\u064D \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062D\u0637\u0629\u2026", 2e3);
    try {
      const j = await osrm(MODES[mode].net, origin(), [dest.lng, dest.lat], false, [[s.lng, s.lat]]);
      const r = buildRoute(j, mode === "access" ? "foot" : mode);
      r.via = [s.lng, s.lat];
      route = r;
      cands = [r];
      nav.setRoute(r);
      pushRoute();
      clearExtras();
      showRouteSheet();
      loadFlags(r);
      toast("\u0623\u064F\u0636\u064A\u0641\u062A \u0645\u062D\u0637\u0629: " + s.name);
    } catch (e) {
      toast("\u062A\u0639\u0630\u0651\u0631 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062D\u0637\u0629");
    }
  }
  function vecTpl() {
    try {
      const s = VS && map.getSource(VS);
      return s && s.tiles && s.tiles[0];
    } catch (e) {
      return null;
    }
  }
  async function doPrecache(silent) {
    if (!route) return;
    const tpl = vecTpl();
    if (!tpl) {
      if (!silent) toast("\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u062F\u064A\u062F \u0645\u0635\u062F\u0631 \u0627\u0644\u0628\u0644\u0627\u0637 \u0644\u0644\u062A\u062E\u0632\u064A\u0646");
      return;
    }
    const tiles = tilesAlong(route, silent ? [12, 13, 14] : [11, 12, 13, 14, 15], silent ? 140 : 380);
    if (!silent) {
      toast("\u062C\u0627\u0631\u064D \u062A\u062D\u0645\u064A\u0644 \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0633\u0627\u0631\u2026 0%", 6e4);
    }
    const r = await precache(tpl, tiles, (d, n) => {
      if (!silent && (d % 10 === 0 || d === n)) toast(`\u062C\u0627\u0631\u064D \u062A\u062D\u0645\u064A\u0644 \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0633\u0627\u0631\u2026 ${Math.round(d / n * 100)}%`, 6e4);
    });
    if (!silent) toast(r.fail > tiles.length / 2 ? "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0645\u0639\u0638\u0645 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 (\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644)" : "\u062A\u0645 \u062D\u0641\u0638 \u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0633\u0627\u0631 \u0644\u0644\u0639\u0645\u0644 \u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A \u2713", 5e3);
  }
  function startPreview() {
    if (!route) return;
    stopPreview(true);
    hideSheet();
    closeToast();
    document.body.classList.add("previewing");
    setFollow(false);
    const key = route.steps.filter((s) => !["depart", "arrive", "continue", "waypoint"].includes(s.type));
    const bar = h("div", { id: "pvBar" }, h("button", { class: "ibtn small", id: "pvPlay", "aria-label": "\u0625\u064A\u0642\u0627\u0641 \u0645\u0624\u0642\u062A" }, svg("i-pause")), h("div", { class: "pv-m" }, h("b", { id: "pvTxt" }, "\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0645\u0633\u0627\u0631"), h("div", { class: "pv-p" }, h("i", { id: "pvProg" }))), h("button", { class: "ghost small", id: "pvSpd" }, "\xD71"), h("button", { class: "ibtn small", id: "pvClose", "aria-label": "\u0625\u0646\u0647\u0627\u0621" }, svg("i-close")));
    document.body.append(bar);
    prev = { d: 0, playing: true, speed: 1, hold: 0, last: 0, bar, key, shown: -1, camB: bearing(route.coords[0], pointAt(route, 40)) };
    const fix = pointAt(route, 0);
    map.jumpTo({ center: fix, zoom: 17.2, pitch: 68, bearing: prev.camB });
    $("#pvPlay").onclick = () => {
      prev.playing = !prev.playing;
      $("#pvPlay").firstChild.firstChild.setAttribute("href", prev.playing ? "#i-pause" : "#i-play");
    };
    $("#pvSpd").onclick = () => {
      prev.speed = prev.speed === 1 ? 2 : prev.speed === 2 ? 4 : 1;
      $("#pvSpd").textContent = "\xD7" + prev.speed;
    };
    $("#pvClose").onclick = () => stopPreview(false);
    const frame = (t) => {
      if (!prev) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.08, (t - (prev.last || t)) / 1e3);
      prev.last = t;
      if (prev.playing) {
        if (prev.hold > 0) {
          prev.hold -= dt;
        } else {
          let v = 90;
          for (const s of key) {
            const g = s.startAlong - prev.d;
            if (g > -5 && g < 150) {
              v = 32;
              if (g < 12 && prev.shown !== s.startAlong) {
                prev.shown = s.startAlong;
                prev.hold = 1.4 / prev.speed;
                $("#pvTxt").textContent = actionText(s);
                break;
              }
            }
          }
          prev.d += v * prev.speed * dt;
        }
      }
      if (prev.d >= route.total) {
        stopPreview(false);
        toast("\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629");
        return;
      }
      const p = pointAt(route, prev.d), q = pointAt(route, prev.d + 35);
      const tb = bearing(p, q);
      prev.camB = normDeg(prev.camB + angDiff(tb, prev.camB) * Math.min(1, dt * 3));
      map.jumpTo({ center: p, bearing: prev.camB, zoom: 17.2, pitch: 68 });
      const me_ = map.getSource("me");
      if (me_) me_.setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: p } });
      $("#pvProg").style.width = prev.d / route.total * 100 + "%";
    };
    requestAnimationFrame(frame);
  }
  function stopPreview(silent) {
    if (!prev) return;
    const b = prev.bar;
    prev = null;
    b && b.remove();
    document.body.classList.remove("previewing");
    lastCarMode = null;
    lastPt = [0, 0];
    drawMe(true);
    if (me.has === false) {
      const s = map.getSource("me");
      s && s.setData(EMPTY);
    }
    if (!silent && route) {
      fitRoute();
      showRouteSheet();
    }
  }
  var closeToast = () => N.toast.classList.add("hide");
  function speak(t) {
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
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) {
    }
  }
  function startNav(sim) {
    if (!route) return;
    stopPreview(true);
    unlockSpeech();
    enableCompass();
    warned.clear();
    lastCur = -1;
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
      recompute().then((ok) => {
        if (ok) startNav(false);
      });
      return;
    }
    navActive = true;
    clearExtras();
    nav.start(true);
    document.body.classList.add("navmode");
    N.hud.classList.remove("hide");
    hideSheet();
    setVolIcon();
    setFollow(true);
    lockScreen();
    lastAlong = 0;
    const walk = isWalk(mode);
    map.easeTo({ center: [vis.lng, vis.lat], zoom: walk ? 18.2 : 17.6, pitch: 65, bearing: vis.hdg, duration: 900 });
    if (!(navigator.connection && navigator.connection.saveData)) doPrecache(true).catch(() => {
    });
    loadFlags(route);
    prefetchLandmarks();
    if (sim) startSim();
    else navTick();
  }
  function stopNav(silent) {
    if (!navActive && !simOn) return;
    navActive = false;
    nav.stop();
    stopSim();
    document.body.classList.remove("navmode");
    N.hud.classList.add("hide");
    if (lanesEl) lanesEl.classList.add("hide");
    clearTimeout(resumeT);
    resumeT = 0;
    try {
      speechSynthesis.cancel();
    } catch (e) {
    }
    try {
      wakeLock && wakeLock.release();
    } catch (e) {
    }
    wakeLock = null;
    drawMe(true);
    map.easeTo({ pitch: 55, duration: 600 });
    if (!silent && route) showRouteSheet();
  }
  async function prefetchLandmarks() {
    if (!route || !navActive || lmBusy) return;
    const S = route.steps;
    const from = nav.cur || 0;
    const idx = [];
    for (let i = from + 1; i < S.length - 1 && idx.length < 4; i++) {
      const s = S[i];
      if (!s.lmTried && s.loc && !["depart", "arrive", "waypoint", "continue"].includes(s.type)) idx.push(i);
    }
    if (!idx.length) return;
    lmBusy = true;
    idx.forEach((i) => S[i].lmTried = true);
    try {
      const res = await landmarksFor(idx.map((i) => S[i].loc));
      idx.forEach((i, k) => {
        if (res[k]) S[i].landmark = res[k];
      });
    } catch (e) {
    }
    lmBusy = false;
  }
  function laneArrow(ind, cx) {
    const y0 = 40, y1 = 11;
    switch (ind) {
      case "left":
      case "sharp left":
        return `M${cx} ${y0}V26Q${cx} 18 ${cx - 8} 18M${cx - 3} 12 ${cx - 9} 18 ${cx - 3} 24`;
      case "right":
      case "sharp right":
        return `M${cx} ${y0}V26Q${cx} 18 ${cx + 8} 18M${cx + 3} 12 ${cx + 9} 18 ${cx + 3} 24`;
      case "slight left":
        return `M${cx} ${y0}V28L${cx - 6} ${y1 + 4}M${cx - 9} ${y1 + 10}L${cx - 6} ${y1 + 3}L${cx} ${y1 + 7}`;
      case "slight right":
        return `M${cx} ${y0}V28L${cx + 6} ${y1 + 4}M${cx + 9} ${y1 + 10}L${cx + 6} ${y1 + 3}L${cx} ${y1 + 7}`;
      case "uturn":
        return `M${cx + 4} ${y0}V20Q${cx + 4} 12 ${cx - 2} 12Q${cx - 8} 12 ${cx - 8} 20V26M${cx - 12} 22l4 5 4-5`;
      default:
        return `M${cx} ${y0}V${y1}M${cx - 5} ${y1 + 6}L${cx} ${y1}L${cx + 5} ${y1 + 6}`;
    }
  }
  function renderLanes(lanes) {
    if (!lanesEl) {
      lanesEl = h("div", { id: "lanes", class: "hide" });
      N.hud.append(lanesEl);
    }
    if (!lanes || !lanes.length) {
      lanesEl.classList.add("hide");
      lanesEl.dataset.k = "";
      return;
    }
    const key = JSON.stringify(lanes);
    if (lanesEl.dataset.k === key) {
      lanesEl.classList.remove("hide");
      return;
    }
    lanesEl.dataset.k = key;
    const W = 30, s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", `0 0 ${lanes.length * W} 48`);
    s.setAttribute("class", "lanesvg");
    s.style.width = Math.min(lanes.length * W, 240) + "px";
    lanes.forEach((l, i) => {
      const x = i * W, cx = x + W / 2;
      const ok = !!l.valid;
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", x + 2);
      r.setAttribute("y", 2);
      r.setAttribute("width", W - 4);
      r.setAttribute("height", 44);
      r.setAttribute("rx", 6);
      r.setAttribute("fill", ok ? "rgba(34,197,94,.22)" : "rgba(255,255,255,.06)");
      r.setAttribute("stroke", ok ? "#22c55e" : "#6b7a99");
      r.setAttribute("stroke-width", ok ? 2 : 1);
      s.append(r);
      for (const ind of l.indications && l.indications.length ? l.indications : ["straight"]) {
        if (ind === "none") continue;
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", laneArrow(ind, cx));
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", ok ? "#22c55e" : "#9aa6c0");
        p.setAttribute("stroke-width", ok ? 3 : 2.2);
        p.setAttribute("stroke-linecap", "round");
        p.setAttribute("stroke-linejoin", "round");
        s.append(p);
      }
    });
    lanesEl.replaceChildren(h("small", {}, "\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0635\u062D\u064A\u062D"), s);
    lanesEl.classList.remove("hide");
  }
  function navTick(dr) {
    const st = nav.update([me.lng, me.lat], me.speed);
    if (!st) return;
    if (!dr) lastAlong = st.along;
    N.hudDist.textContent = st.next.type === "arrive" && st.dNext < 30 ? "\u0627\u0644\u0648\u0635\u0648\u0644" : fmtDist(st.dNext);
    N.hudText.textContent = st.text;
    N.hudIco.firstChild.setAttribute("href", "#" + st.ico);
    N.hudSpeed.textContent = Math.round(me.speed * 3.6) + " \u0643\u0645/\u0633";
    N.hudRem.textContent = fmtDist(st.rem) + " \xB7 " + fmtTime(st.remTime);
    N.hudEta.textContent = "\u0627\u0644\u0648\u0635\u0648\u0644 " + clock(st.remTime);
    if (st.cur !== lastCur) {
      lastCur = st.cur;
      prefetchLandmarks();
    }
    renderLanes(st.dNext < 650 && st.next.lanes && !isWalk(mode) ? st.next.lanes : null);
    hazardWatch();
    tunnelWatch(st);
    if (st.offRoute && !simOn && Date.now() - lastReroute > 15e3) {
      lastReroute = Date.now();
      speak("\u062C\u0627\u0631\u064D \u0625\u0639\u0627\u062F\u0629 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0627\u0631");
      recompute().then((ok) => {
        if (ok) nav.start(false);
      });
    }
  }
  function tunnelWatch(st) {
    const f = route && route.flags;
    if (!f || !f.tunnels) return;
    for (const t of f.tunnels) {
      const d = t.along - st.along, k = "t" + Math.round(t.along / 100);
      if (d > 20 && d < 1100 && !warned.has(k)) {
        warned.add(k);
        const m = `\u0646\u0641\u0642 \u0628\u0639\u062F ${spokenDist(d)}. \u0642\u062F \u062A\u0646\u0642\u0637\u0639 \u0625\u0634\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0642\u0639\u060C \u0648\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0645\u0633\u0627\u0631 \u0645\u062D\u0645\u0651\u0644\u0629 \u0639\u0644\u0649 \u062C\u0647\u0627\u0632\u0643`;
        speak(m);
        toast("\u0646\u0641\u0642 \u0623\u0645\u0627\u0645\u0643 \u2014 \u0627\u0644\u062A\u0648\u062C\u064A\u0647 \u0633\u064A\u0633\u062A\u0645\u0631 \u062A\u0642\u062F\u064A\u0631\u064A\u0627\u064B", 5e3);
      }
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
    const sp = mode === "foot" || mode === "access" ? 1.5 : mode === "bike" ? 5 : SIM_SPEED;
    const tick = () => {
      if (!navActive || !route) {
        stopSim();
        return;
      }
      d += sp * 0.5;
      if (d >= route.total) {
        stopSim();
        return;
      }
      const p = pointAt(route, d), p2 = pointAt(route, d + 6);
      handleFix({ lng: p[0], lat: p[1], acc: 5, speed: sp, heading: bearing(p, p2), t: Date.now(), force: true });
    };
    tick();
    simTimer = setInterval(tick, 500);
  }
  function stopSim() {
    simOn = false;
    clearInterval(simTimer);
    simTimer = null;
  }
  function startMeet() {
    clearAll();
    meet = { on: true, pts: me.has ? [{ lng: me.lng, lat: me.lat, name: "\u0645\u0648\u0642\u0639\u064A" }] : [], mode: "car", mk: [] };
    drawMeet();
    renderMeet();
  }
  function endMeet(silent) {
    if (!meet.on) return;
    for (const m of meet.mk) m.remove();
    meet = { on: false, pts: [], mode: "car", mk: [] };
    if (!silent) hideSheet();
  }
  function addMeetPoint(p) {
    if (meet.pts.length >= 4) {
      toast("\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 4 \u0623\u0634\u062E\u0627\u0635");
      return;
    }
    meet.pts.push(p);
    drawMeet();
    renderMeet();
  }
  function drawMeet() {
    for (const m of meet.mk) m.remove();
    meet.mk = meet.pts.map((p, i) => new maplibregl.Marker({ element: h("div", { class: "mk" }, h("div", { class: "mpin" }, String(i + 1))), anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(map));
  }
  function renderMeet(res) {
    showSheet(h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg("i-users"), h("h3", {}, "\u0646\u0642\u0637\u0629 \u0644\u0642\u0627\u0621 \u0630\u0643\u064A\u0629"), h("button", { class: "plain", on: { click: () => endMeet(false) } }, svg("i-close"))),
      h("p", { class: "note" }, meet.pts.length < 2 ? "\u0623\u0636\u0641 \u0645\u0648\u0642\u0639\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644: \u0627\u0644\u0645\u0633 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u0623\u0648 \u0627\u0628\u062D\u062B \u0639\u0646 \u0645\u0643\u0627\u0646 \u0644\u0643\u0644 \u0634\u062E\u0635 (\u062D\u062A\u0649 4)." : "\u0633\u064A\u064F\u062E\u062A\u0627\u0631 \u0645\u0642\u0647\u0649/\u0645\u0643\u0627\u0646 \u064A\u062A\u0633\u0627\u0648\u0649 \u0641\u064A\u0647 \u0632\u0645\u0646 \u0648\u0635\u0648\u0644 \u0627\u0644\u062C\u0645\u064A\u0639 \u062A\u0642\u0631\u064A\u0628\u0627\u064B."),
      h("div", { class: "list" }, meet.pts.map((p, i) => h("div", { class: "item" }, h("div", { class: "pic", style: "--c:#6366f1" }, String(i + 1)), h("div", { class: "tx" }, h("b", {}, p.name), h("small", {}, p.lat.toFixed(4) + " , " + p.lng.toFixed(4))), h("button", { class: "plain", on: { click: () => {
        meet.pts.splice(i, 1);
        drawMeet();
        renderMeet();
      } } }, svg("i-close"))))),
      h("div", { class: "btns" }, ["car", "foot"].map((m) => h("button", { class: "ghost" + (meet.mode === m ? " on" : ""), on: { click: () => {
        meet.mode = m;
        renderMeet();
      } } }, svg(MODES[m].ico), MODES[m].label))),
      h("div", { class: "btns" }, h("button", { class: "primary", disabled: meet.pts.length < 2 ? "" : null, on: { click: calcMeet } }, svg("i-users"), "\u0627\u062D\u0633\u0628 \u0646\u0642\u0637\u0629 \u0627\u0644\u0644\u0642\u0627\u0621")),
      res || null
    ));
  }
  async function calcMeet() {
    renderMeet(h("p", { class: "note" }, "\u062C\u0627\u0631\u064D \u062D\u0633\u0627\u0628 \u0623\u0632\u0645\u0646\u0629 \u0627\u0644\u0648\u0635\u0648\u0644\u2026"));
    try {
      const net = MODES[meet.mode].net;
      const dur = (p, c) => osrm(net, [p.lng, p.lat], [c.lng, c.lat]).then((j) => j.routes[0].duration);
      const list = await meetupPoints(meet.pts, dur);
      const res = h("div", { class: "list" }, list.slice(0, 3).map((c, k) => h("button", { class: "item", on: { click: () => {
        const p = { lng: c.lng, lat: c.lat, name: c.name, sub: "\u0646\u0642\u0637\u0629 \u0644\u0642\u0627\u0621 \u0645\u0642\u062A\u0631\u062D\u0629", type: "\u0646\u0642\u0637\u0629 \u0644\u0642\u0627\u0621" };
        endMeet(true);
        showPlace(p, true);
      } } }, h("div", { class: "pic", style: "--c:#10b981" }, k === 0 ? "\u2605" : String(k + 1)), h("div", { class: "tx" }, h("b", {}, c.name), h("small", {}, c.times.map((t, i) => `\u0627\u0644\u0634\u062E\u0635 ${i + 1}: ${fmtTime(t)}`).join(" \xB7 "))), h("div", { class: "dd" }, "\u0641\u0631\u0642 " + fmtTime(Math.max(...c.times) - Math.min(...c.times))))));
      renderMeet(h("div", {}, h("p", { class: "note" }, "\u0623\u0641\u0636\u0644 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A (\u0627\u0644\u0623\u0648\u0644 \u0647\u0648 \u0627\u0644\u0623\u0639\u062F\u0644):"), res, h("p", { class: "note" }, "\u0627\u0644\u0623\u0632\u0645\u0646\u0629 \u0645\u0646 \u062E\u0627\u062F\u0645 \u0627\u0644\u062A\u0648\u062C\u064A\u0647 \u0628\u062F\u0648\u0646 \u0627\u0632\u062F\u062D\u0627\u0645 \u0645\u0628\u0627\u0634\u0631. \u0627\u0636\u063A\u0637 \u0627\u062E\u062A\u064A\u0627\u0631\u0627\u064B \u062B\u0645 \xAB\u0628\u062F\u0621\xBB.")));
    } catch (e) {
      renderMeet(h("p", { class: "err" }, "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u062D\u0633\u0627\u0628. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u062D\u0627\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B."));
    }
  }
  var HZ = (() => {
    try {
      const a = JSON.parse(localStorage.getItem("mp_haz")) || [];
      return a.filter((x) => Date.now() - x.t < 48 * 36e5);
    } catch (e) {
      return [];
    }
  })();
  var saveHZ = () => {
    try {
      localStorage.setItem("mp_haz", JSON.stringify(HZ));
    } catch (e) {
    }
  };
  function drawHazards() {
    for (const m of hazMarkers) m.remove();
    hazMarkers = [];
    for (const z of HZ) {
      const el = h("div", { class: "hz", title: HAZ[z.type] }, svg("i-warn"));
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        showSheet(h("div", {}, h("div", { class: "sh-h" }, svg("i-warn"), h("h3", {}, HAZ[z.type]), h("button", { class: "plain", on: { click: hideSheet } }, svg("i-close"))), h("p", { class: "note" }, "\u0623\u064F\u0628\u0644\u063A \u0639\u0646\u0647 \u0645\u0646\u0630 " + fmtTime((Date.now() - z.t) / 1e3) + " \xB7 \u0645\u062D\u0641\u0648\u0638 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632"), h("div", { class: "btns" }, h("button", { class: "ghost", on: { click: () => {
          HZ = HZ.filter((x) => x !== z);
          saveHZ();
          drawHazards();
          hideSheet();
        } } }, "\u062A\u0645 \u0627\u0644\u0625\u0635\u0644\u0627\u062D / \u0625\u0632\u0627\u0644\u0629"))));
      });
      hazMarkers.push(new maplibregl.Marker({ element: h("div", { class: "mk" }, el), anchor: "center" }).setLngLat([z.lng, z.lat]).addTo(map));
    }
  }
  function reportHazard() {
    const p = origin();
    showSheet(h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg("i-warn"), h("h3", {}, "\u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646 \u062E\u0637\u0631 \u0641\u064A \u0645\u0648\u0642\u0639\u0643"), h("button", { class: "plain", on: { click: hideSheet } }, svg("i-close"))),
      h("div", { class: "modes" }, Object.keys(HAZ).map((k) => h("button", { class: "mode", on: { click: () => {
        HZ.push({ id: Date.now(), type: k, lng: p[0], lat: p[1], t: Date.now() });
        saveHZ();
        drawHazards();
        hideSheet();
        toast("\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0628\u0644\u0627\u063A: " + HAZ[k]);
      } } }, svg("i-warn"), h("b", {}, HAZ[k])))),
      h("p", { class: "note" }, "\u062A\u064F\u062D\u0641\u0638 \u0627\u0644\u0628\u0644\u0627\u063A\u0627\u062A \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632 \u0644\u0645\u062F\u0629 48 \u0633\u0627\u0639\u0629 \u0648\u062A\u064F\u0646\u0628\u064E\u0651\u0647 \u0628\u0647\u0627 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0642\u064A\u0627\u062F\u0629. \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0628\u064A\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u062A\u062D\u062A\u0627\u062C \u062E\u0627\u062F\u0645\u0627\u064B (\u0627\u0646\u0638\u0631 README).")
    ));
  }
  function hazardWatch() {
    for (const z of HZ) {
      if (warned.has(z.id)) continue;
      const d = hav([me.lng, me.lat], [z.lng, z.lat]);
      if (d < 250 && Math.abs(angDiff(bearing([me.lng, me.lat], [z.lng, z.lat]), me.hdg)) < 70) {
        warned.add(z.id);
        speak(`\u062A\u0646\u0628\u064A\u0647: ${HAZ[z.type]} \u0623\u0645\u0627\u0645\u0643 \u0628\u0639\u062F ${Math.round(d / 10) * 10} \u0645\u062A\u0631`);
        toast("\u26A0 " + HAZ[z.type] + " \u0623\u0645\u0627\u0645\u0643", 4e3);
      }
    }
  }
  function clearPOI() {
    for (const m of poiMarkers) m.remove();
    poiMarkers = [];
    poiState = null;
    pushPOI();
    $$("#chips button").forEach((b) => b.classList.remove("on", "busy"));
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
    poiState.list.forEach((p) => {
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
    const items = poiState.list.map((p) => h("button", { class: "item", style: `--c:${C.color}`, on: { click: () => selectPOI(p) } }, h("div", { class: "pic" }, svg(C.ico)), h("div", { class: "tx" }, h("b", {}, p.name), h("small", {}, p.sub)), h("div", { class: "dd" }, fmtDist(p.dist))));
    showSheet(h(
      "div",
      {},
      h("div", { class: "sh-h" }, svg(C.ico), h("h3", {}, `${C.plural} \u2014 \u0623\u0642\u0631\u0628 ${poiState.list.length}`), h("button", { class: "plain", "aria-label": "\u0625\u063A\u0644\u0627\u0642", on: { click: () => {
        clearPOI();
        hideSheet();
      } } }, svg("i-close"))),
      poiState.list.length ? h("div", { class: "list" }, items) : h("p", { class: "note" }, `\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0645\u0627\u0643\u0646 \u0636\u0645\u0646 ${fmtDist(poiState.radius)}.`),
      h("p", { class: "note" }, `\u0627\u0644\u0645\u0633\u0627\u0641\u0627\u062A \u0628\u062E\u0637 \u0645\u0633\u062A\u0642\u064A\u0645 \u0636\u0645\u0646 ${fmtDist(poiState.radius)} \u2014 \u062A\u062A\u062D\u0648\u0644 \u0625\u0644\u0649 \u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0637\u0631\u064A\u0642 \u0639\u0646\u062F \u0627\u0644\u0627\u062E\u062A\u064A\u0627\u0631. \xA9 OpenStreetMap`)
    ));
  }
  function selectPOI(p) {
    for (const q of poiState.list) q.el && q.el.classList.toggle("sel", q === p);
    dest = { lng: p.lng, lat: p.lat, name: p.name, sub: p.sub, type: CATS[poiState.cat].label };
    setMarker();
    map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16), pitch: 60, duration: 800, padding: { top: 0, bottom: Math.round(innerHeight * 0.3), left: 0, right: 0 } });
    renderPlace();
  }
  var openModal = (id) => N[id].classList.remove("hide");
  var closeModals = () => {
    for (const m of $$(".modal")) m.classList.add("hide");
  };
  var row = (title, sub, ctrl) => h("div", { class: "set" }, h("label", {}, title, sub ? h("small", {}, sub) : null), ctrl);
  function toggle(key, on) {
    const i = h("input", { type: "checkbox", class: "sw" });
    i.checked = !!ST[key];
    i.addEventListener("change", () => {
      ST[key] = i.checked;
      save("mp_settings_v3", ST);
      on && on(i.checked);
    });
    return i;
  }
  function numInput(key, step) {
    const i = h("input", { type: "number", class: "num", step: String(step), min: "0", inputmode: "decimal" });
    i.value = ST[key];
    i.addEventListener("change", () => {
      const v = parseFloat(i.value);
      if (isFinite(v) && v >= 0) {
        ST[key] = v;
        save("mp_settings_v3", ST);
      }
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
        save("mp_settings_v3", ST);
        on && on();
      });
      return s;
    };
    N.setBody.replaceChildren(
      row("\u0627\u0644\u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0635\u0648\u062A\u064A", "\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0639\u0631\u0628\u064A\u0629 \u0645\u0639 \u0627\u0644\u0645\u0639\u0627\u0644\u0645: \xAB\u0627\u062A\u062C\u0647 \u064A\u0645\u064A\u0646\u0627\u064B \u0639\u0646\u062F \u0635\u064A\u062F\u0644\u064A\u0629\u2026\xBB", toggle("voice", () => {
        if (navActive) setVolIcon();
      })),
      row("\u0627\u0644\u0645\u0628\u0627\u0646\u064A \u062B\u0644\u0627\u062B\u064A\u0629 \u0627\u0644\u0623\u0628\u0639\u0627\u062F", "\u0625\u0638\u0647\u0627\u0631 \u0627\u0631\u062A\u0641\u0627\u0639\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0646\u064A", toggle("buildings", (v) => {
        for (const l of map.getStyle().layers) if (l.type === "fill-extrusion" && !OWN.has(l.id) || l.id === "mp-buildings") map.setLayoutProperty(l.id, "visibility", v ? "visible" : "none");
      })),
      row("\u062A\u0636\u0627\u0631\u064A\u0633 \u0627\u0644\u0623\u0631\u0636 3D", "\u062A\u0639\u0645\u0644 \u0641\u064A \u0648\u0636\u0639 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u0639\u0627\u0644\u064A \u0641\u0642\u0637", toggle("terrain", () => applyTerrain())),
      row("\u0627\u0644\u0623\u062F\u0627\u0621", "\u062A\u0644\u0642\u0627\u0626\u064A \u064A\u062E\u0641\u0651\u0636 \u0627\u0644\u062C\u0648\u062F\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u062C\u0647\u0627\u0632 \u0628\u0637\u064A\u0626\u0627\u064B", sel("perf", [["auto", "\u062A\u0644\u0642\u0627\u0626\u064A"], ["high", "\u062C\u0648\u062F\u0629 \u0639\u0627\u0644\u064A\u0629"], ["low", "\u062E\u0641\u064A\u0641 \u062C\u062F\u0627\u064B"]], () => {
        applyPerf();
        toast(level() === "low" ? "\u0648\u0636\u0639 \u0627\u0644\u0623\u062F\u0627\u0621 \u0627\u0644\u062E\u0641\u064A\u0641" : "\u0648\u0636\u0639 \u0627\u0644\u062C\u0648\u062F\u0629 \u0627\u0644\u0639\u0627\u0644\u064A\u0629");
      })),
      row("\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u0645\u0639 \u0627\u0644\u0633\u064A\u0631", "\u062A\u062F\u0648\u064A\u0631 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 \u062D\u0633\u0628 \u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u062D\u0631\u0643\u0629", toggle("headingUp")),
      row("\u0646\u0645\u0637 \u0627\u0644\u062E\u0631\u064A\u0637\u0629", null, sel("style", [["liberty", "\u0642\u064A\u0627\u0633\u064A"], ["bright", "\u0632\u0627\u0647\u064D"], ["positron", "\u0641\u0627\u062A\u062D \u0647\u0627\u062F\u0626"]], async () => {
        map.setStyle(await loadStyle(ST.style));
      })),
      row("\u0646\u0637\u0627\u0642 \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0623\u0645\u0627\u0643\u0646", null, sel("radius", [[1e3, "1 \u0643\u0645"], [2e3, "2 \u0643\u0645"], [5e3, "5 \u0643\u0645"]])),
      row("\u0627\u0633\u062A\u0647\u0644\u0627\u0643 \u0633\u064A\u0627\u0631\u062A\u0643", "\u0644\u062A\u0631 \u0644\u0643\u0644 100 \u0643\u0645 (\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0648\u0642\u0648\u062F)", numInput("cons", 0.1)),
      row("\u0633\u0639\u0631 \u0644\u062A\u0631 \u0627\u0644\u0648\u0642\u0648\u062F", "\u0644\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A \u0644\u0644\u062A\u0643\u0644\u0641\u0629", numInput("price", 0.01)),
      row("\u0631\u0645\u0632 \u0627\u0644\u0639\u0645\u0644\u0629", null, (() => {
        const i = h("input", { class: "num", maxlength: "6" });
        i.value = ST.cur;
        i.addEventListener("change", () => {
          ST.cur = i.value.trim() || "\u062F.\u0644";
          save("mp_settings_v3", ST);
        });
        return i;
      })()),
      row("\u0627\u0644\u062A\u062D\u062F\u064A\u062B\u0627\u062A", "\u0627\u0644\u0625\u0635\u062F\u0627\u0631 " + APP_VERSION, h("button", { class: "ghost", style: "flex:none;min-height:40px", on: { click: checkUpdate } }, "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0622\u0646")),
      row("\u0645\u0633\u062D \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u0624\u0642\u062A", "\u062D\u0630\u0641 \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629 \u0644\u0644\u0639\u0645\u0644 \u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A", h("button", { class: "ghost", style: "flex:none;min-height:40px", on: { click: async () => {
        try {
          for (const k of await caches.keys()) if (!/shell/.test(k)) await caches.delete(k);
          toast("\u062A\u0645 \u0645\u0633\u062D \u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u0624\u0642\u062A");
        } catch (e) {
          toast("\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0645\u0633\u062D");
        }
      } } }, "\u0645\u0633\u062D")),
      h("p", { class: "hint" }, "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A: \xA9 \u0645\u0633\u0627\u0647\u0645\u0648 OpenStreetMap \xB7 \u062E\u0631\u0627\u0626\u0637 OpenFreeMap (OpenMapTiles) \xB7 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A OSRM \xB7 \u0627\u0644\u0623\u0645\u0627\u0643\u0646 Overpass \xB7 \u0627\u0644\u0628\u062D\u062B Photon/Nominatim \xB7 \u0627\u0644\u0637\u0642\u0633 \u0648\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639\u0627\u062A Open-Meteo \xB7 \u0627\u0644\u062E\u0631\u064A\u0637\u0629 MapLibre GL JS. \u0627\u0644\u0627\u0632\u062F\u062D\u0627\u0645 \u0648\u0627\u0644\u0645\u0648\u0627\u0642\u0641 \u062A\u0642\u062F\u064A\u0631\u064A\u0627\u0646 \u0648\u0644\u064A\u0633\u0627 \u0645\u0628\u0627\u0634\u0631\u064A\u0646.")
    );
  }
  var appURL = () => location.href.split("#")[0].split("?")[0];
  var standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
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
    const data = { title: "\u0645\u0633\u0627\u0631\u064A", text: "\u062E\u0631\u0627\u0626\u0637 \u0648\u0645\u0644\u0627\u062D\u0629 \u062B\u0644\u0627\u062B\u064A\u0629 \u0627\u0644\u0623\u0628\u0639\u0627\u062F \u0628\u062A\u0648\u062C\u064A\u0647 \u0635\u0648\u062A\u064A \u0639\u0631\u0628\u064A", url: appURL() };
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
  function offerUpdate() {
    if ($("#updBar")) return;
    const bar = h(
      "div",
      { id: "updBar", class: "upd", role: "alert" },
      svg("i-refresh"),
      h("div", { class: "ut" }, h("b", {}, "\u064A\u062A\u0648\u0641\u0631 \u062A\u062D\u062F\u064A\u062B \u062C\u062F\u064A\u062F"), h("small", {}, "\u062D\u062F\u0651\u062B \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0623\u062D\u062F\u062B \u0627\u0644\u0645\u064A\u0632\u0627\u062A")),
      h("button", { class: "primary", on: { click: applyUpdate } }, "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0622\u0646"),
      h("button", { class: "ghost", on: { click: () => {
        bar.remove();
        toast("\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0644\u0627\u062D\u0642\u0627\u064B \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A", 4e3);
      } } }, "\u0625\u0644\u063A\u0627\u0621")
    );
    document.body.append(bar);
  }
  function applyUpdate() {
    const w = swReg && swReg.waiting;
    if (!w) {
      location.reload();
      return;
    }
    updating = true;
    w.postMessage({ type: "SKIP_WAITING" });
    setTimeout(() => location.reload(), 2500);
  }
  async function checkUpdate() {
    if (!swReg) {
      toast("\u0627\u0644\u062A\u062D\u062F\u064A\u062B \u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D");
      return;
    }
    toast("\u062C\u0627\u0631\u064D \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u062A\u062D\u062F\u064A\u062B\u2026", 2e3);
    try {
      await swReg.update();
    } catch (e) {
    }
    await sleep(1500);
    if (swReg.waiting) offerUpdate();
    else if (!swReg.installing) toast("\u0623\u0646\u062A \u062A\u0633\u062A\u062E\u062F\u0645 \u0623\u062D\u062F\u062B \u0625\u0635\u062F\u0627\u0631 \u2713");
  }
  function initSW() {
    if (!("serviceWorker" in navigator)) return;
    const reg = () => navigator.serviceWorker.register("sw.js").then((r) => {
      swReg = r;
      if (r.waiting && navigator.serviceWorker.controller) offerUpdate();
      r.addEventListener("updatefound", () => {
        const w = r.installing;
        w && w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) offerUpdate();
        });
      });
      r.update().catch(() => {
      });
    }).catch(() => {
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (updating) location.reload();
    });
    document.readyState === "complete" ? reg() : addEventListener("load", reg);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && swReg) swReg.update().catch(() => {
      });
    });
  }
  function intro() {
    const el = $("#intro");
    if (!el) return Promise.resolve();
    el.classList.add("go");
    return new Promise((res) => {
      setTimeout(() => el.classList.add("out"), 2600);
      setTimeout(() => {
        el.remove();
        res();
      }, 3e3);
    });
  }
  function wire() {
    N.q.addEventListener("input", debounce(doSearch, 200));
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
      clearTimeout(resumeT);
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
    N.bPitch.addEventListener("click", () => map.easeTo({ pitch: map.getPitch() > 10 ? 0 : 62, duration: 600 }));
    N.bHazard.addEventListener("click", reportHazard);
    N.bMeet.addEventListener("click", startMeet);
    N.bCompass.addEventListener("click", () => {
      if (Math.abs(angDiff(map.getBearing(), 0)) > 2) {
        northOnly = true;
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
      save("mp_settings_v3", ST);
      setVolIcon();
      if (!ST.voice) {
        try {
          speechSynthesis.cancel();
        } catch (e) {
        }
      }
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
    const cc = map.getCanvasContainer();
    cc.addEventListener("pointerdown", userTouched, { passive: true });
    cc.addEventListener("touchstart", userTouched, { passive: true });
    cc.addEventListener("wheel", userTouched, { passive: true });
    map.on("dragstart", (e) => {
      if (e.originalEvent) userTouched();
    });
    map.on("rotate", () => {
      N.bCompass.firstChild.style.transform = `rotate(${-map.getBearing()}deg)`;
    });
    map.on("click", mapClick);
  }
  async function boot() {
    const introP = intro();
    const style = await loadStyle(ST.style);
    const c = lastPos ? [lastPos.lng, lastPos.lat] : FALLBACK_CENTER;
    map = new maplibregl.Map({ container: "map", style, center: c, zoom: lastPos ? 15.6 : 13, pitch: 62, bearing: -12, maxPitch: 85, attributionControl: false, antialias: !lowEnd && devicePixelRatio < 2, fadeDuration: 0, pixelRatio: Math.min(devicePixelRatio || 1, level() === "low" ? 1.25 : 2), dragRotate: true, touchPitch: true, maxTileCacheSize: level() === "low" ? 80 : 200, cancelPendingTileRequestsWhileZooming: true });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "\xA9 OpenStreetMap \xB7 OpenFreeMap \xB7 OSRM" }), "bottom-left");
    map.on("style.load", () => {
      setupLayers();
      drawHazards();
    });
    map.on("error", (e) => {
      if (e && e.error && /Failed to fetch|NetworkError|AJAXError/i.test(String(e.error.message || e.error))) setStatus(navigator.onLine ? "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u0639\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u0631\u064A\u0637\u0629" : "\u0628\u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A \u2014 \u062A\u0638\u0647\u0631 \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u062E\u0632\u0646\u0629 \u0641\u0642\u0637");
    });
    wire();
    requestAnimationFrame(loop);
    window.__mp = { map, me, vis, nav, get state() {
      return { follow, navActive, simOn, dest, route, mode, routes, cands, poiState, prev: !!prev, meet };
    }, handleFix, startGPS, showPlace, chooseMode, applyMode, showPOI, mapClick, reportHazard, offerUpdate, startPreview, stopPreview, showDeparture, showWeather, showStops, showParking, startMeet, addMeetPoint, renderLanes, userTouched, doPrecache, level, applyPerf };
    startGPS();
    if (!navigator.onLine) setStatus("\u0628\u062F\u0648\u0646 \u0625\u0646\u062A\u0631\u0646\u062A \u2014 \u062A\u0638\u0647\u0631 \u0627\u0644\u062E\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u062E\u0632\u0646\u0629 \u0641\u0642\u0637");
    const ll = params.get("ll");
    if (ll) {
      const [a, b] = ll.split(",").map(Number);
      if (isFinite(a) && isFinite(b)) map.once("load", () => showPlace({ lat: a, lng: b, name: params.get("n") || "\u0645\u0648\u0642\u0639 \u0645\u0634\u0627\u0631\u064E\u0643" }, true));
    }
    initSW();
    await introP;
  }
  boot();
})();
