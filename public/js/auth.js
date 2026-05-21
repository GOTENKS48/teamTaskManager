/**
 * Auth page logic — handles login/signup/forgot-password/reset-password forms
 */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  if (isLoggedIn()) {
    window.location.href = '/dashboard.html';
    return;
  }

  // ─── Helper: Show a specific auth section ──────────────────────────────────
  function showSection(sectionId) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    // Hide/show tabs depending on section
    const tabBar = document.querySelector('.auth-tabs');
    if (sectionId === 'forgot-section' || sectionId === 'reset-section') {
      tabBar.style.display = 'none';
    } else {
      tabBar.style.display = '';
      // Sync tab highlight
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      if (sectionId === 'login-section') document.getElementById('login-tab').classList.add('active');
      if (sectionId === 'signup-section') document.getElementById('signup-tab').classList.add('active');
    }
  }

  // ─── Tab switching ─────────────────────────────────────────────────────────
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      document.getElementById(tab.dataset.form).classList.add('active');
    });
  });

  // ─── "Forgot password?" link ───────────────────────────────────────────────
  document.getElementById('show-forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('forgot-section');
  });

  // ─── "Back to Sign In" links ───────────────────────────────────────────────
  document.getElementById('back-to-login-1')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login-section');
  });
  document.getElementById('back-to-login-2')?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login-section');
  });

  // ─── Signup form ───────────────────────────────────────────────────────────
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

  // ─── Login form ────────────────────────────────────────────────────────────
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

  // ─── Forgot Password form ─────────────────────────────────────────────────
  const forgotForm = document.getElementById('forgot-form');
  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = forgotForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const res = await API.forgotPassword({
        email: document.getElementById('forgot-email').value.trim(),
      });

      showToast('Reset token generated! Redirecting to reset form...', 'success');

      // Auto-fill the token and switch to reset form
      document.getElementById('reset-token').value = res.data.resetToken;
      setTimeout(() => showSection('reset-section'), 800);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
    }
  });

  // ─── Reset Password form ──────────────────────────────────────────────────
  const resetForm = document.getElementById('reset-form');
  resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-password-confirm').value;

    if (password !== confirm) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    const btn = resetForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Resetting...';

    try {
      await API.resetPassword({
        token: document.getElementById('reset-token').value.trim(),
        password,
      });

      showToast('Password reset successfully! You can now sign in.', 'success');
      resetForm.reset();
      setTimeout(() => showSection('login-section'), 1000);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  });
});
