<!-- src/lib/components/TesterModal.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let testerName = '';
  let isSubmitting = false;

  function handleSubmit(event) {
    event.preventDefault();
    const name = testerName.trim();
    
    if (!name) {
      alert('Please enter your name');
      return;
    }
    
    if (isSubmitting) return;
    isSubmitting = true;
    
    dispatch('login', { name });
    
    // Reset form after short delay
    setTimeout(() => {
      isSubmitting = false;
    }, 500);
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      handleSubmit(event);
    }
  }
</script>

<div class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <div class="modal-content">
    <h2 id="modal-title">Welcome to Usability Olympics</h2>
    <p>Please enter your name to continue:</p>
    
    <form on:submit={handleSubmit}>
      <input 
        type="text" 
        bind:value={testerName}
        placeholder="Your Name" 
        required 
        autofocus
        disabled={isSubmitting}
        on:keydown={handleKeydown}
        aria-label="Enter your name"
      />
      <button 
        type="submit" 
        class="button"
        disabled={isSubmitting || !testerName.trim()}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  </div>
</div>

<style>
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }

  .modal-content {
    background-color: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    width: 400px;
    max-width: 90%;
    text-align: center;
    animation: modalSlideIn 0.3s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-50px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-content h2 {
    color: #62929a;
    margin-bottom: 20px;
    font-size: 1.5rem;
  }

  .modal-content p {
    margin-bottom: 20px;
    color: #666;
  }

  .modal-content input {
    width: 100%;
    padding: 12px;
    margin: 15px 0;
    border: 2px solid #ccc;
    border-radius: 8px;
    font-size: 16px;
    box-sizing: border-box;
    transition: border-color 0.3s ease;
  }

  .modal-content input:focus {
    border-color: #62929a;
    outline: none;
    box-shadow: 0 0 0 3px rgba(98, 146, 154, 0.2);
  }

  .modal-content input:disabled {
    background-color: #f5f5f5;
    color: #999;
  }

  .button {
    padding: 12px 24px;
    border-radius: 5px;
    background: #62929a;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease-in-out;
    width: 100%;
    margin-top: 10px;
  }

  .button:hover:not(:disabled) {
    background: #4f7b85;
    transform: translateY(-1px);
  }

  .button:disabled {
    background: #a0a0a0;
    cursor: not-allowed;
    transform: none;
  }

  .button:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .modal-content {
      width: 95%;
      padding: 20px;
    }
    
    .modal-content h2 {
      font-size: 1.3rem;
    }
  }
</style>