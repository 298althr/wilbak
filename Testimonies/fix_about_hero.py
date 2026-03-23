
import sys

def replace_lines(filename, start_line, end_line, replacement):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Lines are 1-indexed, so we subtract 1
    new_lines = lines[:start_line-1] + [replacement] + lines[end_line:]
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

about_hero_html = """    <!-- HERO SECTION — Editorial Manifesto -->
    <header class="relative w-full overflow-hidden bg-slate-950 pt-40 pb-32 border-b border-white/5 selection:bg-blue-900 selection:text-blue-100">
        <!-- Background Image Panel -->
        <div class="absolute inset-0 z-0">
            <img src="../assets/images/about-hero.png" 
                 alt="The Architect's Vision" 
                 class="w-full h-full object-cover object-top opacity-40 grayscale hover:grayscale-0 transition-all duration-1000 scale-110">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
        </div>

        <div class="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <nav class="flex items-center justify-center gap-4 mb-12 animate-reveal">
                <span class="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Architecture</span>
                <span class="w-1 h-1 rounded-full bg-blue-500"></span>
                <span class="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400">Founder & Philosophy</span>
            </nav>

            <h1 class="serif text-5xl sm:text-7xl md:text-9xl text-white leading-[0.9] mb-12 tracking-tight animate-reveal" style="animation-delay: 0.1s;">
                Human Vision.<br>
                <span class="italic font-light text-slate-400">Driven by Logic.</span>
            </h1>

            <div class="max-w-2xl mx-auto animate-reveal" style="animation-delay: 0.2s;">
                <p class="text-lg sm:text-xl text-slate-400 font-light leading-relaxed">
                    The Data Architect was founded on a single premise: that the world's most valuable assets are often the
                    least liquid. Our mission is to bridge that gap using sovereign-tier technology.
                </p>
            </div>
        </div>
    </header>
"""

replace_lines(r'c:\Users\saviour\Documents\Wilbak\Testimonies\about\about.html', 186, 192, about_hero_html)
