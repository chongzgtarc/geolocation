// Configuration
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzVqkhlEEHWBhjIbne1NkRRpSVgEpzbSKU2LebYyGIn5NGCnrEzPiF2h95MIE0DWudrWQ/exec';

// Global Data Object
let gatheredData = {
    name: '',
    latitude: null,
    longitude: null,
    accuracy: null,
    method: '',
    provider: '',
    isFallback: false,
    city: '',
    region: '',
    country: '',
    browser: '',
    os: '',
    userAgent: '',
    timestamp: ''
};

// UI Elements
const inputCard = document.getElementById('input-card');
const loadingCard = document.getElementById('loading-card');
const resultCard = document.getElementById('result-card');
const statusCard = document.getElementById('status-card');

const testerNameInput = document.getElementById('tester-name');
const btnRequestLocation = document.getElementById('btn-request-location');
const btnSubmitSheets = document.getElementById('btn-submit-sheets');
const btnDownloadJson = document.getElementById('btn-download-json');
const btnReset = document.getElementById('btn-reset');

const loadingStatusText = document.getElementById('loading-status');
const valLatitude = document.getElementById('val-latitude');
const valLongitude = document.getElementById('val-longitude');
const valAccuracy = document.getElementById('val-accuracy');
const valMethod = document.getElementById('val-method');

const fallbackInfo = document.getElementById('fallback-info');
const ipCity = document.getElementById('ip-city');
const ipRegion = document.getElementById('ip-region');
const ipCountry = document.getElementById('ip-country');
const ipOrg = document.getElementById('ip-org');

const mapLink = document.getElementById('map-link');
const consoleLog = document.getElementById('console-log');
const submitSpinner = document.getElementById('submit-spinner');
const submitSuccessIcon = document.getElementById('submit-success-icon');
const submitErrorIcon = document.getElementById('submit-error-icon');
const statusMessageText = document.getElementById('status-message');

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Helper: Add Console Log Entry
function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;
    consoleLog.appendChild(entry);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Request Geolocation
btnRequestLocation.addEventListener('click', () => {
    const name = testerNameInput.value.trim();
    if (!name) {
        alert('Please enter your name or a tester ID first.');
        testerNameInput.focus();
        return;
    }

    gatheredData.name = name;
    
    // Parse browser and OS details
    const uaInfo = getBrowserAndOS();
    gatheredData.browser = uaInfo.browser;
    gatheredData.os = uaInfo.os;
    gatheredData.userAgent = navigator.userAgent;
    
    // Transition UI to Loading
    inputCard.classList.add('hidden');
    loadingCard.classList.remove('hidden');
    loadingStatusText.textContent = 'Requesting GPS Geolocation...';

    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            handleGeoSuccess,
            handleGeoError,
            geoOptions
        );
    } else {
        addLog('Browser does not support HTML5 Geolocation API.', 'error');
        triggerIPFallback('Not Supported');
    }
});

// Success Geolocation Handler
function handleGeoSuccess(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy;
    
    gatheredData.latitude = lat;
    gatheredData.longitude = lng;
    gatheredData.accuracy = `${acc.toFixed(1)}m`;
    gatheredData.method = 'GPS / Browser API';
    gatheredData.provider = 'Browser GPS';
    gatheredData.isFallback = false;
    gatheredData.timestamp = new Date().toISOString();

    // Try to retrieve some details via reverse lookup or IP info (optional)
    fetchIPDetailsQuietly();

    // Populate UI
    valLatitude.textContent = lat.toFixed(6);
    valLongitude.textContent = lng.toFixed(6);
    valAccuracy.textContent = `${acc.toFixed(1)} meters`;
    valMethod.textContent = 'GPS / Browser API';
    valMethod.className = 'telemetry-value highlight';

    // Set Map link (OpenStreetMap)
    mapLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

    // Display Results
    loadingCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
}

// Geolocation Error Handler
function handleGeoError(error) {
    let reason = 'Unknown error';
    switch (error.code) {
        case error.PERMISSION_DENIED:
            reason = 'Permission Denied by user';
            break;
        case error.POSITION_UNAVAILABLE:
            reason = 'Location information unavailable';
            break;
        case error.TIMEOUT:
            reason = 'Request timed out';
            break;
    }
    
    console.warn(`Geolocation failed: ${reason}. Falling back to IP Geolocation.`);
    loadingStatusText.textContent = 'GPS failed. Attempting IP Geolocation...';
    triggerIPFallback(reason);
}

// Fallback: Fetch Location via IP Geolocation API
function triggerIPFallback(reason) {
    gatheredData.isFallback = true;
    
    // Using ipapi.co (Free, no key required for basic usage)
    fetch('https://ipapi.co/json/')
        .then(response => {
            if (!response.ok) throw new Error('IP lookup failed');
            return response.json();
        })
        .then(data => {
            gatheredData.latitude = data.latitude;
            gatheredData.longitude = data.longitude;
            gatheredData.accuracy = '~10km (IP Estimate)';
            gatheredData.method = `IP Fallback (${reason})`;
            gatheredData.provider = data.org || 'N/A';
            gatheredData.city = data.city || 'N/A';
            gatheredData.region = data.region || 'N/A';
            gatheredData.country = data.country_name || 'N/A';
            gatheredData.timestamp = new Date().toISOString();

            // Populate UI
            valLatitude.textContent = data.latitude ? data.latitude.toFixed(4) : 'N/A';
            valLongitude.textContent = data.longitude ? data.longitude.toFixed(4) : 'N/A';
            valAccuracy.textContent = '~10 km (IP-based)';
            valMethod.textContent = `IP Fallback (${reason})`;
            valMethod.className = 'telemetry-value highlight';

            // Set Fallback Details Card
            ipCity.textContent = data.city || 'N/A';
            ipRegion.textContent = data.region || 'N/A';
            ipCountry.textContent = data.country_name || 'N/A';
            ipOrg.textContent = data.org || 'N/A';
            
            fallbackInfo.classList.remove('hidden');

            // Set Map link
            if (data.latitude && data.longitude) {
                mapLink.href = `https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=12/${data.latitude}/${data.longitude}`;
            }

            loadingCard.classList.add('hidden');
            resultCard.classList.remove('hidden');
        })
        .catch(err => {
            console.error('IP Fallback lookup also failed:', err);
            
            // Show error message
            alert(`Unable to get your location. GPS failed (${reason}) and IP Fallback failed. Please check permissions.`);
            
            // Reset to step 1
            loadingCard.classList.add('hidden');
            inputCard.classList.remove('hidden');
        });
}

// Optional helper to get approximate city details even if GPS succeeds
function fetchIPDetailsQuietly() {
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {
            gatheredData.city = data.city || '';
            gatheredData.region = data.region || '';
            gatheredData.country = data.country_name || '';
            gatheredData.provider = data.org || 'Browser GPS';
        })
        .catch(() => {
            // Silently ignore failures on background info
        });
}

// Download gathered data as JSON file
btnDownloadJson.addEventListener('click', () => {
    const filename = `geolocation-${gatheredData.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gatheredData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

// Submit Data to Google Sheets
btnSubmitSheets.addEventListener('click', async () => {
    // Show Console Log Panel
    resultCard.classList.add('hidden');
    statusCard.classList.remove('hidden');
    
    // UI Loading state
    submitSpinner.classList.remove('hidden');
    submitSuccessIcon.classList.add('hidden');
    submitErrorIcon.classList.add('hidden');
    btnReset.classList.add('hidden');
    statusMessageText.textContent = 'Submitting to Google Sheet...';
    
    consoleLog.innerHTML = ''; // Clear previous log
    addLog(`Initiating submission for: ${gatheredData.name}`);
    addLog(`Target URL: ${SHEETS_URL.substring(0, 45)}...`);

    try {
        addLog('Sending payload to Google Apps Script (no-cors mode)...');
        
        // We use text/plain and no-cors to guarantee delivery and avoid CORS redirect errors
        await fetch(SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(gatheredData)
        });

        addLog('Transmission completed successfully!', 'success');
        showSuccessState('Location data sent successfully!');

    } catch (err) {
        addLog(`Critical: Submission failed. ${err.message}`, 'error');
        showErrorState('Failed to submit data to Google Sheets.');
    }
});

function showSuccessState(msg) {
    submitSpinner.classList.add('hidden');
    submitSuccessIcon.classList.remove('hidden');
    statusMessageText.textContent = msg;
    btnReset.classList.remove('hidden');
}

function showErrorState(msg) {
    submitSpinner.classList.add('hidden');
    submitErrorIcon.classList.remove('hidden');
    statusMessageText.textContent = msg;
    btnReset.classList.remove('hidden');
}

// Reset UI
btnReset.addEventListener('click', () => {
    // Clear inputs and resets
    testerNameInput.value = '';
    fallbackInfo.classList.add('hidden');
    statusCard.classList.add('hidden');
    inputCard.classList.remove('hidden');
    
    // Reset internal object
    gatheredData = {
        name: '',
        latitude: null,
        longitude: null,
        accuracy: null,
        method: '',
        provider: '',
        isFallback: false,
        city: '',
        region: '',
        country: '',
        browser: '',
        os: '',
        userAgent: '',
        timestamp: ''
    };
});

// Helper: Parse friendly Browser and OS from User Agent
function getBrowserAndOS() {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Detect OS
    if (ua.indexOf("Win") !== -1) os = "Windows";
    else if (ua.indexOf("Mac") !== -1 && ua.indexOf("iPhone") === -1 && ua.indexOf("iPad") === -1 && ua.indexOf("iPod") === -1) os = "macOS";
    else if (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1 || ua.indexOf("iPod") !== -1) os = "iOS";
    else if (ua.indexOf("Android") !== -1) os = "Android";
    else if (ua.indexOf("Linux") !== -1) os = "Linux";

    // Detect Browser
    if (ua.indexOf("Firefox") !== -1) {
        browser = "Firefox";
    } else if (ua.indexOf("Opera") !== -1 || ua.indexOf("OPR") !== -1) {
        browser = "Opera";
    } else if (ua.indexOf("Edge") !== -1 || ua.indexOf("Edg") !== -1) {
        browser = "Edge";
    } else if (ua.indexOf("Chrome") !== -1) {
        browser = "Chrome";
    } else if (ua.indexOf("Safari") !== -1) {
        browser = "Safari";
    } else if (ua.indexOf("MSIE") !== -1 || !!document.documentMode === true) {
        browser = "Internet Explorer";
    }

    return { browser, os };
}
