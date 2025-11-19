<!-- src/routes/auth/register/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { authStore, register } from '$lib/stores/auth.js';
  import { onMount } from 'svelte';
  
  let formData = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  
  let isSubmitting = false;
  let errorMessage = '';
  let showPassword = false;
  let showConfirmPassword = false;
  let validationErrors = {};

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
    validationErrors = {};
    
    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      validationErrors = validation.errors;
      return;
    }
    
    isSubmitting = true;
    
    try {
      const result = await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });
      
      if (result.success) {
        // Redirect to dashboard on successful registration
        goto('/dashboard');
      } else {
        errorMessage = result.error || 'Registration failed';
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
  
  function validateForm() {
    const errors = {};
    
    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }
    
    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!isStrongPassword(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  function isStrongPassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers;
  }
  
  function togglePasswordVisibility(field) {
    if (field === 'password') {
      showPassword = !showPassword;
    } else if (field === 'confirmPassword') {
      showConfirmPassword = !showConfirmPassword;
    }
  }
  
  function clearError() {
    errorMessage = '';
  }
  
  function clearFieldError(field) {
    if (validationErrors[field]) {
      validationErrors = { ...validationErrors };
      delete validationErrors[field];
    }
  }
  
  // Real-time validation feedback
  $: isFormValid = formData.firstName.trim() && 
                   formData.lastName.trim() && 
                   formData.email.trim() && 
                   formData.password && 
                   formData.confirmPassword &&
                   Object.keys(validationErrors).length === 0;
</script>

<svelte:head>
  <title>Create Account - Usability Olympics</title>
  <meta name="description" content="Create your Usability Olympics account" />
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <h1>Create Account</h1>
      <p>Join the Usability Olympics community</p>
    </div>

    {#if errorMessage}
      <div class="error-message" role="alert">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{errorMessage}</span>
        <button class="error-close" on:click={clearError} aria-label="Dismiss error">×</button>
      </div>
    {/if}

    <form on:submit={handleSubmit} class="auth-form" novalidate>
      <div class="form-row">
        <div class="form-group">
          <label for="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            bind:value={formData.firstName}
            on:input={() => clearFieldError('firstName')}
            placeholder="Enter your first name"
            required
            disabled={isSubmitting}
            autocomplete="given-name"
            class:error={validationErrors.firstName}
          />
          {#if validationErrors.firstName}
            <span class="field-error">{validationErrors.firstName}</span>
          {/if}
        </div>

        <div class="form-group">
          <label for="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            bind:value={formData.lastName}
            on:input={() => clearFieldError('lastName')}
            placeholder="Enter your last name"
            required
            disabled={isSubmitting}
            autocomplete="family-name"
            class:error={validationErrors.lastName}
          />
          {#if validationErrors.lastName}
            <span class="field-error">{validationErrors.lastName}</span>
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          type="email"
          bind:value={formData.email}
          on:input={() => clearFieldError('email')}
          placeholder="Enter your email"
          required
          disabled={isSubmitting}
          autocomplete="email"
          class:error={validationErrors.email}
        />
        {#if validationErrors.email}
          <span class="field-error">{validationErrors.email}</span>
        {/if}
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-input-container">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={formData.password}
            on:input={() => clearFieldError('password')}
            placeholder="Create a strong password"
            required
            disabled={isSubmitting}
            autocomplete="new-password"
            class:error={validationErrors.password}
          />
          <button
            type="button"
            class="password-toggle"
            on:click={() => togglePasswordVisibility('password')}
            disabled={isSubmitting}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {#if validationErrors.password}
          <span class="field-error">{validationErrors.password}</span>
        {/if}
        <div class="password-requirements">
          <p>Password must contain:</p>
          <ul>
            <li class:valid={formData.password.length >= 8}>At least 8 characters</li>
            <li class:valid={/[A-Z]/.test(formData.password)}>One uppercase letter</li>
            <li class:valid={/[a-z]/.test(formData.password)}>One lowercase letter</li>
            <li class:valid={/\d/.test(formData.password)}>One number</li>
          </ul>
        </div>
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <div class="password-input-container">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            bind:value={formData.confirmPassword}
            on:input={() => clearFieldError('confirmPassword')}
            placeholder="Confirm your password"
            required
            disabled={isSubmitting}
            autocomplete="new-password"
            class:error={validationErrors.confirmPassword}
          />
          <button
            type="button"
            class="password-toggle"
            on:click={() => togglePasswordVisibility('confirmPassword')}
            disabled={isSubmitting}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {#if validationErrors.confirmPassword}
          <span class="field-error">{validationErrors.confirmPassword}</span>
        {/if}
      </div>

      <div class="form-actions">
        <button 
          type="submit" 
          class="btn btn-primary"
          disabled={isSubmitting || !isFormValid}
        >
          {#if isSubmitting}
            <span class="spinner"></span>
            Creating Account...
          {:else}
            Create Account
          {/if}
        </button>
      </div>
    </form>

    <div class="auth-footer">
      <p>
        Already have an account? 
        <a href="/auth/login" class="auth-link">Sign in here</a>
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
    max-width: 500px;
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

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
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

  .field-error {
    display: block;
    color: #dc2626;
    font-size: 0.8rem;
    margin-top: 4px;
  }

  .password-requirements {
    margin-top: 8px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 6px;
    border-left: 3px solid #e2e8f0;
  }

  .password-requirements p {
    margin: 0 0 8px 0;
    font-size: 0.85rem;
    color: #64748b;
    font-weight: 500;
  }

  .password-requirements ul {
    margin: 0;
    padding-left: 16px;
    list-style: none;
  }

  .password-requirements li {
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 2px;
    position: relative;
  }

  .password-requirements li::before {
    content: '✗';
    position: absolute;
    left: -16px;
    color: #dc2626;
    font-weight: bold;
  }

  .password-requirements li.valid {
    color: #16a34a;
  }

  .password-requirements li.valid::before {
    content: '✓';
    color: #16a34a;
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
    margin: 0;
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

  /* Responsive design */
  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }

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