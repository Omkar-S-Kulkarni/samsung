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
    navMemory: document.getElementById('nav-memory'),
    navGoals: document.getElementById('nav-goals'),
    dashboardView: document.getElementById('dashboard-view'),
    reportsView: document.getElementById('reports-view'),
    memoryView: document.getElementById('memory-view'),
    goalsView: document.getElementById('goals-view'),
    systemStatus: document.getElementById('system-status'),
    aiMemorySummary: document.getElementById('ai-memory-summary'),
    insightsTimeline: document.getElementById('insights-timeline'),
    eventsHistory: document.getElementById('events-history'),
    behavioralPatterns: document.getElementById('behavioral-patterns'),
    memorySummaries: document.getElementById('memory-summaries'),
    summaryContent: document.getElementById('summary-content'),
    btnWeeklySummary: document.getElementById('btn-weekly-summary'),
    btnMonthlySummary: document.getElementById('btn-monthly-summary'),
    editableMemoryList: document.getElementById('editable-memory-list'),
    goalForm: document.getElementById('goal-form'),
    goalCategory: document.getElementById('goal-category'),
    goalTarget: document.getElementById('goal-target'),
    goalUnit: document.getElementById('goal-unit'),
    goalUrgency: document.getElementById('goal-urgency'),
    goalsList: document.getElementById('goals-list'),
    dailyPlan: document.getElementById('daily-plan'),
    habitList: document.getElementById('habit-list'),
    progressCharts: document.getElementById('progress-charts'),
    streakInfo: document.getElementById('streak-info'),
    badgesList: document.getElementById('badges-list'),
    adaptiveUpdates: document.getElementById('adaptive-updates'),
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
    elements.navMemory.onclick = () => switchTab('memory');
    elements.navGoals.onclick = () => switchTab('goals');
    elements.btnSend.onclick = sendMessage;
    elements.chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    elements.btnVoice.onclick = toggleVoice;
    elements.btnWhy.onclick = showTransparencyModal;
    elements.btnWeeklySummary.onclick = () => loadSummary('weekly');
    elements.btnMonthlySummary.onclick = () => loadSummary('monthly');
    elements.goalForm.onsubmit = setGoal;
}

function switchTab(tab) {
    if (tab === 'dashboard') {
        elements.dashboardView.classList.remove('hidden');
        elements.reportsView.classList.add('hidden');
        elements.memoryView.classList.add('hidden');
        elements.goalsView.classList.add('hidden');
        elements.navDashboard.classList.add('active');
        elements.navReports.classList.remove('active');
        elements.navMemory.classList.remove('active');
        elements.navGoals.classList.remove('active');
    } else if (tab === 'reports') {
        elements.dashboardView.classList.add('hidden');
        elements.reportsView.classList.remove('hidden');
        elements.memoryView.classList.add('hidden');
        elements.goalsView.classList.add('hidden');
        elements.navDashboard.classList.remove('active');
        elements.navReports.classList.add('active');
        elements.navMemory.classList.remove('active');
        elements.navGoals.classList.remove('active');
        generateReports();
    } else if (tab === 'memory') {
        elements.dashboardView.classList.add('hidden');
        elements.reportsView.classList.add('hidden');
        elements.memoryView.classList.remove('hidden');
        elements.goalsView.classList.add('hidden');
        elements.navDashboard.classList.remove('active');
        elements.navReports.classList.remove('active');
        elements.navMemory.classList.add('active');
        elements.navGoals.classList.remove('active');
        loadMemoryData();
    } else if (tab === 'goals') {
        elements.dashboardView.classList.add('hidden');
        elements.reportsView.classList.add('hidden');
        elements.memoryView.classList.add('hidden');
        elements.goalsView.classList.remove('hidden');
        elements.navDashboard.classList.remove('active');
        elements.navReports.classList.remove('active');
        elements.navMemory.classList.remove('active');
        elements.navGoals.classList.add('active');
        loadGoalsData();
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
    } catch (e) {
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

async function loadMemoryData() {
    try {
        const resp = await fetch('/api/memory/default_user');
        const data = await resp.json();
        
        // AI Memory Summary
        elements.aiMemorySummary.innerHTML = data.ai_memory || "No summary available.";
        
        // Insights Timeline
        elements.insightsTimeline.innerHTML = (data.insights || []).map(insight => `<div class="timeline-item">📅 ${insight}</div>`).join('');
        
        // Events History
        elements.eventsHistory.innerHTML = (data.events || []).map(event => `<div class="event-item">⚡ ${event}</div>`).join('');
        
        // Behavioral Patterns
        elements.behavioralPatterns.innerHTML = (data.patterns || []).map(pattern => `<div class="pattern-item">🔄 ${pattern}</div>`).join('');
        
        // Editable Memory
        elements.editableMemoryList.innerHTML = (data.memories || []).map((memory, index) => `
            <div class="memory-item">
                <span>${memory}</span>
                <button onclick="editMemory(${index})">Edit</button>
                <button onclick="deleteMemory(${index})">Delete</button>
            </div>
        `).join('');
        
    } catch (e) {
        console.error("Failed to load memory data", e);
        elements.aiMemorySummary.innerHTML = "Error loading memory data.";
    }
}

function loadSummary(period) {
    // Mock summaries, in real app fetch from API
    const summaries = {
        weekly: "This week, your average stress levels decreased by 15%, and you maintained consistent HRV. Great job on the evening walks!",
        monthly: "Over the past month, you've shown improved recovery patterns. Anomalies detected: 3 (all resolved). Focus on sleep quality next."
    };
    elements.summaryContent.innerHTML = summaries[period] || "No summary available.";
}

function editMemory(index) {
    // Placeholder for edit functionality
    alert(`Edit memory at index ${index}`);
}

function deleteMemory(index) {
    // Placeholder for delete functionality
    alert(`Delete memory at index ${index}`);
}

async function loadGoalsData() {
    try {
        // Fetch goals from dashboard API
        const resp = await fetch('/api/dashboard/default_user');
        const data = await resp.json();
        
        // Goals List
        const goals = data.goals || {};
        elements.goalsList.innerHTML = Object.entries(goals).map(([category, goal]) => `
            <div class="goal-item">
                <h4>${category}</h4>
                <p>Target: ${goal.target} ${goal.unit}</p>
                <p>Progress: ${goal.current || 0}/${goal.target} (${goal.progress || 0}%)</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${goal.progress || 0}%"></div>
                </div>
            </div>
        `).join('') || "No goals set.";
        
        // Daily Plan
        elements.dailyPlan.innerHTML = data.plan || "Generating daily plan...";
        
        // Habit Tracking (mock for now)
        elements.habitList.innerHTML = `
            <div class="habit-item">🏃 Morning Run: 5/7 days</div>
            <div class="habit-item">💧 Water Intake: 6/8 glasses</div>
            <div class="habit-item">😴 Sleep: 7/7 hours</div>
        `;
        
        // Progress Charts (simple text for now)
        elements.progressCharts.innerHTML = `
            <div>HRV Trend: Improving 📈</div>
            <div>Stress Levels: Decreasing 📉</div>
            <div>Activity: Consistent 📊</div>
        `;
        
        // Streak System
        elements.streakInfo.innerHTML = `
            <div>Current Streak: 12 days 🔥</div>
            <div>Longest Streak: 28 days 🏆</div>
        `;
        
        // Achievement Badges
        elements.badgesList.innerHTML = `
            <div class="badge">🏃 Fitness Warrior</div>
            <div class="badge">😴 Sleep Champion</div>
            <div class="badge">💪 Goal Crusher</div>
        `;
        
        // Adaptive Updates
        elements.adaptiveUpdates.innerHTML = "AI is monitoring your progress and will update plans as needed.";
        
    } catch (e) {
        console.error("Failed to load goals data", e);
    }
}

async function setGoal(e) {
    e.preventDefault();
    const category = elements.goalCategory.value;
    const target = parseFloat(elements.goalTarget.value);
    const unit = elements.goalUnit.value;
    const urgency = parseInt(elements.goalUrgency.value);
    
    try {
        const resp = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: 'default_user',
                category,
                target,
                unit,
                urgency
            })
        });
        const result = await resp.json();
        alert('Goal set successfully!');
        elements.goalForm.reset();
        loadGoalsData(); // Refresh
    } catch (e) {
        console.error("Failed to set goal", e);
        alert('Failed to set goal.');
    }
}

init();
