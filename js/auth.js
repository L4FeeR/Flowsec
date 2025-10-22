document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    let otpSent = false;
    let userEmail = '';
    
    // Test Supabase connection
    console.log('Supabase client initialized:', supabaseClient ? 'Yes' : 'No');
    console.log('Supabase URL:', SUPABASE_URL);
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get email and password
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('submit-btn');
            const btnText = document.getElementById('btn-text');
            
            // Validate password
            if (!password || password.length < 8) {
                alert('Password must be at least 8 characters');
                return;
            }
            
            // Store password temporarily for key decryption after magic link
            sessionStorage.setItem('tempPassword', password);
            sessionStorage.setItem('tempEmail', email);
            
            // Disable button and show loading
            submitBtn.disabled = true;
            btnText.textContent = 'Sending...';
            
            console.log('Attempting to send magic link to:', email);
            
            // Get the correct base URL (handles GitHub Pages with repo name)
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '').replace('/pages', '');
            
            const { data, error } = await supabaseClient.auth.signInWithOtp({ 
                email: email,
                options: {
                    shouldCreateUser: false,
                    emailRedirectTo: baseUrl + '/pages/chat.html'
                }
            });
            
            console.log('Magic Link Response:', { data, error });
            
            if (error) {
                console.error('Magic Link Error:', error);
                alert('Error: ' + error.message);
                submitBtn.disabled = false;
                btnText.textContent = 'Send Magic Link';
                sessionStorage.removeItem('tempPassword');
                sessionStorage.removeItem('tempEmail');
            } else {
                console.log('Magic link sent successfully to:', email);
                // Show success message
                loginForm.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;">✉️</div>
                        <h3 style="color: #333; margin-bottom: 10px;">Check Your Email!</h3>
                        <p style="color: #666; margin-bottom: 20px;">
                            We've sent a magic link to <strong>${email}</strong>
                        </p>
                        <p style="color: #999; font-size: 14px;">
                            Click the link in your email to sign in.<br>
                            Your password will be used to decrypt your keys.<br>
                            (Also check your spam folder)
                        </p>
                        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Send Another Link
                        </button>
                    </div>
                `;
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const gender = document.getElementById('gender').value;
            const profilePic = document.getElementById('profile-pic').files[0];
            
            const submitBtn = document.getElementById('submit-btn');
            const btnText = document.getElementById('btn-text');
            
            // Validate passwords
            if (password.length < 8) {
                alert('Password must be at least 8 characters');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            submitBtn.disabled = true;
            btnText.textContent = 'Creating...';
            
            console.log('Attempting signup for:', email);
            
            // Store profile data AND password before sending magic link
            localStorage.setItem('pendingName', name);
            localStorage.setItem('pendingUsername', username);
            localStorage.setItem('pendingGender', gender);
            localStorage.setItem('pendingEmail', email);
            sessionStorage.setItem('pendingPassword', password); // Store in sessionStorage for security
            
            if (profilePic) {
                // Store file for later upload
                const reader = new FileReader();
                reader.onload = function(e) {
                    localStorage.setItem('pendingProfilePic', e.target.result);
                };
                reader.readAsDataURL(profilePic);
            }
            
            // Get the correct base URL (handles GitHub Pages with repo name)
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '').replace('/pages', '');
            
            // Send magic link with user metadata
            const { data, error } = await supabaseClient.auth.signInWithOtp({ 
                email: email,
                options: {
                    shouldCreateUser: true,
                    emailRedirectTo: baseUrl + '/pages/complete-profile.html',
                    data: {
                        name: name,
                        username: username,
                        gender: gender
                    }
                }
            });
            
            console.log('Signup Magic Link Response:', { data, error });
            
            if (error) {
                console.error('Signup Error:', error);
                alert('Error: ' + error.message);
                submitBtn.disabled = false;
                btnText.textContent = 'Create Account';
            } else {
                console.log('Signup magic link sent successfully to:', email);
                
                // Show success message
                signupForm.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;">✉️</div>
                        <h3 style="color: #333; margin-bottom: 10px;">Check Your Email!</h3>
                        <p style="color: #666; margin-bottom: 20px;">
                            We've sent a magic link to <strong>${email}</strong>
                        </p>
                        <p style="color: #999; font-size: 14px;">
                            Click the link in your email to complete your account setup.<br>
                            (Also check your spam folder)
                        </p>
                        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                `;
            }
        });
    }
});