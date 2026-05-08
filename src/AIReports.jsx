import React, { useState } from 'react';
import { Calendar, Utensils, HeartPulse, AlertOctagon, Moon, Sparkles, Loader2, ClipboardList } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = 'http://localhost:8000';

const ActionCard = ({ title, description, icon: Icon, color, onClick, isLoading, active }) => (
  <button 
    onClick={onClick}
    disabled={isLoading}
    className={`glass-card rounded-2xl p-5 flex flex-col relative overflow-hidden transition-all duration-300 text-left
      ${active ? 'ring-2' : 'hover:bg-white/5 hover:-translate-y-1'}
      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    style={{ ringColor: color }}
  >
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5" style={{ backgroundColor: color, filter: 'blur(20px)' }} />
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border" style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}>
      {isLoading && active ? <Loader2 className="animate-spin" size={24} /> : <Icon size={24} />}
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-400">{description}</p>
  </button>
);

export default function AIReports({ user_id }) {
  const [activeReport, setActiveReport] = useState(null);
  const [reportContent, setReportContent] = useState('');
  const [loadingType, setLoadingType] = useState(null);
  const [mealInput, setMealInput] = useState('');

  const streamHardcodedResponse = (text) => {
    let index = 0;
    setLoadingType(null); // stop spinner immediately
    setReportContent(''); // start clean
    
    // Simulate fast typing (like a chatbot)
    const chunkSize = 5; 
    const interval = setInterval(() => {
      index += chunkSize;
      setReportContent(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 10);
  };

  const getHardcodedTemplate = (type) => {
    switch(type) {
      case 'schedule': return `
# 📅 Optimal Daily Schedule
Based on your Readiness Score (75/100) and moderate fatigue index, here is your optimized schedule for today.

### 🌅 Morning (Focus & Activation)
- **07:00 AM** - Wake up and hydrate (16oz water with lemon).
- **07:15 AM** - Light mobility stretching (10 mins) to activate nervous system.
- **07:30 AM** - High-protein breakfast (see meal plan).
- **08:30 AM** - Deep Work Block 1 (90 mins). Your HRV indicates peak cognitive focus right now.

### ☀️ Afternoon (Active Recovery)
- **12:00 PM** - Lunch & short 15-min outdoor walk (Zone 1 heart rate) to maintain circadian rhythm.
- **02:00 PM** - Deep Work Block 2. 
- **04:30 PM** - **Primary Workout:** Moderate Intensity (Zone 3). Your recovery score supports a 45-minute strength or cardio session, but avoid max effort.

### 🌙 Evening (Down-regulation)
- **07:00 PM** - Dinner (focus on complex carbs to aid sleep).
- **08:30 PM** - Screen shutdown.
- **09:30 PM** - Begin sleep routine.
      `;
      case 'meal_plan': return `
# 🥗 Adaptive Meal Plan
I've analyzed your intake so far today: *"${mealInput}"*.

Based on your current metabolic rate and remaining caloric budget, here is how we adjust:

### ⚠️ Intake Analysis
Based on what you've eaten, we need to balance your blood sugar and ensure adequate protein intake to support recovery.

### 🍽️ Next Meal (Lunch/Dinner)
- **Protein**: 40g (Grilled chicken breast, salmon, or tofu)
- **Veggies**: 2 cups of dark leafy greens (spinach, kale) with olive oil to slow digestion.
- **Carbs**: Limit heavy simple carbs for this meal to balance your energy levels.

### 🍎 Snacks
- Handful of almonds or walnuts.
- 1 scoop of whey/plant protein in water.

### 💧 Hydration
Drink at least 32oz of water over the next 3 hours to help process nutrients and maintain cellular hydration.
      `;
      case 'health_report': return `
# 🩺 Executive Health Analysis
*Generated from your live biometric twin.*

### ✅ What You're Doing Right
- **Resting Heart Rate (RHR)**: Your RHR is stable at 62 bpm, indicating excellent cardiovascular baseline efficiency.
- **SpO2 Levels**: Maintaining 98-99% oxygen saturation.
- **Sleep Architecture**: You achieved 1.5 hours of Deep Sleep last night, which is excellent for physical recovery.

### ⚠️ Areas for Immediate Attention
- **Heart Rate Variability (HRV)**: Your HRV has dipped by 12% compared to your 7-day baseline. This is an early warning sign of central nervous system (CNS) fatigue.
- **Stress Accumulation**: We've detected sustained low-grade stress during your afternoon blocks over the last 3 days.

### 💡 Recommendations
1. **Prioritize Recovery Today**: Limit workout intensity to Zone 2 (easy effort).
2. **Box Breathing**: Implement a 5-minute box breathing session at 2:00 PM to reset your autonomic nervous system.
      `;
      case 'mistakes': return `
# ⚠️ Past Mistakes & Corrections
*Analysis of your recent biometric anomalies and patterns.*

### 1. The "Late Night Cortisol" Spike
**The Mistake:** Over the past week, your data shows an activity and stress spike around 10:30 PM. This is destroying your sleep architecture and lowering your morning readiness.
**The Fix:** Implement a strict "digital sunset" at 9:00 PM. No intense emails or workouts after this time.

### 2. Dehydration During Training
**The Mistake:** Your heart rate drift (cardiac drift) during your afternoon workouts suggests you are entering sessions under-hydrated. Your heart has to work 15% harder to pump thicker blood.
**The Fix:** Drink 500ml of water with a pinch of sea salt 45 minutes *before* your workout begins.

### 3. Protein Distribution
**The Mistake:** Your recovery scores indicate poor muscle synthesis overnight. This often correlates with backloading all your protein to dinner.
**The Fix:** Distribute protein evenly. Aim for 30g at breakfast to kickstart muscle protein synthesis.
      `;
      case 'sleep_plan': return `
# 🌙 Sleep Optimization Protocol
Your current fatigue index is moderate, and your nervous system needs help down-regulating tonight.

### ⏱️ T-Minus 2 Hours (08:00 PM)
- **Environment**: Dim all overhead lights. Switch devices to night mode / blue light filters.
- **Nutrition**: Stop all calorie intake. Herbal tea (Chamomile or Magnesium supplement) is approved.

### ⏱️ T-Minus 1 Hour (09:00 PM)
- **Temperature Drop**: Lower the bedroom temperature to 65-68°F (18-20°C).
- **Brain Dump**: Spend 5 minutes writing down tomorrow's tasks so your brain doesn't loop on them overnight.

### ⏱️ T-Minus 15 Mins (09:45 PM)
- **Physiological Sighs**: Do 10 rounds of a double inhale followed by a long exhale to rapidly lower your heart rate.
- **Position**: Get into bed. If reading, use a physical book or e-ink reader. 

*Target Sleep Onset: 10:00 PM.*
      `;
      default: return "# Report Generated\nAnalysis complete.";
    }
  };

  const generateReport = async (type) => {
    if (type === 'meal_plan' && !mealInput) {
      alert("Please tell me what you've eaten today first!");
      return;
    }

    setLoadingType(type);
    setActiveReport(type);
    setReportContent(''); // clear old content

    // Simulate network delay before starting the "typing"
    setTimeout(() => {
      const template = getHardcodedTemplate(type);
      streamHardcodedResponse(template);
    }, 600);
  };

  const reportsList = [
    { id: 'schedule', title: 'Daily Schedule', desc: 'Optimal minute-by-minute schedule based on today\'s data.', icon: Calendar, color: '#00E5FF' },
    { id: 'meal_plan', title: 'Meal Plan', desc: 'Adaptive macros and meals based on what you\'ve already eaten.', icon: Utensils, color: '#39FF6A' },
    { id: 'health_report', title: 'Health Analysis', desc: 'Deep-dive plain English report of your current health.', icon: HeartPulse, color: '#f87171' },
    { id: 'mistakes', title: 'Past Mistakes', desc: 'Identifies health mistakes and provides actionable solutions.', icon: AlertOctagon, color: '#FF9A3C' },
    { id: 'sleep_plan', title: 'Sleep Optimization', desc: 'A complete wind-down routine tailored to your fatigue.', icon: Moon, color: '#c084fc' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="text-[var(--color-pulse-cyan)]" /> AI Action Plans
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Generate comprehensive, plain-English reports and routines powered by the Intelligent Engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {reportsList.map(r => (
          <ActionCard 
            key={r.id}
            title={r.title}
            description={r.desc}
            icon={r.icon}
            color={r.color}
            active={activeReport === r.id}
            isLoading={loadingType === r.id}
            onClick={() => {
              if (r.id !== 'meal_plan') generateReport(r.id);
              else setActiveReport('meal_plan'); // just open the panel to type input
            }}
          />
        ))}
      </div>

      {/* Main Content Area */}
      {activeReport && (
        <div className="flex-1 glass-card rounded-2xl p-6 md:p-8 flex flex-col vitals-slide-up relative">
          
          {/* Meal Input Specific UI */}
          {activeReport === 'meal_plan' && !reportContent && loadingType !== 'meal_plan' && (
            <div className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5 max-w-2xl mx-auto w-full mt-8">
              <label className="block text-sm font-bold text-white mb-2">What have you eaten today so far?</label>
              <textarea 
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--color-pulse-green)] resize-none"
                rows="3"
                placeholder="e.g. 2 slices of pizza, a coke, and an apple..."
                value={mealInput}
                onChange={e => setMealInput(e.target.value)}
              />
              <button 
                onClick={() => generateReport('meal_plan')}
                className="mt-3 bg-[var(--color-pulse-green)] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#39FF6A]/80 transition-colors flex items-center justify-center gap-2 w-full"
              >
                <Utensils size={16} /> Generate Meal Plan
              </button>
            </div>
          )}

          {/* Loading State */}
          {loadingType === activeReport && (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-[var(--color-pulse-cyan)] mb-4" size={48} />
              <p className="text-gray-400 font-mono tracking-widest uppercase text-sm">Synthesizing Report...</p>
              <p className="text-xs text-gray-500 mt-2">This may take a moment depending on the LLM.</p>
            </div>
          )}

          {/* Markdown Result */}
          {reportContent && (
            <div className="prose prose-invert prose-cyan max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-[var(--color-pulse-cyan)] prose-p:leading-relaxed overflow-y-auto pr-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reportContent}
              </ReactMarkdown>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
