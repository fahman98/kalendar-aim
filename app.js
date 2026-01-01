const TOTAL_WEEKS = 50;
const WEEKLY_PAYMENT_CALC = 110; 
const WEEKLY_PAYMENT_DISPLAY = 120; // For view (includes savings)
const START_DATE_STR = '2025-10-13'; // YYYY-MM-DD
const STORAGE_KEY = 'aim_schedule_data_v1';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    const listContainer = document.getElementById('payment-list');
    const savedData = loadData();
    
    // Clear list
    listContainer.innerHTML = '';

    // Calculations
    const MOM_WEEKS_FIXED = 3;
    let weeks = [];
    let currentDate = new Date(START_DATE_STR);

    // 1. Generate core data
    // Public Holidays on Mondays (2025-2026)
    const HOLIDAYS = {
        '2025-10-20': 'Cuti Deepavali',
        '2026-02-02': 'Cuti Thaipusam',
        '2026-03-23': 'Cuti Raya Puasa',
        '2026-06-01': 'Hari Keputeraan Agong',
        '2026-08-31': 'Hari Merdeka'
    };

    let weekCounter = 1;

    while (weekCounter <= TOTAL_WEEKS) {
        const isoDate = currentDate.toISOString().split('T')[0];
        const isHoliday = HOLIDAYS.hasOwnProperty(isoDate);

        weeks.push({
            id: isHoliday ? 'CUTI' : weekCounter,
            date: new Date(currentDate),
            isoDate: isoDate,
            isHoliday: isHoliday,
            holidayName: isHoliday ? HOLIDAYS[isoDate] : null
        });

        if (!isHoliday) {
            weekCounter++;
        }
        
        currentDate.setDate(currentDate.getDate() + 7);
    }

    // 2. Group by Month
    const months = {};
    const monthNames = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];

    weeks.forEach(week => {
        const year = week.date.getFullYear();
        const monthIndex = week.date.getMonth();
        const key = `${year}-${monthIndex}`;
        
        if (!months[key]) {
            months[key] = {
                name: `${monthNames[monthIndex]} ${year}`,
                key: key,
                weeks: []
            };
        }
        months[key].weeks.push(week);
    });

    // 3. Render
    let totalPaidWeeks = 0;
    const sortedKeys = Object.keys(months).sort((a,b) => {
        const [y1, m1] = a.split('-').map(Number);
        const [y2, m2] = b.split('-').map(Number);
        if (y1 !== y2) return y1 - y2;
        return m1 - m2;
    });

    sortedKeys.forEach((key, index) => {
        const monthGroup = months[key];
        
        // Count ONLY payable weeks (exclude holidays)
        const payableWeeks = monthGroup.weeks.filter(w => !w.isHoliday);
        const weekCount = payableWeeks.length;
        
        const totalAmount = weekCount * WEEKLY_PAYMENT_DISPLAY; 
        
        // Split Logic
        const momWeeks = MOM_WEEKS_FIXED;
        const sonWeeks = Math.max(0, weekCount - MOM_WEEKS_FIXED); // Safety check
        const momAmount = momWeeks * WEEKLY_PAYMENT_DISPLAY;    
        const sonAmount = sonWeeks * WEEKLY_PAYMENT_DISPLAY;    

        const isMonthPaid = savedData[key] === true;
        if (isMonthPaid) totalPaidWeeks += weekCount;

        // Section
        const section = document.createElement('section');
        section.className = `month-section ${isMonthPaid ? 'paid-month collapsed' : ''}`;
        section.style.animationDelay = `${index * 0.1}s`; // Staggered Entry

        // Header
        const header = document.createElement('div');
        header.className = 'month-header';
        
        let breakdownHTML = `
            <div class="calc-row mak-text">
                <span class="calc-label">Mak (${momWeeks}m)</span>
                <span class="calc-val">RM ${momAmount}</span>
            </div>
        `;
        
        if (sonWeeks > 0) {
            breakdownHTML += `
                <div class="calc-row highlight">
                    <span class="calc-label">+ Mujib (${sonWeeks}m)</span>
                    <span class="calc-val">RM ${sonAmount}</span>
                </div>
            `;
        }

        header.innerHTML = `
            <div class="header-top">
                <div>
                    <span class="month-title">${monthGroup.name}</span>
                    <div class="month-meta">${weekCount} Minggu • Total RM ${totalAmount}</div>
                </div>
                <label class="toggle-switch" onclick="event.stopPropagation()">
                    <input type="checkbox" id="month-check-${key}" ${isMonthPaid ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <div class="header-bottom-calc">
                ${breakdownHTML}
                <div class="calc-line"></div>
                <div class="calc-row total-row">
                    <span class="calc-label">Jumlah Bersih</span>
                    <span class="calc-val">RM ${totalAmount}</span>
                </div>
            </div>
        `;
        section.appendChild(header);

        // Events
        header.addEventListener('click', () => {
             section.classList.toggle('collapsed');
        });

        const checkbox = header.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            saveMonthPayment(key, e.target.checked);
            if(e.target.checked) {
                fireConfetti(); // Trigger Confetti
            }
            updateUI();
        });

        // Weeks List
        const weeksContainer = document.createElement('div');
        weeksContainer.className = 'weeks-container';
        
        monthGroup.weeks.forEach(week => {
            const dateStr = formatDate(week.date);
            const today = new Date().toISOString().split('T')[0];
            
            const row = document.createElement('div');

            if (week.isHoliday) {
                row.className = 'week-row week-holiday';
                // Holiday Row Style
                row.innerHTML = `
                    <span class="week-lbl" style="background:#fee2e2; color:#ef4444; border:none">CUTI</span>
                    <span class="week-dt" style="opacity:0.8">${dateStr}</span>
                    <span class="week-amt" style="font-size:0.75rem; color:#ef4444; text-transform:uppercase; text-align:right">${week.holidayName}</span>
                `;
            } else {
                // Standard Week Logic
                let statusClass = '';
                if (isMonthPaid) {
                    statusClass = 'week-done';
                } else if (week.isoDate < today) {
                    statusClass = 'week-pending';
                }

                row.className = `week-row ${statusClass}`;
                row.innerHTML = `
                    <span class="week-lbl">M${week.id}</span>
                    <span class="week-dt">${dateStr}</span>
                    <span class="week-amt">RM ${WEEKLY_PAYMENT_DISPLAY}</span>
                `;
            }
            weeksContainer.appendChild(row);
        });

        section.appendChild(weeksContainer);
        listContainer.appendChild(section);
    });

    updateSummary(totalPaidWeeks);

    // Update Target Date dynamically
    if (weeks.length > 0) {
        const lastWeek = weeks[weeks.length - 1];
        document.getElementById('target-date').textContent = formatDate(lastWeek.date);
    }
}

function saveMonthPayment(monthKey, status) {
    const data = loadData();
    data[monthKey] = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateSummary(paidCount) {
    const totalAmount = TOTAL_WEEKS * WEEKLY_PAYMENT_CALC;
    const paidAmount = paidCount * WEEKLY_PAYMENT_CALC;
    const remaining = totalAmount - paidAmount;

    // Running Counter Animation
    animateValue('total-paid', 0, paidAmount, 1000); // Always animates from 0 for effect or current? 
    // For simplicity, let's just animate text. To avoid "flashing" from 0 every time, we could store prev value.
    // But user requested "Nombor Running" on load. 
    // Simply replacing textContent is standard. Let's try a simple custom anim.
    
    // document.getElementById('total-paid').textContent = `RM ${paidAmount.toLocaleString()}`;
    // document.getElementById('remaining').textContent = `RM ${remaining.toLocaleString()}`;
    
    // Manual Set for Remain (no anim requested, but consistent)
    document.getElementById('remaining').textContent = `RM ${remaining.toLocaleString()}`;

    
    // Progress bar
    const percentage = (paidCount / TOTAL_WEEKS) * 100;
    document.getElementById('progress-bar').style.width = `${percentage}%`;
    document.getElementById('progress-text').textContent = `${paidCount}/${TOTAL_WEEKS} Minggu`;
}

// Animation Helpers
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    // Simple check to see if we already have a value to animate from? 
    // For now, let's just format the end.
    // Actually, to make it "run", we set intervals.
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        obj.innerHTML = `RM ${value.toLocaleString()}`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
             obj.innerHTML = `RM ${end.toLocaleString()}`;
        }
    };
    window.requestAnimationFrame(step);
}

function fireConfetti() {
    const count = 100;
    const defaults = {
        origin: { y: 0.7 }
    };

    // Simple Particle Generator
    for(let i=0; i<50; i++) {
        createParticle(window.innerWidth/2, window.innerHeight/2);
    }
}

function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'confetti';
    
    // Random Color
    const colors = ['#f43f5e', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.backgroundColor = color;
    
    // Random pos
    const destX = (Math.random() - 0.5) * 500;
    const destY = (Math.random() - 0.5) * 500;
    const rot = Math.random() * 360;

    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    document.body.appendChild(particle);

    // Animate
    const animation = particle.animate([
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${destX}px, ${destY}px) rotate(${rot}deg)`, opacity: 0 }
    ], {
        duration: 1000 + Math.random() * 500,
        easing: 'cubic-bezier(0, .9, .57, 1)',
        fill: 'forwards'
    });

    animation.onfinish = () => particle.remove();
}


function formatDate(date) {
    // Format: 13 Okt 2025
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('ms-MY', options);
}

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        return JSON.parse(raw);
    }
    const initialData = {
        '2025-9': true,
        '2025-10': true,
        '2025-11': true,
        '2026-0': true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
}
