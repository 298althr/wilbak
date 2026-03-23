const fs = require('fs');

const files = [
    'index.html',
    'the-engine/engine_nodes.html',
    'view-schema/view-schema.html',
    'testimony/master-matrix.html',
    'risktable/investor-risk-matrix.html',
    'about/about.html'
];

const ICONS = {
    'thorne': '<svg class="w-4 h-4 text-slate-800 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>',
    'beijing': '<svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>',
    'northstar': '<svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>',
    'dubai_auto': '<svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375M5.25 8.25V6.375c0-.621.504-1.125 1.125-1.125h11.25c.621 0 1.125.504 1.125 1.125v1.875m-13.5 0h13.5m-13.5 0v5.625m13.5-5.625v5.625m-13.5 0h13.5" /></svg>',
    'oudh': '<svg class="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>',
    'agri': '<svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>',
    'valle': '<svg class="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>',
    'keystone': '<svg class="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>'
};

const PARTNERS = [
    {id: 'thorne', name: 'Thorne-Blackwood'},
    {id: 'beijing', name: 'Beijing Power'},
    {id: 'northstar', name: 'NorthStar Motors'},
    {id: 'dubai_auto', name: 'Al-Maktoum Auto'},
    {id: 'oudh', name: 'Oudh & Gold'},
    {id: 'agri', name: 'Agri-Growth'},
    {id: 'valle', name: 'Valle de Oro'},
    {id: 'keystone', name: 'Keystone CM'}
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    for (const partner of PARTNERS) {
        // Desktop
        let regexDesktop = new RegExp(`partner=${partner.id}" class="dropdown-item">\\s*(?:<div[^>]*><\\/div>|<svg[\\s\\S]*?<\\/svg>)?\\s*<span([^>]*)>${partner.name.replace('&', '&amp;?')}</span>`, "g");
        content = content.replace(regexDesktop, `partner=${partner.id}" class="dropdown-item">\n                            ${ICONS[partner.id]}<span$1>${partner.name}</span>`);
        
        // Sometimes the ampersand isn't escaped
        let regexDesktop2 = new RegExp(`partner=${partner.id}" class="dropdown-item">\\s*(?:<div[^>]*><\\/div>|<svg[\\s\\S]*?<\\/svg>)?\\s*<span([^>]*)>${partner.name}</span>`, "g");
        content = content.replace(regexDesktop2, `partner=${partner.id}" class="dropdown-item">\n                            ${ICONS[partner.id]}<span$1>${partner.name}</span>`);

        // Mobile
        let mobileName = partner.name.replace('&', '&amp;?');
        let regexMobile = new RegExp(`(?:→|\\<svg[\\s\\S]*?\\<\\/svg\\>)\\s+${mobileName}`, 'g');
        content = content.replace(regexMobile, `${ICONS[partner.id]} ${partner.name}`);
        
        let regexMobile2 = new RegExp(`(?:→|\\<svg[\\s\\S]*?\\<\\/svg\\>)\\s+${partner.name}`, 'g');
        content = content.replace(regexMobile2, `${ICONS[partner.id]} ${partner.name}`);
    }
    
    fs.writeFileSync(file, content);
}
console.log('Testimonies replaced');
