<script>
  import { getStore } from '$lib/utils/hmr-stores';
  let kickData = getStore('kick-data', { username: '', chatroomId: '' });
</script>

<a href="/">Back</a>
<h1 class="text-2xl font-bold">How to get Kick chatroom ID</h1>
<ol class="pl-5 list-decimal">
  <li><h1 class="text-lg">Launch a browser to kick.com</h1></li>
  <li><h1 class="text-lg">Log in</h1></li>
  <li><h1 class="text-lg">Press F12 to launch javascript console</h1></li>
  <li><h1 class="text-lg">Select the "Console" tab</h1></li>
  <li>
    <h1 class="text-lg">Paste into javascript console and press &lt;Enter&gt;:</h1>
    <div class="h-10">
      <textarea class="border-2 p-1 resize-none font-mono text-xs w-full" readonly
        >fetch("https://kick.com/api/v2/channels/{$kickData?.username || 'YOUR_USERNAME'}/chatroom").then(resp =>
        resp.json()).then(json => console.log(json.id));</textarea
      >
    </div>
  </li>
  <li><h1 class="text-lg">Copy the value into the chatroomId input box on the previous screen</h1></li>
</ol>
