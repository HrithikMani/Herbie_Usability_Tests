<!-- src/routes/auth/login/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { authStore, login } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';
  
  let email = '';
  let password = '';
  let isSubmitting = false;
  let errorMessage = '';
  let showPassword = false;

  // Redirect if already logged in
  onMount(() => {
    if ($authStore.isAuthenticated) {
      goto('/dashboard');
    }
  });

  async function handleSubmit(event) {
    event.preventDefault();
    
    if (isSubmitting) return;
    
    // Clear previous errors
    errorMessage = '';
    
    // Basic validation
    if (!email.trim()) {
      errorMessage = 'Email is required';
      return;
    }
    
    if (!password.trim()) {
      errorMessage = 'Password is required';
      return;
    }
    
    if (!isValidEmail(email)) {
      errorMessage = 'Please enter a valid email address';
      return;
    }
    
    isSubmitting = true;
    
    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        // Redirect to dashboard on successful login
        goto('/dashboard');
      } else {
        errorMessage = result.error || 'Login failed';
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }
  
  function clearError() {
    errorMessage = '';
  }
</script>

<svelte:head>
  <title>Login - Usability Olympics</title>
  <meta name="description" content="Login to your Usability Olympics account" />
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <h1>Welcome Back</h1>
      <p>Sign in to your Herbie Managmeent Console</p>
    </div>

    {#if errorMessage}
      <div class="error-message" role="alert">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{errorMessage}</span>
        <button class="error-close" on:click={clearError} aria-label="Dismiss error">×</button>
      </div>
    {/if}

    <form on:submit={handleSubmit} class="auth-form" novalidate>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="Enter your email"
          required
          disabled={isSubmitting}
          autocomplete="email"
          class:error={errorMessage && !email.trim()}
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-input-container">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="Enter your password"
            required
            disabled={isSubmitting}
            autocomplete="current-password"
            class:error={errorMessage && !password.trim()}
          />
          <button
            type="button"
            class="password-toggle"
            on:click={togglePasswordVisibility}
            disabled={isSubmitting}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button 
          type="submit" 
          class="btn btn-primary"
          disabled={isSubmitting || !email.trim() || !password.trim()}
        >
          {#if isSubmitting}
            <span class="spinner"></span>
            Signing in...
          {:else}
            Sign In
          {/if}
        </button>
      </div>
    </form>

    <div class="auth-footer">
      <p>
        Don't have an account? 
        <a href="/auth/register" class="auth-link">Create one here</a>
      </p>
      <p>
        <a href="/auth/forgot-password" class="auth-link forgot-link">Forgot your password?</a>
      </p>
    </div>
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    
    padding: 20px;
  }

  .auth-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    padding: 40px;
    width: 100%;
    max-width: 420px;
    animation: slideUp 0.4s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .auth-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .auth-header h1 {
    color: #333;
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  .auth-header p {
    color: #666;
    margin: 0;
    font-size: 0.95rem;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: shake 0.3s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  .error-icon {
    font-size: 16px;
  }

  .error-text {
    flex: 1;
    color: #dc2626;
    font-size: 0.9rem;
  }

  .error-close {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 18px;
    font-weight: bold;
    padding: 0;
    line-height: 1;
  }

  .error-close:hover {
    opacity: 0.7;
  }

  .auth-form {
    margin-bottom: 30px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    color: #374151;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .form-group input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-group input.error {
    border-color: #dc2626;
  }

  .form-group input:disabled {
    background-color: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  .password-input-container {
    position: relative;
  }

  .password-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #6b7280;
    font-size: 16px;
  }

  .password-toggle:hover:not(:disabled) {
    color: #374151;
  }

  .password-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .form-actions {
    margin-top: 25px;
  }

  .btn {
    width: 100%;
    padding: 14px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .auth-footer {
    text-align: center;
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
  }

  .auth-footer p {
    margin: 0 0 8px 0;
    color: #6b7280;
    font-size: 0.9rem;
  }

  .auth-link {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .auth-link:hover {
    color: #5a67d8;
    text-decoration: underline;
  }

  .forgot-link {
    font-size: 0.85rem;
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .auth-container {
      padding: 10px;
    }

    .auth-card {
      padding: 30px 20px;
    }

    .auth-header h1 {
      font-size: 1.75rem;
    }
  }
</style>