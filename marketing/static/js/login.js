document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    
    errorMsg.textContent = '';
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, password })
        });
        
        const data = await response.json();
        
        if (data.success === true) {
            sessionStorage.setItem('loggedIn', 'true');
            sessionStorage.setItem('userId', userId);
            
            // Set user role based on backend response or user ID
            const userRole = data.role || (userId === 'CRM' ? 'CRM' : 'ADMIN');
            sessionStorage.setItem('userRole', userRole);
            
            // Redirect based on role
            if (userRole === 'CRM') {
                window.location.href = 'marketing.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            errorMsg.textContent = data.message || 'Invalid credentials';
        }
    } catch (error) {
        errorMsg.textContent = 'Login failed. Please try again.';
    }
});
