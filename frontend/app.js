/**
 * ADEO Health Dashboard Interaction Logic
 */

const state = {
    hr: 72,
    stress: 24,
    hrv: 55,
    battery: 100,
    isListening: false,
};

// DOM Elements
const elements = {
    valHr: document.getElementById('val-hr'),
    valStress: document.getElementById('val-stress'),
    valHrv: document.getElementById('val-hrv'),
    batteryLevel: document.getElementById('battery-level'),
    insightText: document.getElementById('insight-text'),
    chatHistory: document.getElementById('chat-history'),
    chatInput: document.getElementById('chat-input'),
    btnSend: document.getElementById('btn-send'),
    btnVoice: document.getElementById('btn-voice-toggle'),
    btnWhy: document.getElementById('btn-why'),
    modalWhy: document.getElementById('modal-why'),
    modalContent: document.getElementById('modal-content'),
    navDashboard: document.getElementById('nav-dashboard'),
    navReports: document.getElementById('nav-reports'),
    dashboardView: document.getElementById('dashboard-view'),
    reportsView: document.getElementById('reports-view'),
    systemStatus: document.getElementById('system-status'),
};

// Initialize
function init() {
    startSimulation();
    setupEventListeners();
}

// Real-time sensor updates from API
async function startSimulation() {
    setInterval(async () => {
        try {
            const resp = await fetch(`/api/health?battery=${state.battery}`);
            const json = await resp.json();

            const data = json.data;
            state.hr = Math.round(data.heart_rate_bpm);
            state.stress = Math.round(data.computed_stress || 20);
            state.hrv = Math.round(data.hrv_ms);

            if (json.insight) {
                elements.insightText.innerText = json.insight;
            }

            // Handle Alerts
            if (json.alerts && json.alerts.length > 0) {
                elements.systemStatus.innerText = "🚨 Alert Detected";
                elements.systemStatus.className = "status-pill critical-text";
                document.getElementById('card-hr').classList.add('critical');
            } else {
                elements.systemStatus.innerText = "System Nominal";
                elements.systemStatus.className = "status-pill";
                document.getElementById('card-hr').classList.remove('critical');
            }

            updateUI();
        } catch (e) {
            console.error("API Error", e);
        }
    }, 5000);
}

function updateUI() {
    elements.valHr.innerText = state.hr;
    elements.valStress.innerText = state.stress;
    elements.valHrv.innerText = state.hrv;
    elements.batteryLevel.innerText = `${Math.floor(state.battery)}%`;
}

// Event Listeners
function setupEventListeners() {
    elements.navDashboard.onclick = () => switchTab('dashboard');
    elements.navReports.onclick = () => switchTab('reports');
    elements.btnSend.onclick = sendMessage;
    elements.chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    elements.btnVoice.onclick = toggleVoice;
    elements.btnWhy.onclick = showTransparencyModal;
}

function switchTab(tab) {
    if (tab === 'dashboard') {
        elements.dashboardView.classList.remove('hidden');
        elements.reportsView.classList.add('hidden');
        elements.navDashboard.classList.add('active');
        elements.navReports.classList.remove('active');
    } else {
        elements.dashboardView.classList.add('hidden');
        elements.reportsView.classList.remove('hidden');
        elements.navDashboard.classList.remove('active');
        elements.navReports.classList.add('active');
        generateReports();
    }
}

async function sendMessage() {
    const text = elements.chatInput.value.trim();
    if (!text) return;

    addChatMessage(text, 'user');
    elements.chatInput.value = '';

    try {
        const resp = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, battery: state.battery })
        });
        const json = await resp.json();

        addChatMessage(json.response, 'system');
        speak(json.response);
    } catch {
        addChatMessage("Sorry, I'm having trouble connecting to my brain.", 'system');
    }
}

function addChatMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.innerText = text;
    elements.chatHistory.appendChild(div);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

// Voice Features
function toggleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
    }

    if (state.isListening) {
        state.isListening = false;
        elements.btnVoice.style.color = "white";
    } else {
        const recognition = new SpeechRecognition();
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            elements.chatInput.value = transcript;
            sendMessage();
        };
        recognition.start();
        state.isListening = true;
        elements.btnVoice.style.color = "var(--critical-color)";
    }
}

function speak(text) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
}

// Explainability
function showTransparencyModal() {
    elements.modalWhy.style.display = 'flex';
    elements.modalContent.innerHTML = `
        <div class="transparency-item" style="margin-bottom:1rem;">
            <strong>Inference Source:</strong> Multi-Agent Orchestrator (Safety + Analysis)
        </div>
        <div class="transparency-item" style="margin-bottom:1rem;">
            <strong>Data Used:</strong> HR (${state.hr} bpm), Stress (${state.stress}/100), RAG Historical context
        </div>
        <div class="transparency-item">
            <strong>Confidence Score:</strong> 0.89 (High)
        </div>
    `;
}

async function generateReports() {
    try {
        const resp = await fetch(`/api/insights?user_id=web_user_1`);
        const json = await resp.json();

        // Weekly AI Outlook
        const weekly = json.weekly;
        if (weekly.status === "No data") {
            document.getElementById('weekly-report-content').innerHTML = `<p>Not enough data yet for a weekly report. Keep wearing ADEO!</p>`;
        } else {
            document.getElementById('weekly-report-content').innerHTML = `
                <div class="report-stat"><strong>Avg HR:</strong> ${Math.round(weekly.avg_hr)} bpm</div>
                <div class="report-stat"><strong>Stress Trend:</strong> ${weekly.stress_trend}</div>
                <div class="report-stat"><strong>Anomalies:</strong> ${weekly.anomalies_detected} this week</div>
                <div class="patterns-list" style="margin-top:1rem;">
                    ${(weekly.top_patterns || []).map(p => `<div class="pattern-item">💡 ${p}</div>`).join('')}
                </div>
            `;
        }

        // Progress Tracking
        const progress = json.progress;
        if (progress.status) {
            document.getElementById('daily-summary-content').innerHTML = `<p>${progress.status}</p>`;
        } else {
            document.getElementById('daily-summary-content').innerHTML = `
                <p>Your HRV has shifted <strong>${progress.hrv_progress}</strong> over the last period.</p>
                <p>${progress.message}</p>
            `;
        }

    } catch (e) {
        console.error("Failed to load insights", e);
    }
}

init();
