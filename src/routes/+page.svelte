<script>
  import { browser } from '$app/environment';
  import { getStore } from '$lib/utils/hmr-stores';
  import Checkmark from './checkmark.svelte';

  let desktop = '';
  let initDone = getStore('init-done', false);
  let marblesExecData = getStore('marbles-exe', null);
  let kickData = getStore('kick-data', { username: '', chatroomId: '' });
  let logStore = getStore('logger', '');
  let started = getStore('started', false);
  let showLog = getStore('show-log', false);
  let marblesStarted = getStore('marblesStarted', false);

  const maxLogSize = 1000 * 1000; // 1 mb
  const oldChunksRemoved = 1000 * 100; // 100 kb

  if (window.electron && browser) {
    window.electron.receive('log-message', (msg) => {
      if ($logStore.length > maxLogSize) {
        $logStore = $logStore.substring($logStore.length - (maxLogSize - oldChunksRemoved));
      }
      $logStore += msg + '\n';
    });
    window.electron.receive('set-marbles-exe-data', (data) => {
      $marblesExecData = data;
    });
    window.electron.receive('run-init-done', () => {
      $initDone = true;
    });
    window.electron.receive('set-kick-data', (data) => {
      $kickData = data;
    });
    window.electron.receive('server-started', () => {
      $started = true;
    });
    window.electron.receive('server-killed', () => {
      $started = false;
      $marblesStarted = false;
    });
    window.electron.receive('marbles-started', () => {
      $marblesStarted = true;
    });
  }
  const nextButtonColor = ' bg-blue-500 hover:bg-blue-700 ';
  const extraButtonColor = ' bg-gray-500 hover:bg-gray-700 ';
  const bigButtonClasses = ' text-white font-bold py-2 px-4 rounded ';
  const smallButtonClasses = ' text-white font-bold py-1 px-2 text-xs rounded ';
</script>

<div class="h-full flex flex-col justify-between">
  <div>
    {#if $initDone}
      <div class="pl-4">
        <ol>
          <li>
            <h1 class="text-2xl">Patch marbles.exe</h1>
            <div class="ml-4">
              {#if $marblesExecData}
                {#if $marblesExecData.path}
                  <Checkmark class="inline-block text-green-600" />
                {/if}
                {$marblesExecData.path}
                <button
                  class={extraButtonColor + smallButtonClasses}
                  on:click={() => window.electron.send('setup-marbles-location')}
                >
                  Change Marbles Location
                </button>
                <div>
                  {#if $marblesExecData.hasKickUrl && !$marblesExecData.hasTwitchUrl}
                    <Checkmark class="inline-block text-green-600" />
                  {/if}
                  {#if $marblesExecData.hasTwitchUrl}
                    <button
                      class={nextButtonColor + bigButtonClasses}
                      on:click={() => window.electron.send('patch-marbles-exe', $marblesExecData.path)}
                    >
                      Patch
                    </button>
                  {/if}
                  {#if $marblesExecData.hasKickUrl}
                    <div class="inline-flex">
                      <button
                        class={extraButtonColor + smallButtonClasses}
                        on:click={() => window.electron.send('unpatch-marbles-exe', $marblesExecData.path)}
                      >
                        Un-Patch
                      </button>
                      <div>Click this to revert Marbles back to Twitch</div>
                    </div>
                  {/if}
                </div>
              {:else}
                <b class="text-red-600">NOT SET</b>
                <button
                  class={nextButtonColor + bigButtonClasses}
                  on:click={() => window.electron.send('setup-marbles-location')}
                >
                  Set Marbles Location
                </button>
              {/if}
            </div>
          </li>
          {#if $marblesExecData && $marblesExecData.hasKickUrl && !$marblesExecData.hasTwitchUrl}
            <li class="pt-4">
              <h1 class="text-2xl">Provide Kick Info</h1>
              <div class="ml-4 flex">
                {#if $kickData.chatroomId && $kickData.username}
                  <Checkmark class="inline-block text-green-600" />
                {/if}
                <div>
                  Kick Username:
                  <input
                    type="text"
                    bind:value={$kickData.username}
                    readonly={$started}
                    on:keyup={(event) =>
                      window.electron.send('set-kick-username', {
                        username: event.target.value,
                        chatroomId: $kickData.chatroomId,
                      })}
                  />
                </div>
                <div>
                  Kick chatroomId:
                  <input
                    type="text"
                    readonly={$started}
                    bind:value={$kickData.chatroomId}
                    on:change={(event) => ($kickData.chatroomId = event.target.value)}
                  />
                  <a class="ml-4" href="/help">Help</a>
                </div>
              </div>
            </li>
          {/if}
          {#if $kickData && $kickData.username && $kickData.chatroomId}
            <li class="pt-4">
              <h1 class="text-2xl">Ready!</h1>
              <div class="ml-4">
                {#if !$started}
                  <button
                    class={nextButtonColor + bigButtonClasses}
                    on:click={() =>
                      window.electron.send('launch-marbles', { ...$kickData, path: $marblesExecData?.path })}
                    >Launch Marbles</button
                  >
                  <button
                    class={extraButtonColor + smallButtonClasses}
                    on:click={() => {
                      window.electron.send('launch-server', $kickData);
                    }}>Launch chat server only</button
                  >
                {:else}
                  <div>Running...</div>
                  {#if $marblesStarted}
                    <button
                      class={nextButtonColor + smallButtonClasses}
                      on:click={() => window.electron.send('kill-marbles')}>Stop Marbles</button
                    >
                  {:else}
                    <button
                      class={extraButtonColor + smallButtonClasses}
                      on:click={() => window.electron.send('kill-marbles')}>Stop Server</button
                    >
                  {/if}
                {/if}
              </div>
            </li>
          {/if}
        </ol>
        <span />
      </div>
    {/if}
  </div>
  <div class="border-t-2 border-gray-600 p-1">
    <div class="flex justify-end">
      <button
        class={extraButtonColor + smallButtonClasses + ' mr-2'}
        on:click={() => window.electron.send('copy-to-clipboard', $logStore)}>Copy log</button
      >
      <button class={extraButtonColor + smallButtonClasses} on:click={() => ($showLog = !$showLog)}
        >{$showLog ? 'Hide' : 'Show'} log</button
      >
    </div>
    {#if $showLog}
      <div class="h-40">
        <textarea class="border-2 p-1 resize-none font-mono text-xs w-full h-full" readonly>{$logStore}</textarea>
      </div>
    {/if}
  </div>
</div>

<style>
</style>
