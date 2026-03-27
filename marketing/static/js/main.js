function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

function checkPageAccess() {
    const userRole = sessionStorage.getItem('userRole');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // If user is CRM role, only allow marketing.html and india.html
    if (userRole === 'CRM') {
        const allowedPages = ['marketing.html', 'india.html', 'login.html'];
        if (!allowedPages.includes(currentPage)) {
            window.location.href = 'marketing.html';
            return false;
        }
    }
    return true;
}

function restrictNavigation() {
    const userRole = sessionStorage.getItem('userRole');
    
    if (userRole === 'CRM') {
        // Hide all navigation links except marketing
        const navLinks = document.querySelectorAll('.sidebar nav a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href !== 'marketing.html' && href !== 'india.html') {
                link.style.display = 'none';
            }
        });
        
        // Also disable direct navigation attempts
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== 'marketing.html' && href !== 'india.html') {
                    e.preventDefault();
                    alert('Access denied. You only have access to Marketing module.');
                    return false;
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const currentPath = window.location.pathname;
    if (!sessionStorage.getItem('loggedIn') && !currentPath.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check page access permissions
    if (!checkPageAccess()) {
        return;
    }
    
    // Restrict navigation for CRM users
    restrictNavigation();
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.sidebar nav a');
    
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});