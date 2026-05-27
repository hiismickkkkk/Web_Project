/* ═══════════════════════════════════════════
   NCU Accessibility Map — JavaScript
   ═══════════════════════════════════════════ */

// ───────── Constants ─────────
const NCU    = [24.9681, 121.1921];
const ZOOM   = 16;
const BOUNDS = L.latLngBounds(
    [24.960, 121.183],   // 西南角（留些餘裕）
    [24.976, 121.201]    // 東北角
);
const OWM_KEY = '108580b87d11aa9e274174cc3037f578'; // ← 換成你的 OpenWeatherMap API Key

// ───────── Map Setup ─────────
const map = L.map('map', {
    zoomControl:        false,
    maxBounds:          BOUNDS,
    maxBoundsViscosity: 1.0,   // 完全鎖定，不允許拖出邊界
    minZoom:            15     // 不能縮得太遠
}).setView(NCU, ZOOM);

L.control.zoom({ position: 'bottomright' }).addTo(map);

const tileOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
});

const tileSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 20, attribution: '© Esri' }
);

tileSat.addTo(map);
const rainOverlay = L.layerGroup();
L.control.layers(
    { '街道地圖': tileOSM, '衛星俯瞰': tileSat },
    { '天氣動畫': rainOverlay },
    { position: 'topleft' }
).addTo(map);

map.on('overlayadd', async e => {
    if (e.name !== '天氣動畫') return;

    // 解鎖縮放與邊界，讓雷達範圍可見
    map.setMinZoom(3);
    map.setMaxBounds(null);
    map.setView(NCU, 9, { animate: true });

    const card = document.getElementById('weather-card');
    card.style.display = 'block';
    document.getElementById('weather-loading').style.display = 'flex';
    document.getElementById('weather-content').style.display = 'none';
    const [weatherData] = await Promise.all([fetchWeather(), Promise.resolve(initCloudLayer())]);
    renderWeatherCard(weatherData);
});

map.on('overlayremove', e => {
    if (e.name !== '天氣動畫') return;

    // 還原校園縮放與邊界
    map.setMinZoom(15);
    map.setMaxBounds(BOUNDS);
    map.setView(NCU, ZOOM, { animate: true });

    document.getElementById('weather-card').style.display = 'none';
    stopCloudLayer();
});

// ───────── Facility Data ─────────
const DATA = {
    aed: {
        color: '#FF4757',
        icon:  'fa-heart-pulse',
        label: 'AED 體外除顫器',
        items: [
            { name: '衛生保健組',   coords: [24.96819, 121.19342], desc: '行政大樓一樓，衛生保健組服務台旁' },
            { name: '行政大樓',     coords: [24.96826, 121.19510], desc: '行政大樓一樓正門入口處' },
            { name: '女十四舍',     coords: [24.96562, 121.19438], desc: '宿舍一樓舍監室旁' },
            { name: '綜教館',       coords: [24.97021, 121.19300], desc: '綜合教學館一樓中庭牆面' },
            { name: '依仁堂',       coords: [24.96826, 121.19103], desc: '體育館（依仁堂）主入口' }
        ]
    },
    sos: {
        color: '#FF6B35',
        icon:  'fa-phone-volume',
        label: 'SOS 緊急電話',
        items: [
            { name: '綜教館',           coords: [24.97021, 121.19280], desc: 'SOS 緊急求救電話' },
            { name: '至道樓',           coords: [24.96563, 121.19378], desc: 'SOS 緊急求救電話' },
            { name: '校史館前',         coords: [24.96700, 121.19576], desc: 'SOS 緊急求救電話' },
            { name: '國鼎大樓前',       coords: [24.96992, 121.19098], desc: 'SOS 緊急求救電話' },
            { name: '羽球場',           coords: [24.96901, 121.19104], desc: 'SOS 緊急求救電話' },
            { name: '小榕樹排球場',     coords: [24.96744, 121.19087], desc: 'SOS 緊急求救電話' },
            { name: '後門',             coords: [24.96567, 121.19104], desc: 'SOS 緊急求救電話' },
            { name: '籃球場',           coords: [24.96848, 121.18922], desc: 'SOS 緊急求救電話' },
            { name: '大型力學實驗館',   coords: [24.96872, 121.18854], desc: 'SOS 緊急求救電話' },
            { name: '運動中心',         coords: [24.96973, 121.18989], desc: 'SOS 緊急求救電話' }
        ]
    },
    ramp: {
        color: '#2196F3',
        icon:  'fa-person-walking',
        label: '無障礙坡道',
        items: [
            { name: '無障礙坡道 — 行政大樓北側', coords: [24.96840, 121.19505], desc: '連接停車場與行政大樓入口，坡度平緩，設有止滑條' },
            { name: '無障礙坡道 — 圖書館正門',   coords: [24.96878, 121.19265], desc: '圖書館主入口兩側均設有無障礙坡道' },
            { name: '無障礙坡道 — 理學院',       coords: [24.96650, 121.19398], desc: '理學院大樓主入口坡道，寬度 150 cm' },
            { name: '無障礙坡道 — 工學院廣場',   coords: [24.96698, 121.19522], desc: '工學院廣場連接各教室走道之坡道' },
            { name: '無障礙坡道 — 學生活動中心', coords: [24.96918, 121.19345], desc: '學生活動中心側門坡道' },
            { name: '無障礙坡道 — 依仁堂（體育館）', coords: [24.96898, 121.19050], desc: '體育館主入口無障礙坡道，寬度充裕' }
        ]
    },
    elevator: {
        color: '#4CAF50',
        icon:  'fa-elevator',
        label: '無障礙電梯',
        items: [
            { name: '無障礙電梯 — 行政大樓',   coords: [24.96832, 121.19518], desc: '可達 1–6 樓，位於大樓東側走廊' },
            { name: '無障礙電梯 — 圖書館',     coords: [24.96875, 121.19258], desc: '可達 B1–5 樓，位於入口大廳右側' },
            { name: '無障礙電梯 — 理學院',     coords: [24.96655, 121.19405], desc: '可達 1–8 樓，位於理學院中央走廊' },
            { name: '無障礙電梯 — 工學院一館', coords: [24.96703, 121.19530], desc: '可達 1–6 樓，位於一館北棟入口旁' },
            { name: '無障礙電梯 — 綜教館',     coords: [24.97015, 121.19308], desc: '可達 1–5 樓，位於綜教館西側電梯廳' },
            { name: '無障礙電梯 — 女十四舍',   coords: [24.96565, 121.19445], desc: '可達 1–8 樓，宿舍一樓大廳旁' }
        ]
    }
};

// ───────── Layer Groups & Visibility State ─────────
const groups  = {};
const visible = {};

Object.keys(DATA).forEach(k => {
    groups[k]  = L.layerGroup();
    visible[k] = true;
});

// ───────── User Location State ─────────
let userPos    = null;
let userMarker = null;
let userCircle = null;

// ───────── Popup HTML ─────────
function popupHTML(item, key) {
    const cfg = DATA[key];
    let distHtml = '';
    if (userPos) {
        const d = haversine(userPos[0], userPos[1], item.coords[0], item.coords[1]);
        distHtml = `<div class="pop-dist"><i class="fas fa-route"></i> ${fmtDist(d)}</div>`;
    }
    return `
        <div class="pop-head" style="border-left:4px solid ${cfg.color};">
            <i class="fas ${cfg.icon}" style="color:${cfg.color};font-size:13px;"></i> ${item.name}
        </div>
        <div class="pop-body">
            <p>${item.desc}</p>
            ${distHtml}
        </div>`;
}

// ───────── Build / Rebuild Markers ─────────
function buildMarkers() {
    Object.keys(DATA).forEach(key => {
        const cfg = DATA[key];
        groups[key].clearLayers();

        DATA[key].items.forEach(item => {
            L.circleMarker(item.coords, {
                radius:      10,
                fillColor:   cfg.color,
                color:       '#ffffff',
                weight:      2.5,
                fillOpacity: 0.88
            })
            .bindPopup(popupHTML(item, key), { maxWidth: 260 })
            .addTo(groups[key]);
        });

        if (visible[key]) {
            if (!map.hasLayer(groups[key])) groups[key].addTo(map);
        } else {
            if (map.hasLayer(groups[key]))  map.removeLayer(groups[key]);
        }

        document.getElementById(`cnt-${key}`).textContent =
            `${DATA[key].items.length} 個`;
    });
}

// ───────── Toggle Layer ─────────
function toggleLayer(key) {
    visible[key] = !visible[key];

    const btn = document.getElementById(`cat-${key}`);
    const eye = document.getElementById(`eye-${key}`);

    if (visible[key]) {
        groups[key].addTo(map);
        btn.classList.replace('inactive', 'active') || btn.classList.add('active');
        eye.className = 'fas fa-eye cat-eye';
    } else {
        map.removeLayer(groups[key]);
        btn.classList.replace('active', 'inactive') || btn.classList.add('inactive');
        eye.className = 'fas fa-eye-slash cat-eye';
    }
}

// ───────── Reset View ─────────
function resetView() {
    map.setView(NCU, ZOOM, { animate: true });
}

// ───────── Current Location ─────────
function locateUser() {
    if (!navigator.geolocation) {
        showToast('您的瀏覽器不支援定位功能', 'error');
        return;
    }

    const btn = document.getElementById('locate-btn');
    btn.classList.remove('located');
    btn.classList.add('locating');
    showToast('正在取得您的位置…', 'info');

    navigator.geolocation.getCurrentPosition(
        pos => {
            btn.classList.remove('locating');
            btn.classList.add('located');
            const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
            setUserLocation(lat, lng, acc);
            showToast('已找到您的位置！', 'success');
        },
        err => {
            btn.classList.remove('locating');
            const msgs = {
                1: '請允許瀏覽器使用定位權限',
                2: '無法取得位置，請確認 GPS 已開啟',
                3: '定位逾時，請重試'
            };
            showToast(msgs[err.code] || '定位失敗', 'error');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
}

function setUserLocation(lat, lng, acc) {
    userPos = [lat, lng];

    // Remove old layers
    if (userMarker) map.removeLayer(userMarker);
    if (userCircle) map.removeLayer(userCircle);

    // Accuracy circle
    userCircle = L.circle([lat, lng], {
        radius:      acc,
        color:       '#4285f4',
        fillColor:   '#4285f4',
        fillOpacity: 0.08,
        weight:      1.5
    }).addTo(map);

    // Pulsing dot marker
    const icon = L.divIcon({
        className:   '',
        html:        '<div class="my-loc-wrap"><div class="my-loc-ring"></div><div class="my-loc-dot"></div></div>',
        iconSize:    [20, 20],
        iconAnchor:  [10, 10],
        popupAnchor: [0, -12]
    });

    userMarker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
            <div class="pop-head" style="border-left:4px solid #4285f4;">
                <i class="fas fa-circle-dot" style="color:#4285f4;font-size:13px;"></i> 您的目前位置
            </div>
            <div class="pop-body">
                <p>精確度：±${Math.round(acc)} 公尺</p>
            </div>`);

    map.setView([lat, lng], 17, { animate: true });

    // Location status badge
    const locStatus = document.getElementById('loc-status');
    locStatus.style.display = 'flex';
    document.getElementById('loc-text').textContent = `已定位（精確度 ±${Math.round(acc)}m）`;

    // Rebuild popups to include distances
    buildMarkers();

    // Show nearest facilities panel
    showNearest(lat, lng);
}

// ───────── Nearest Facilities ─────────
function showNearest(lat, lng) {
    const cats = [
        { key: 'aed',      color: '#FF4757', icon: 'fa-heart-pulse' },
        { key: 'sos',      color: '#FF6B35', icon: 'fa-phone-volume' },
        { key: 'ramp',     color: '#2196F3', icon: 'fa-person-walking' },
        { key: 'elevator', color: '#4CAF50', icon: 'fa-elevator' }
    ];

    const html = cats.map(c => {
        const items = DATA[c.key].items;
        if (!items.length) return '';

        let closest = items[0];
        let minDist = haversine(lat, lng, items[0].coords[0], items[0].coords[1]);

        items.forEach(it => {
            const d = haversine(lat, lng, it.coords[0], it.coords[1]);
            if (d < minDist) { minDist = d; closest = it; }
        });

        return `
            <div class="near-item" onclick="flyTo(${closest.coords[0]}, ${closest.coords[1]})">
                <div class="near-icon" style="background:${c.color};">
                    <i class="fas ${c.icon}"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div class="near-name">${closest.name}</div>
                    <div class="near-dist">
                        <i class="fas fa-route"></i> ${fmtDist(minDist)}
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color:var(--muted);font-size:10px;flex-shrink:0;"></i>
            </div>`;
    }).join('');

    document.getElementById('nearest-list').innerHTML = html;
    document.getElementById('nearest-panel').style.display = 'block';
}

function flyTo(lat, lng) {
    map.flyTo([lat, lng], 18, { animate: true, duration: 1 });
}

// ───────── Haversine Distance ─────────
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const r = Math.PI / 180;
    const dLat = (lat2 - lat1) * r;
    const dLng = (lng2 - lng1) * r;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m) {
    return m < 1000
        ? `${Math.round(m)} 公尺`
        : `${(m / 1000).toFixed(1)} 公里`;
}

// ───────── Search ─────────
(function initSearch() {
    const inp  = document.getElementById('search-input');
    const clr  = document.getElementById('search-clear');
    const drop = document.getElementById('search-dropdown');

    inp.addEventListener('input', () => {
        const q = inp.value.trim();
        clr.style.display = q ? 'flex' : 'none';
        if (q.length >= 1) {
            renderSearch(q, drop);
        } else {
            drop.style.display = 'none';
        }
    });

    clr.addEventListener('click', () => {
        inp.value = '';
        clr.style.display = 'none';
        drop.style.display = 'none';
        inp.focus();
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.header-center')) {
            drop.style.display = 'none';
        }
    });
})();

function renderSearch(q, drop) {
    const ql  = q.toLowerCase();
    const hits = [];

    Object.keys(DATA).forEach(key => {
        DATA[key].items.forEach(it => {
            if (it.name.toLowerCase().includes(ql) || it.desc.toLowerCase().includes(ql)) {
                hits.push({ ...it, key });
            }
        });
    });

    if (!hits.length) {
        drop.innerHTML = '<div class="sdrop-empty">找不到符合的設施</div>';
    } else {
        drop.innerHTML = hits.slice(0, 8).map(h => {
            const cfg = DATA[h.key];
            return `
                <div class="sdrop-item"
                     onclick="flyTo(${h.coords[0]},${h.coords[1]});
                              document.getElementById('search-dropdown').style.display='none';">
                    <div class="sdrop-icon" style="background:${cfg.color};">
                        <i class="fas ${cfg.icon}"></i>
                    </div>
                    <div>
                        <div class="sdrop-name">${h.name}</div>
                        <div class="sdrop-type">${cfg.label}</div>
                    </div>
                </div>`;
        }).join('');
    }

    drop.style.display = 'block';
}

// ───────── Toast ─────────
function showToast(msg, type = 'info', dur = 3200) {
    const box   = document.getElementById('toast-box');
    const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const el    = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type] || 'fa-circle-info'}"></i> ${msg}`;
    box.appendChild(el);

    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 320);
    }, dur);
}

// ───────── Modal ─────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.getElementById('btn-report').onclick = () => openModal('modal-report');
document.getElementById('btn-info').onclick   = () => openModal('modal-info');

['modal-report', 'modal-info'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal(id);
    });
});

document.getElementById('report-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn  = form.querySelector('[type=submit]');
    btn.disabled = true;

    try {
        const res = await fetch(form.action, {
            method:  'POST',
            body:    new FormData(form),
            headers: { Accept: 'application/json' }
        });

        if (res.ok) {
            showToast('回報已送出，感謝您的協助！', 'success');
            form.reset();
            setTimeout(() => closeModal('modal-report'), 1600);
        } else {
            showToast('送出失敗，請稍後再試', 'error');
        }
    } catch {
        showToast('網路錯誤，請稍後再試', 'error');
    } finally {
        btn.disabled = false;
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal('modal-report');
        closeModal('modal-info');
        document.getElementById('search-dropdown').style.display = 'none';
    }
});

// ───────── Weather: WMO Code Table ─────────
const WMO = {
    0:  { label: '晴朗',       emoji: '☀️'  },
    1:  { label: '大致晴朗',   emoji: '🌤️' },
    2:  { label: '局部多雲',   emoji: '⛅'  },
    3:  { label: '陰天',       emoji: '☁️'  },
    45: { label: '有霧',       emoji: '🌫️' },
    48: { label: '凍霧',       emoji: '🌫️' },
    51: { label: '毛毛雨',     emoji: '🌦️' },
    53: { label: '毛毛雨',     emoji: '🌦️' },
    55: { label: '毛毛雨',     emoji: '🌦️' },
    61: { label: '小雨',       emoji: '🌧️' },
    63: { label: '中雨',       emoji: '🌧️' },
    65: { label: '大雨',       emoji: '🌧️' },
    71: { label: '小雪',       emoji: '🌨️' },
    73: { label: '中雪',       emoji: '🌨️' },
    75: { label: '大雪',       emoji: '❄️'  },
    80: { label: '陣雨',       emoji: '🌦️' },
    81: { label: '陣雨',       emoji: '🌦️' },
    82: { label: '大陣雨',     emoji: '⛈️'  },
    95: { label: '雷雨',       emoji: '⛈️'  },
    96: { label: '雷雨夾冰雹', emoji: '⛈️'  },
    99: { label: '強雷雨夾冰雹', emoji: '⛈️' },
};

// ───────── Weather State ─────────
let cloudLayer     = null;
let cloudAnimTimer = null;

// ───────── Open-Meteo: 取得當前天氣 ─────────
async function fetchWeather() {
    const url = `https://api.open-meteo.com/v1/forecast`
              + `?latitude=${NCU[0]}&longitude=${NCU[1]}`
              + `&current=temperature_2m,wind_speed_10m,weather_code,precipitation`
              + `&timezone=Asia%2FTaipei`;
    try {
        const res  = await fetch(url);
        const data = await res.json();
        return data.current;
    } catch {
        return null;
    }
}

function renderWeatherCard(data) {
    const loading = document.getElementById('weather-loading');
    const content = document.getElementById('weather-content');

    if (!data) {
        loading.innerHTML = '<i class="fas fa-exclamation-circle"></i> 天氣資料載入失敗';
        return;
    }

    const wmo = WMO[data.weather_code] || { label: '未知', emoji: '🌡️' };

    document.getElementById('weather-icon').textContent  = wmo.emoji;
    document.getElementById('weather-temp').textContent  = `${data.temperature_2m}°C`;
    document.getElementById('weather-desc').textContent  = wmo.label;
    document.getElementById('weather-wind').textContent  = `${data.wind_speed_10m} km/h`;
    document.getElementById('weather-precip').textContent = `${data.precipitation} mm`;

    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('weather-time').textContent = `更新時間 ${hh}:${mm}`;

    loading.style.display  = 'none';
    content.style.display  = 'block';
}

// ───────── OpenWeatherMap: 雲層動畫 ─────────
function initCloudLayer() {
    cloudLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
        { opacity: 0.6, zIndex: 10, maxNativeZoom: 9 }
    ).addTo(map);

    // 呼吸動畫：opacity 在 0.35 ~ 0.75 之間緩慢振盪
    let opacity   = 0.6;
    let direction = -1;
    cloudAnimTimer = setInterval(() => {
        opacity += direction * 0.012;
        if (opacity <= 0.35) direction =  1;
        if (opacity >= 0.75) direction = -1;
        cloudLayer.setOpacity(opacity);
    }, 80);
}

function stopCloudLayer() {
    if (cloudAnimTimer) { clearInterval(cloudAnimTimer); cloudAnimTimer = null; }
    if (cloudLayer) {
        if (map.hasLayer(cloudLayer)) map.removeLayer(cloudLayer);
        cloudLayer = null;
    }
}

// ───────── Initialize ─────────
buildMarkers();

// ═══ 側邊欄收縮功能 JS ═══
function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const icon = document.getElementById('sidebar-icon');
    const btn = sidebar.querySelector('.toggle-sidebar-btn');
    
    sidebar.classList.toggle('collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        icon.className = 'fas fa-chevron-left';
        btn.title = '展開側邊欄';
        sidebar.appendChild(btn); 
    } else {
        icon.className = 'fas fa-chevron-right';
        btn.title = '收起側邊欄';
        const titleDiv = sidebar.querySelector('.sidebar-title');
        titleDiv.appendChild(btn);
    }
    
    if (typeof map !== 'undefined' && map !== null) {
        let count = 0;
        const interval = setInterval(() => {
            map.invalidateSize();
            count++;
            if (count > 30) clearInterval(interval);
        }, 10);
    }
}

// ═══ 展開內部資訊 ═══
function populateRegionLists() {
    Object.entries(DATA).forEach(([type, info]) => {
        const ulElement = document.getElementById(`list-${type}`);
        if (!ulElement) return;

        ulElement.innerHTML = info.items.map(item => {
            const descText = item.desc || info.defaultDesc || '';
            return `
                <li onclick="focusOnLocation(${item.coords[0]}, ${item.coords[1]}, event)">
                    <div>
                        <div class="region-item-name">${item.name}</div>
                        <div class="region-item-desc">${descText}</div>
                    </div>
                </li>
            `;
        }).join('');
    });
}

function handleCategoryClick(type) {
    const currentPanel = document.getElementById(`panel-${type}`);
    if (currentPanel) {
        currentPanel.classList.toggle('open');
    }
}

function handleEyeClick(type, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    if (typeof toggleLayer === 'function') {
        toggleLayer(type);
    }
}

function focusOnLocation(lat, lng, event) {
    if (event) event.stopPropagation();
    
    if (typeof map !== 'undefined' && map !== null) {
        map.flyTo([lat, lng], 18, {
            animate: true,
            duration: 0.8
        });
        
        if (window.innerWidth < 768 && typeof toggleSidebar === 'function') {
            toggleSidebar();
        }
    }
}

document.addEventListener('DOMContentLoaded', populateRegionLists);