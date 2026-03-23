import os

html_files = [
    r"c:\Users\saviour\Documents\Wilbak\Testimonies\index.html",
    r"c:\Users\saviour\Documents\Wilbak\Testimonies\view-schema\view-schema.html",
    r"c:\Users\saviour\Documents\Wilbak\Testimonies\testimony\master-matrix.html",
    r"c:\Users\saviour\Documents\Wilbak\Testimonies\risktable\investor-risk-matrix.html",
    r"c:\Users\saviour\Documents\Wilbak\Testimonies\about\about.html"
]

def generate_desktop_dropdown(path_prefix, is_about=False):
    extra_class = " hover:text-slate-900 flex items-center gap-1 group no-underline transition-colors uppercase tracking-widest" if is_about else " flex items-center gap-1 group"
    return f'''                <div class="dropdown">
                    <a href="{path_prefix}the-engine/engine_nodes.html" class="dropdown-trigger{' ' if is_about else ' nav-link'}{extra_class}">
                        <span>The Engine</span>
                        <svg class="dropdown-arrow w-3 h-3 cursor-pointer group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </a>
                    <div class="dropdown-content">
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-01" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-blue-600"></div><span{' class="normal-case"' if is_about else ''}>Data Ingest</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-02" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-blue-600"></div><span{' class="normal-case"' if is_about else ''}>Null Triage</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-03" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-blue-600"></div><span{' class="normal-case"' if is_about else ''}>Multi-Provider Enrichers</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-04" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-teal-500"></div><span{' class="normal-case"' if is_about else ''}>L2 Order Book Snapshot</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-05" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-teal-500"></div><span{' class="normal-case"' if is_about else ''}>Options Greeks Engine</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-06" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-violet-600"></div><span{' class="normal-case"' if is_about else ''}>Regime Detection AI</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-07" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-violet-600"></div><span{' class="normal-case"' if is_about else ''}>AI Sentiment Scrape</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-08" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-slate-500"></div><span{' class="normal-case"' if is_about else ''}>Correlation Guard</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-09" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-amber-500"></div><span{' class="normal-case"' if is_about else ''}>Confidence Gate</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-10" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-violet-600"></div><span{' class="normal-case"' if is_about else ''}>RL Execution Node</span></a>
                        <a href="{path_prefix}the-engine/engine_nodes.html#node-11" class="dropdown-item"><div class="w-2 h-2 rounded-full bg-red-500"></div><span{' class="normal-case"' if is_about else ''}>Circuit Breaker</span></a>
                    </div>
                </div>'''

def generate_mobile_dropdown(path_prefix, is_about=False):
    classes = "py-4 border-b border-slate-100 text-slate-900 no-underline" if is_about else "mobile-nav-link"
    link_class = "py-2 border-b border-slate-50 text-slate-500 no-underline text-xs" if is_about else "mobile-sub-link"
    wrapper = "pl-4 flex flex-col gap-1 pb-2 border-b border-slate-100" if is_about else "mobile-sub-nav"
    return f'''            <a href="{path_prefix}the-engine/engine_nodes.html" class="{classes}">The Engine</a>
            <div class="{wrapper}">
                <a href="{path_prefix}the-engine/engine_nodes.html#node-01" class="{link_class}">→ Data Ingest</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-02" class="{link_class}">→ Null Triage</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-03" class="{link_class}">→ Multi-Provider Enrichers</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-04" class="{link_class}">→ L2 Order Book Snapshot</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-05" class="{link_class}">→ Options Greeks Engine</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-06" class="{link_class}">→ Regime Detection AI</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-07" class="{link_class}">→ AI Sentiment Scrape</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-08" class="{link_class}">→ Correlation Guard</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-09" class="{link_class}">→ Confidence Gate</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-10" class="{link_class}">→ RL Execution Node</a>
                <a href="{path_prefix}the-engine/engine_nodes.html#node-11" class="{link_class}">→ Circuit Breaker</a>
            </div>'''
            
for file in html_files:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
    except: continue
    
    path_prefix = "" if "index.html" in file else "../"
    is_about = "about.html" in file
    
    # Desktop
    if is_about:
        target_desktop = f'<a href="../the-engine/engine_nodes.html" class="hover:text-slate-900 no-underline transition-colors">The Engine</a>'
    else:
        target_desktop = f'<a href="{path_prefix}the-engine/engine_nodes.html" class="nav-link">The Engine</a>'
        
    if target_desktop in content:
        content = content.replace(target_desktop, generate_desktop_dropdown(path_prefix, is_about=is_about))
        
    # Mobile
    if is_about:
        target_mobile = f'<a href="../the-engine/engine_nodes.html" class="py-4 border-b border-slate-100 text-slate-900 no-underline">The Engine</a>'
    else:
        target_mobile = f'<a href="{path_prefix}the-engine/engine_nodes.html" class="mobile-nav-link">The Engine</a>'
        
    if target_mobile in content:
        content = content.replace(target_mobile, generate_mobile_dropdown(path_prefix, is_about=is_about))
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done replacing.")
