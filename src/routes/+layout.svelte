<script>
  import '../app.scss';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let ready = false;
  onMount(() => {
    if (window.electron && browser) {
      window.electron.send('run-init');
    }
    ready = true;
  });
</script>

{#if ready}
  <div class="h-full">
    <slot />
  </div>
{/if}
