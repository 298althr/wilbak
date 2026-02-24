let currentStep = 1;
let userData = {
    cooling: '',
    bill: 0,
    downtime: 0
};

function toggleCalculator() {
    // Legacy modal logic removed. The calculator is now inline on the homepage.
    const section = document.getElementById('calculator-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function resetCalculator() {
    currentStep = 1;
    userData = { cooling: '', bill: 0, downtime: 0 };
    showStep(1);
}

function showStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
    document.querySelector(`.step[data-step="${step}"]`).classList.remove('hidden');
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function nextStep(step, val) {
    if (step === 1) {
        userData.cooling = val;
        currentStep = 2;
        showStep(2);
    } else if (step === 2) {
        userData.bill = parseFloat(document.getElementById('input-bill').value) || 0;
        currentStep = 3;
        showStep(3);
    } else if (step === 3) {
        userData.downtime = parseFloat(document.getElementById('input-downtime').value) || 0;
        runAnalysis();
    }
}

function runAnalysis() {
    showStep(4);
    const statusText = document.getElementById('status-text');
    const statuses = [
        "Analyzing thermal loops...",
        "Cross-referencing predictive failure patterns...",
        "Calculating lake-water cooling equivalence...",
        "Finalizing infrastructure audit..."
    ];

    let i = 0;
    const interval = setInterval(() => {
        statusText.innerText = statuses[i];
        i++;
        if (i >= statuses.length) {
            clearInterval(interval);
            displayResults();
        }
    }, 800);
}

async function displayResults() {
    // Logic from calculator.md
    // Leak #1: The Thermal Tax (38% of monthly bill)
    const monthlyLeak = Math.round(userData.bill * 0.38);
    const thermalTax = monthlyLeak * 12;

    // Leak #2: The 'Wait-Until-It-Breaks' Penalty ($15k/hr downtime)
    const downtimePenalty = Math.round(userData.downtime * 15000);

    const total = thermalTax + downtimePenalty;

    const resultLabel = document.getElementById('result-total');
    if (resultLabel) {
        resultLabel.innerText = `$${total.toLocaleString()} / year`;
    }

    // Inject Leak Details
    const leakContainer = document.getElementById('leak-details');
    if (leakContainer) {
        leakContainer.innerHTML = `
            <div class="space-y-4 text-left">
                <div class="p-6 bg-white/10 border border-white/10 rounded-3xl">
                    <span class="text-[10px] font-bold text-ocean-pearl/50 uppercase tracking-widest">Leak #1: Thermal Tax</span>
                    <p class="text-base text-white mt-1">You spend ~$${monthlyLeak.toLocaleString()}/mo just fighting physics. Closed-loop exchange could drop this by 38%.</p>
                </div>
                <div class="p-6 bg-white/10 border border-white/10 rounded-3xl">
                    <span class="text-[10px] font-bold text-ocean-pearl/50 uppercase tracking-widest">Leak #2: Reactive Penalty</span>
                    <p class="text-base text-white mt-1">Unscheduled downtime cost you $${downtimePenalty.toLocaleString()} last year in lost capacity and sleep.</p>
                </div>
                <div class="p-6 bg-white/10 border border-white/10 rounded-3xl">
                    <span class="text-[10px] font-bold text-ocean-pearl/50 uppercase tracking-widest">Leak #3: Ghost Capacity</span>
                    <p class="text-base text-white mt-1">Your server density suggests a 15% over-provisioning gap. Smart automation can reclaim this floor.</p>
                </div>
            </div>
        `;
    }

    userData.totalLeak = total;
    userData.thermalTax = thermalTax;
    userData.maintenanceCost = downtimePenalty;

    showStep(5);
}

async function submitLead(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button');
    submitBtn.innerText = "Transmitting...";
    submitBtn.disabled = true;

    const leadData = {
        name: document.getElementById('lead-name').value,
        email: document.getElementById('lead-email').value,
        companyName: document.getElementById('lead-company').value,
        coolingMethod: userData.cooling,
        monthlyBill: userData.bill,
        annualDowntime: userData.downtime,
        thermalTax: userData.thermalTax,
        maintenanceCost: userData.maintenanceCost,
        totalLeak: userData.totalLeak
    };

    // Prepare WhatsApp Brief
    const waMessage = encodeURIComponent(
        `Hi Wilhelm, I just ran the Wilbak Infrastructure Audit.\n\n` +
        `Business: ${leadData.companyName}\n` +
        `Leak Detected: $${leadData.totalLeak.toLocaleString()}/year\n` +
        `Cooling: ${leadData.coolingMethod}\n` +
        `Downtime: ${leadData.annualDowntime}hrs\n\n` +
        `I'd like to discuss a hard-data audit for our facility.`
    );
    const waLink = `https://wa.me/2340000000000?text=${waMessage}`; // Placeholder number

    const waButton = document.getElementById('wa-cta');
    if (waButton) {
        waButton.onclick = () => window.open(waLink, '_blank');
    }

    try {
        const response = await fetch('http://localhost:4000/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leadData)
        });

        if (response.ok) {
            showStep(6);
        }
    } catch (e) {
        console.error("Submission failed", e);
        submitBtn.innerText = "Error. Try Again.";
        submitBtn.disabled = false;
    }
}

const projectData = {
    arctic: {
        tag: 'Arctic Ridge',
        title: 'Sub-Zero Thermal Optimization',
        challenge: 'Extreme cold was causing hardware brittleness and high-latency mechanical failures in a sub-zero climate farm.',
        solution: 'Designed and implemented a custom heat-recycling airflow system that turned waste server heat into a thermal shield for critical components.',
        metricVal: '25%',
        metricLabel: 'Lower Failure Rate'
    },
    offshore: {
        tag: 'Deep Offshore',
        title: 'Underwater Autonomy',
        challenge: 'Zero physical access for repairs or maintenance in a high-pressure, underwater data pod.',
        solution: 'Built redundant AI self-healing arrays that automatically route data around hardware faults without human intervention.',
        metricVal: '99.99%',
        metricLabel: 'Verified Uptime'
    },
    finance: {
        tag: 'Neural Finance',
        title: 'Predictive PSU Monitoring',
        challenge: 'High-density trading racks generate massive heat cycles, leading to sudden power supply unit (PSU) blowouts.',
        solution: 'Implemented liquid immersion cooling combined with a predictive AI model that monitors micro-fluctuations in hardware health.',
        metricVal: '$2M',
        metricLabel: 'Savings / Year'
    }
};

function toggleProjectModal() {
    const modal = document.getElementById('project-modal');
    modal.classList.toggle('hidden');
}

function openProject(id) {
    const data = projectData[id];
    if (!data) return;

    document.getElementById('project-modal-tag').innerText = data.tag;
    document.getElementById('project-modal-title').innerText = data.title;
    document.getElementById('project-modal-challenge').innerText = data.challenge;
    document.getElementById('project-modal-solution').innerText = data.solution;
    document.getElementById('project-modal-metric-val').innerText = data.metricVal;
    document.getElementById('project-modal-metric-label').innerText = data.metricLabel;

    toggleProjectModal();
}

// Smooth scroll for anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Hero Carousel Engine
function initHeroCarousel() {
    const carousels = document.querySelectorAll('.hero-carousel');
    carousels.forEach(carousel => {
        const slides = carousel.querySelectorAll('.carousel-slide');
        if (slides.length === 0) return;

        let currentIndex = 0;

        function nextSlide() {
            const currentSlide = slides[currentIndex];
            currentIndex = (currentIndex + 1) % slides.length;
            const nextSlide = slides[currentIndex];

            currentSlide.classList.remove('active');
            currentSlide.classList.add('exit');

            nextSlide.classList.remove('exit');
            nextSlide.classList.add('active');

            setTimeout(() => {
                slides.forEach((slide, index) => {
                    if (index !== currentIndex) {
                        slide.classList.remove('exit');
                    }
                });
            }, 1000);
        }

        setInterval(nextSlide, 5000);
    });
}

document.addEventListener('DOMContentLoaded', initHeroCarousel);
