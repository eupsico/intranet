export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');

    tabContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const tabId = e.target.dataset.tab;

            tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            contentSections.forEach(section => {
                section.style.display = section.id === tabId ? 'block' : 'none';
            });
        }
    });
}