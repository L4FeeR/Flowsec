// Theme toggle logic for Flowsec webapp
(function() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    const body = document.body;
    const icon = toggleBtn.querySelector('i');
    
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('flowsec-theme');
    if (savedTheme) {
        body.setAttribute('data-theme', savedTheme);
        updateIcon(savedTheme);
    }
    
    toggleBtn.addEventListener('click', function() {
        const current = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', current);
        localStorage.setItem('flowsec-theme', current);
        updateIcon(current);
    });
    
    function updateIcon(theme) {
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
})();
