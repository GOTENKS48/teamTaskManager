/**
 * Auth page logic — handles login/signup forms and tab switching
 */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (isLoggedIn()) {
    window.location.href = '/dashboard.html';
    return;
  }

  // Tab switching
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      document.getElementById(tab.dataset.form).classList.add('active');
    });
  });

  // Signup form
  const signupForm = document.getElementById('signup-form');
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = signupForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const res = await API.signup({
        name: document.getElementById('signup-name').value.trim(),
        email: document.getElementById('signup-email').value.trim(),
        password: document.getElementById('signup-password').value,
      });
      setToken(res.data.token);
      setUser(res.data.user);
      showToast('Account created! Redirecting...', 'success');
      setTimeout(() => window.location.href = '/dashboard.html', 600);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

  // Login form
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const res = await API.login({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      });
      setToken(res.data.token);
      setUser(res.data.user);
      showToast('Welcome back!', 'success');
      setTimeout(() => window.location.href = '/dashboard.html', 600);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
});
